from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models.models import db, User, PlanoEstudo, SubjectContent, HorariosEscolares, CursoMateria
from datetime import datetime, timedelta, time as dt_time
import random
from servicos.plano_estudo_avancado import generate_study_plan, Conteudo as ConteudoModel, UserPreferences
import json
from sqlalchemy.dialects.postgresql import ARRAY, TEXT

onboarding_bp = Blueprint('onboarding', __name__)

def _cap(s: str | None, n: int) -> str | None:
    if not s:
        return None
    s = str(s).strip()
    return s[:n] if len(s) > n else s

# --- Rota para salvar os dados do Onboarding ---
@onboarding_bp.route('/api/onboarding', methods=['POST'])
@login_required
def onboarding():
    data = request.get_json(silent=True) or {}

    def parse_array(value):
        # Aceita lista, string JSON ou string "Segunda,Terça"
        if value is None:
            return []
        if isinstance(value, list):
            return [str(v) for v in value if v is not None]
        if isinstance(value, str):
            try:
                j = json.loads(value)
                if isinstance(j, list):
                    return [str(v) for v in j if v is not None]
            except Exception:
                pass
            return [s.strip() for s in value.split(",") if s.strip()]
        return []

    def parse_time(v):
        if isinstance(v, str) and ":" in v:
            try:
                h, m = map(int, v.split(":")[:2])
                return dt_time(h, m)
            except Exception:
                return None
        return None

    user = User.query.get(current_user.id)
    if not user:
        return jsonify({"error": "Usuário não encontrado"}), 404

    user.has_onboarding = True
    user.idade = int(data.get("idade") or 0) or None
    user.escolaridade = _cap(data.get("escolaridade"), 64)
    user.objetivo = _cap(data.get("objetivo"), 120)

    # normaliza estilo e ritmo
    estilo = (data.get("estilo_aprendizagem") or "").strip().lower()
    ritmo = (data.get("ritmo") or "").strip().lower()
    mapa_estilo = {"pratica": "pratica", "teorica": "teorica", "visual": "visual", "auditiva": "auditiva", "mista": "mista"}
    mapa_ritmo = {"leve": "leve", "moderado": "moderado", "medio": "moderado", "desafiador": "desafiador", "alto": "desafiador"}
    user.estilo_aprendizagem = _cap(mapa_estilo.get(estilo, estilo or None), 32)
    user.ritmo = _cap(mapa_ritmo.get(ritmo, ritmo or None), 16)

    user.dias_disponiveis = parse_array(data.get("dias_disponiveis") or data.get("dias"))

    user.tempo_diario = int(data.get("tempo_diario") or 0) or None

    t = parse_time(data.get("horario_inicio"))
    if t:
        user.horario_inicio = t

    try:
        if data.get("curso_id") is not None:
            user.curso_id = int(data["curso_id"])
    except Exception:
        pass

    db.session.add(user)
    db.session.commit()

    return jsonify({"ok": True})

# --- Simples cache em memória (use Redis para produção) ---
plano_cache = {}

