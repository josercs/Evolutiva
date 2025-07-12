import email
import sys
import os
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import requests
import psycopg2
from sqlalchemy import text, select
from models.models import db, HorariosEscolares, PlanoEstudo, User, ProgressoMateria
import re
import json
from werkzeug.utils import secure_filename
from werkzeug.security import check_password_hash, generate_password_hash
from flask_login import LoginManager, login_required, current_user, login_user, logout_user
from sqlalchemy.orm import Session
from flask_caching import Cache
import logging

logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
load_dotenv()

logging.basicConfig(level=logging.DEBUG)

GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL = os.getenv("GOOGLE_DEFAULT_MODEL", "models/gemini-1.5-flash-latest")
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
app.secret_key = "um_valor_secreto_e_unico"
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
CORS(
    app,
    supports_credentials=True,
    resources={r"/*": {"origins": [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://192.168.0.106:5173",
        "http://192.168.0.109:5173",
        "http://192.168.0.107:5173",
        "*"
    ]}}
)

login_manager = LoginManager()
login_manager.init_app(app)

from models.models import User

@login_manager.user_loader
def load_user(user_id):
    with Session(db.engine) as session:
        return session.get(User, int(user_id))

app.config['SQLALCHEMY_DATABASE_URI'] = f"postgresql://{os.getenv('DB_USERNAME', 'postgres')}:{os.getenv('DB_PASSWORD', '1234')}@{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '5432')}/{os.getenv('DB_NAME', 'sistema_estudos')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

from routes.auth_routes import auth_bp
from src.routes import course_routes, progress_routes, onboarding_routes
from routes.materias_routes import materias_bp
from src.db import get_db_connection
app.register_blueprint(auth_bp)
app.register_blueprint(course_routes.course_bp)
app.register_blueprint(progress_routes.progress_bp)
app.register_blueprint(onboarding_routes.onboarding_bp)
app.register_blueprint(materias_bp)
app.register_blueprint(progress_routes.content_bp)  # <-- Isso é essencial!

# def get_db_connection():
#     return psycopg2.connect(
#         dbname=os.getenv('DB_NAME', 'sistema_estudos'),
#         user=os.getenv('DB_USERNAME', 'postgres'),
#         password=os.getenv('DB_PASSWORD', '1234'),
#         host=os.getenv('DB_HOST', 'localhost'),
#         port=os.getenv('DB_PORT', '5432')
#     )

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "online", "message": "API do Sistema de Estudos está funcionando!"})

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

# --- Rotas de Conteúdo ---
@app.route('/api/trilhas')
def get_trilhas():
    trilhas = HorariosEscolares.query.all()
    return jsonify({
        "trilhas": [
            {
                "id": t.id,
                "horario": t.horario,
                "materia": t.materia,
                "conteudo": t.conteudo,
                "status": t.status,
                "prioridade": t.prioridade,
                "link": t.link,
                "videos": t.videos,
                "anotacoes": t.anotacoes,
                "feito": t.feito,
                "pdf_nome": t.pdf_nome,
                "dia": t.dia,
                "conteudo_id": t.conteudo_id,
                "link1": t.link1,
            }
            for t in trilhas
        ]
    })

@app.route('/api/courses', methods=['GET'])
def api_courses():
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT DISTINCT h.id, h.materia
                FROM horarios_escolares h
                JOIN subject_contents s ON s.materia_id = h.id
                ORDER BY h.materia
            """)
            materias = [{"id": row[0], "materia": row[1]} for row in cur.fetchall()]
        conn.close()
        return jsonify({"courses": materias})
    except Exception as e:
        return jsonify({"courses": [], "error": str(e)}), 500

@app.route('/api/conteudo/<materia>', methods=['GET'])
def get_conteudo_materia(materia):
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT s.id, s.subject, s.topic, s.created_at
                FROM subject_contents s
                JOIN horarios_escolares h ON s.materia_id = h.id
                WHERE h.materia = %s
                ORDER BY s.created_at DESC
            """, (materia,))
            conteudos = [
                {
                    "id": row[0],
                    "subject": row[1],
                    "topic": row[2],
                    "created_at": row[3].strftime('%d/%m/%Y %H:%M') if row[3] else ""
                }
                for row in cur.fetchall()
            ]
        conn.close()
        return jsonify({"conteudos": conteudos})
    except Exception as e:
        print("Erro ao buscar conteúdos por matéria:", e)
        return jsonify({"conteudos": [], "error": str(e)}), 500

