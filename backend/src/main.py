import os
import re
import json
import logging
import time
import requests
import sys
import threading
from dotenv import load_dotenv
from datetime import datetime, timedelta
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from sqlalchemy import text, select
from flask_login import LoginManager, login_required, current_user
from werkzeug.utils import secure_filename

# Optional rate limiter (safe no-op fallback)
try:
    from flask_limiter import Limiter  # type: ignore
    from flask_limiter.util import get_remote_address  # type: ignore
except Exception:  # pragma: no cover
    Limiter = None  # type: ignore
    def get_remote_address():  # type: ignore
        return None

# Local models
from models.models import (
    db,
    HorariosEscolares,
    PlanoEstudo,
    User,
    ProgressoMateria,
    SubjectContent,
    CompletedContent,
    YouTubeCache,
    CursoMateria,
    Curso,
    WeeklyQuiz,
)

# Ensure local paths are on sys.path before local imports
CURRENT_DIR = os.path.dirname(__file__)
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)
PARENT_DIR = os.path.abspath(os.path.join(CURRENT_DIR, '..'))
if PARENT_DIR not in sys.path:
    sys.path.insert(0, PARENT_DIR)

# Load .env from backend/src explicitly (fallback to default env loading)
try:
    load_dotenv(os.path.join(CURRENT_DIR, '.env'))
except Exception:
    load_dotenv()

# Configure logging level based on environment early
_log_level = os.getenv('LOG_LEVEL') or ('DEBUG' if os.getenv('FLASK_ENV','development') != 'production' else 'INFO')
logging.basicConfig(level=getattr(logging, _log_level.upper(), logging.INFO))

# Simple in-memory cache for YouTube queries (TTL in seconds)
_YT_CACHE: dict[str, tuple[float, list[dict]]] = {}
_YT_CACHE_TTL = 600
_YT_CACHE_MAX_ROWS = 2000
try:
    _YT_CACHE_TTL = int(os.getenv('YT_CACHE_TTL', str(_YT_CACHE_TTL)))
    _YT_CACHE_MAX_ROWS = int(os.getenv('YT_CACHE_MAX_ROWS', str(_YT_CACHE_MAX_ROWS)))
except Exception:
    pass

GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL = os.getenv("GOOGLE_DEFAULT_MODEL", "models/gemini-1.5-flash-latest")
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

# Resolve pasta de uploads do repositório (preferir raiz do projeto)
_CDIR = os.path.dirname(__file__)
_BACKEND_DIR = os.path.abspath(os.path.join(_CDIR, '..'))
_ROOT_DIR = os.path.abspath(os.path.join(_CDIR, '..', '..'))
_CANDIDATES = [
    os.path.join(_ROOT_DIR, 'uploads'),   # repo root/uploads
    os.path.join(_BACKEND_DIR, 'uploads') # backend/uploads (fallback)
]
UPLOAD_FOLDER = next((p for p in _CANDIDATES if os.path.isdir(p)), _CANDIDATES[0])
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
# Use SECRET_KEY from environment with fallback
app.secret_key = os.getenv('SECRET_KEY') or os.getenv('FLASK_SECRET_KEY') or 'dev-secret-change-me'
# Ajustes de sessão
same_site_env = os.getenv('SESSION_COOKIE_SAMESITE', 'Lax')
secure_env = os.getenv('SESSION_COOKIE_SECURE', 'false').lower() in {'1', 'true', 'yes'}
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE=same_site_env,
    SESSION_COOKIE_SECURE=secure_env,
)
# If SameSite=None then cookie must be Secure; em dev sem https mantenha Lax
if same_site_env.lower() == 'none' and not secure_env:
    logging.warning('SESSION_COOKIE_SAMESITE=None requires SESSION_COOKIE_SECURE=true; forcing SECURE true')
    app.config.update(SESSION_COOKIE_SECURE=True)