def _to_datetime_today(t: dt_time | None):
    """Converte um objeto time (ou None) em datetime hoje às HH:MM.
    Se t for None retorna hoje 08:00.
    """
    base = t or dt_time(8, 0)
    today = datetime.today().date()
    return datetime.combine(today, base)

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

    # horario_inicio pode ser datetime.time armazenado em User; evita usar strptime nesse caso
    if getattr(user, 'horario_inicio', None) and isinstance(user.horario_inicio, dt_time):
        horario_inicio = _to_datetime_today(user.horario_inicio)
    else:
        # fallback para string ou default
        valor = user.horario_inicio if isinstance(user.horario_inicio, str) else "08:00"
        try:
            h, m = map(int, str(valor).split(":")[:2])
            horario_inicio = _to_datetime_today(dt_time(h, m))
        except Exception:
            horario_inicio = _to_datetime_today(dt_time(8, 0))

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

    # Determina curso do usuário
    curso_id = getattr(user, 'curso_id', None)

    # Filtra conteúdos do DB apenas pelas matérias vinculadas ao curso, quando curso_id existir
    conteudos_db_query = SubjectContent.query
    if curso_id:
        try:
            # Buscar materias vinculadas ao curso
            materia_ids = [row[0] for row in db.session.query(CursoMateria.materia_id).filter_by(curso_id=curso_id).all()]
            if materia_ids:
                conteudos_db_query = conteudos_db_query.filter(SubjectContent.materia_id.in_(materia_ids))
            else:
                conteudos_db_query = conteudos_db_query.filter(False)  # nenhum conteúdo
        except Exception:
            pass
    conteudos_db = conteudos_db_query.all()

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
        start_time=(user.horario_inicio.strftime("%H:%M") if getattr(user, "horario_inicio", None) else "08:00"),
        focus_areas=user.focus_areas if hasattr(user, "focus_areas") else None
    )

    # Carrega último plano salvo para reaproveitar revisões agendadas e pendências
    plano_salvo = PlanoEstudo.query.filter_by(email=user.email).order_by(PlanoEstudo.id.desc()).first()
    plano_dados_salvo = None
    if plano_salvo and plano_salvo.dados:
        try:
            plano_dados_salvo = plano_salvo.dados if isinstance(plano_salvo.dados, dict) else json.loads(plano_salvo.dados)
        except Exception:
            plano_dados_salvo = None

    plano_semanal, plano_cards = generate_study_plan(user_prefs, conteudos, semana_anterior=(plano_dados_salvo or {}).get('days'), plano_dados_salvo=plano_dados_salvo)

    # Persiste novo plano
    plano_estudo = PlanoEstudo(email=user.email, dados=plano_semanal)
    db.session.add(plano_estudo)
    db.session.commit()

    return jsonify({"plano_estudo": plano_semanal, "plano_cards": plano_cards})

# --- Rota opcional: buscar plano do usuário logado ---
# Removida a rota '/api/planos/me' deste blueprint para evitar conflito com main.py
# Utilize '/api/planos/me-auth' quando precisar exigir autenticação na consulta
@onboarding_bp.route('/api/planos/me-auth', methods=['GET'])
@login_required
def get_plano_me_auth():
    plano = PlanoEstudo.query.filter_by(email=current_user.email).order_by(PlanoEstudo.id.desc()).first()
    if plano:
        dados = plano.dados
        if isinstance(dados, str):
            dados = json.loads(dados)
        return jsonify({"plano_estudo": dados})
    return jsonify({"plano_estudo": None})

@onboarding_bp.route('/api/onboarding/status/<int:user_id>', methods=['GET'])
@login_required
def get_onboarding_status(user_id: int):
    # Permite apenas que o próprio usuário consulte seu status
    if not current_user or current_user.id != user_id:
        return jsonify({"error": "Forbidden"}), 403
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Usuário não encontrado"}), 404
    return jsonify({
        "user_id": user.id,
        "email": user.email,
        "has_onboarding": bool(getattr(user, 'has_onboarding', False)),
        "curso_id": getattr(user, 'curso_id', None),
        "status": "completed" if getattr(user, 'has_onboarding', False) else "pending"
    })

@onboarding_bp.route('/api/onboarding/status/me', methods=['GET'])
@login_required
def get_onboarding_status_me():
    # Atalho para o usuário logado
    user = User.query.get(current_user.id)
    if not user:
        return jsonify({"error": "Usuário não encontrado"}), 404
    return jsonify({
        "user_id": user.id,
        "email": user.email,
        "has_onboarding": bool(getattr(user, 'has_onboarding', False)),
        "curso_id": getattr(user, 'curso_id', None),
        "status": "completed" if getattr(user, 'has_onboarding', False) else "pending"
    })

