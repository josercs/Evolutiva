from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from src.models.models import db, User, PlanoEstudo

onboarding_bp = Blueprint('onboarding', __name__)

@onboarding_bp.route('/api/onboarding', methods=['POST'])
def onboarding():
    data = request.json
    user_id = data.get("user_id")  # Ajuste conforme autenticação
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Usuário não encontrado"}), 404

    user.objetivo = data.get("objetivo")
    user.disponibilidade = data.get("disponibilidade")
    user.preferencia = data.get("preferencia")
    db.session.commit()

    # Geração simples de plano de estudo
    plano = PlanoEstudo(user_id=user.id, descricao=f"Plano para {user.objetivo}")
    db.session.add(plano)
    db.session.commit()

    return jsonify({"ok": True, "plano_id": plano.id})

@onboarding_bp.route('/api/user/onboarding', methods=['PATCH'])
@login_required
def concluir_onboarding():
    user = User.query.get(current_user.id)
    if not user:
        return jsonify({"error": "Usuário não encontrado"}), 404
    user.onboarding_done = True
    db.session.commit()
    return jsonify({"ok": True})