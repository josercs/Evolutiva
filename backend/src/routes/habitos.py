from flask import Blueprint, request, jsonify
from flask_login import current_user
from datetime import datetime
from src.db import get_db_connection

habitos_bp = Blueprint('habitos', __name__, url_prefix='/api/habitos')

@habitos_bp.route('/checkin', methods=['POST'])
def registrar_checkin():
    hoje = datetime.utcnow().date()
    db = get_db_connection()
    db.habitos.update_one(
        {"user_id": current_user.id},
        {"$addToSet": {"dias_estudados": str(hoje)}},
        upsert=True
    )
    return jsonify({"msg": "Check-in registrado."}), 200