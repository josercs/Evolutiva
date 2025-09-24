from flask import Blueprint, request, jsonify
from models.models import db, CompletedContent, SubjectContent, HorariosEscolares

content_bp = Blueprint('content', __name__, url_prefix='/api/conteudos')
content_public_bp = Blueprint('content_public', __name__)

# Listar conteúdos de uma matéria por ID
@content_bp.route('/materia/<int:materia_id>', methods=['GET'])
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

@content_bp.route('/concluir', methods=['POST'])
def concluir_conteudo():
    data = request.json
    user_id = data.get('user_id')
    content_id = data.get('content_id')
    # Checagem extra para evitar 'undefined' ou None
    if not user_id or user_id == "undefined" or not content_id:
        return jsonify({"success": False, "message": "Dados incompletos"}), 400
    if not CompletedContent.query.filter_by(user_id=user_id, content_id=content_id).first():
        cc = CompletedContent(user_id=user_id, content_id=content_id)
        db.session.add(cc)
        db.session.commit()
    return jsonify({"success": True})

# Public endpoint to fetch full HTML content by id (compat with existing frontend)
@content_public_bp.route('/api/conteudo_html/<int:conteudo_id>', methods=['GET'])
def get_conteudo_html(conteudo_id: int):
    try:
        row = (
            db.session.query(
                SubjectContent.id,
                SubjectContent.subject,
                SubjectContent.topic,
                SubjectContent.content_html,
                HorariosEscolares.materia,
            )
            .join(HorariosEscolares, SubjectContent.materia_id == HorariosEscolares.id)
            .filter(SubjectContent.id == conteudo_id)
            .first()
        )
        if row:
            return jsonify({
                "id": row[0],
                "subject": row[1],
                "topic": row[2],
                "content_html": row[3],
                "materia": row[4],
            })
        else:
            return jsonify({"error": "Conteúdo não encontrado"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500