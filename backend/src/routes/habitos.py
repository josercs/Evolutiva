from flask import Blueprint, request, jsonify
from flask_login import current_user, login_required
from datetime import datetime
from db import get_db_connection
from models.models import db, HabitoCheckin

habitos_bp = Blueprint('habitos', __name__, url_prefix='/api/habitos')

@habitos_bp.route('/checkin', methods=['POST'])
@login_required
def registrar_checkin():
    data = request.get_json(force=True)
    habit = data.get('habit') or 'estudo_diario'
    date = data.get('date')  # dd/MM/YYYY
    if not date:
        return jsonify({"error": "date é obrigatório (dd/MM/YYYY)"}), 400
    # Evita duplicidade por UniqueConstraint
    existente = HabitoCheckin.query.filter_by(user_id=current_user.id, habit=habit, date=date).first()
    if existente:
        return jsonify({"success": True, "id": existente.id, "message": "Já registrado"})
    reg = HabitoCheckin(user_id=current_user.id, habit=habit, date=date)
    db.session.add(reg)
    db.session.commit()
    return jsonify({"success": True, "id": reg.id})

@habitos_bp.route('/checkin', methods=['GET'])
@login_required
def listar_checkins():
    date = request.args.get('date')
    habit = request.args.get('habit')
    q = HabitoCheckin.query.filter_by(user_id=current_user.id)
    if habit:
        q = q.filter_by(habit=habit)
    if date:
        q = q.filter_by(date=date)
    items = q.order_by(HabitoCheckin.date.desc()).all()
    return jsonify({
        "checkins": [
            {"id": i.id, "habit": i.habit, "date": i.date}
            for i in items
        ]
    })