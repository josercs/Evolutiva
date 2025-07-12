from flask import Blueprint, request, jsonify
from flask_login import current_user
from src.db import get_db_connection

agendas_bp = Blueprint('agendas', __name__, url_prefix='/api/agendas')

@agendas_bp.route('/blocos', methods=['POST'])
def salvar_blocos():
    dados = request.json
    db = get_db_connection()
    db.agendas.update_one(
        {"user_id": current_user.id, "dia": dados["dia"]},
        {"$set": {"blocos": dados["blocos"]}},
        upsert=True
    )
    return jsonify({"msg": "Blocos salvos."}), 200