@app.route('/api/conteudos', methods=['GET'])
def listar_conteudos_agrupados():
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT id, materia FROM horarios_escolares ORDER BY materia")
            materias = cur.fetchall()
            cur.execute("""
                SELECT s.id, s.subject, s.topic, s.created_at, h.materia
                FROM subject_contents s
                JOIN horarios_escolares h ON s.materia_id = h.id
                ORDER BY h.materia, s.created_at DESC
            """)
            conteudos_raw = cur.fetchall()
        conn.close()
        conteudos = {}
        for materia_id, materia_nome in materias:
            conteudos[materia_nome] = [
                {
                    "id": id,
                    "subject": subject,
                    "topic": topic,
                    "created_at": created_at.strftime('%d/%m/%Y %H:%M') if created_at else ""
                }
                for (id, subject, topic, created_at, materia) in conteudos_raw
                if materia == materia_nome
            ]
        return jsonify({"conteudos": conteudos})
    except Exception as e:
        print("Erro ao listar conteúdos:", e)
        return jsonify({"conteudos": {}, "error": str(e)}), 500

@app.route('/api/conteudo_html/<int:conteudo_id>', methods=['GET'])
def get_conteudo_html(conteudo_id):
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT s.id, s.subject, s.topic, s.content_html, h.materia
                FROM subject_contents s
                JOIN horarios_escolares h ON s.materia_id = h.id
                WHERE s.id = %s
            """, (conteudo_id,))
            row = cur.fetchone()
        conn.close()
        if row:
            return jsonify({
                "id": row[0],           # <-- Adicione esta linha
                "subject": row[1],
                "topic": row[2],
                "content_html": row[3],
                "materia": row[4]
            })
        else:
            return jsonify({"error": "Conteúdo não encontrado"}), 404
    except Exception as e:
        print("Erro ao buscar conteúdo HTML:", e)
        return jsonify({"error": str(e)}), 500

# --- Gemini: Quiz ---
@app.route('/api/generate_quiz/<int:conteudo_id>', methods=['GET'])
def generate_quiz(conteudo_id):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT content_html FROM subject_contents WHERE id = %s", (conteudo_id,))
        row = cur.fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Conteúdo não encontrado"}), 404

    content_html = row[0]
    prompt = (
        "Gere 8 perguntas de múltipla escolha sobre o seguinte conteúdo, com 4 opções cada e destaque a correta e forneça uma explicação curta para cada resposta correta. "
        "Responda no formato JSON: [{question, options:[], answer}]\n\n"
        f"{content_html}"
        "Ao final, forneça também um feedback geral sobre o desempenho do aluno, considerando as respostas dadas (você receberá as respostas do aluno depois), apontando pontos fortes e o que ele pode melhorar para dominar o conteúdo."
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
        if match:
            json_str = match.group(1)
        else:
            json_str = text
        try:
            questions = json.loads(json_str)
        except Exception as e:
            print("Erro ao fazer parse do JSON da Gemini:", e)
            questions = []
        return jsonify({"questions": questions})
    except Exception as e:
        print("Erro geral ao gerar quiz:", e)
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
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        feedback = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        return jsonify({"feedback": feedback})
    except Exception as e:
        print("Erro ao gerar feedback:", e)
        return jsonify({"error": "Erro ao gerar feedback", "details": str(e)}), 500

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
            "pergunta": q["question"],
            "resposta_correta": q["answer"],
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
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        feedback = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        return jsonify({"feedback": feedback})
    except Exception as e:
        return jsonify({"error": "Erro ao gerar feedback do quiz", "details": str(e)}), 500

# --- Gemini: Mapa Mental ---
@app.route('/api/generate_mindmap', methods=['POST'])
def generate_mindmap():
    try:
        data = request.get_json(force=True)

        content = data.get("content", "").strip()
        topic = data.get("topic", "").strip()

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

        # Envia para a API do Gemini
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}]
        }

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

        for key, items in mindmap.get("subtopics", {}).items():
            mindmap["subtopics"][key] = [s.strip() for s in items if is_short_term(s)]

        return jsonify(mindmap)

    except requests.exceptions.RequestException as req_err:
        return jsonify({"error": "Erro na comunicação com a API Gemini", "details": str(req_err)}), 502

    except json.JSONDecodeError:
        return jsonify({"error": "Falha ao decodificar JSON da resposta da IA"}), 500

    except Exception as e:
        print("Erro ao gerar mapa mental:", e)
        return jsonify({"error": "Erro interno no servidor", "details": str(e)}), 500

# Exemplo simples, ajuste para seu modelo!
@app.route('/api/planos', methods=['GET', 'POST'])
def planos():
    email = request.args.get('email') if request.method == 'GET' else request.json['email']
    if request.method == 'GET':
        plano = PlanoEstudo.query.filter_by(email=email).first()
        return jsonify({'plano': plano.dados if plano else []})
    else:
        dados = request.json['plano']
        plano = PlanoEstudo.query.filter_by(email=email).first()
        if plano:
            plano.dados = dados
        else:
            plano = PlanoEstudo(email=email, dados=dados)
            db.session.add(plano)
        db.session.commit()
        return jsonify({'ok': True})

# --- Gemini: Cronograma de Estudos ---
# Exemplo Flask
@app.route('/api/gemini', methods=['POST'])
def gemini():
    data = request.json
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
            for c in m.get('conteudos', [])
            if isinstance(c, dict) and c.get('subject') and c.get('topic')
        ]
        if conteudos_validos:
            prompt += f"- {m['materia']}: {', '.join(conteudos_validos)}\n"
    prompt += f"\nDias disponíveis: {', '.join(dias)}\n"
    prompt += f"Horários disponíveis: {', '.join(horarios)}\n"
    prompt += "Não escreva nada além do JSON."

    # Chama a API Gemini
    try:
        payload = {
            "contents": [{"parts": [{"text": prompt}]}]
        }
        response = requests.post(GEMINI_API_URL, json=payload)
        response.raise_for_status()
        text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        return jsonify({"resultado": text})
    except Exception as e:
        print("Erro ao chamar Gemini:", e)
        return jsonify({"erro": str(e), "prompt": prompt}), 500

# Exemplo Node/Express + multer
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
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET avatar_url = %s WHERE email = %s",
                (avatar_url, email)
            )
            conn.commit()
        conn.close()
        return jsonify({"avatarUrl": avatar_url})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/usuarios/avatar', methods=['GET'])
def get_avatar():
    email = request.args.get('email')
    if not email:
        return jsonify({"avatarUrl": ""})
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute('SELECT avatar_url FROM users WHERE email = %s', (email,))
            row = cur.fetchone()
        conn.close()
        return jsonify({"avatarUrl": row[0] if row and row[0] else ""})
    except Exception as e:
        print("Erro ao buscar avatar:", e)
        return jsonify({"avatarUrl": ""}), 500

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Recurso não encontrado"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Erro interno do servidor"}), 500

@app.route('/api/progress')
def get_progress():
    email = request.args.get('email')
    # Exemplo de resposta vazia (ajuste conforme sua lógica)
    if not email:
        return jsonify({"progress": 0})
    # Aqui você pode buscar o progresso do usuário no banco
    # Exemplo:
    # conn = get_db_connection()
    # with conn.cursor() as cur:
    #     cur.execute('SELECT progress FROM users WHERE email = %s', (email,))
    #     row = cur.fetchone()
    # conn.close()
    # return jsonify({"progress": row[0] if row else 0})
    return jsonify({"progress": 0})

# Removido login_required e dependências de autenticação para evitar erros
@app.route("/api/user/onboarding", methods=["PATCH"])
@login_required
def complete_onboarding():
    user = User.query.get(current_user.id)
    if not user:
        return jsonify({"error": "Usuário não encontrado"}), 404
    user.has_onboarding = True  # <-- padronizado
    db.session.commit()
    return jsonify({"message": "Onboarding concluído!"})

@app.route("/api/users/me")
@login_required
def get_me():
    return jsonify({
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "has_onboarding": current_user.has_onboarding,  # <-- padronizado
        "avatar_url": current_user.avatar_url,
    })



@app.route('/api/logout', methods=['POST'])
def logout():
    logout_user()
    return jsonify({"message": "Logout realizado com sucesso!"})

@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    try:
        data = request.get_json()
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Email e senha são obrigatórios'}), 400

        email = data['email'].strip().lower()
        password = data['password']

        stmt = select(User).where(User.email == email).limit(1)
        user = db.session.execute(stmt).scalar_one_or_none()

        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        if not check_password_hash(user.password_hash, password):
            return jsonify({'error': 'Credenciais inválidas'}), 401

        user_data = {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'has_onboarding': user.has_onboarding,
            'curso_id': user.curso_id,
            'avatar_url': user.avatar_url,
            'role': user.role
        }

        return jsonify(user_data), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not name or not email or not password:
        return jsonify({'success': False, 'message': 'Todos os campos são obrigatórios'}), 400

    try:
        if User.query.filter_by(email=email).first():
            return jsonify({"error": "Email já cadastrado."}), 409

        new_user = User(
            name=name,
            email=email,
            password_hash=generate_password_hash(password),
            has_onboarding=False
        )
        db.session.add(new_user)
        db.session.commit()

        # Retorne o usuário criado, incluindo o id
        return jsonify({
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "curso_id": new_user.curso_id,
            "has_onboarding": new_user.has_onboarding,
            "avatar_url": new_user.avatar_url,
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Remova ou renomeie a outra função 'login' duplicada!
def get_user_by_id(user_id):
    with Session(db.engine) as session:
        return session.get(User, int(user_id))

# Configuração do cache
cache = Cache(config={'CACHE_TYPE': 'SimpleCache'})
cache.init_app(app)

# Exemplo de endpoint Flask
@app.route('/api/materias')
def get_materias():
    course_id = request.args.get('course_id')
    materias_param = request.args.get('materias')
    if not course_id:
        return jsonify({"materias": []})
    query = """
        SELECT m.id, m.materia as nome
        FROM curso_materia cm
        JOIN horarios_escolares m ON cm.materia_id = m.id
        WHERE cm.curso_id = :course_id
    """
    params = {"course_id": course_id}
    if materias_param:
        nomes = [nome.strip() for nome in materias_param.split(',')]
        query += " AND m.materia = ANY(:nomes)"
        params["nomes"] = nomes
    materias = db.session.execute(text(query), params).fetchall()
    return jsonify({
        "materias": [
            {"id": row[0], "nome": row[1]}
            for row in materias
        ]
    })

# Exemplo Flask
@app.route("/api/progresso/materias", methods=["GET"])
@login_required
def progresso_materias():
    user_id = current_user.id
    progresso = ProgressoMateria.query.filter_by(user_id=user_id).all()
    return jsonify({
        "progresso": [
            {
                "materia": p.subject,
                "percent": p.percent,
                "total_lessons": getattr(p, "total_lessons", None),
                "completed_lessons": getattr(p, "completed_lessons", None)
            }
            for p in progresso
        ]
    })

@app.route('/api/progresso/materias/<int:user_id>/<int:curso_id>', methods=['GET'])
@login_required
def get_progresso_materias(user_id, curso_id):
    try:
        progresso = ProgressoMateria.query.filter_by(
            user_id=user_id,
            curso_id=curso_id
        ).all()
        return jsonify({
            "progresso": [
                {
                    "materia": p.subject,
                    "percent": p.percent,
                    "total_lessons": p.total_lessons,
                    "completed_lessons": p.completed_lessons
                }
                for p in progresso
            ]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Removidas as rotas de planos para evitar conflito:
# @app.route('/api/planos/pendencias', methods=['GET'])
# def get_pendencias():
#     ...
#
# @app.route('/api/planos/me', methods=['GET'])
# def get_plano_estudo_usuario():
#     ...
#
# @app.route('/api/planos/atualizar-status-bloco', methods=['POST'])
# def atualizar_status_bloco():
#     ...
#
# @app.route('/api/planos', methods=['GET', 'POST'])
# def planos():
#     ...

# --- Demais rotas do sistema (conteúdo, quiz, avatar, progresso, etc) ---

@app.route('/api/planos/me', methods=['GET'])
def get_plano_estudo_usuario():
    email = request.args.get('email')
    if not email:
        return jsonify({"error": "Email não informado"}), 400

    plano = PlanoEstudo.query.filter_by(email=email).order_by(PlanoEstudo.id.desc()).first()
    if not plano:
        return jsonify({"plano_estudo": None})

    return jsonify({"plano_estudo": plano.dados})

def carregar_plano_usuario(email):
    plano = PlanoEstudo.query.filter_by(email=email).order_by(PlanoEstudo.id.desc()).first()
    if plano:
        try:
            return plano.dados if isinstance(plano.dados, dict) else json.loads(plano.dados)
        except Exception:
            return None
    return None

def salvar_plano_usuario(email, dados):
    plano = PlanoEstudo.query.filter_by(email=email).order_by(PlanoEstudo.id.desc()).first()
    if plano:
        plano.dados = dados
    else:
        plano = PlanoEstudo(email=email, dados=dados)
        db.session.add(plano)
    db.session.commit()

@app.route('/api/planos/pendencias', methods=['GET'])
def get_pendencias():
    email = request.args.get("email")
    if not email:
        return jsonify({"error": "Email não informado", "pendencias": []}), 400
    plano = carregar_plano_usuario(email)
    if not plano or "days" not in plano:
        return jsonify({"pendencias": []})
    pendencias = []
    for dia in plano.get("days", []):
        for idx, bloco in enumerate(dia.get("blocks", [])):
            if bloco.get("status") in ["pendente", "dificuldade"]:
                pendencias.append({
                    "subject": bloco.get("subject"),
                    "topic": bloco.get("topic"),
                    "date": dia.get("date"),
                    "start_time": bloco.get("start_time"),
                    "end_time": bloco.get("end_time"),
                    "activity_type": bloco.get("activity_type"),
                    "status": bloco.get("status"),
                    "idx": idx
                })
    return jsonify({"pendencias": pendencias})

@app.route('/api/planos/atualizar-status-bloco', methods=['POST'])
def atualizar_status_bloco():
    data = request.get_json()
    email = data.get("email")
    date = data.get("date")
    block_index = data.get("blockIndex")
    status = data.get("status")
    if not all([email, date, isinstance(block_index, int), status]):
        return jsonify({"error": "Dados incompletos"}), 400
    plano = carregar_plano_usuario(email)
    if not plano or "days" not in plano:
        return jsonify({"error": "Plano não encontrado"}), 404
    dia = next((d for d in plano["days"] if d["date"] == date), None)
    if not dia:
        return jsonify({"error": "Dia não encontrado no plano"}), 404
    blocks = dia.get("blocks", [])
    if block_index < 0 or block_index >= len(blocks):
        return jsonify({"error": "Índice do bloco inválido"}), 400
    blocks[block_index]["status"] = status
    salvar_plano_usuario(email, plano)
    return jsonify({"ok": True})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
