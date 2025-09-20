Migration guide: converting users.dias_disponiveis to JSON/JSONB and running Alembic

Prerequisites
- Python environment with backend requirements installed
- Database URL configured via SQLALCHEMY_DATABASE_URI or DB_* envs
- For Postgres, ensure the role has ALTER TABLE permissions

Steps
1) Initialize env
- Ensure backend/src/.env has USE_SQLITE=false when targeting Postgres
- Export envs or create a .env at project root for your shell session

2) Create database (if first run)
- The app calls db.create_all() on startup, which is fine for dev
- For production, prefer Alembic migrations only

3) Run Alembic upgrade
- From backend/ run:
  alembic upgrade head

What the migration does
- On Postgres: ALTER TABLE users ALTER COLUMN dias_disponiveis TYPE JSONB USING dias_disponiveis::jsonb
- On SQLite: noop (column already JSON-compatible)

Backfill/compatibility
- Existing code now expects JSON in User.dias_disponiveis
- Frontend can send an array or object and backend will persist JSON as-is

Rollback
- Not recommended. A downgrade to TEXT is attempted in the migration for Postgres, but array semantics are lost.

Troubleshooting
- alembic not found: install with `pip install alembic`
- Permission denied: verify DB credentials
- Inconsistent metadata: ensure models match your production schema or generate proper migrations
