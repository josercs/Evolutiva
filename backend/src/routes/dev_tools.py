import os
import json
import subprocess
from flask import Blueprint, jsonify, current_app
from sqlalchemy import text

dev_tools_bp = Blueprint('dev_tools', __name__)


def _safe_env(name: str, default: str = "") -> str:
    v = os.getenv(name, default)
    if name.lower().endswith('password'):
        return '***'
    return v


@dev_tools_bp.route('/api/dev/db-info', methods=['GET'])
def db_info():
    # Minimal introspection to help diagnose DB wiring and column types.
    try:
        eng = current_app.extensions['sqlalchemy'].db.engine  # type: ignore
        with eng.connect() as c:
            row = c.execute(text(
                """
                SELECT data_type, udt_name
                FROM information_schema.columns
                WHERE table_schema = COALESCE(current_schema(), 'public')
                  AND table_name = 'users'
                  AND column_name = 'dias_disponiveis'
                """
            )).first()
            col = tuple(row) if row else None
    except Exception as e:
        return jsonify({"ok": False, "error": repr(e)}), 500

    info = {
        "ok": True,
        "env": {
            "DB_HOST": _safe_env('DB_HOST'),
            "DB_PORT": _safe_env('DB_PORT'),
            "DB_NAME": _safe_env('DB_NAME') or _safe_env('POSTGRES_DB'),
            "DB_USER": _safe_env('DB_USERNAME') or _safe_env('DB_USER') or _safe_env('POSTGRES_USER'),
            "USE_SQLITE": os.getenv('USE_SQLITE', 'false'),
        },
        "column_users_dias_disponiveis": col,
    }
    return jsonify(info)


@dev_tools_bp.route('/api/dev/migrate', methods=['POST'])
def dev_migrate():
    # Fire-and-forget alembic upgrade head; return stdout/stderr for inspection.
    # Note: This endpoint is intended for development only.
    try:
        proc = subprocess.run(['alembic', 'upgrade', 'head'], capture_output=True, text=True, check=False)
        out = proc.stdout.strip()
        err = proc.stderr.strip()
        return jsonify({"returncode": proc.returncode, "stdout": out, "stderr": err})
    except Exception as e:
        return jsonify({"error": repr(e)}), 500
