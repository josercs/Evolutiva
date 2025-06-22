from flask import Blueprint, jsonify
from models.models import HorariosEscolares  # ajuste o import conforme seu projeto

materias_bp = Blueprint('materias', __name__, url_prefix='/api/materias')

@materias_bp.route('/', methods=['GET'])
def listar_materias():
    materias = HorariosEscolares.query.order_by(HorariosEscolares.id.asc()).all()
    materias_lista = [{"id": m.id, "nome": m.materia} for m in materias]
    return jsonify({"materias": materias_lista})