# Config padrão do SQLAlchemy a partir de variáveis de ambiente
try:
    # Optional SQLite fallback for local dev
    use_sqlite = os.getenv('USE_SQLITE', 'false').lower() in {'1', 'true', 'yes'}

    if use_sqlite:
        app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
            'SQLALCHEMY_DATABASE_URI',
            f"sqlite:///{os.path.join(CURRENT_DIR, 'dev.db')}"
        )
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    else:
        db_user = os.getenv('DB_USERNAME', 'postgres')
        db_pass = os.getenv('DB_PASSWORD', '1234')
        db_host = os.getenv('DB_HOST', 'localhost')
        db_port = os.getenv('DB_PORT', '5432')
        db_name = os.getenv('DB_NAME', 'sistema_estudos')
        app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
            'SQLALCHEMY_DATABASE_URI',
            f'postgresql+psycopg2://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}'
        )
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

        db.init_app(app)

        # Optionally create tables at startup (dev convenience)
        auto_ddl = os.getenv('AUTO_DDL_ON_START', '1').lower() in {'1','true','yes','on'}
        if auto_ddl:
            with app.app_context():
                try:
                    db.create_all()
                except Exception as ce:
                    logging.warning(f"Falha ao criar tabelas: {ce}")

                # 2) Migração leve (users)
                try:
                    db.session.execute(text("ALTER TABLE users ALTER COLUMN ritmo TYPE varchar(16);"))
                    db.session.execute(text("ALTER TABLE users ALTER COLUMN estilo_aprendizagem TYPE varchar(32);"))
                    db.session.execute(text("ALTER TABLE users ALTER COLUMN escolaridade TYPE varchar(64);"))
                    db.session.execute(text("""
                        DO $$
                        BEGIN
                            IF EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_name='users' AND column_name='horario_inicio'
                                    AND data_type IN ('character varying','text')
                            ) THEN
                                ALTER TABLE users
                                ALTER COLUMN horario_inicio TYPE time USING NULLIF(horario_inicio, '')::time;
                            END IF;
                        END $$;
                    """))
                    db.session.execute(text("""
                        DO $$
                        BEGIN
                            IF EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_name='users' AND column_name='dias_disponiveis'
                            ) THEN
                                BEGIN
                                    ALTER TABLE users
                                    ALTER COLUMN dias_disponiveis TYPE text[] USING
                                        CASE
                                            WHEN dias_disponiveis IS NULL THEN NULL
                                            WHEN pg_typeof(dias_disponiveis)::text = 'json' THEN
                                                (SELECT ARRAY(SELECT json_array_elements_text(dias_disponiveis)))
                                            ELSE dias_disponiveis::text[]
                                        END;
                                EXCEPTION WHEN others THEN
                                    NULL;
                                END;
                            END IF;
                        END $$;
                    """))
                    db.session.commit()
                except Exception as me:
                    logging.warning(f"Migração leve (users) falhou: {me}")
                    db.session.rollback()

                # 3) Migração leve (weekly_quizzes)
                try:
                    db.session.execute(text("""
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_name='weekly_quizzes' AND column_name='week_start'
                            ) THEN
                                ALTER TABLE weekly_quizzes ADD COLUMN week_start date;
                                UPDATE weekly_quizzes
                                    SET week_start = DATE_TRUNC('week', COALESCE(created_at, NOW()))::date;
                                ALTER TABLE weekly_quizzes ALTER COLUMN week_start SET NOT NULL;
                            END IF;
                        END $$;
                        """))
                    db.session.execute(text("""
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_name='weekly_quizzes' AND column_name='status'
                            ) THEN
                                ALTER TABLE weekly_quizzes ADD COLUMN status varchar(16) NOT NULL DEFAULT 'ready';
                            END IF;
                        END $$;
                        """))
                    db.session.execute(text("""
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_name='weekly_quizzes' AND column_name='version'
                            ) THEN
                                ALTER TABLE weekly_quizzes ADD COLUMN version integer NOT NULL DEFAULT 1;
                            END IF;
                        END $$;
                        """))
                    db.session.execute(text("""
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_name='weekly_quizzes' AND column_name='data'
                            ) THEN
                                ALTER TABLE weekly_quizzes ADD COLUMN data jsonb NOT NULL DEFAULT '[]'::jsonb;
                            END IF;
                        END $$;
                        """))
                    db.session.execute(text("""
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM pg_constraint WHERE conname = 'uq_weekly_quiz_user_week'
                            ) THEN
                                ALTER TABLE weekly_quizzes ADD CONSTRAINT uq_weekly_quiz_user_week UNIQUE (user_id, week_start);
                            END IF;
                        END $$;
                        """))
                    db.session.execute(text("""
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='ix_weekly_quizzes_user_id'
                            ) THEN
                                CREATE INDEX ix_weekly_quizzes_user_id ON weekly_quizzes(user_id);
                            END IF;
                            IF NOT EXISTS (
                                SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='ix_weekly_quizzes_week_start'
                            ) THEN
                                CREATE INDEX ix_weekly_quizzes_week_start ON weekly_quizzes(week_start);
                            END IF;
                            IF NOT EXISTS (
                                SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='ix_weekly_quizzes_status'
                            ) THEN
                                CREATE INDEX ix_weekly_quizzes_status ON weekly_quizzes(status);
                            END IF;
                        END $$;
                        """))
                    db.session.commit()
                except Exception as wqe:
                    logging.warning(f"Migração leve (weekly_quizzes) falhou: {wqe}")
                    db.session.rollback()

        # Dev seed: populate minimal data if empty so frontend can render
        try:
            dev_seed = os.getenv('DEV_AUTOCREATE_DATA')
            use_dev = (dev_seed or '').lower() in {'1','true','yes'} or (os.getenv('USE_SQLITE','false').lower() in {'1','true','yes'})
            if use_dev:
                curso = Curso.query.first()
                if not curso:
                    curso = Curso(nome='Curso Teste')
                    db.session.add(curso)
                    db.session.commit()
                # Seed materias if missing
                materias_nomes = ['Matemática', 'Português', 'História']
                materias = []
                for nome in materias_nomes:
                    m = HorariosEscolares.query.filter_by(materia=nome).first()
                    if not m:
                        m = HorariosEscolares(materia=nome, horario='')
                        db.session.add(m)
                        db.session.commit()
                    materias.append(m)
                    # Ensure link CursoMateria
                    if not CursoMateria.query.filter_by(curso_id=curso.id, materia_id=m.id).first():
                        db.session.add(CursoMateria(curso_id=curso.id, materia_id=m.id))
                        db.session.commit()
                # Seed SubjectContent per materia
                for m in materias:
                    existing = SubjectContent.query.filter_by(materia_id=m.id).count()
                    if existing < 3:
                        for i in range(1, 4):
                            sc = SubjectContent(
                                subject=m.materia,
                                topic=f'Tópico {i} de {m.materia}',
                                content_html=f'<h1>{m.materia} - Tópico {i}</h1><p>Conteúdo de teste.</p>',
                                created_at=db.func.now(),
                                materia_id=m.id,
                                curso_id=curso.id,
                            )
                            db.session.add(sc)
                        db.session.commit()
        except Exception as se:
            logging.warning(f"Falha ao popular dados de desenvolvimento: {se}")

    # Basic log about which DB is in use (mask password)
    try:
        uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
        safe_uri = re.sub(r':[^@]+@', ':***@', uri) if isinstance(uri, str) else uri
        logging.info(f"DB conectado em: {safe_uri}")
    except Exception:
        pass
