from flask import Blueprint, jsonify, request
from db import get_db_connection
from models.models import db, HorariosEscolares, CursoMateria, Module, Lesson, CompletedLesson, CompletedContent, User, Curso
from sqlalchemy import text
from flask_login import login_required, current_user
from datetime import datetime
from models.models import PomodoroSession

progress_bp = Blueprint('progress', __name__, url_prefix='/api/progress')

# Legacy alias blueprint for Portuguese path expected by frontend
progresso_bp = Blueprint('progresso', __name__, url_prefix='/api/progresso')

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

# Legacy alias endpoints mapping to the same handlers
@progresso_bp.route('/materias/<int:user_id>/<int:curso_id>', methods=['GET'])
def progresso_materias_alias(user_id, curso_id):
    return progresso_materias(user_id, curso_id)

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

@progresso_bp.route('/achievements/<int:user_id>', methods=['GET'])
def get_user_achievements_alias(user_id):
    return get_user_achievements(user_id)

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

@progresso_bp.route('/user/<int:user_id>', methods=['GET'])
def get_user_progress_alias(user_id):
    return get_user_progress(user_id)

@progress_bp.route('/user/<int:user_id>/xp', methods=['GET'])
def get_user_xp(user_id):
    # Exemplo: retorne XP e streak do usuário
    from models.models import XPStreak
    xp = XPStreak.query.filter_by(user_id=user_id).first()
    return jsonify({
        "xp": xp.xp if xp else 0,
        "streak": xp.streak if xp else 0
    })

@progresso_bp.route('/user/<int:user_id>/xp', methods=['GET'])
def get_user_xp_alias(user_id):
    return get_user_xp(user_id)

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

@progresso_bp.route('/user/<int:user_id>/curso', methods=['GET'])
def get_user_curso_alias(user_id):
    return get_user_curso(user_id)

@progress_bp.route('/pomodoro', methods=['POST'])
@login_required
def log_pomodoro_session():
    try:
        data = request.get_json(force=True) or {}
        inicio = data.get('inicio')
        fim = data.get('fim')
        tipo = data.get('tipo') or 'work'
        duracao = int(data.get('duracao') or (300 if tipo == 'break' else 1500))

        # Parse ISO strings; fallback to now
        def parse_dt(val):
            try:
                return datetime.fromisoformat(val.replace('Z', '+00:00')) if isinstance(val, str) else datetime.utcnow()
            except Exception:
                return datetime.utcnow()

        inicio_dt = parse_dt(inicio)
        fim_dt = parse_dt(fim)

        sess = PomodoroSession(
            user_id=current_user.id,
            inicio=inicio_dt,
            fim=fim_dt,
            tipo=str(tipo)[:20],
            duracao=duracao
        )
        db.session.add(sess)
        db.session.commit()
        return jsonify({"success": True, "id": sess.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500