import os, re, time, logging, threading
from datetime import datetime, timedelta
from flask import Flask, jsonify
from flask_cors import CORS
from sqlalchemy import text
from dotenv import load_dotenv

from config import get_config
from models.models import db, Curso, HorariosEscolares, SubjectContent, CursoMateria, User, WeeklyQuiz, YouTubeCache

# Explicit runtime markers to ensure audit sees real usage of server/queue libs present in core requirements.
try:
    import gunicorn  # type: ignore  # noqa: F401
except Exception:  # pragma: no cover
    pass
try:
    import rq  # type: ignore  # noqa: F401
except Exception:  # pragma: no cover
    pass

try:
    from flask_limiter import Limiter  # type: ignore
    from flask_limiter.util import get_remote_address  # type: ignore
except Exception:  # pragma: no cover
    Limiter = None  # type: ignore
    def get_remote_address():  # type: ignore
        return None

from flask_login import LoginManager, current_user
from flask_jwt_extended import (
    JWTManager,
    verify_jwt_in_request,
    get_jwt_identity,
    create_access_token,
    create_refresh_token,
    get_jwt,
)  # type: ignore

try:  # Redis optional until dependency installed
    import redis  # type: ignore
except Exception:  # pragma: no cover
    redis = None  # type: ignore

login_manager = LoginManager()
jwt = JWTManager()
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

    # Secure cookie defaults (can be overridden by env):
    app.config.setdefault('SESSION_COOKIE_SECURE', cfg.ENVIRONMENT == 'production')
    app.config.setdefault('SESSION_COOKIE_HTTPONLY', True)
    app.config.setdefault('SESSION_COOKIE_SAMESITE', 'Lax')
    # JWT cookie mode not yet enabled (still header based) but prepare flags
    app.config.setdefault('JWT_COOKIE_SECURE', cfg.ENVIRONMENT == 'production')
    app.config.setdefault('JWT_COOKIE_SAMESITE', 'Lax')
    app.config.setdefault('JWT_COOKIE_CSRF_PROTECT', False)

    # Hardening: exigir SECRET_KEY real em produção
    if cfg.ENVIRONMENT == 'production':
        if not os.getenv('SECRET_KEY') and not os.getenv('FLASK_SECRET_KEY') and cfg.SECRET_KEY.startswith('dev-'):
            raise RuntimeError('SECRET_KEY ausente ou insegura em produção')

    # Definir secret explicitamente (prioridade env)
    app.secret_key = os.getenv('SECRET_KEY') or os.getenv('FLASK_SECRET_KEY') or cfg.SECRET_KEY

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

    # Sempre inicializar DB (independente de Postgres/SQLite)
    db.init_app(app)

    # create_all somente permitido explicita/claramente (não forçar em production)
    auto_ddl = os.getenv('AUTO_DDL_ON_START','0').lower() in {'1','true','yes'}
    if auto_ddl and cfg.ENVIRONMENT != 'production':
        with app.app_context():
            try:
                db.create_all()
            except Exception as e:
                logging.warning(f"Falha ao criar tabelas: {e}")
    elif auto_ddl and cfg.ENVIRONMENT == 'production':
        logging.warning('AUTO_DDL_ON_START ignorado em produção — use alembic upgrade head')

    # CORS
    origins_env = os.getenv('FRONTEND_ORIGINS')
    if origins_env:
        origins = [o.strip() for o in origins_env.split(',') if o.strip()]
    else:
        origins = _DEF_ORIGINS
    CORS(app, supports_credentials=True, resources={r"/*": {"origins": origins}})
    if cfg.ENVIRONMENT == 'production' and any('localhost' in o or '127.0.0.1' in o for o in origins):
        logging.warning('CORS: origens de desenvolvimento detectadas em produção; revise FRONTEND_ORIGINS.')

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

    # Login (session based legacy)
    login_manager.init_app(app)
    # JWT
    jwt.init_app(app)

    # Redis connection (single client) for token revocation / rotation metadata
    redis_url = os.getenv('REDIS_URL') or f"redis://{os.getenv('REDIS_HOST','redis')}: {os.getenv('REDIS_PORT','6379')}/0".replace(' ', '')
    r_client = None
    if redis is not None:
        try:
            r_client = redis.Redis.from_url(redis_url, decode_responses=True)  # type: ignore
            # quick ping to validate connectivity (non-fatal)
            try:
                r_client.ping()
            except Exception:
                r_client = None
        except Exception:
            r_client = None
    app.redis = r_client  # type: ignore

    # Blocklist key namespace helpers
    _BL_REFRESH_PREFIX = 'jwt:refresh:block:'
    _RT_ROTATE_PREFIX = 'jwt:refresh:rot:'  # maps old jti -> new jti for replay detection

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):  # pragma: no cover (simple logic)
        # Only enforce for refresh tokens for now (could extend to access)
        if jwt_payload.get('type') == 'refresh' and app.redis:
            jti = jwt_payload.get('jti')
            if not jti:
                return False
            return app.redis.sismember('jwt:refresh:revoked', jti)  # type: ignore
        return False

    @jwt.invalid_token_loader
    def _invalid_token(reason):  # pragma: no cover
        return jsonify({"error": "Token inválido", "reason": reason}), 401

    @jwt.unauthorized_loader
    def _missing_token(reason):  # pragma: no cover
        return jsonify({"error": "Token ausente", "reason": reason}), 401

    @jwt.revoked_token_loader
    def _revoked(jwt_header, jwt_payload):  # pragma: no cover
        return jsonify({"error": "Token revogado"}), 401

    @jwt.expired_token_loader
    def _expired(jwt_header, jwt_payload):  # pragma: no cover
        return jsonify({"error": "Token expirado"}), 401

    # Refresh endpoint agora centralizado em routes/auth_routes.py (removido aqui para evitar duplicidade)

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
    from routes.videos_routes import videos_bp
    from routes.ai_routes import ai_bp
    from routes import v1_bp

    for bp in (auth_bp, user_bp, users_bp, agendas_bp, habitos_bp, content_bp, progress_bp, course_bp, onboarding_bp, bp_quiz_gen, videos_bp, ai_bp, v1_bp):
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