except Exception:
    pass

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Allow configurable CORS origins from env FRONTEND_ORIGINS (comma-separated)
_frontend_origins = os.getenv('FRONTEND_ORIGINS')
if _frontend_origins:
    origins = [o.strip() for o in _frontend_origins.split(',') if o.strip()]
else:
    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    # LAN defaults commonly used in local networks
    "http://192.168.0.100:5173",
    "http://192.168.0.100:5174",
        "http://192.168.0.106:5173",
        "http://192.168.0.109:5173",
        "http://192.168.0.107:5173",
    ]
CORS(
    app,
    supports_credentials=True,
    resources={r"/*": {"origins": origins}},
    allow_headers=[
        "Content-Type",
        "X-Requested-With",
        "Authorization",
        "If-None-Match",
        "If-Modified-Since",
    ],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    expose_headers=["Set-Cookie", "ETag"],
)

# Rate limiting configuration (env-driven)
_lmts_default = os.getenv('YT_RATE_LIMIT', '60 per hour')
_lmts_burst = os.getenv('YT_RATE_BURST', '10 per minute')
if 'Limiter' in globals() and Limiter is not None:
    limiter = Limiter(get_remote_address, app=app, default_limits=[_lmts_default])
else:
    class _NoopLimiter:
        def limit(self, *args, **kwargs):
            def _decorator(f):
                return f
            return _decorator
    limiter = _NoopLimiter()

YT_API_KEY = os.getenv("YT_API_KEY")
# sanitize quoted env values
if isinstance(YT_API_KEY, str):
    YT_API_KEY = YT_API_KEY.strip().strip('"').strip("'")

login_manager = LoginManager()
login_manager.init_app(app)

# Register blueprints
from routes.auth_routes import auth_bp
from routes.auth_routes import login as auth_login  # type: ignore
from routes.user_routes import user_bp, users_bp
from routes.agendas import agendas_bp
from routes.habitos import habitos_bp
from routes.content_routes import content_bp
from routes.progress_routes import progress_bp
from routes.course_routes import course_bp
from routes.onboarding_routes import onboarding_bp
from routes.quiz_gen_routes import bp_quiz_gen
from routes.quiz_gen_routes import (
    generate_weekly_quiz,
    fetch_weekly_contents_for_user,
    get_week_start_date,
)
from routes import v1_bp

try:
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(agendas_bp)
    app.register_blueprint(habitos_bp)
    app.register_blueprint(content_bp)
    app.register_blueprint(progress_bp)
    app.register_blueprint(course_bp)
    app.register_blueprint(onboarding_bp)
    app.register_blueprint(bp_quiz_gen)
    app.register_blueprint(v1_bp)

    # Optional AI blueprints (skip if deps missing)
    try:
        from routes.ia_quiz import bp_quiz  # type: ignore
        app.register_blueprint(bp_quiz)
    except Exception as _ai_ex:
        logging.warning(f"IA quiz desabilitado: {_ai_ex}")
    try:
        from routes.ia_sugestao import bp_ia_sugestao  # type: ignore
        app.register_blueprint(bp_ia_sugestao)
    except Exception as _ai2_ex:
        logging.warning(f"IA sugestao desabilitado: {_ai2_ex}")
except Exception as _bp_ex:
    logging.warning(f"Falha ao registrar blueprints: {_bp_ex}")

# ---- Lightweight weekly scheduler (optional) ----
_scheduler_started = False
_scheduler_timer: threading.Timer | None = None
def _seconds_until_next_sunday_3am(now: datetime | None = None) -> int:
    now = now or datetime.now()
    # calculate next Sunday 03:00 from current time
    days_ahead = (6 - now.weekday()) % 7  # Sunday=6
    target = (now + timedelta(days=days_ahead)).replace(hour=3, minute=0, second=0, microsecond=0)
    if target <= now:
        target = target + timedelta(days=7)
    delta = (target - now).total_seconds()
    return int(delta)

def _weekly_quiz_job():
    try:
        with app.app_context():
            # Find active users (fallback: all users)
            try:
                users = db.session.query(User).all()
            except Exception:
                users = []
            week_start = get_week_start_date()
            count = 0
            for u in users:
                try:
                    contents = fetch_weekly_contents_for_user(u.id)
                    if len(contents) < 2:
                        continue
                    quiz = generate_weekly_quiz(contents, per_content=5)
                    # upsert into WeeklyQuiz
                    from models.models import WeeklyQuiz  # local import to avoid cycle
                    record = (
                        db.session.query(WeeklyQuiz)
                        .filter(WeeklyQuiz.user_id == u.id, WeeklyQuiz.week_start == week_start)
                        .first()
                    )
                    if record:
                        record.data = quiz
                        record.status = 'ready'
                        record.version = (record.version or 1)
                    else:
                        record = WeeklyQuiz(user_id=u.id, week_start=week_start, status='ready', version=1, data=quiz)
                        db.session.add(record)
                    count += 1
                except Exception as ie:
                    logging.warning(f"Quiz weekly falhou para user {getattr(u,'id',None)}: {ie}")
            try:
                db.session.commit()
            except Exception as ce:
                logging.warning(f"Falha ao commit quizzes semanais: {ce}")
            logging.info(f"Weekly quiz job complete; processed {count} users")
    finally:
        # schedule next run
        delay = _seconds_until_next_sunday_3am()
        try:
            t = threading.Timer(delay, _weekly_quiz_job)
            t.daemon = True
            t.start()
            global _scheduler_timer
            _scheduler_timer = t
        except Exception as _t_ex:
            logging.warning(f"Failed to schedule next weekly quiz run: {_t_ex}")