# --- Legacy alias to avoid 404s: /api/planos/me (session-based) ---
@onboarding_bp.route('/api/planos/me', methods=['GET'])
@login_required
def get_plano_me_legacy():
    """Alias para retornar o último plano do usuário autenticado, compatível com chamadas legacy a /api/planos/me."""
    plano = PlanoEstudo.query.filter_by(email=current_user.email).order_by(PlanoEstudo.id.desc()).first()
    if plano:
        dados = plano.dados
        if isinstance(dados, str):
            try:
                dados = json.loads(dados)
            except Exception:
                pass
        return jsonify({"plano_estudo": dados})
    return jsonify({"plano_estudo": None})

# --- NOVOS ENDPOINTS PARA ALINHAR COM O FRONTEND ---

def _coerce_json(data):
    try:
        if isinstance(data, str):
            return json.loads(data)
    except Exception:
        pass
    return data

@onboarding_bp.route('/api/planos/por-email', methods=['GET'])
@login_required
def get_plano_por_email():
    """Retorna o último plano salvo para o e-mail informado (deve ser o do usuário autenticado)."""
    email = (request.args.get('email') or '').strip().lower() or current_user.email
    if not email:
        return jsonify({"plano_estudo": None}), 200
    # Segurança: o e-mail solicitado deve ser o do usuário logado
    if email != (current_user.email or '').lower():
        return jsonify({"error": "Forbidden"}), 403
    plano = PlanoEstudo.query.filter_by(email=email).order_by(PlanoEstudo.id.desc()).first()
    if not plano:
        return jsonify({"plano_estudo": None}), 200
    dados = _coerce_json(plano.dados)
    return jsonify({"plano_estudo": dados}), 200

@onboarding_bp.route('/api/planos/atualizar-status-bloco', methods=['POST'])
@login_required
def atualizar_status_bloco():
    """Atualiza o status de um bloco dentro do plano salvo.
    Body: { email, date: 'dd/MM/YYYY', blockIndex?: number, id?: number|string, status: 'pendente'|'dificuldade'|'ok' }
    """
    try:
        body = request.get_json(force=True) or {}
    except Exception:
        body = {}
    email = (body.get('email') or '').strip().lower() or current_user.email
    date = body.get('date')
    status = (body.get('status') or '').strip().lower()
    block_index = body.get('blockIndex')
    block_id = body.get('id')

    if email != (current_user.email or '').lower():
        return jsonify({"error": "Forbidden"}), 403
    if not date or not status:
        return jsonify({"error": "Dados incompletos"}), 400

    plano = PlanoEstudo.query.filter_by(email=email).order_by(PlanoEstudo.id.desc()).first()
    if not plano:
        return jsonify({"error": "Plano não encontrado"}), 404

    dados = _coerce_json(plano.dados) or {}
    days = dados.get('days') if isinstance(dados, dict) else None
    if not isinstance(days, list):
        return jsonify({"error": "Formato de plano inválido"}), 400

    # Localiza o dia
    dia = next((d for d in days if d.get('date') == date), None)
    if not dia:
        return jsonify({"error": "Dia não encontrado no plano"}), 404

    blocks = dia.get('blocks') if isinstance(dia, dict) else None
    if not isinstance(blocks, list) or not blocks:
        return jsonify({"error": "Blocos não encontrados"}), 404

    updated = False
    if isinstance(block_index, int) and 0 <= block_index < len(blocks):
        blocks[block_index]['status'] = status
        updated = True
    elif block_id is not None:
        for b in blocks:
            if str(b.get('id')) == str(block_id):
                b['status'] = status
                updated = True
                break

    if not updated:
        return jsonify({"error": "Bloco não encontrado"}), 404

    # Persiste alterações
    plano.dados = dados
    try:
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@onboarding_bp.route('/api/planos/pendencias', methods=['GET'])
@login_required
def listar_pendencias():
    email = (request.args.get('email') or '').strip().lower() or current_user.email
    if email != (current_user.email or '').lower():
        return jsonify({"error": "Forbidden"}), 403

    plano = PlanoEstudo.query.filter_by(email=email).order_by(PlanoEstudo.id.desc()).first()
    if not plano:
        return jsonify({"pendencias": []})
    dados = _coerce_json(plano.dados) or {}
    days = dados.get('days') if isinstance(dados, dict) else []

    pendencias = []
    for d in days or []:
        date = d.get('date')
        for idx, b in enumerate(d.get('blocks') or []):
            st = (b.get('status') or 'ok').lower()
            if st in {'pendente', 'dificuldade'}:
                pendencias.append({
                    "id": b.get('id'),
                    "subject": b.get('subject'),
                    "topic": b.get('topic'),
                    "date": date,
                    "start_time": b.get('start_time'),
                    "end_time": b.get('end_time'),
                    "activity_type": b.get('activity_type'),
                    "status": st,
                    "idx": idx,
                })
    return jsonify({"pendencias": pendencias})

