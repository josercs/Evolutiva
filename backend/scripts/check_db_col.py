#!/usr/bin/env python3
import os
import sys
from urllib.parse import urlparse

def build_db_uri() -> str:
    uri = os.getenv('SQLALCHEMY_DATABASE_URI')
    if uri:
        return uri
    # Build from DB_* like the app/alembic do
    user = os.getenv('DB_USERNAME') or os.getenv('DB_USER') or os.getenv('POSTGRES_USER', 'postgres')
    pwd = os.getenv('DB_PASSWORD') or os.getenv('POSTGRES_PASSWORD', 'postgres')
    host = os.getenv('DB_HOST', 'localhost')
    # If running inside Docker and pointing to localhost, map to host.docker.internal
    try:
        if os.path.exists('/.dockerenv') and host in {'127.0.0.1', 'localhost'}:
            host = 'host.docker.internal'
    except Exception:
        pass
    port = os.getenv('DB_PORT', '5432')
    db = os.getenv('DB_NAME') or os.getenv('POSTGRES_DB', 'postgres')
    return f'postgresql+psycopg2://{user}:{pwd}@{host}:{port}/{db}'

def main() -> int:
    uri = build_db_uri()
    if not uri.startswith('postgresql'):
        print(f"[check_db_col] Unexpected DB URI (not Postgres): {uri}")
        return 2
    try:
        import sqlalchemy as sa
        eng = sa.create_engine(uri)
        with eng.begin() as cxn:
            row = cxn.execute(sa.text(
                """
                SELECT data_type, udt_name
                FROM information_schema.columns
                WHERE table_schema = COALESCE(current_schema(), 'public')
                  AND table_name = 'users'
                  AND column_name = 'dias_disponiveis'
                """
            )).first()
            print('[check_db_col] users.dias_disponiveis ->', row)
    except Exception as e:
        print('[check_db_col] Error:', repr(e))
        return 1
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
