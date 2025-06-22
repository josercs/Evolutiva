from flask import Blueprint, request, jsonify

from models.models import Curso, HorariosEscolares
from models.models import CursoMateria

course_bp = Blueprint('course', __name__, url_prefix='/api')

@course_bp.route('/', methods=['GET'])
def get_courses():
    curso_id = request.args.get('curso_id')
    if curso_id:
        # Busca IDs das matérias associadas ao curso
        materias_ids = [cm.materia_id for cm in CursoMateria.query.filter_by(curso_id=curso_id).all()]
        materias = HorariosEscolares.query.filter(HorariosEscolares.id.in_(materias_ids)).all()
        return jsonify({"courses": [m.to_dict() for m in materias]})
    cursos = Curso.query.all()
    return jsonify({
        'success': True,
        'courses': [{'id': c.id, 'title': c.nome, 'description': c.descricao, 'image': c.imagem} for c in cursos]
    })

@course_bp.route('/<int:course_id>', methods=['GET'])
def get_course(course_id):
    curso = Curso.query.get(course_id)
    if curso:
        return jsonify({'success': True, 'course': {
            'id': curso.id,
            'title': curso.nome,
            'description': curso.descricao,
            'image': curso.imagem
        }})
    return jsonify({'success': False, 'message': 'Curso não encontrado'}), 404

@course_bp.route('/<int:course_id>/modules/<int:module_id>', methods=['GET'])
def get_module(course_id, module_id):
    # Supondo que módulos estejam relacionados a HorariosEscolares
    materia = HorariosEscolares.query.filter_by(id=module_id, curso_id=course_id).first()
    if materia:
        return jsonify({'success': True, 'module': materia.to_dict()})
    return jsonify({'success': False, 'message': 'Módulo não encontrado'}), 404

@course_bp.route('/cursos', methods=['GET'])
def listar_cursos():
    cursos = Curso.query.all()
    return jsonify([{"id": c.id, "nome": c.nome} for c in cursos])