def _start_weekly_quiz_scheduler():
    global _scheduler_started, _scheduler_timer
    if _scheduler_started:
        return
    if os.getenv('ENABLE_WEEKLY_QUIZ_CRON', 'true').lower() not in {'1','true','yes'}:
        return
    # Start only in the reloader's main process to avoid duplicates on Windows
    if os.environ.get('WERKZEUG_RUN_MAIN') not in {'true', 'True', '1'} and os.environ.get('FLASK_RUN_FROM_CLI'):
        # If running via flask CLI with reloader parent, wait for child
        return
    try:
        delay = _seconds_until_next_sunday_3am()
        t = threading.Timer(delay, _weekly_quiz_job)
        t.daemon = True
        t.start()
        _scheduler_timer = t
        _scheduler_started = True
        logging.info("Weekly quiz scheduler enabled")
    except Exception as e:
        logging.warning(f"Failed to start weekly quiz scheduler: {e}")

_start_weekly_quiz_scheduler()

# Garante JSON 401 para acessos sem autenticação
@login_manager.unauthorized_handler
def _unauthorized():
    return jsonify({"error": "Unauthorized"}), 401

# Carregador de usuário para Flask-Login
@login_manager.user_loader
def load_user(user_id):
    try:
        return db.session.get(User, int(user_id))
    except Exception:
        return None

