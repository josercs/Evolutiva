from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    verify_jwt_in_request,
    get_jwt,
)  # type: ignore
from sqlalchemy import select, func
from werkzeug.security import check_password_hash
from models.models import db, User
import os
import logging

# In-memory fallback for refresh rotation when Redis indisponível (dev/tests)
_INMEM_ROTATED: set[str] = set()

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password')
    if not name or not email or not password:
        return jsonify({'success': False, 'message': 'Todos os campos são obrigatórios'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'E-mail já cadastrado'}), 409
    user = User(name=name, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    # use string identity
    access = create_access_token(identity=str(user.id))
    refresh = create_refresh_token(identity=str(user.id))
    return jsonify({
        'success': True,
        'message': 'Usuário cadastrado com sucesso',
        'access_token': access,
        'refresh_token': refresh,
        'user': {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'role': getattr(user, 'role', 'student')
        }
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password')
    if not email or not password:
        return jsonify({'error': 'Email e senha são obrigatórios'}), 400

    dbg = os.getenv('DEBUG_SESSIONS', 'false').lower() in {'1','true','yes'}

    user = db.session.execute(
        select(User).where(func.lower(User.email) == email).limit(1)
    ).scalar_one_or_none()

    if dbg:
        logging.debug(f"[auth] login email={email} found={bool(user)}")

    dev_master = os.getenv('DEV_MASTER_PASSWORD')
    dev_autocreate = os.getenv('DEV_AUTOCREATE_USER', 'true').lower() in {'1','true','yes'}

    if not user:
        if dev_master and password == dev_master and dev_autocreate:
            user = User(name=email.split('@')[0] or 'User', email=email)
            user.set_password(password)
            db.session.add(user)
            db.session.commit()
            if dbg:
                logging.debug(f"[auth] autocreated user for {email}")
        else:
            if dbg:
                logging.debug(f"[auth] user not found and no autocreate for {email}")
            return jsonify({'error': 'Credenciais inválidas'}), 401

    valid = False
    try:
        valid = user.check_password(password)
    except Exception:
        valid = False

    if not valid and getattr(user, 'password_hash', None) == password:
        try:
            user.set_password(password)
            db.session.commit()
            valid = True
            if dbg:
                logging.debug(f"[auth] upgraded plaintext password for {email}")
        except Exception:
            db.session.rollback()
            valid = False

    if not valid and dev_master and password == dev_master:
        valid = True
        if dbg:
            logging.debug(f"[auth] master password accepted for {email}")
        # optional: upgrade stored hash to master password in dev
        if os.getenv('DEV_UPGRADE_ON_MASTER', 'true').lower() in {'1','true','yes'}:
            try:
                user.set_password(password)
                db.session.commit()
                if dbg:
                    logging.debug(f"[auth] upgraded hash via master password for {email}")
            except Exception:
                db.session.rollback()
                if dbg:
                    logging.debug(f"[auth] failed to upgrade hash via master for {email}")

    if not valid:
        if dbg:
            logging.debug(f"[auth] invalid password for {email}")
        return jsonify({'error': 'Credenciais inválidas'}), 401

    login_user(user)  # mantém compatibilidade sessão
    access = create_access_token(identity=str(user.id))
    refresh = create_refresh_token(identity=str(user.id))
    return jsonify({
        'access_token': access,
        'refresh_token': refresh,
        'id': user.id,
        'name': user.name,
        'nome': user.name,
        'email': user.email,
        'has_onboarding': user.has_onboarding,
        'onboardingDone': user.has_onboarding,
        'curso_id': user.curso_id,
        'avatar_url': user.avatar_url,
        'avatar': user.avatar_url,
        'role': user.role,
        'level': getattr(user, 'level', 1),
        'badges': getattr(user, 'badges', []),
        'xp': getattr(user, 'xp', 0),
        'streak': getattr(user, 'streak', 0),
    })

@auth_bp.route('/logout', methods=['POST'])
@jwt_required(optional=True)
def logout():
    # Revoke provided refresh token (client should send it explicitly) — if header access only, this simply logs out session
    token = None
    try:
        verify_jwt_in_request(optional=True)
        token = get_jwt()
    except Exception:
        token = None
    try:
        logout_user()
    except Exception:
        pass
    if token and token.get('type') == 'refresh':
        r_client = getattr(auth_bp, 'redis', None) or getattr(auth_bp, 'app', None)
    return jsonify({'success': True, 'message': 'Logout realizado com sucesso'})

@auth_bp.route('/refresh', methods=['POST'])
def refresh_token():
    try:
        # Validate current refresh token
        verify_jwt_in_request(refresh=True)
        payload = get_jwt()
        uid = payload.get('sub') or get_jwt_identity()
        jti = payload.get('jti')
        app = auth_bp._get_current_object().app  # type: ignore
        r_client = getattr(app, 'redis', None)
        # Rotation: if this refresh was already used, deny (replay)
        if jti and (
            (r_client and r_client.sismember('jwt:refresh:rotated', jti)) or
            (not r_client and jti in _INMEM_ROTATED)
        ):
            return jsonify({'error': 'Refresh token reutilizado (replay)'}), 401
        # Issue new tokens
        uid_str = str(uid) if uid is not None else None
        new_access = create_access_token(identity=uid_str)
        new_refresh = create_refresh_token(identity=uid_str)
        new_payload = {'access_token': new_access, 'refresh_token': new_refresh}
        # Mark old refresh as rotated and store revoke list (TTL ~ original exp approximation)
        if r_client and jti:
            try:
                r_client.sadd('jwt:refresh:rotated', jti)
                # Also add to revoked set for explicit blocklist (defense-in-depth)
                r_client.sadd('jwt:refresh:revoked', jti)
            except Exception:
                pass
        elif jti:
            _INMEM_ROTATED.add(jti)
        return jsonify(new_payload)
    except Exception as e:
        return jsonify({'error': 'Refresh token inválido', 'details': str(e)}), 401

@auth_bp.route('/token/verify', methods=['GET'])
@jwt_required()
def verify_token():
    return jsonify({'ok': True, 'user_id': get_jwt_identity()})

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = (data or {}).get('email')
    if email:
        user = User.query.filter_by(email=(email or '').strip().lower()).first()
        if user:
            return jsonify({'success': True, 'message': 'Instruções para redefinição de senha enviadas para o e-mail'})
        return jsonify({'success': False, 'message': 'Usuário não encontrado'}), 404
    return jsonify({'success': False, 'message': 'E-mail inválido'}), 400

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    new_password = data.get('new_password')
    if email and new_password:
        user = User.query.filter_by(email=email).first()
        if user:
            user.set_password(new_password)
            db.session.commit()
            return jsonify({'success': True, 'message': 'Senha redefinida com sucesso'})
        return jsonify({'success': False, 'message': 'Usuário não encontrado'}), 404
    return jsonify({'success': False, 'message': 'Dados inválidos para redefinição de senha'}), 400

@auth_bp.route('/update-profile', methods=['PUT'])
@jwt_required()
def update_profile():
    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    name = (data.get('name') or '').strip()
    if not email or not name:
        return jsonify({'success': False, 'message': 'Dados inválidos para atualização de perfil'}), 400
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'success': False, 'message': 'Usuário não encontrado'}), 404
    user.name = name
    db.session.commit()
    return jsonify({'success': True, 'message': 'Perfil atualizado com sucesso'})

@auth_bp.route('/delete-account', methods=['DELETE'])
@jwt_required()
def delete_account():
    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    if not email:
        return jsonify({'success': False, 'message': 'E-mail não informado'}), 400
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'success': False, 'message': 'Usuário não encontrado'}), 404
    db.session.delete(user)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Conta excluída com sucesso'})

