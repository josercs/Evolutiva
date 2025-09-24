from flask import Blueprint, request, jsonify
from flask_login import current_user, login_required

user_bp = Blueprint('user', __name__, url_prefix='/api/user')

@user_bp.route('/me-session', methods=['GET'])
@login_required
def get_current_user():
    return jsonify({
        "id": current_user.id,
        "name": current_user.name,
        "nome": current_user.name,  # compatibility
        "email": current_user.email,
        "avatar": getattr(current_user, "avatar_url", ""),
        "avatar_url": getattr(current_user, "avatar_url", ""),
        "level": getattr(current_user, "level", 1),
        "badges": getattr(current_user, "badges", []),
        "xp": getattr(current_user, "xp", 0),
        "streak": getattr(current_user, "streak", 0),
        "has_onboarding": getattr(current_user, "has_onboarding", False),
        "onboardingDone": getattr(current_user, "has_onboarding", False),  # alias
        "curso_id": getattr(current_user, "curso_id", None),
    })

# Alias legacy/new consistency: also expose /api/users/me with identical payload
users_bp = Blueprint('users', __name__, url_prefix='/api/users')

@users_bp.route('/me-session', methods=['GET'])
@login_required
def get_current_user_alias():
    return jsonify({
        "id": current_user.id,
        "name": current_user.name,
        "nome": current_user.name,
        "email": current_user.email,
        "avatar": getattr(current_user, "avatar_url", ""),
        "avatar_url": getattr(current_user, "avatar_url", ""),
        "level": getattr(current_user, "level", 1),
        "badges": getattr(current_user, "badges", []),
        "xp": getattr(current_user, "xp", 0),
        "streak": getattr(current_user, "streak", 0),
        "has_onboarding": getattr(current_user, "has_onboarding", False),
        "onboardingDone": getattr(current_user, "has_onboarding", False),
        "curso_id": getattr(current_user, "curso_id", None),
    })