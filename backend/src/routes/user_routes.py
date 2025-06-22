from flask import Blueprint, jsonify
from models.models import User, Curso

user_bp = Blueprint('user', __name__, url_prefix='/api/usuarios')

@user_bp.route('/<int:user_id>/curso', methods=['GET'])
def get_user_curso(user_id):
    user = User.query.get(user_id)
    print("User:", user)
    if not user or not user.curso_id:
        return jsonify({"error": "Curso não encontrado"}), 404
    curso = Curso.query.get(user.curso_id)
    print("Curso:", curso)
    if not curso:
        return jsonify({"error": "Curso não encontrado"}), 404
    return jsonify({"id": curso.id, "nome": curso.nome})