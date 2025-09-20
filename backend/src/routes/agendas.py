from flask import Blueprint, request, jsonify
from flask_login import current_user, login_required
from models.models import db, AgendaBloco

agendas_bp = Blueprint('agendas', __name__, url_prefix='/api/agendas')

@agendas_bp.route('/blocos', methods=['GET'])
@login_required
def listar_blocos():
    date = request.args.get('date')
    q = AgendaBloco.query.filter_by(user_id=current_user.id)
    if date:
        q = q.filter_by(date=date)
    blocos = q.order_by(AgendaBloco.date.asc(), AgendaBloco.start_time.asc()).all()
    return jsonify({
        "blocks": [
            {
                "id": b.id,
                "date": b.date,
                "start_time": b.start_time,
                "end_time": b.end_time,
                "activity_type": b.activity_type,
                "subject": b.subject,
                "topic": b.topic,
                "duration": b.duration,
                "priority": b.priority,
                "status": b.status,
                "content_id": b.content_id,
            }
            for b in blocos
        ]
    })

@agendas_bp.route('/blocos', methods=['POST'])
@login_required
def salvar_blocos():
    data = request.get_json(force=True)
    blocks = data if isinstance(data, list) else data.get('blocks')
    if not isinstance(blocks, list):
        return jsonify({"error": "Formato inválido"}), 400
    saved_ids = []
    for blk in blocks:
        b = AgendaBloco(
            user_id=current_user.id,
            date=blk.get('date'),
            start_time=blk.get('start_time'),
            end_time=blk.get('end_time'),
            activity_type=blk.get('activity_type') or 'study',
            subject=blk.get('subject'),
            topic=blk.get('topic'),
            duration=blk.get('duration'),
            priority=blk.get('priority'),
            status=blk.get('status'),
            content_id=blk.get('content_id') or blk.get('id')
        )
        db.session.add(b)
        db.session.flush()
        saved_ids.append(b.id)
    db.session.commit()
    return jsonify({"success": True, "ids": saved_ids})

@agendas_bp.route('/blocos/<int:block_id>', methods=['PATCH'])
@login_required
def atualizar_bloco(block_id):
    b = AgendaBloco.query.filter_by(id=block_id, user_id=current_user.id).first()
    if not b:
        return jsonify({"error": "Bloco não encontrado"}), 404
    data = request.get_json(force=True) or {}
    for field in ['date', 'start_time', 'end_time', 'activity_type', 'subject', 'topic', 'duration', 'priority', 'status', 'content_id']:
        if field in data:
            setattr(b, field, data[field])
    db.session.commit()
    return jsonify({"success": True})