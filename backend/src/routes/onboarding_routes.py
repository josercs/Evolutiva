from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from models.models import db, User, PlanoEstudo, SubjectContent, HorariosEscolares
from datetime import datetime, timedelta
import random
from servicos.plano_estudo_avancado import generate_study_plan, Conteudo as ConteudoModel, UserPreferences
import json

onboarding_bp = Blueprint('onboarding', __name__)

# --- Rota para salvar os dados do Onboarding ---
@onboarding_bp.route('/api/onboarding', methods=['POST'])
@login_required
def onboarding():
    data = request.json
    user = User.query.get(current_user.id)
    if not user:
        return jsonify({"error": "Usuário não encontrado."}), 404

    idade = data.get("idade")
    try:
        idade = int(idade)
    except (TypeError, ValueError):
        idade = None  # ou defina um valor padrão ou retorne erro

    user.idade = idade
    user.escolaridade = data.get("escolaridade")
    user.objetivo = data.get("objetivo")
    user.dias_disponiveis = data.get("dias_disponiveis")
    if isinstance(user.dias_disponiveis, str):
        user.dias_disponiveis = [d.strip().capitalize() for d in user.dias_disponiveis.split(",") if d.strip()]
    else:
        user.dias_disponiveis = data.get("dias_disponiveis")
    user.tempo_diario = data.get("tempo_diario")
    user.estilo_aprendizagem = data.get("estilo_aprendizagem")
    user.ritmo = data.get("ritmo")
    user.horario_inicio = data.get("horario_inicio")
    curso_id = data.get("curso_id")

    # Adicione aqui:
    user.focus_areas = data.get("focus_areas")
    user.difficulty_preference = data.get("difficulty_preference")

    if curso_id:
        user.curso_id = int(curso_id)
        user.has_onboarding = True
    else:
        return jsonify({"error": "curso_id é obrigatório"}), 400

    db.session.commit()
    return jsonify({"success": True})

# --- Simples cache em memória (use Redis para produção) ---
plano_cache = {}

