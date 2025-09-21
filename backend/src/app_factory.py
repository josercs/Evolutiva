import os, re, time, logging, threading
from datetime import datetime, timedelta
from flask import Flask, jsonify
from flask_cors import CORS
from sqlalchemy import text
from dotenv import load_dotenv

from config import get_config
from models.models import db, Curso, HorariosEscolares, SubjectContent, CursoMateria, User, WeeklyQuiz, YouTubeCache

try:
    from flask_limiter import Limiter  # type: ignore
    from flask_limiter.util import get_remote_address  # type: ignore
except Exception:  # pragma: no cover
    Limiter = None  # type: ignore
    def get_remote_address():  # type: ignore
        return None

from flask_login import LoginManager, current_user

login_manager = LoginManager()
_scheduler_timer = None
_scheduler_started = False

_YT_CACHE: dict[str, tuple[float, list[dict]]] = {}
_YT_CACHE_TTL = 600
_YT_CACHE_MAX_ROWS = 2000

_DEF_ORIGINS = [
    "http://localhost:5173","http://127.0.0.1:5173",
    "http://localhost:5174","http://127.0.0.1:5174",
]

_APP_START_TS = time.time()


def create_app():
    load_dotenv()
    cfg = get_config()

    logging.basicConfig(level=getattr(logging, cfg.LOG_LEVEL.upper(), logging.INFO))

    app = Flask(__name__)
    app.config.from_object(cfg)

    # DB URI resolution (SQLite fallback)
    if cfg.USE_SQLITE:
        app.config['SQLALCHEMY_DATABASE_URI'] = app.config.get('SQLALCHEMY_DATABASE_URI') or f"sqlite:///{os.path.join(os.path.dirname(__file__), 'dev.db')}"
    else:
        if not app.config.get('SQLALCHEMY_DATABASE_URI'):
            db_user = os.getenv('DB_USERNAME', 'postgres')
            db_pass = os.getenv('DB_PASSWORD', '1234')
            db_host = os.getenv('DB_HOST', 'localhost')
            db_port = os.getenv('DB_PORT', '5432')
            db_name = os.getenv('DB_NAME', 'sistema_estudos')
            app.config['SQLALCHEMY_DATABASE_URI'] = f'postgresql+psycopg2://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}'

    db.init_app(app)

    with app.app_context():
        try:
            if os.getenv('AUTO_DDL_ON_START','1').lower() in {'1','true','yes'}:
                db.create_all()
        except Exception as e:
            logging.warning(f"Falha ao criar tabelas: {e}")

    # CORS
    origins_env = os.getenv('FRONTEND_ORIGINS')
    if origins_env:
        origins = [o.strip() for o in origins_env.split(',') if o.strip()]
    else:
        origins = _DEF_ORIGINS
    CORS(app, supports_credentials=True, resources={r"/*": {"origins": origins}})

    # Rate Limiter
    lmts_default = os.getenv('YT_RATE_LIMIT', '60 per hour')
    lmts_burst = os.getenv('YT_RATE_BURST', '10 per minute')
    if 'Limiter' in globals() and Limiter is not None:
        limiter = Limiter(get_remote_address, app=app, default_limits=[lmts_default])
    else:
        class _NoopLimiter:
            def limit(self, *a, **k):
                def _d(f): return f
                return _d
        limiter = _NoopLimiter()
    app.limiter = limiter  # type: ignore
    app.limits_burst = lmts_burst  # type: ignore

    # Login
    login_manager.init_app(app)

    @login_manager.unauthorized_handler
    def _unauth():
        return jsonify({"error": "Unauthorized"}), 401

    @login_manager.user_loader
    def load_user(uid):
        try:
            return db.session.get(User, int(uid))
        except Exception:
            return None

    # Register existing blueprints
    from routes.auth_routes import auth_bp
    from routes.user_routes import user_bp, users_bp
    from routes.agendas import agendas_bp
    from routes.habitos import habitos_bp
    from routes.content_routes import content_bp
    from routes.progress_routes import progress_bp
    from routes.course_routes import course_bp
    from routes.onboarding_routes import onboarding_bp
    from routes.quiz_gen_routes import bp_quiz_gen
    from routes import v1_bp

    for bp in (auth_bp, user_bp, users_bp, agendas_bp, habitos_bp, content_bp, progress_bp, course_bp, onboarding_bp, bp_quiz_gen, v1_bp):
        try:
            app.register_blueprint(bp)
        except Exception as e:
            logging.warning(f"Falha ao registrar blueprint {getattr(bp,'name',bp)}: {e}")

    # Simple health legacy
    @app.route('/api/health')
    def legacy_health():
        try:
            db.session.execute(text('SELECT 1'))
            db_ok = True
        except Exception:
            db_ok = False
        return jsonify({
            'status':'online',
            'message':'API do Sistema de Estudos está funcionando!',
            'uptime_seconds': int(time.time() - _APP_START_TS),
            'db_ok': db_ok
        })

    # Index
    @app.route('/')
    def index():
        return jsonify({'message':'API do Sistema de Estudos'})

    return app
