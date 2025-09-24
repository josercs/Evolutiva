import os
from models.models import db
from sqlalchemy import text

# Attempt to import psycopg2 optionally
try:
    import psycopg2  # type: ignore
except Exception:  # pragma: no cover
    psycopg2 = None

def get_db_connection():
    """Return a low-level DB connection if psycopg2 is available; otherwise
    fall back to SQLAlchemy engine raw connection. Supports SQLite fallback via env.
    """
    # If explicitly using SQLite, prefer SQLAlchemy engine
    use_sqlite = os.getenv('USE_SQLITE', 'false').lower() in {'1', 'true', 'yes'}
    if use_sqlite or psycopg2 is None:
        try:
            # Use SQLAlchemy engine, returns a context-managed connection object
            return db.engine.connect()
        except Exception as e:
            raise RuntimeError(f"Falha ao obter conexão via SQLAlchemy: {e}")

    # Default: Postgres via psycopg2
    # Choose default host depending on environment: 'db' in Docker, 'localhost' otherwise
    in_docker = os.path.exists('/.dockerenv') or os.getenv('DOCKER') == '1'
    # Prefer 'host.docker.internal' when running in Docker and env points to localhost
    env_host = os.getenv('DB_HOST')
    if in_docker and (env_host in {None, '', 'localhost', '127.0.0.1'}):
        default_host = 'host.docker.internal'
    else:
        default_host = 'db' if in_docker else 'localhost'
    return psycopg2.connect(
        dbname=os.getenv('DB_NAME', 'sistema_estudos'),
        user=os.getenv('DB_USERNAME', 'postgres'),
        password=os.getenv('DB_PASSWORD', '1234'),
        host=os.getenv('DB_HOST', default_host),
        port=os.getenv('DB_PORT', '5432')
    )

if __name__ == "__main__":
    try:
        conn = get_db_connection()
        try:
            # Try a simple query depending on connection type
            if hasattr(conn, 'execute'):
                # SQLAlchemy connection
                conn.execute(text('SELECT 1'))
            else:
                # psycopg2 connection
                with conn.cursor() as cur:
                    cur.execute('SELECT 1')
        finally:
            conn.close()
        print("Conexão OK")
    except Exception as e:
        print("Erro ao conectar:", e)
