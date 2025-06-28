from flask import Blueprint, request, jsonify
from models.models import db, CompletedContent

content_bp = Blueprint('content', __name__, url_prefix='/api/conteudos')

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