from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from models.models import db, User, PlanoEstudo, HorariosEscolares, SubjectContent, Course
import requests
import os
import json
import re

onboarding_bp = Blueprint('onboarding', __name__)

@onboarding_bp.route('/api/onboarding', methods=['POST'])
@login_required
def onboarding():
    data = request.json
    user = User.query.get(current_user.id)
    if not user:
        return jsonify({"error": "Usuário não encontrado."}), 404

    user.idade = data.get("idade")
    user.escolaridade = data.get("escolaridade")
    user.objetivo = data.get("objetivo")
    user.dias_disponiveis = data.get("dias_disponiveis")
    user.tempo_diario = data.get("tempo_diario")
    user.estilo_aprendizagem = data.get("estilo_aprendizagem")
    user.ritmo = data.get("ritmo")
    user.horario_inicio = data.get("horario_inicio")
    curso_id = data.get("curso_id")
    if curso_id:
        user.curso_id = int(curso_id)
        user.has_onboarding = True  # <-- Adicione esta linha!
    else:
        return jsonify({"error": "curso_id é obrigatório"}), 400

    db.session.commit()
    return jsonify({"success": True})

# Exemplo de rota para buscar plano por email
@onboarding_bp.route('/api/planos', methods=['GET'])
@login_required
def get_plano():
    email = request.args.get('email')
    if not email:
        return jsonify({"error": "Email não informado."}), 400

    plano = PlanoEstudo.query.filter_by(email=email).order_by(PlanoEstudo.id.desc()).first()
    if not plano:
        return jsonify({"plano": None}), 200

    return jsonify({"plano": plano.dados}), 200

@onboarding_bp.route('/api/planos/me', methods=['GET'])
@login_required
def get_plano_me():
    plano = PlanoEstudo.query.filter_by(email=current_user.email).order_by(PlanoEstudo.id.desc()).first()
    if plano:
        return jsonify({"plano_estudo": plano.dados})
    return jsonify({"plano_estudo": None})

@onboarding_bp.route('/api/plano-estudo/gerar', methods=['POST'])
@login_required
def gerar_plano_estudo():
    user = User.query.get(current_user.id)
    if not user or not user.has_onboarding:
        return jsonify({"error": "Onboarding não encontrado."}), 400

    try:
        materias = HorariosEscolares.query.all()
        materias_lista = [m.materia for m in materias if m.materia]

        conteudos = SubjectContent.query.all()
        conteudos_lista = [
            {
                "id": c.id,
                "materia_id": c.materia_id,
                "subject": c.subject,
                "topic": c.topic,
                "content_html": c.content_html
            }
            for c in conteudos
        ]

        cursos = Course.query.all()
        cursos_lista = [c.title for c in cursos]

        prompt = f"""
        Crie um plano de estudo semanal personalizado para o seguinte aluno:

        - Nome: {user.name}
        - Idade: {user.idade}
        - Escolaridade: {user.escolaridade}
        - Objetivo: {user.objetivo}
        - Dias disponíveis para estudo: {user.dias_disponiveis}
        - Tempo disponível por dia: {user.tempo_diario} minutos
        - Horário de início do estudo: {user.horario_inicio}
        - Estilo de aprendizagem: {user.estilo_aprendizagem}
        - Ritmo de estudo: {user.ritmo}
        - Matérias disponíveis: {materias_lista}
        - Cursos disponíveis: {cursos_lista}
        - Conteúdos disponíveis: (use apenas estes para montar as atividades)
        {conteudos_lista}

        **Regras para o plano:**
        - Todas as atividades devem ser baseadas exclusivamente nos conteúdos listados acima (campo "Conteúdos disponíveis").
        - Para cada sessão, escolha um conteúdo da lista e utilize o campo "subject" como matéria e "topic" como tema da atividade.
        - Divida o tempo diário em blocos de até 40 minutos, começando pelo horário de início informado.
        - Para cada dia disponível, distribua as sessões de estudo nesses blocos, preenchendo os horários sequencialmente.
        - Alterne entre teoria, prática, revisão e quizzes, conforme o estilo de aprendizagem e o ritmo do aluno.
        - Inclua revisões semanais e momentos de descanso.
        - Priorize a variedade de matérias e conteúdos ao longo da semana.

        **Formato de resposta:**  
        Retorne apenas um JSON estruturado assim (sem explicações ou comentários):

        {{
          "segunda": [
            {{"horario": "08:00-08:40", "atividade": "Leitura: {{subject}} - {{topic}}"}},
            {{"horario": "08:40-09:20", "atividade": "Exercícios: {{subject}} - {{topic}}"}}
          ],
          "terça": [
            ...
          ],
          ...
        }}

        **Importante:**  
        - Sempre utilize os valores de "subject" e "topic" dos conteúdos fornecidos para montar as atividades do campo "atividade".
        - Não invente matérias ou temas que não estejam na lista de conteúdos disponíveis.
        """

        GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")
        GEMINI_MODEL = os.getenv("GOOGLE_DEFAULT_MODEL", "models/gemini-1.5-flash-latest")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}]
        }

        response = requests.post(url, json=payload)
        response.raise_for_status()
        text = response.json()["candidates"][0]["content"]["parts"][0]["text"]

        # Extrai o JSON entre as crases (markdown)
        match = re.search(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL)
        if match:
            json_str = match.group(1)
        else:
            match = re.search(r"(\{.*\})", text, re.DOTALL)
            if match:
                json_str = match.group(1)
            else:
                return jsonify({"error": "Não foi possível extrair o JSON da resposta da IA."}), 500

        try:
            plano = json.loads(json_str)
        except Exception as e:
            return jsonify({"error": f"Resposta da IA não é um JSON válido: {json_str}"}), 500

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Erro ao gerar plano: {str(e)}"}), 500

    try:
        plano_estudo = PlanoEstudo(email=user.email, dados=plano)
        db.session.add(plano_estudo)
        user.has_onboarding = True
        db.session.commit()
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Erro ao salvar plano: {str(e)}"}), 500

    return jsonify({"plano_estudo": plano})