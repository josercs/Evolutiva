from flask import Blueprint, request, jsonify
from models.models import db  # Ajuste para importar o objeto db do SQLAlchemy
from models.models import Tarefa  # Importe seu modelo de tarefa corretamente

tarefas_bp = Blueprint('tarefas', __name__, url_prefix='/api/tarefas')

@tarefas_bp.route('/atualizar-prioridade/<int:id>', methods=['PUT'])
def atualizar_prioridade(id):
    dados = request.json
    tarefa = Tarefa.query.filter_by(id=id).first()
    if not tarefa:
        return jsonify({"msg": "Tarefa não encontrada."}), 404

    # Atualize apenas os campos permitidos
    campos_permitidos = {"prioridade", "importante", "urgente", "status"}
    for key, value in dados.items():
        if key in campos_permitidos:
            setattr(tarefa, key, value)
    db.session.commit()
    return jsonify({"msg": "Prioridade atualizada."}), 200