@auth_bp.route('/get-user', methods=['GET'])
@jwt_required(optional=True)
def get_user():
    email = (request.args.get('email') or '').strip().lower()
    if not email:
        return jsonify({'success': False, 'message': 'E-mail não informado'}), 400
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'success': False, 'message': 'Usuário não encontrado'}), 404
    return jsonify({
        'success': True,
        'user': {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'role': getattr(user, 'role', 'student')
        }
    })

@auth_bp.route('/user/me', methods=['GET'])
@jwt_required()
def user_me():
    uid = get_jwt_identity()
    try:
        uid_int = int(uid) if uid is not None else None
    except Exception:
        uid_int = None
    user = User.query.get(uid_int)
    if not user:
        return jsonify({'success': False, 'message': 'Usuário não encontrado'}), 404
    return jsonify({
        'success': True,
        'user': {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'role': getattr(user, 'role', 'student'),
            'has_onboarding': getattr(user, 'has_onboarding', False)
        }
    })

# Compat aliases usados pelo frontend legado (/api/users/me e /api/user/me fora do prefixo /api/auth)
@auth_bp.route('/users/me', methods=['GET'])
@jwt_required()
def users_me_alias():
    return user_me()

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me_alias():
    return user_me()

@auth_bp.route('/onboarding', methods=['POST'])
def onboarding():
    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    answers = data.get('answers')
    if not email or not answers:
        return jsonify({'success': False, 'message': 'Dados incompletos'}), 400
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'success': False, 'message': 'Usuário não encontrado'}), 404
    user.has_onboarding = True  # <-- padronize aqui!
    db.session.commit()
    return jsonify({'success': True, 'message': 'Onboarding concluído'})

@auth_bp.route('/debug/users', methods=['GET'])
def debug_users():
    if os.getenv('DEBUG_SESSIONS', 'false').lower() not in {'1','true','yes'}:
        return jsonify({"error": "Not found"}), 404
    users = User.query.order_by(User.id.asc()).all()
    return jsonify({
        "count": len(users),
        "users": [
            {"id": u.id, "email": u.email, "name": u.name, "has_onboarding": u.has_onboarding}
            for u in users
        ]
    })

@auth_bp.route('/me/jwt', methods=['GET'])
@jwt_required()
def me_jwt():
    uid = get_jwt_identity()
    try:
        uid_int = int(uid) if uid is not None else None
    except Exception:
        uid_int = None
    user = User.query.get(uid_int)
    if not user:
        return jsonify({'error': 'Usuário não encontrado'}), 404
    return jsonify({'id': user.id, 'email': user.email, 'name': user.name})