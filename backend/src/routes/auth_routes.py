from flask import Blueprint, request, jsonify
from models.models import db, User

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
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
    email = data.get('email')
    password = data.get('password')
    user = User.query.filter_by(email=email).first()
    if user and user.check_password(password):
        return jsonify({
            'success': True,
            'message': 'Login realizado com sucesso',
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'role': getattr(user, 'role', 'student')
            }
        })
    return jsonify({'success': False, 'message': 'Credenciais inválidas'}), 401

@auth_bp.route('/logout', methods=['POST'])
def logout():
    return jsonify({'success': True, 'message': 'Logout realizado com sucesso'})

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    if data and data.get('email'):
        user = User.query.filter_by(email=data.get('email')).first()
        if user:
            return jsonify({'success': True, 'message': 'Instruções para redefinição de senha enviadas para o e-mail'})
        return jsonify({'success': False, 'message': 'Usuário não encontrado'}), 404
    return jsonify({'success': False, 'message': 'E-mail inválido'}), 400

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    email = data.get('email')
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
    email = data.get('email')
    name = data.get('name')
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
    email = data.get('email')
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
    email = request.args.get('email')
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
    email = request.args.get('email')
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
            'onboarding_done': getattr(user, 'onboarding_done', False)
        }
    })

@auth_bp.route('/onboarding', methods=['POST'])
def onboarding():
    data = request.get_json()
    email = data.get('email')
    answers = data.get('answers')
    if not email or not answers:
        return jsonify({'success': False, 'message': 'Dados incompletos'}), 400
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'success': False, 'message': 'Usuário não encontrado'}), 404
    user.onboarding_done = True
    db.session.commit()
    return jsonify({'success': True, 'message': 'Onboarding concluído'})