_APP_START_TIME = time.time()

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health básico retrocompatível."""
    uptime = int(time.time() - _APP_START_TIME)
    # Check DB quickly
    db_ok = True
    try:
        db.session.execute(text('SELECT 1'))
    except Exception:
        db_ok = False
    return jsonify({
        "status": "online",
        "message": "API do Sistema de Estudos está funcionando!",
        "uptime_seconds": uptime,
        "db_ok": db_ok
    })

@app.route('/')
def index():
    return jsonify({"message": "API do Sistema de Estudos"})

@app.route('/db-test')
def db_test():
    try:
        with app.app_context():
            db.session.execute(text('SELECT 1'))
        return jsonify({"status": "ok", "message": "Conexão com o banco de dados funcionando!"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- Cursos (único) ---
@app.route('/api/courses', methods=['GET'])
def api_courses():
    return api_cursos()

# Alias em PT
@app.route('/api/cursos', methods=['GET'])
def api_cursos():
    try:
        rows = Curso.query.order_by(Curso.nome.asc()).all()
        return jsonify([{"id": c.id, "nome": c.nome} for c in rows])
    except Exception as e:
        logging.warning(f"ORM Curso falhou, tentando SQL direto: {e}")
        try:
            rows = db.session.execute(text("SELECT id, nome FROM cursos ORDER BY nome ASC")).fetchall()
            return jsonify([{"id": row.id, "nome": row.nome} for row in rows])
        except Exception:
            logging.exception("Erro ao listar cursos")
            return jsonify([]), 200

# --- Conteúdos por matéria (por nome) ---
@app.route('/api/conteudo/<materia>', methods=['GET'])
def get_conteudo_materia(materia):
    try:
        rows = (
            db.session.query(
                SubjectContent.id,
                SubjectContent.subject,
                SubjectContent.topic,
                SubjectContent.created_at,
            )
            .join(HorariosEscolares, SubjectContent.materia_id == HorariosEscolares.id)
            .filter(HorariosEscolares.materia == materia)
            .order_by(SubjectContent.created_at.desc())
            .all()
        )
        conteudos = [
            {
                "id": rid,
                "subject": subject,
                "topic": topic,
                "created_at": created_at.strftime('%d/%m/%Y %H:%M') if created_at else "",
            }
            for (rid, subject, topic, created_at) in rows
        ]
        return jsonify({"conteudos": conteudos})
    except Exception as e:
        return jsonify({"conteudos": [], "error": str(e)}), 500

# --- Conteúdo HTML por id (único) ---
@app.route('/api/conteudo_html/<int:conteudo_id>', methods=['GET'])
def get_conteudo_html(conteudo_id):
    try:
        row = (
            db.session.query(
                SubjectContent.id,
                SubjectContent.subject,
                SubjectContent.topic,
                SubjectContent.content_html,
                HorariosEscolares.materia,
            )
            .join(HorariosEscolares, SubjectContent.materia_id == HorariosEscolares.id)
            .filter(SubjectContent.id == conteudo_id)
            .first()
        )
        if row:
            # Reescreve URLs relativas de imagem para absolutas (carregando do backend)
            try:
                base = request.host_url.rstrip('/')
                html = row[3] or ""
                # casos comuns: src="/uploads/..", src='uploads/..', url(/uploads/..)
                html = re.sub(r"src=[\"']\s*/?uploads/", f'src="{base}/uploads/', html)
                html = re.sub(r'url\(\s*/?uploads/', f'url({base}/uploads/', html)
            except Exception:
                html = row[3] or ""
            return jsonify({
                "id": row[0],
                "subject": row[1],
                "topic": row[2],
                "content_html": html,
                "materia": row[4],
            })
        else:
            return jsonify({"error": "Conteúdo não encontrado"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- Gemini: Quiz ---
@app.route('/api/generate_quiz/<int:conteudo_id>', methods=['GET'])
def generate_quiz(conteudo_id):
    sc = SubjectContent.query.get(conteudo_id)
    if not sc:
        return jsonify({"error": "Conteúdo não encontrado"}), 404

    content_html = sc.content_html or ""
    prompt = (
        "Gere 8 perguntas de múltipla escolha sobre o seguinte conteúdo, com 4 opções cada e destaque a correta e forneça uma explicação curta para cada resposta correta. "
        "Responda no formato JSON: [{question, options:[], answer}]\n\n"
        f"{content_html}"
        "Ao final, forneça também um feedback geral sobre o desempenho do aluno, considerando as respostas dadas (você receberá as respostas do aluno depois), apontando pontos fortes e o que ele pode melhorar para dominar o conteúdo."
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        text_resp = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        match = re.search(r"```json\s*(.*?)\s*```", text_resp, re.DOTALL)
        json_str = match.group(1) if match else text_resp
        try:
            questions = json.loads(json_str)
        except Exception:
            questions = []
        return jsonify({"questions": questions})
    except Exception as e:
        return jsonify({"error": "Erro ao gerar quiz", "details": str(e)}), 500

# --- Gemini: Feynman Feedback ---
@app.route('/api/gemini_feynman', methods=['POST'])
def gemini_feynman():
    data = request.get_json()
    texto = data.get("texto", "")
    conteudo = data.get("conteudo", "")
    prompt = (
        f'O estudante explicou o conteúdo assim: "{texto}"\n'
        f'O conteúdo original é: "{conteudo}"\n'
        "Dê um feedback construtivo, aponte acertos e pontos a melhorar."
    )
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    if not GEMINI_API_KEY:
        return jsonify({"error": "GEMINI_API_KEY ausente."}), 503
    try:
        response = requests.post(url, json=payload, timeout=20)
        response.raise_for_status()
        feedback = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        return jsonify({"feedback": feedback})
    except Exception as e:
        logging.exception("/api/feynman_feedback error")
        return jsonify({"error": "Erro ao gerar feedback", "details": str(e)}), 502

# --- Gemini: Quiz Feedback ---
@app.route('/api/quiz_feedback', methods=['POST'])
def quiz_feedback():
    data = request.get_json()
    questions = data.get("questions", [])
    answers = data.get("answers", [])
    conteudo = data.get("conteudo", "")

    respostas = []
    for i, q in enumerate(questions):
        resposta_aluno = answers[i] if i < len(answers) else None
        respostas.append({
            "pergunta": q.get("question"),
            "resposta_correta": q.get("answer"),
            "resposta_aluno": resposta_aluno,
            "explicacao": q.get("explanation", "")
        })

    prompt = (
        "Considere o seguinte conteúdo estudado:\n"
        f"{conteudo}\n\n"
        "Aqui estão as perguntas do quiz, a resposta correta e a resposta do aluno:\n"
        f"{respostas}\n\n"
        "Com base nisso, forneça um feedback geral sobre o desempenho do aluno, destacando acertos, erros, pontos fortes e o que ele pode melhorar para dominar o conteúdo."
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    if not GEMINI_API_KEY:
        return jsonify({"error": "GEMINI_API_KEY ausente."}), 503
    try:
        response = requests.post(url, json=payload, timeout=25)
        response.raise_for_status()
        feedback = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        return jsonify({"feedback": feedback})
    except Exception as e:
        logging.exception("/api/quiz_feedback error")
        return jsonify({"error": "Erro ao gerar feedback do quiz", "details": str(e)}), 502

# --- Gemini: Mapa Mental ---
@app.route('/api/generate_mindmap', methods=['POST'])
def generate_mindmap():
    try:
        data = request.get_json(force=True)

        content = (data.get("content") or "").strip()
        topic = (data.get("topic") or "").strip()

        if not content or not topic:
            return jsonify({"error": "Campos 'content' e 'topic' são obrigatórios."}), 400

        prompt = f"""
