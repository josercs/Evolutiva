from flask import Blueprint, request, jsonify
from models.models import Curso, HorariosEscolares, CursoMateria, SubjectContent
from models.models import db  # Use o db correto do seu projeto

course_bp = Blueprint('course', __name__, url_prefix='/api')

# Detalhes de um curso específico
@course_bp.route('/cursos/<int:course_id>', methods=['GET'])
def get_course(course_id):
    curso = Curso.query.get(course_id)
    if curso:
        return jsonify({'success': True, 'course': {
            'id': curso.id,
            'nome': curso.nome
        }})
    return jsonify({'success': False, 'message': 'Curso não encontrado'}), 404

# Listar todos os cursos
@course_bp.route('/cursos', methods=['GET'])
def listar_cursos():
    cursos = Curso.query.all()
    return jsonify([
        {"id": c.id, "nome": c.nome}
        for c in cursos
    ])

# Listar matérias de um curso específico
@course_bp.route('/materias', methods=['GET'])
def listar_materias_por_curso():
    course_id = request.args.get('course_id')
    if not course_id:
        return jsonify({"materias": []})
    materias = db.session.query(HorariosEscolares).join(
        CursoMateria, HorariosEscolares.id == CursoMateria.materia_id
    ).filter(
        CursoMateria.curso_id == course_id
    ).all()
    return jsonify({
        "materias": [{"id": m.id, "nome": m.materia} for m in materias]
    })

# Listar conteúdos de uma matéria específica (por ID)
@course_bp.route('/materias/<int:materia_id>/conteudos', methods=['GET'])
def listar_conteudos_por_materia(materia_id):
    conteudos = SubjectContent.query.filter_by(materia_id=materia_id).all()
    return jsonify({
        "conteudos": [
            {
                "id": c.id,
                "subject": c.subject,
                "topic": c.topic,
                "created_at": c.created_at.strftime('%d/%m/%Y %H:%M') if c.created_at else ""
            }
            for c in conteudos
        ]
    })

# (temporary debug endpoint removed)