@onboarding_bp.route('/api/planos/concluir-bloco', methods=['POST'])
@login_required
def concluir_bloco():
    try:
        body = request.get_json(force=True) or {}
    except Exception:
        body = {}
    body['status'] = 'ok'
    return atualizar_status_bloco()

@onboarding_bp.route('/api/planos/marcar-revisao', methods=['POST'])
@login_required
def marcar_revisao():
    """Adiciona um bloco de revisão, por padrão no próximo sábado, às 19:00 por 45 min.
    Body: { email, conteudo_id, date?: 'dd/MM/YYYY', start_time?: 'HH:MM', duration?: number }
    """
    try:
        body = request.get_json(force=True) or {}
    except Exception:
        body = {}

    email = (body.get('email') or '').strip().lower() or current_user.email
    conteudo_id = body.get('conteudo_id')
    date = body.get('date')  # opcional
    start_time = (body.get('start_time') or '19:00').strip()
    duration = int(body.get('duration') or 45)

    if email != (current_user.email or '').lower():
        return jsonify({"error": "Forbidden"}), 403
    if not conteudo_id:
        return jsonify({"error": "conteudo_id obrigatório"}), 400

    # Busca conteúdo para preencher subject/topic
    conteudo = SubjectContent.query.get(conteudo_id)
    if not conteudo:
        return jsonify({"error": "Conteúdo não encontrado"}), 404

    # Determina a data alvo (próximo sábado se não informado)
    if not date:
        hoje = datetime.now()
        # weekday(): Monday=0 ... Sunday=6; Saturday=5
        days_ahead = (5 - hoje.weekday() + 7) % 7
        alvo = hoje + timedelta(days=days_ahead)
        date = alvo.strftime('%d/%m/%Y')

    # Carrega plano existente
    plano = PlanoEstudo.query.filter_by(email=email).order_by(PlanoEstudo.id.desc()).first()
    if not plano:
        return jsonify({"error": "Plano não encontrado"}), 404

    dados = _coerce_json(plano.dados) or {}
    if not isinstance(dados, dict):
        return jsonify({"error": "Formato de plano inválido"}), 400

    days = dados.setdefault('days', [])
    dia = next((d for d in days if d.get('date') == date), None)
    if not dia:
        dia = {"date": date, "blocks": [], "total_study_time": 0}
        days.append(dia)

    # Cria bloco de revisão
    bloco = {
        "id": conteudo.id,
        "start_time": start_time,
        "end_time": start_time,  # opcionalmente calcule pelo duration
        "activity_type": "revisão",
        "subject": conteudo.subject,
        "topic": conteudo.topic,
        "duration": duration,
        "priority": 1,
        "status": "pendente",
    }
    # Ajusta end_time conforme duration
    try:
        t0 = datetime.strptime(start_time, '%H:%M')
        t1 = t0 + timedelta(minutes=duration)
        bloco['end_time'] = t1.strftime('%H:%M')
    except Exception:
        pass

    dia_blocks = dia.setdefault('blocks', [])
    dia_blocks.append(bloco)
    dia['total_study_time'] = int(dia.get('total_study_time') or 0) + duration

    plano.dados = dados
    try:
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500