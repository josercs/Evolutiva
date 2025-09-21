import os, re, json, time, threading, requests, logging
from datetime import datetime, timedelta
from flask import jsonify, request, send_from_directory
from werkzeug.utils import secure_filename
from sqlalchemy import text
try:
    from flask_login import current_user, login_required  # type: ignore
except Exception:  # fallback se flask_login não instalado
    def login_required(f):  # type: ignore
        return f
    class _Anon:
        is_authenticated = False
    current_user = _Anon()  # type: ignore
from models.models import db, SubjectContent, HorariosEscolares, PlanoEstudo, User, YouTubeCache, Curso
from routes.auth_routes import login as auth_login  # type: ignore
from app_factory import create_app

app = create_app()
limiter = getattr(app, 'limiter', None)
_lmts_burst = getattr(app, 'limits_burst', '10 per minute')
YT_API_KEY = os.getenv('YT_API_KEY')
GEMINI_API_KEY = os.getenv('GOOGLE_API_KEY')
GEMINI_MODEL = os.getenv('GOOGLE_DEFAULT_MODEL', 'models/gemini-1.5-flash-latest')
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

    # Upload folder resolution
_CDIR = os.path.dirname(__file__)
_BACKEND_DIR = os.path.abspath(os.path.join(_CDIR, '..'))
_ROOT_DIR = os.path.abspath(os.path.join(_CDIR, '..', '..'))
_CANDIDATES = [os.path.join(_ROOT_DIR, 'uploads'), os.path.join(_BACKEND_DIR, 'uploads')]
UPLOAD_FOLDER = next((p for p in _CANDIDATES if os.path.isdir(p)), _CANDIDATES[0])
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

    # Cache YouTube (usa variáveis definidas na factory se quiser evoluir)
_YT_CACHE: dict[str, tuple[float, list[dict]]] = {}
_YT_CACHE_TTL = int(os.getenv('YT_CACHE_TTL', '600'))
_YT_CACHE_MAX_ROWS = int(os.getenv('YT_CACHE_MAX_ROWS', '2000'))

def _prune_youtube_cache(max_rows: int = _YT_CACHE_MAX_ROWS):
    try:
        total = db.session.query(YouTubeCache.id).count()
        excess = max(0, total - int(max_rows))
        if excess > 0:
            ids = [rid for (rid,) in db.session.query(YouTubeCache.id)
                   .order_by(YouTubeCache.created_at.asc())
                   .limit(excess)
                   .all()]
            if ids:
                db.session.query(YouTubeCache).filter(YouTubeCache.id.in_(ids)).delete(synchronize_session=False)
                db.session.commit()
    except Exception:
        db.session.rollback()

def _refresh_yt_cache_async(query: str, max_results: int):
    try:
        api_key = os.getenv('YT_API_KEY') or YT_API_KEY
        if not api_key or not query:
            return
        resp = requests.get(
            'https://www.googleapis.com/youtube/v3/search',
            params={
                'key': api_key,
                'part': 'snippet',
                'type': 'video',
                'q': query,
                'maxResults': max_results,
                'safeSearch': 'moderate'
            }, timeout=4
        )
        resp.raise_for_status()
        data = resp.json()
        items = data.get('items', [])
        videos = []
        for it in items:
            vid = (it.get('id') or {}).get('videoId')
            sn = (it.get('snippet') or {})
            if not vid:
                continue
            videos.append({
                'id': vid,
                'title': sn.get('title'),
                'channelTitle': sn.get('channelTitle'),
                'thumbnail': ((sn.get('thumbnails') or {}).get('medium') or {}).get('url')
                    or ((sn.get('thumbnails') or {}).get('default') or {}).get('url')
            })
        now = time.time()
        cache_key = f"{query}|{max_results}"
        _YT_CACHE[cache_key] = (now, videos)
        try:
            db.session.add(YouTubeCache(query=query, max_results=max_results, results=videos))
            db.session.commit()
            _prune_youtube_cache(_YT_CACHE_MAX_ROWS)
        except Exception:
            db.session.rollback()
    except Exception:
        pass

_APP_START_TIME = time.time()

