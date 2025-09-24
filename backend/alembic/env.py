from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import os
import sys

# add src to path for models import
CURRENT_DIR = os.path.dirname(__file__)
BASE_DIR = os.path.abspath(os.path.join(CURRENT_DIR, '..', 'src'))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from models.models import db  # noqa: E402

config = context.config

# Interpret the config file for Python logging.
fileConfig(config.config_file_name)

def get_url():
    # Prefer explicit env var
    uri = os.getenv('SQLALCHEMY_DATABASE_URI')
    use_sqlite = os.getenv('USE_SQLITE', 'false').lower() in {'1','true','yes'}
    if uri:
        return uri
    if use_sqlite:
        return f"sqlite:///{os.path.join(BASE_DIR, 'dev.db')}"

    # Build Postgres URI from DB_* env like the app does
    db_user = os.getenv('DB_USERNAME') or os.getenv('DB_USER') or os.getenv('POSTGRES_USER', 'postgres')
    db_pass = os.getenv('DB_PASSWORD') or os.getenv('POSTGRES_PASSWORD', 'postgres')
    db_host = os.getenv('DB_HOST', 'localhost')
    # If running in Docker and DB_HOST points to localhost, redirect to host.docker.internal
    try:
        if os.path.exists('/.dockerenv') and db_host in {'127.0.0.1', 'localhost'}:
            db_host = 'host.docker.internal'
    except Exception:
        pass
    db_port = os.getenv('DB_PORT', '5432')
    db_name = os.getenv('DB_NAME') or os.getenv('POSTGRES_DB', 'postgres')
    return f"postgresql+psycopg2://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"

config.set_main_option('sqlalchemy.url', get_url())

target_metadata = db.metadata

def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True, dialect_opts={"paramstyle": "named"})

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix='sqlalchemy.',
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
