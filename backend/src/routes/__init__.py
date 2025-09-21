from flask import Blueprint, jsonify
import time, os

_START_TS = time.time()

v1_bp = Blueprint('v1', __name__, url_prefix='/api/v1')

@v1_bp.route('/health', methods=['GET'])
def v1_health():
	uptime = int(time.time() - _START_TS)
	env = os.getenv('APP_ENV') or os.getenv('FLASK_ENV', 'development')
	version = os.getenv('APP_VERSION', '0.1.0')
	db_ok = True
	from models.models import db as _db
	from sqlalchemy import text as _text
	try:
		_db.session.execute(_text('SELECT 1'))
	except Exception:
		db_ok = False
	return jsonify({
		'status': 'online',
		'version': version,
		'environment': env,
		'uptime_seconds': uptime,
		'db_ok': db_ok,
		'meta': {'service': 'evolutiva-api'}
	})

# Makes this directory a package and helps relative imports work reliably.
