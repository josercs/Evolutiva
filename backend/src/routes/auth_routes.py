from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user
from sqlalchemy import select, func
from werkzeug.security import check_password_hash
from models.models import db, User
import os
import logging

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
    return jsonify({
        'success': True,
        'message': 'Usuário cadastrado com sucesso',
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

    login_user(user)
    return jsonify({
        'id': user.id,
        'name': user.name,
        'nome': user.name,  # alias
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
def logout():
    try:
        logout_user()
    except Exception:
        pass
    return jsonify({'success': True, 'message': 'Logout realizado com sucesso'})

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
def user_me():
    email = (request.args.get('email') or '').strip().lower()
    if not email:
        return jsonify({'success': False, 'message': 'E-mail não fornecido'}), 400
    user = User.query.filter_by(email=email).first()
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