# --- Função auxiliar para gerar plano sem IA ---
def gerar_plano_estudo_script(user, conteudos):
    plano = {}

    # Ajuste de blocos conforme ritmo
    ritmo = (user.ritmo or "equilibrado").lower()
    tempo_total_min = int(user.tempo_diario or 60)
    if ritmo == "leve":
        blocos = max(1, tempo_total_min // 50)
    elif ritmo == "desafiador":
        blocos = max(1, tempo_total_min // 30)
    else:
        blocos = max(1, tempo_total_min // 40)

    try:
        horario_inicio = datetime.strptime(user.horario_inicio or "08:00", "%H:%M")
    except Exception:
        horario_inicio = datetime.strptime("08:00", "%H:%M")

    dias = user.dias_disponiveis or ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"]
    if isinstance(dias, str):
        dias = [d.strip().capitalize() for d in dias.split(",") if d.strip()]

    if not conteudos:
        return {}

    random.shuffle(conteudos)
    conteudo_index = 0

    # Tipos de atividade conforme estilo de aprendizagem
    estilo = (user.estilo_aprendizagem or "").lower()
    tipos_base = ["Leitura", "Prática", "Revisão", "Quiz"]
    if estilo == "visual":
        tipos = ["Leitura", "Prática", "Quiz", "Revisão"]
    elif estilo == "auditivo":
        tipos = ["Leitura", "Quiz", "Prática", "Revisão"]
    elif estilo == "pratica":
        tipos = ["Prática", "Leitura", "Quiz", "Revisão"]
    elif estilo == "leitura":
        tipos = ["Leitura", "Revisão", "Quiz", "Prática"]
    else:
        tipos = tipos_base

    for dia in dias:
        plano[dia.lower()] = []
        horario_atual = horario_inicio

        for bloco in range(blocos):
            # Pausa a cada 2 blocos para rotinas longas
            if bloco > 0 and bloco % 2 == 0:
                plano[dia.lower()].append({
                    "horario": f"{horario_atual.strftime('%H:%M')}-{(horario_atual + timedelta(minutes=10)).strftime('%H:%M')}",
                    "atividade": "Pausa/Descanso"
                })
                horario_atual += timedelta(minutes=10)

            if conteudo_index >= len(conteudos):
                random.shuffle(conteudos)
                conteudo_index = 0

            conteudo = conteudos[conteudo_index]
            conteudo_index += 1

            hora_inicio = horario_atual.strftime("%H:%M")
            hora_fim = (horario_atual + timedelta(minutes=40)).strftime("%H:%M")

            # Último bloco do dia é revisão, se houver mais de 2 blocos
            if bloco == blocos - 1 and blocos > 2:
                tipo_atividade = "Revisão"
            else:
                tipo_atividade = tipos[bloco % len(tipos)]

            atividade = f"{tipo_atividade}: {conteudo.subject} - {conteudo.topic}"

            plano[dia.lower()].append({
                "horario": f"{hora_inicio}-{hora_fim}",
                "atividade": atividade
            })

            horario_atual += timedelta(minutes=40)

    # Após montar o plano diário:
    total_conteudos = len(set(f"{c.subject}-{c.topic}" for c in conteudos))
    dias_estudo = len([d for d in plano if plano[d]])
    total_blocos = sum(len([b for b in plano[d] if "atividade" in b and "Pausa" not in b["atividade"]]) for d in plano)

    metas_semanais = [
        f"Estudar pelo menos {min(5, total_conteudos)} conteúdos diferentes.",
        f"Realizar pelo menos {max(2, total_blocos // 4)} sessões de prática ou quiz.",
        f"Revisar conteúdos no último bloco de pelo menos {max(2, dias_estudo // 2)} dias.",
        f"Estudar em pelo menos {dias_estudo} dias nesta semana."
    ]

    return {
        "plano_diario": plano,
        "metas_semanais": metas_semanais
    }

# --- Rota para gerar plano de estudo com script ---
@onboarding_bp.route('/api/plano-estudo/gerar', methods=['POST'])
@login_required
def gerar_plano_estudo():
    user = User.query.get(current_user.id)
    if not user or not user.has_onboarding:
        return jsonify({"error": "Onboarding não encontrado."}), 400

    # Exemplo: buscar conteúdos do curso do usuário
    conteudos_db = SubjectContent.query.all()
    conteudos = [
        ConteudoModel(
            id=c.id,
            subject=c.subject,
            topic=c.topic,
            difficulty=getattr(c, "difficulty", "medium"),
            estimated_time=getattr(c, "estimated_time", 45),
            dependencies=getattr(c, "dependencies", [])
        ) for c in conteudos_db
    ]

    user_prefs = UserPreferences(
        available_days=user.dias_disponiveis or ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"],
        daily_study_time=int(user.tempo_diario or 120),
        learning_style=user.estilo_aprendizagem or "balanced",
        pace=user.ritmo or "moderate",
        start_time=user.horario_inicio or "08:00",
        focus_areas=user.focus_areas if hasattr(user, "focus_areas") else None
    )

    plano_semanal, plano_cards = generate_study_plan(user_prefs, conteudos)
    plano_estudo = PlanoEstudo(email=user.email, dados=plano_semanal)
    db.session.add(plano_estudo)
    db.session.commit()

    return jsonify({"plano_estudo": plano_semanal, "plano_cards": plano_cards})

# --- Rota opcional: buscar plano do usuário logado ---
@onboarding_bp.route('/api/planos/me', methods=['GET'])
@login_required
def get_plano_me():
    plano = PlanoEstudo.query.filter_by(email=current_user.email).order_by(PlanoEstudo.id.desc()).first()
    if plano:
        # Garante que retorna objeto, não string JSON
        dados = plano.dados
        if isinstance(dados, str):
            dados = json.loads(dados)
        return jsonify({"plano_estudo": dados})
    return jsonify({"plano_estudo": None})