Leia o texto abaixo e gere um mapa mental em JSON, agrupando subtópicos por afinidade.
Cada subtópico deve ser apenas uma palavra ou expressão curta (máximo 4 palavras, nunca frases longas ou parágrafos).
Formato de resposta:
{{
  "topic": "{topic}",
  "related_topics": ["Operações", "Propriedades", "Fórmulas", "Representação"],
  "subtopics": {{
    "Operações": ["União", "Interseção", "Diferença", "Complementar"],
    "Propriedades": ["Comutativa", "Associativa", "Distributiva"],
    "Fórmulas": ["Inclusão-Exclusão", "Conjuntos Disjuntos"],
    "Representação": ["Diagramas de Venn", "Extensão"]
  }}
}}
Apenas arrays de strings curtas, sem objetos aninhados, sem frases longas, sem explicações.
"""

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        response = requests.post(url, json=payload)
        response.raise_for_status()

        response_text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        match = re.search(r"\{[\s\S]+\}", response_text)
        if not match:
            return jsonify({"error": "Resposta da IA não contém JSON válido."}), 500

        mindmap = json.loads(match.group(0))

        # Sanitiza os subtópicos
        def is_short_term(s):
            return (
                isinstance(s, str)
                and 2 < len(s) < 40
                and len(s.split()) <= 4
                and not any(p in s for p in ".!?;:,")
                and not s.lower().startswith(("resumo", "conclusão", "em resumo", "em síntese", "em suma"))
            )

        for key, items in (mindmap.get("subtopics") or {}).items():
            mindmap["subtopics"][key] = [str(s).strip() for s in items if is_short_term(s)]

        return jsonify(mindmap)

    except requests.exceptions.RequestException as req_err:
        return jsonify({"error": "Erro na comunicação com a API Gemini", "details": str(req_err)}), 502
    except json.JSONDecodeError:
        return jsonify({"error": "Falha ao decodificar JSON da resposta da IA"}), 500
    except Exception as e:
        return jsonify({"error": "Erro interno no servidor", "details": str(e)}), 500

# --- Planos de estudo ---
@app.route('/api/planos', methods=['GET', 'POST'])
def planos():
    email = request.args.get('email') if request.method == 'GET' else (request.json or {}).get('email')
    if not email:
        return jsonify({'error': 'Email é obrigatório'}), 400
    if request.method == 'GET':
        plano = PlanoEstudo.query.filter_by(email=email).first()
        return jsonify({'plano': plano.dados if plano else []})
    else:
        dados = (request.json or {}).get('plano')
        if dados is None:
            return jsonify({'error': 'Campo "plano" é obrigatório'}), 400
        plano = PlanoEstudo.query.filter_by(email=email).first()
        if plano:
            plano.dados = dados
        else:
            plano = PlanoEstudo(email=email, dados=dados)
            db.session.add(plano)
        db.session.commit()
        return jsonify({'ok': True})

# --- Gemini: Cronograma de Estudos ---
@app.route('/api/gemini', methods=['POST'])
def gemini():
    data = request.json or {}
    materias = data.get('materias', [])
    dias = data.get('dias', [])
    horarios = data.get('horarios', [])

    prompt = (
        "Você é um assistente educacional. Gere um cronograma de estudos semanal personalizado para o estudante, "
        "usando as matérias e conteúdos abaixo. Distribua os conteúdos ao longo dos dias e horários disponíveis, "
        "sem repetir conteúdos, e balanceando as matérias. Responda em JSON, no formato:\n"
        '[{"dia": "Segunda", "horario": "09:00", "materia": "Matemática", "conteudo": "Funções Quadráticas"}, ...]\n\n'
        "Matérias e conteúdos:\n"
    )
    for m in materias:
        conteudos_validos = [
            f"{c['subject']}: {c['topic']}"
            for c in (m.get('conteudos') or [])
            if isinstance(c, dict) and c.get('subject') and c.get('topic')
        ]
        if conteudos_validos:
            prompt += f"- {m.get('materia')}: {', '.join(conteudos_validos)}\n"
    prompt += f"\nDias disponíveis: {', '.join(dias)}\n"
    prompt += f"Horários disponíveis: {', '.join(horarios)}\n"
    prompt += "Não escreva nada além do JSON."

    try:
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        response = requests.post(GEMINI_API_URL, json=payload)
        response.raise_for_status()
        text_resp = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        return jsonify({"resultado": text_resp})
    except Exception as e:
        return jsonify({"erro": str(e), "prompt": prompt}), 500

# --- Upload/Download Avatar ---
@app.route('/api/usuarios/avatar', methods=['POST'])
def upload_avatar():
    email = request.form.get('email')
    avatar = request.files.get('avatar')

    if not email or not avatar:
        return jsonify({"error": "Email e arquivo de avatar são obrigatórios."}), 400

    filename = secure_filename(f"{email}_{avatar.filename}")
    avatar_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    avatar.save(avatar_path)

    avatar_url = f"/uploads/{filename}"

    try:
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"error": "Usuário não encontrado"}), 404
        user.avatar_url = avatar_url
        db.session.commit()
        return jsonify({"avatarUrl": avatar_url})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/usuarios/avatar', methods=['GET'])
def get_avatar():
    email = request.args.get('email')
    if not email:
        return jsonify({"avatarUrl": ""})
    try:
        user = User.query.filter_by(email=email).first()
        return jsonify({"avatarUrl": user.avatar_url if user and user.avatar_url else ""})
    except Exception:
        return jsonify({"avatarUrl": ""}), 500

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Endpoint esperado pela HomePage: retorna estrutura com materias e achievements
@app.route('/api/progresso', methods=['GET'])
def progresso_dashboard_stub():
    try:
        user = None
        try:
            if current_user and getattr(current_user, 'is_authenticated', False):
                user = current_user
        except Exception:
            pass
        return jsonify({
            "materias": [],
            "achievements": [],
            "xp": 0,
            "streak": 0,
            "newAchievement": False
        })
    except Exception as e:
        return jsonify({"materias": [], "achievements": [], "error": str(e)})

@app.route('/api/progress')
def get_progress():
    email = request.args.get('email')
    if not email:
        return jsonify({"progress": 0})
    return jsonify({"progress": 0})

# Onboarding
@app.route("/api/user/onboarding", methods=["PATCH"])
@login_required
def complete_onboarding():
    user = User.query.get(current_user.id)
    if not user:
        return jsonify({"error": "Usuário não encontrado"}), 404
    user.has_onboarding = True
    db.session.commit()
    return jsonify({"message": "Onboarding concluído!"})

# Legacy aliases to align endpoints
@app.route('/api/login', methods=['POST'])
def legacy_login_alias():
    # Delegate to /api/auth/login ensuring identical behavior
    return auth_login()

# Alias de usuário atual usado pelo frontend
@app.route('/api/users/me', methods=['GET'])
def users_me():
    try:
        if not (current_user and getattr(current_user, 'is_authenticated', False)):
            return jsonify({"error": "Unauthorized"}), 401
        return jsonify({
            "id": current_user.id,
            "email": current_user.email,
            "nome": getattr(current_user, 'nome', None) or (current_user.email or '').split('@')[0],
            "avatar_url": getattr(current_user, 'avatar_url', None),
            "xp": getattr(current_user, 'xp', 0),
            "streak": getattr(current_user, 'streak', 0),
        })
    except Exception:
        return jsonify({"error": "Unauthorized"}), 401

# Alias extra para compatibilidade
@app.route('/api/user/me', methods=['GET'])
def user_me_alias():
    return users_me()

# --- YouTube helper: prune persistent cache ---
def _prune_youtube_cache(max_rows: int = _YT_CACHE_MAX_ROWS):
    try:
        total = db.session.query(YouTubeCache.id).count()
        excess = max(0, total - int(max_rows))
        if excess > 0:
            ids = [rid for (rid,) in db.session.query(YouTubeCache.id)
                   .order_by(YouTubeCache.created_at.asc())
                   .limit(excess)
                   .all()]
            if ids:
                db.session.query(YouTubeCache).filter(YouTubeCache.id.in_(ids)).delete(synchronize_session=False)
                db.session.commit()
    except Exception:
        db.session.rollback()

def _refresh_yt_cache_async(query: str, max_results: int):
    """Atualiza o cache do YouTube em background sem bloquear a resposta."""
    try:
        api_key = os.getenv('YT_API_KEY') or YT_API_KEY
        if not api_key or not query:
            return
        resp = requests.get(
            'https://www.googleapis.com/youtube/v3/search',
            params={
                'key': api_key,
                'part': 'snippet',
                'type': 'video',
                'q': query,
                'maxResults': max_results,
                'safeSearch': 'moderate'
            }, timeout=4
        )
        resp.raise_for_status()
        data = resp.json()
        items = data.get('items', [])
        videos = []
        for it in items:
            vid = (it.get('id') or {}).get('videoId')
            sn = it.get('snippet') or {}
            if not vid:
                continue
            videos.append({
                'id': vid,
                'title': sn.get('title'),
                'channelTitle': sn.get('channelTitle'),
                'thumbnail': ((sn.get('thumbnails') or {}).get('medium') or {}).get('url')
                    or ((sn.get('thumbnails') or {}).get('default') or {}).get('url')
            })
        now = time.time()
        cache_key = f"{query}|{max_results}"
        _YT_CACHE[cache_key] = (now, videos)
        try:
            db.session.add(YouTubeCache(query=query, max_results=max_results, results=videos))
            db.session.commit()
            _prune_youtube_cache(_YT_CACHE_MAX_ROWS)
        except Exception:
            db.session.rollback()
    except Exception:
        pass

# --- YouTube API ---
@app.route('/api/videos', methods=['GET'])
@limiter.limit(_lmts_burst)
def get_videos():
    """Busca vídeos no YouTube com cache em memória e persistente.
    Parâmetros: q (query), maxResults (padrão 6)
    Retorno: { videos: [ { id, title, channelTitle, thumbnail } ] }
    """
    query = request.args.get('q') or request.args.get('query') or ''
    max_results = request.args.get('maxResults') or 6
    try:
        max_results = int(max_results)
    except Exception:
        max_results = 6

    if not query:
        return jsonify({"videos": []})

    api_key = os.getenv('YT_API_KEY') or YT_API_KEY
    if not api_key:
        return jsonify({"videos": [], "error": "YT_API_KEY não configurada"}), 200

    # Cache lookup (in-memory hot cache)
    cache_key = f"{query}|{max_results}"
    now = time.time()
    cached = _YT_CACHE.get(cache_key)
    if cached:
        ts, vids = cached
        if now - ts < _YT_CACHE_TTL:
            resp = jsonify({"videos": vids})
            resp.headers["Cache-Control"] = "public, max-age=300"
            return resp
        else:
            _YT_CACHE.pop(cache_key, None)

    # Persistent cache lookup
    try:
        row = YouTubeCache.query.filter_by(query=query, max_results=max_results) \
            .order_by(YouTubeCache.created_at.desc()).first()
        if row:
            # Se cache persistente existe mas pode estar expirado, devolve "stale" e atualiza em background
            threading.Thread(target=_refresh_yt_cache_async, args=(query, max_results), daemon=True).start()
            _YT_CACHE[cache_key] = (now, row.results)
            resp = jsonify({"videos": row.results})
            resp.headers["Cache-Control"] = "public, max-age=300"
            return resp
    except Exception:
        pass

    # Fetch from YouTube
    try:
        resp = requests.get(
            'https://www.googleapis.com/youtube/v3/search',
            params={
                'key': api_key,
                'part': 'snippet',
                'type': 'video',
                'q': query.strip()[:160],
                'maxResults': max_results,
                'safeSearch': 'moderate'
            }, timeout=4  # reduzido
        )
        resp.raise_for_status()
        data = resp.json()
        items = data.get('items', [])
        videos = []
        for it in items:
            vid = (it.get('id') or {}).get('videoId')
            sn = it.get('snippet') or {}
            if not vid:
                continue
            videos.append({
                'id': vid,
                'title': sn.get('title'),
                'channelTitle': sn.get('channelTitle'),
                'thumbnail': ((sn.get('thumbnails') or {}).get('medium') or {}).get('url')
                    or ((sn.get('thumbnails') or {}).get('default') or {}).get('url')
            })
        # Store in caches
        _YT_CACHE[cache_key] = (now, videos)
        try:
            db.session.add(YouTubeCache(query=query, max_results=max_results, results=videos))
            db.session.commit()
            _prune_youtube_cache(_YT_CACHE_MAX_ROWS)
        except Exception:
            db.session.rollback()
        out = jsonify({"videos": videos})
        out.headers["Cache-Control"] = "public, max-age=300"
        return out
    except Exception as e:
        # Fallback simples: retorna lista vazia, sem quebrar UI
        return jsonify({"videos": [], "error": str(e)}), 200

@app.route('/api/videos/cache/stats', methods=['GET'])
def yt_cache_stats():
    try:
        # Persistent total
        total = db.session.query(YouTubeCache.id).count()
    except Exception:
        total = None
    # Memory cache size and keys (redacted)
    mem_size = len(_YT_CACHE)
    ttl = _YT_CACHE_TTL
    max_rows = _YT_CACHE_MAX_ROWS
    return jsonify({
        'memory_cache_entries': mem_size,
        'persistent_total': total,
        'ttl_seconds': ttl,
        'max_rows': max_rows,
    })

@app.route('/api/videos/cache/purge', methods=['POST'])
def yt_cache_purge():
    try:
        body = request.get_json(force=True) or {}
    except Exception:
        body = {}
    clear_memory = bool(body.get('clear_memory'))
    purged = 0
    if clear_memory:
        _YT_CACHE.clear()
    # Purge expired from persistent cache
    try:
        cutoff = datetime.utcnow() - timedelta(seconds=_YT_CACHE_TTL)
        ids = [rid for (rid,) in db.session.query(YouTubeCache.id)
               .filter(YouTubeCache.created_at < cutoff)
               .all()]
        if ids:
            db.session.query(YouTubeCache).filter(YouTubeCache.id.in_(ids)).delete(synchronize_session=False)
            db.session.commit()
            purged = len(ids)
    except Exception:
        db.session.rollback()
    try:
        total = db.session.query(YouTubeCache.id).count()
    except Exception:
        total = None
    return jsonify({'ok': True, 'cleared_memory': clear_memory, 'purged_rows': purged, 'persistent_total': total})

@app.route('/api/videos/batch', methods=['POST'])
@limiter.limit(_lmts_burst)
def get_videos_batch():
    """Busca múltiplas listas de vídeos por diferentes queries em uma única chamada.
    Body: { queries: [{ key: string, q: string, maxResults?: number }] }
    Resposta: { results: { [key: string]: Array<{ id, title, channelTitle, thumbnail }> }, errors?: { [key: string]: string } }
    """
    try:
        payload = request.get_json(force=True) or {}
    except Exception:
        payload = {}
    queries = payload.get('queries') or []

    if not isinstance(queries, list):
        return jsonify({"results": {}, "errors": {"_": "Formato inválido"}}), 400

    MAX_QUERIES = 12
    results: dict[str, list] = {}
    errors: dict[str, str] = {}

    api_key = os.getenv('YT_API_KEY') or YT_API_KEY
    if not api_key:
        for item in queries[:MAX_QUERIES]:
            k = (item or {}).get('key') or ''
            if k:
                results[k] = []
                errors[k] = 'YT_API_KEY não configurada'
        return jsonify({"results": results, "errors": errors}), 200

    now = time.time()

    for item in queries[:MAX_QUERIES]:
        try:
            k = (item or {}).get('key') or ''
            q = (item or {}).get('q') or ''
            max_results = int((item or {}).get('maxResults') or 3)
            if not k:
                continue
            if not q:
                results[k] = []
                continue

            q = q.strip()[:160]
            max_results = max(1, min(max_results, 6))

            cache_key = f"{q}|{max_results}"
            cached = _YT_CACHE.get(cache_key)
            if cached and now - cached[0] < _YT_CACHE_TTL:
                results[k] = cached[1]
                continue

            try:
                row = YouTubeCache.query.filter_by(query=q, max_results=max_results) \
                    .order_by(YouTubeCache.created_at.desc()).first()
                if row:
                    _YT_CACHE[cache_key] = (now, row.results)
                    results[k] = row.results
                    threading.Thread(target=_refresh_yt_cache_async, args=(q, max_results), daemon=True).start()
                    continue
            except Exception:
                pass

            resp = requests.get(
                'https://www.googleapis.com/youtube/v3/search',
                params={
                    'key': api_key,
                    'part': 'snippet',
                    'type': 'video',
                    'q': q,
                    'maxResults': max_results,
                    'safeSearch': 'moderate'
                }, timeout=4
            )
            resp.raise_for_status()
            data = resp.json()
            items = data.get('items', [])
            videos = []
            for it in items:
                vid = (it.get('id') or {}).get('videoId')
                sn = it.get('snippet') or {}
                if not vid:
                    continue
                videos.append({
                    'id': vid,
                    'title': sn.get('title'),
                    'channelTitle': sn.get('channelTitle'),
                    'thumbnail': ((sn.get('thumbnails') or {}).get('medium') or {}).get('url')
                        or ((sn.get('thumbnails') or {}).get('default') or {}).get('url')
                })
            results[k] = videos
            _YT_CACHE[cache_key] = (now, videos)
            try:
                db.session.add(YouTubeCache(query=q, max_results=max_results, results=videos))
                db.session.commit()
                _prune_youtube_cache(_YT_CACHE_MAX_ROWS)
            except Exception:
                db.session.rollback()
        except Exception as e:
            key = (item or {}).get('key') or ''
            if key:
                errors[key] = str(e)
                results[key] = []

    resp_body = {"results": results}
    if errors:
        resp_body["errors"] = errors
    return jsonify(resp_body), 200

# --- Error handlers ---
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Recurso não encontrado"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Erro interno do servidor"}), 500

if __name__ == "__main__":
    # Executa o app Flask apenas se chamado diretamente
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)

