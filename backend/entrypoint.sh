#!/usr/bin/env bash
set -euo pipefail

echo "[entrypoint] Starting container (ENV=${FLASK_ENV:-unknown})"

# Wait for DB if URL looks like postgres and host:port reachable attempt
if [[ "${SQLALCHEMY_DATABASE_URI:-}" == postgresql* ]]; then
  echo "[entrypoint] Waiting for database..."
  MAX_ATTEMPTS=30
  ATTEMPT=1
  until python - <<'PYCODE'
import os,sys
from urllib.parse import urlparse
import psycopg2
uri=os.getenv('SQLALCHEMY_DATABASE_URI')
if not uri:
    sys.exit(1)
parts=urlparse(uri)
try:
    conn=psycopg2.connect(dbname=parts.path.lstrip('/'), user=parts.username, password=parts.password, host=parts.hostname, port=parts.port or 5432, connect_timeout=3)
    conn.close()
    sys.exit(0)
except Exception as e:
    sys.exit(2)
PYCODE
  do
    if [[ $ATTEMPT -ge $MAX_ATTEMPTS ]]; then
      echo "[entrypoint] Database not reachable after $MAX_ATTEMPTS attempts" >&2
      break
    fi
    sleep 2
    ATTEMPT=$((ATTEMPT+1))
  done
fi

if [[ "${RUN_MIGRATIONS:-1}" == "1" ]]; then
  echo "[entrypoint] Running Alembic migrations..."
# As a safety net: if database has no core tables (e.g., fresh DB, baseline only), create schema once.
if [[ "${SQLALCHEMY_DATABASE_URI:-}" == postgresql* ]]; then
  MISSING_USERS=$(python - <<'PYCODE'
import os
import psycopg2
from urllib.parse import urlparse
try:
    uri=os.getenv('SQLALCHEMY_DATABASE_URI'); p=urlparse(uri)
    conn=psycopg2.connect(dbname=p.path.lstrip('/'), user=p.username, password=p.password, host=p.hostname, port=p.port or 5432)
    cur=conn.cursor(); cur.execute("SELECT to_regclass('public.users') IS NULL")
    missing = cur.fetchone()[0]
    cur.close(); conn.close()
    print('YES' if missing else 'NO')
except Exception:
    print('UNKNOWN')
PYCODE
  )
  if [[ "$MISSING_USERS" == "YES" ]]; then
    echo "[entrypoint] Core table 'users' missing — bootstrapping schema via create_all() (one-time)."
    python - <<'PYCODE'
import logging
from app_factory import create_app
from models.models import db
app = create_app()
with app.app_context():
    try:
        db.create_all()
        print('[entrypoint] db.create_all completed')
    except Exception as e:
        logging.exception('create_all failed: %s', e)
        raise
PYCODE
  fi
fi

  if command -v alembic >/dev/null 2>&1; then
    # Detect if alembic_version table exists; if not, we may need to stamp baseline safely
    NEED_STAMP=0
    if [[ "${SQLALCHEMY_DATABASE_URI:-}" == postgresql* ]]; then
      TABLE_CHECK=$(python - <<'PYCODE'
import os,sys
import psycopg2
from urllib.parse import urlparse
uri=os.getenv('SQLALCHEMY_DATABASE_URI')
if not uri:
    sys.exit(0)
p=urlparse(uri)
conn=psycopg2.connect(dbname=p.path.lstrip('/'), user=p.username, password=p.password, host=p.hostname, port=p.port or 5432)
cur=conn.cursor()
cur.execute("SELECT 1 FROM information_schema.tables WHERE table_name='alembic_version'")
print('YES' if cur.fetchone() else 'NO')
cur.close(); conn.close()
PYCODE
      )
      if [[ "$TABLE_CHECK" == "NO" ]]; then
        NEED_STAMP=1
      fi
    fi
    if alembic upgrade head; then
      echo "[entrypoint] Alembic upgrade head OK"
    else
      echo "[entrypoint] Alembic upgrade failed (will attempt fallback)" >&2
      # If current shows FAILED or version table is empty, we'll stamp
      CURRENT_OUTPUT=$(alembic current 2>&1 || true)
      if echo "$CURRENT_OUTPUT" | grep -qi "FAILED"; then
        echo "[entrypoint] alembic current shows FAILED head"; NEED_STAMP=1
      fi
      if [[ "${SQLALCHEMY_DATABASE_URI:-}" == postgresql* ]]; then
        ROWS=$(python - <<'PYCODE'
import os,sys
import psycopg2
from urllib.parse import urlparse
try:
    uri=os.getenv('SQLALCHEMY_DATABASE_URI')
    p=urlparse(uri)
    conn=psycopg2.connect(dbname=p.path.lstrip('/'), user=p.username, password=p.password, host=p.hostname, port=p.port or 5432)
    cur=conn.cursor()
    cur.execute("SELECT count(*) FROM information_schema.tables WHERE table_name='alembic_version'")
    exists = cur.fetchone()[0] > 0
    if exists:
        try:
            cur.execute("SELECT count(*) FROM alembic_version")
            cnt = cur.fetchone()[0]
        except Exception:
            cnt = 0
    else:
        cnt = -1
    cur.close(); conn.close()
    print(cnt)
except Exception:
    print(-2)
PYCODE
        )
        if [[ "$ROWS" == "0" || "$ROWS" == "-1" || "$ROWS" == "-2" ]]; then
          echo "[entrypoint] alembic_version absent/empty; will stamp head"; NEED_STAMP=1
        fi
      fi
      if [[ $NEED_STAMP -eq 1 ]]; then
        echo "[entrypoint] Applying baseline stamp head (non-destructive)"
        if alembic stamp head; then
          echo "[entrypoint] Baseline stamp applied; proceeding"
        else
          echo "[entrypoint] Baseline stamp failed" >&2
          exit 1
        fi
      else
        echo "[entrypoint] Proceeding without stamp (non-fatal)."
      fi
    fi
  else
    echo "[entrypoint] Alembic not installed? Skipping." >&2
  fi
else
  echo "[entrypoint] RUN_MIGRATIONS disabled (RUN_MIGRATIONS=${RUN_MIGRATIONS:-unset})"
fi

# Optional seed (only if SEED_ON_START=1 and script exists)
if [[ "${SEED_ON_START:-0}" == "1" && -f scripts/seed_data.py ]]; then
  echo "[entrypoint] Running seed script..."
  python scripts/seed_data.py || echo "[entrypoint] Seed script failed (non-fatal)" >&2
fi

CMD_EXEC=(gunicorn --chdir /app/src -w ${WORKERS:-3} -k gthread --threads ${THREADS:-4} -b 0.0.0.0:5000 main:app --timeout ${GUNICORN_TIMEOUT:-120} --graceful-timeout ${GRACEFUL_TIMEOUT:-30})

echo "[entrypoint] Exec: ${CMD_EXEC[*]}"
exec "${CMD_EXEC[@]}"
