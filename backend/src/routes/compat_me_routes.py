from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from flask_login import current_user
from models.models import User, db

compat_me_bp = Blueprint('compat_me', __name__, url_prefix='/api')

@compat_me_bp.route('/user/me', methods=['GET'])
@compat_me_bp.route('/users/me', methods=['GET'])
def compat_me():
    # Try JWT first (optional); if absent, fallback to session cookie (Flask-Login)
    uid = None
    try:
        verify_jwt_in_request(optional=True)
        uid = get_jwt_identity()
    except Exception:
        uid = None

    user = None
    if uid is not None:
        try:
            uid_int = int(uid)
        except Exception:
            uid_int = None
        if uid_int is not None:
            user = db.session.get(User, uid_int)
    if not user and getattr(current_user, 'is_authenticated', False):
        user = current_user  # type: ignore
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    return jsonify({
        'id': user.id,
        'name': getattr(user, 'name', ''),
        'nome': getattr(user, 'name', ''),
        'email': user.email,
        'has_onboarding': getattr(user, 'has_onboarding', False),
        'onboardingDone': getattr(user, 'has_onboarding', False),
        'avatar_url': getattr(user, 'avatar_url', None),
        'avatar': getattr(user, 'avatar_url', None),
        'role': getattr(user, 'role', 'student'),
        'level': getattr(user, 'level', 1),
        'badges': getattr(user, 'badges', []),
        'xp': getattr(user, 'xp', 0),
        'streak': getattr(user, 'streak', 0),
    })
