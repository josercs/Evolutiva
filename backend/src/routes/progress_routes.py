from flask import Blueprint, jsonify, request
from src.db import get_db_connection
from models.models import db, HorariosEscolares, CursoMateria, Module, Lesson, CompletedLesson, CompletedContent, User, Curso
from sqlalchemy import text

progress_bp = Blueprint('progress', __name__, url_prefix='/api/progress')

@progress_bp.route('/materias/<int:user_id>/<int:curso_id>', methods=['GET'])
def progresso_materias(user_id, curso_id):
    """
    Retorna o progresso do usuário por matéria dentro de um curso.
    Cada matéria é associada a módulos via campo materia_id em modules.
    """
    # Busque apenas as matérias associadas ao curso_id
    materias = db.session.execute(
        text("""
            SELECT m.id, m.materia
            FROM curso_materia cm
            JOIN horarios_escolares m ON cm.materia_id = m.id
            WHERE cm.curso_id = :curso_id
        """),
        {"curso_id": curso_id}
    ).fetchall()

    # Monte o progresso só para essas matérias
    progresso = []
    for row in materias:
        materia_id, nome = row
        # Total de conteúdos da matéria
        total = db.session.execute(
            text("SELECT COUNT(*) FROM subject_contents WHERE materia_id = :materia_id"),
            {"materia_id": materia_id}
        ).scalar()

        # Quantos conteúdos o usuário concluiu nessa matéria
        concluidos = db.session.execute(
            text("""
                SELECT COUNT(*) FROM completed_content cc
                JOIN subject_contents sc ON cc.content_id = sc.id
                WHERE cc.user_id = :user_id AND sc.materia_id = :materia_id
            """),
            {"user_id": user_id, "materia_id": materia_id}
        ).scalar()

        percent = int((concluidos / total) * 100) if total > 0 else 0
        progresso.append({
            "materia": nome,
            "percent": percent,
            "total_lessons": total,
            "completed_lessons": concluidos
        })

    return jsonify({"progresso": progresso})

# Endpoint para listar conquistas do usuário
@progress_bp.route('/achievements/<int:user_id>', methods=['GET'])
def get_user_achievements(user_id):
    from models.models import Achievement  # Certifique-se de ter o modelo Achievement
    achievements = Achievement.query.filter_by(user_id=user_id).all()
    return jsonify({
        "achievements": [
            {
                "id": a.id,
                "title": a.title,
                "description": a.description,
                "earned_at": a.earned_at.isoformat() if a.earned_at else None
            }
            for a in achievements
        ]
    })

# Endpoint para progresso geral do usuário (todos os cursos)
@progress_bp.route('/user/<int:user_id>', methods=['GET'])
def get_user_progress(user_id):
    from models.models import Progress
    progresses = Progress.query.filter_by(user_id=user_id).all()
    return jsonify({
        "progress": [
            {
                "course_id": p.course_id,
                "progress_percentage": p.progress_percentage,
                "current_lesson_id": p.current_lesson_id,
                "last_activity": p.last_activity.isoformat() if p.last_activity else None
            }
            for p in progresses
        ]
    })

@progress_bp.route('/user/<int:user_id>/xp', methods=['GET'])
def get_user_xp(user_id):
    # Exemplo: retorne XP e streak do usuário
    from models.models import XPStreak
    xp = XPStreak.query.filter_by(user_id=user_id).first()
    return jsonify({
        "xp": xp.xp if xp else 0,
        "streak": xp.streak if xp else 0
    })

@progress_bp.route('/user/<int:user_id>/curso', methods=['GET'])
def get_user_curso(user_id):
    try:
        user = User.query.get(user_id)
        if not user or not user.curso_id:
            return jsonify({"error": "Curso não encontrado"}), 404
        curso = Curso.query.get(user.curso_id)
        if not curso:
            return jsonify({"error": "Curso não encontrado"}), 404
        return jsonify({
            "id": curso.id,
            "nome": curso.nome,
            "descricao": getattr(curso, "descricao", None)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

content_bp = Blueprint('content', __name__, url_prefix='/api/conteudos')

@content_bp.route('/concluir', methods=['POST'])
def concluir_conteudo():
    data = request.json
    user_id = data.get('user_id')
    content_id = data.get('content_id')
    if not user_id or not content_id:
        return jsonify({"success": False, "message": "Dados incompletos"}), 400
    if not CompletedContent.query.filter_by(user_id=user_id, content_id=content_id).first():
        cc = CompletedContent(user_id=user_id, content_id=content_id)
        db.session.add(cc)
        db.session.commit()
    return jsonify({"success": True})