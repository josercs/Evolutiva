from flask import Blueprint, request, jsonify
from models.models import db, User

usuarios_bp = Blueprint('usuarios', __name__, url_prefix='/api/usuarios')

@usuarios_bp.route('/avatar', methods=['GET'])
def get_avatar_by_email():
    email = (request.args.get('email') or '').strip().lower()
    if not email:
        return jsonify({"error": "E-mail não informado"}), 400
    user = User.query.filter_by(email=email).first()
    # Retorna sempre 200 com string (frontend espera apenas avatarUrl)
    url = getattr(user, 'avatar_url', '') if user else ''
    return jsonify({"avatarUrl": url or ""})