_APP_START_TIME = time.time()

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health básico retrocompatível."""
    uptime = int(time.time() - _APP_START_TIME)
    # Check DB quickly
    db_ok = True
    try:
        db.session.execute(text('SELECT 1'))
    except Exception:
        db_ok = False
    return jsonify({
        "status": "online",
        "message": "API do Sistema de Estudos está funcionando!",
        "uptime_seconds": uptime,
        "db_ok": db_ok
    })

@app.route('/')
def index():
    return jsonify({"message": "API do Sistema de Estudos"})

@app.route('/db-test')
def db_test():
    try:
        with app.app_context():
            db.session.execute(text('SELECT 1'))
        return jsonify({"status": "ok", "message": "Conexão com o banco de dados funcionando!"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- Cursos (único) ---
@app.route('/api/courses', methods=['GET'])
def api_courses():
    return api_cursos()

# Alias em PT
@app.route('/api/cursos', methods=['GET'])
def api_cursos():
    try:
        rows = Curso.query.order_by(Curso.nome.asc()).all()
        return jsonify([{"id": c.id, "nome": c.nome} for c in rows])
    except Exception as e:
        logging.warning(f"ORM Curso falhou, tentando SQL direto: {e}")
        try:
            rows = db.session.execute(text("SELECT id, nome FROM cursos ORDER BY nome ASC")).fetchall()
            return jsonify([{"id": row.id, "nome": row.nome} for row in rows])
        except Exception:
            logging.exception("Erro ao listar cursos")
            return jsonify([]), 200

# --- Conteúdos por matéria (por nome) ---
@app.route('/api/conteudo/<materia>', methods=['GET'])
def get_conteudo_materia(materia):
    try:
        rows = (
            db.session.query(
                SubjectContent.id,
                SubjectContent.subject,
                SubjectContent.topic,
                SubjectContent.created_at,
            )
            .join(HorariosEscolares, SubjectContent.materia_id == HorariosEscolares.id)
            .filter(HorariosEscolares.materia == materia)
            .order_by(SubjectContent.created_at.desc())
            .all()
        )
        conteudos = [
            {
                "id": rid,
                "subject": subject,
                "topic": topic,
                "created_at": created_at.strftime('%d/%m/%Y %H:%M') if created_at else "",
            }
            for (rid, subject, topic, created_at) in rows
        ]
        return jsonify({"conteudos": conteudos})
    except Exception as e:
        return jsonify({"conteudos": [], "error": str(e)}), 500

# --- Conteúdo HTML por id (único) ---
@app.route('/api/conteudo_html/<int:conteudo_id>', methods=['GET'])
def get_conteudo_html(conteudo_id):
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
            # Reescreve URLs relativas de imagem para absolutas (carregando do backend)
            try:
                base = request.host_url.rstrip('/')
                html = row[3] or ""
                # casos comuns: src="/uploads/..", src='uploads/..', url(/uploads/..)
                html = re.sub(r"src=[\"']\s*/?uploads/", f'src="{base}/uploads/', html)
                html = re.sub(r'url\(\s*/?uploads/', f'url({base}/uploads/', html)
            except Exception:
                html = row[3] or ""
            return jsonify({
                "id": row[0],
                "subject": row[1],
                "topic": row[2],
                "content_html": html,
                "materia": row[4],
            })
        else:
            return jsonify({"error": "Conteúdo não encontrado"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- Gemini: Quiz ---
@app.route('/api/generate_quiz/<int:conteudo_id>', methods=['GET'])
def generate_quiz(conteudo_id):
    sc = SubjectContent.query.get(conteudo_id)
    if not sc:
        return jsonify({"error": "Conteúdo não encontrado"}), 404

    content_html = sc.content_html or ""
    prompt = (
        "Gere 8 perguntas de múltipla escolha sobre o seguinte conteúdo, com 4 opções cada e destaque a correta e forneça uma explicação curta para cada resposta correta. "
        "Responda no formato JSON: [{question, options:[], answer}]\n\n"
        f"{content_html}"
        "Ao final, forneça também um feedback geral sobre o desempenho do aluno, considerando as respostas dadas (você receberá as respostas do aluno depois), apontando pontos fortes e o que ele pode melhorar para dominar o conteúdo."
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        text_resp = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        match = re.search(r"```json\s*(.*?)\s*```", text_resp, re.DOTALL)
        json_str = match.group(1) if match else text_resp
        try:
            questions = json.loads(json_str)
        except Exception:
            questions = []
        return jsonify({"questions": questions})
    except Exception as e:
        return jsonify({"error": "Erro ao gerar quiz", "details": str(e)}), 500

# --- Gemini: Feynman Feedback ---
@app.route('/api/gemini_feynman', methods=['POST'])
def gemini_feynman():
    data = request.get_json()
    texto = data.get("texto", "")
    conteudo = data.get("conteudo", "")
    prompt = (
        f'O estudante explicou o conteúdo assim: "{texto}"\n'
        f'O conteúdo original é: "{conteudo}"\n'
        "Dê um feedback construtivo, aponte acertos e pontos a melhorar."
    )
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    if not GEMINI_API_KEY:
        return jsonify({"error": "GEMINI_API_KEY ausente."}), 503
    try:
        response = requests.post(url, json=payload, timeout=20)
        response.raise_for_status()
        feedback = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        return jsonify({"feedback": feedback})
    except Exception as e:
        logging.exception("/api/feynman_feedback error")
        return jsonify({"error": "Erro ao gerar feedback", "details": str(e)}), 502

# --- Gemini: Quiz Feedback ---
@app.route('/api/quiz_feedback', methods=['POST'])
def quiz_feedback():
    data = request.get_json()
    questions = data.get("questions", [])
    answers = data.get("answers", [])
    conteudo = data.get("conteudo", "")

    respostas = []
    for i, q in enumerate(questions):
        resposta_aluno = answers[i] if i < len(answers) else None
        respostas.append({
            "pergunta": q.get("question"),
            "resposta_correta": q.get("answer"),
            "resposta_aluno": resposta_aluno,
            "explicacao": q.get("explanation", "")
        })

    prompt = (
        "Considere o seguinte conteúdo estudado:\n"
        f"{conteudo}\n\n"
        "Aqui estão as perguntas do quiz, a resposta correta e a resposta do aluno:\n"
        f"{respostas}\n\n"
        "Com base nisso, forneça um feedback geral sobre o desempenho do aluno, destacando acertos, erros, pontos fortes e o que ele pode melhorar para dominar o conteúdo."
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    if not GEMINI_API_KEY:
        return jsonify({"error": "GEMINI_API_KEY ausente."}), 503
    try:
        response = requests.post(url, json=payload, timeout=25)
        response.raise_for_status()
        feedback = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        return jsonify({"feedback": feedback})
    except Exception as e:
        logging.exception("/api/quiz_feedback error")
        return jsonify({"error": "Erro ao gerar feedback do quiz", "details": str(e)}), 502

# --- Gemini: Mapa Mental ---
@app.route('/api/generate_mindmap', methods=['POST'])
def generate_mindmap():
    try:
        data = request.get_json(force=True)

        content = (data.get("content") or "").strip()
        topic = (data.get("topic") or "").strip()

        if not content or not topic:
            return jsonify({"error": "Campos 'content' e 'topic' são obrigatórios."}), 400

        prompt = f"""
