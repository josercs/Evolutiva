from flask import Blueprint, jsonify
from flask_login import current_user, login_required

user_bp = Blueprint('user', __name__, url_prefix='/api/user')

@user_bp.route('/me', methods=['GET'])
@login_required
def get_current_user():
    return jsonify({
        "id": current_user.id,
        "nome": current_user.name,
        "email": current_user.email,
        "avatar": getattr(current_user, "avatar_url", ""),
        "level": getattr(current_user, "level", 1),
        "badges": getattr(current_user, "badges", []),
        "xp": getattr(current_user, "xp", 0),
        "streak": getattr(current_user, "streak", 0),
    })