Leia o texto abaixo e gere um mapa mental em JSON, agrupando subtópicos por afinidade.
Cada subtópico deve ser apenas uma palavra ou expressão curta (máximo 4 palavras, nunca frases longas ou parágrafos).
Formato de resposta:
{{
  "topic": "{topic}",
  "related_topics": ["Operações", "Propriedades", "Fórmulas", "Representação"],
  "subtopics": {{
    "Operações": ["União", "Interseção", "Diferença", "Complementar"],
    "Propriedades": ["Comutativa", "Associativa", "Distributiva"],
    "Fórmulas": ["Inclusão-Exclusão", "Conjuntos Disjuntos"],
    "Representação": ["Diagramas de Venn", "Extensão"]
  }}
}}
Apenas arrays de strings curtas, sem objetos aninhados, sem frases longas, sem explicações.
"""

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        response = requests.post(url, json=payload)
        response.raise_for_status()

        response_text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        match = re.search(r"\{[\s\S]+\}", response_text)
        if not match:
            return jsonify({"error": "Resposta da IA não contém JSON válido."}), 500

        mindmap = json.loads(match.group(0))

        # Sanitiza os subtópicos
        def is_short_term(s):
            return (
                isinstance(s, str)
                and 2 < len(s) < 40
                and len(s.split()) <= 4
                and not any(p in s for p in ".!?;:,")
                and not s.lower().startswith(("resumo", "conclusão", "em resumo", "em síntese", "em suma"))
            )

        for key, items in (mindmap.get("subtopics") or {}).items():
            mindmap["subtopics"][key] = [str(s).strip() for s in items if is_short_term(s)]

        return jsonify(mindmap)

    except requests.exceptions.RequestException as req_err:
        return jsonify({"error": "Erro na comunicação com a API Gemini", "details": str(req_err)}), 502
    except json.JSONDecodeError:
        return jsonify({"error": "Falha ao decodificar JSON da resposta da IA"}), 500
    except Exception as e:
        return jsonify({"error": "Erro interno no servidor", "details": str(e)}), 500

# --- Planos de estudo ---
@app.route('/api/planos', methods=['GET', 'POST'])
def planos():
    email = request.args.get('email') if request.method == 'GET' else (request.json or {}).get('email')
    if not email:
        return jsonify({'error': 'Email é obrigatório'}), 400
    if request.method == 'GET':
        plano = PlanoEstudo.query.filter_by(email=email).first()
        return jsonify({'plano': plano.dados if plano else []})
    else:
        dados = (request.json or {}).get('plano')
        if dados is None:
            return jsonify({'error': 'Campo "plano" é obrigatório'}), 400
        plano = PlanoEstudo.query.filter_by(email=email).first()
        if plano:
            plano.dados = dados
        else:
            plano = PlanoEstudo(email=email, dados=dados)
            db.session.add(plano)
        db.session.commit()
        return jsonify({'ok': True})

# --- Gemini: Cronograma de Estudos ---
@app.route('/api/gemini', methods=['POST'])
def gemini():
    data = request.json or {}
    materias = data.get('materias', [])
    dias = data.get('dias', [])
    horarios = data.get('horarios', [])

    prompt = (
        "Você é um assistente educacional. Gere um cronograma de estudos semanal personalizado para o estudante, "
        "usando as matérias e conteúdos abaixo. Distribua os conteúdos ao longo dos dias e horários disponíveis, "
        "sem repetir conteúdos, e balanceando as matérias. Responda em JSON, no formato:\n"
        '[{"dia": "Segunda", "horario": "09:00", "materia": "Matemática", "conteudo": "Funções Quadráticas"}, ...]\n\n'
        "Matérias e conteúdos:\n"
    )
    for m in materias:
        conteudos_validos = [
            f"{c['subject']}: {c['topic']}"
            for c in (m.get('conteudos') or [])
            if isinstance(c, dict) and c.get('subject') and c.get('topic')
        ]
        if conteudos_validos:
            prompt += f"- {m.get('materia')}: {', '.join(conteudos_validos)}\n"
    prompt += f"\nDias disponíveis: {', '.join(dias)}\n"
    prompt += f"Horários disponíveis: {', '.join(horarios)}\n"
    prompt += "Não escreva nada além do JSON."

    try:
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        response = requests.post(GEMINI_API_URL, json=payload)
        response.raise_for_status()
        text_resp = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        return jsonify({"resultado": text_resp})
    except Exception as e:
        return jsonify({"erro": str(e), "prompt": prompt}), 500

# --- Upload/Download Avatar ---
@app.route('/api/usuarios/avatar', methods=['POST'])
def upload_avatar():
    email = request.form.get('email')
    avatar = request.files.get('avatar')

    if not email or not avatar:
        return jsonify({"error": "Email e arquivo de avatar são obrigatórios."}), 400

    filename = secure_filename(f"{email}_{avatar.filename}")
    avatar_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    avatar.save(avatar_path)

    avatar_url = f"/uploads/{filename}"

    try:
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"error": "Usuário não encontrado"}), 404
        user.avatar_url = avatar_url
        db.session.commit()
        return jsonify({"avatarUrl": avatar_url})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/usuarios/avatar', methods=['GET'])
def get_avatar():
    email = request.args.get('email')
    if not email:
        return jsonify({"avatarUrl": ""})
    try:
        user = User.query.filter_by(email=email).first()
        return jsonify({"avatarUrl": user.avatar_url if user and user.avatar_url else ""})
    except Exception:
        return jsonify({"avatarUrl": ""}), 500

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Endpoint esperado pela HomePage: retorna estrutura com materias e achievements
@app.route('/api/progresso', methods=['GET'])
def progresso_dashboard_stub():
    try:
        user = None
        try:
            if current_user and getattr(current_user, 'is_authenticated', False):
                user = current_user
        except Exception:
            pass
        return jsonify({
            "materias": [],
            "achievements": [],
            "xp": 0,
            "streak": 0,
            "newAchievement": False
        })
    except Exception as e:
        return jsonify({"materias": [], "achievements": [], "error": str(e)})

@app.route('/api/progress')
def get_progress():
    email = request.args.get('email')
    if not email:
        return jsonify({"progress": 0})
    return jsonify({"progress": 0})

# Onboarding
@app.route("/api/user/onboarding", methods=["PATCH"])
@login_required
def complete_onboarding():
    user = User.query.get(current_user.id)
    if not user:
        return jsonify({"error": "Usuário não encontrado"}), 404
    user.has_onboarding = True
    db.session.commit()
    return jsonify({"message": "Onboarding concluído!"})

# Legacy aliases to align endpoints
@app.route('/api/login', methods=['POST'])
def legacy_login_alias():
    # Delegate to /api/auth/login ensuring identical behavior
    return auth_login()

# Alias de usuário atual usado pelo frontend
@app.route('/api/users/me', methods=['GET'])
def users_me():
    try:
        if not (current_user and getattr(current_user, 'is_authenticated', False)):
            return jsonify({"error": "Unauthorized"}), 401
        return jsonify({
            "id": current_user.id,
            "email": current_user.email,
            "nome": getattr(current_user, 'nome', None) or (current_user.email or '').split('@')[0],
            "avatar_url": getattr(current_user, 'avatar_url', None),
            "xp": getattr(current_user, 'xp', 0),
            "streak": getattr(current_user, 'streak', 0),
        })
    except Exception:
        return jsonify({"error": "Unauthorized"}), 401

# Alias extra para compatibilidade
@app.route('/api/user/me', methods=['GET'])
def user_me_alias():
    return users_me()

# --- YouTube helper: prune persistent cache ---
def _prune_youtube_cache(max_rows: int = _YT_CACHE_MAX_ROWS):
    try:
        total = db.session.query(YouTubeCache.id).count()
        excess = max(0, total - int(max_rows))
        if excess > 0:
            ids = [rid for (rid,) in db.session.query(YouTubeCache.id)
                   .order_by(YouTubeCache.created_at.asc())
                   .limit(excess)
                   .all()]
            if ids:
                db.session.query(YouTubeCache).filter(YouTubeCache.id.in_(ids)).delete(synchronize_session=False)
                db.session.commit()
    except Exception:
        db.session.rollback()

def _refresh_yt_cache_async(query: str, max_results: int):
    """Atualiza o cache do YouTube em background sem bloquear a resposta."""
    try:
        api_key = os.getenv('YT_API_KEY') or YT_API_KEY
        if not api_key or not query:
            return
        resp = requests.get(
            'https://www.googleapis.com/youtube/v3/search',
            params={
                'key': api_key,
                'part': 'snippet',
                'type': 'video',
                'q': query,
                'maxResults': max_results,
                'safeSearch': 'moderate'
            }, timeout=4
        )
        resp.raise_for_status()
        data = resp.json()
        items = data.get('items', [])
        videos = []
        for it in items:
            vid = (it.get('id') or {}).get('videoId')
            sn = it.get('snippet') or {}
            if not vid:
                continue
            videos.append({
                'id': vid,
                'title': sn.get('title'),
                'channelTitle': sn.get('channelTitle'),
                'thumbnail': ((sn.get('thumbnails') or {}).get('medium') or {}).get('url')
                    or ((sn.get('thumbnails') or {}).get('default') or {}).get('url')
            })
        now = time.time()
        cache_key = f"{query}|{max_results}"
        _YT_CACHE[cache_key] = (now, videos)
        try:
            db.session.add(YouTubeCache(query=query, max_results=max_results, results=videos))
            db.session.commit()
            _prune_youtube_cache(_YT_CACHE_MAX_ROWS)
        except Exception:
            db.session.rollback()
    except Exception:
        pass

# --- YouTube API ---
@app.route('/api/videos', methods=['GET'])
@limiter.limit(_lmts_burst)
def get_videos():
    """Busca vídeos no YouTube com cache em memória e persistente.
    Parâmetros: q (query), maxResults (padrão 6)
    Retorno: { videos: [ { id, title, channelTitle, thumbnail } ] }
    """
    query = request.args.get('q') or request.args.get('query') or ''
    max_results = request.args.get('maxResults') or 6
    try:
        max_results = int(max_results)
    except Exception:
        max_results = 6

    if not query:
        return jsonify({"videos": []})

    api_key = os.getenv('YT_API_KEY') or YT_API_KEY
    if not api_key:
        return jsonify({"videos": [], "error": "YT_API_KEY não configurada"}), 200

    # Cache lookup (in-memory hot cache)
    cache_key = f"{query}|{max_results}"
    now = time.time()
    cached = _YT_CACHE.get(cache_key)
    if cached:
        ts, vids = cached
        if now - ts < _YT_CACHE_TTL:
            resp = jsonify({"videos": vids})
            resp.headers["Cache-Control"] = "public, max-age=300"
            return resp
        else:
            _YT_CACHE.pop(cache_key, None)

    # Persistent cache lookup
    try:
        row = YouTubeCache.query.filter_by(query=query, max_results=max_results) \
            .order_by(YouTubeCache.created_at.desc()).first()
        if row:
            # Se cache persistente existe mas pode estar expirado, devolve "stale" e atualiza em background
            threading.Thread(target=_refresh_yt_cache_async, args=(query, max_results), daemon=True).start()
            _YT_CACHE[cache_key] = (now, row.results)
            resp = jsonify({"videos": row.results})
            resp.headers["Cache-Control"] = "public, max-age=300"
            return resp
    except Exception:
        pass

    # Fetch from YouTube
    try:
        resp = requests.get(
            'https://www.googleapis.com/youtube/v3/search',
            params={
                'key': api_key,
                'part': 'snippet',
                'type': 'video',
                'q': query.strip()[:160],
                'maxResults': max_results,
                'safeSearch': 'moderate'
            }, timeout=4  # reduzido
        )
        resp.raise_for_status()
        data = resp.json()
        items = data.get('items', [])
        videos = []
        for it in items:
            vid = (it.get('id') or {}).get('videoId')
            sn = it.get('snippet') or {}
            if not vid:
                continue
            videos.append({
                'id': vid,
                'title': sn.get('title'),
                'channelTitle': sn.get('channelTitle'),
                'thumbnail': ((sn.get('thumbnails') or {}).get('medium') or {}).get('url')
                    or ((sn.get('thumbnails') or {}).get('default') or {}).get('url')
            })
        # Store in caches
        _YT_CACHE[cache_key] = (now, videos)
        try:
            db.session.add(YouTubeCache(query=query, max_results=max_results, results=videos))
            db.session.commit()
            _prune_youtube_cache(_YT_CACHE_MAX_ROWS)
        except Exception:
            db.session.rollback()
        out = jsonify({"videos": videos})
        out.headers["Cache-Control"] = "public, max-age=300"
        return out
    except Exception as e:
        # Fallback simples: retorna lista vazia, sem quebrar UI
        return jsonify({"videos": [], "error": str(e)}), 200

@app.route('/api/videos/cache/stats', methods=['GET'])
def yt_cache_stats():
    try:
        # Persistent total
        total = db.session.query(YouTubeCache.id).count()
    except Exception:
        total = None
    # Memory cache size and keys (redacted)
    mem_size = len(_YT_CACHE)
    ttl = _YT_CACHE_TTL
    max_rows = _YT_CACHE_MAX_ROWS
    return jsonify({
        'memory_cache_entries': mem_size,
        'persistent_total': total,
        'ttl_seconds': ttl,
        'max_rows': max_rows,
    })

@app.route('/api/videos/cache/purge', methods=['POST'])
def yt_cache_purge():
    try:
        body = request.get_json(force=True) or {}
    except Exception:
        body = {}
    clear_memory = bool(body.get('clear_memory'))
    purged = 0
    if clear_memory:
        _YT_CACHE.clear()
    # Purge expired from persistent cache
    try:
        cutoff = datetime.utcnow() - timedelta(seconds=_YT_CACHE_TTL)
        ids = [rid for (rid,) in db.session.query(YouTubeCache.id)
               .filter(YouTubeCache.created_at < cutoff)
               .all()]
        if ids:
            db.session.query(YouTubeCache).filter(YouTubeCache.id.in_(ids)).delete(synchronize_session=False)
            db.session.commit()
            purged = len(ids)
    except Exception:
        db.session.rollback()
    try:
        total = db.session.query(YouTubeCache.id).count()
    except Exception:
        total = None
    return jsonify({'ok': True, 'cleared_memory': clear_memory, 'purged_rows': purged, 'persistent_total': total})

@app.route('/api/videos/batch', methods=['POST'])
@limiter.limit(_lmts_burst)
def get_videos_batch():
    """Busca múltiplas listas de vídeos por diferentes queries em uma única chamada.
    Body: { queries: [{ key: string, q: string, maxResults?: number }] }
    Resposta: { results: { [key: string]: Array<{ id, title, channelTitle, thumbnail }> }, errors?: { [key: string]: string } }
    """
    try:
        payload = request.get_json(force=True) or {}
    except Exception:
        payload = {}
    queries = payload.get('queries') or []

    if not isinstance(queries, list):
        return jsonify({"results": {}, "errors": {"_": "Formato inválido"}}), 400

    MAX_QUERIES = 12
    results: dict[str, list] = {}
    errors: dict[str, str] = {}

    api_key = os.getenv('YT_API_KEY') or YT_API_KEY
    if not api_key:
        for item in queries[:MAX_QUERIES]:
            k = (item or {}).get('key') or ''
            if k:
                results[k] = []
                errors[k] = 'YT_API_KEY não configurada'
        return jsonify({"results": results, "errors": errors}), 200

    now = time.time()

    for item in queries[:MAX_QUERIES]:
        try:
            k = (item or {}).get('key') or ''
            q = (item or {}).get('q') or ''
            max_results = int((item or {}).get('maxResults') or 3)
            if not k:
                continue
            if not q:
                results[k] = []
                continue

            q = q.strip()[:160]
            max_results = max(1, min(max_results, 6))

            cache_key = f"{q}|{max_results}"
            cached = _YT_CACHE.get(cache_key)
            if cached and now - cached[0] < _YT_CACHE_TTL:
                results[k] = cached[1]
                continue

            try:
                row = YouTubeCache.query.filter_by(query=q, max_results=max_results) \
                    .order_by(YouTubeCache.created_at.desc()).first()
                if row:
                    _YT_CACHE[cache_key] = (now, row.results)
                    results[k] = row.results
                    threading.Thread(target=_refresh_yt_cache_async, args=(q, max_results), daemon=True).start()
                    continue
            except Exception:
                pass

            resp = requests.get(
                'https://www.googleapis.com/youtube/v3/search',
                params={
                    'key': api_key,
                    'part': 'snippet',
                    'type': 'video',
                    'q': q,
                    'maxResults': max_results,
                    'safeSearch': 'moderate'
                }, timeout=4
            )
            resp.raise_for_status()
            data = resp.json()
            items = data.get('items', [])
            videos = []
            for it in items:
                vid = (it.get('id') or {}).get('videoId')
                sn = it.get('snippet') or {}
                if not vid:
                    continue
                videos.append({
                    'id': vid,
                    'title': sn.get('title'),
                    'channelTitle': sn.get('channelTitle'),
                    'thumbnail': ((sn.get('thumbnails') or {}).get('medium') or {}).get('url')
                        or ((sn.get('thumbnails') or {}).get('default') or {}).get('url')
                })
            results[k] = videos
            _YT_CACHE[cache_key] = (now, videos)
            try:
                db.session.add(YouTubeCache(query=q, max_results=max_results, results=videos))
                db.session.commit()
                _prune_youtube_cache(_YT_CACHE_MAX_ROWS)
            except Exception:
                db.session.rollback()
        except Exception as e:
            key = (item or {}).get('key') or ''
            if key:
                errors[key] = str(e)
                results[key] = []

    resp_body = {"results": results}
    if errors:
        resp_body["errors"] = errors
    return jsonify(resp_body), 200

# --- Error handlers ---
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Recurso não encontrado"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Erro interno do servidor"}), 500

if __name__ == "__main__":
    # Executa o app Flask apenas se chamado diretamente
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)

