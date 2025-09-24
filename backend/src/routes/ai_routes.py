import os, re, json, requests
from flask import Blueprint, request, jsonify
from models.models import SubjectContent

ai_bp = Blueprint('ai', __name__)

GEMINI_API_KEY = os.getenv('GOOGLE_API_KEY')
GEMINI_MODEL = os.getenv('GOOGLE_DEFAULT_MODEL', 'models/gemini-1.5-flash-latest')
GEMINI_BASE_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

def _call_gemini(prompt: str, timeout: int = 25):
    if not GEMINI_API_KEY:
        return None, {"error": "GEMINI_API_KEY ausente."}
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    try:
        resp = requests.post(GEMINI_BASE_URL, json=payload, timeout=timeout)
        resp.raise_for_status()
        return resp.json(), None
    except Exception as e:
        return None, {"error": "Falha na chamada Gemini", "details": str(e)}

@ai_bp.route('/api/generate_quiz/<int:conteudo_id>', methods=['GET'])
def generate_quiz(conteudo_id: int):
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
    data, err = _call_gemini(prompt)
    if err:
        return jsonify(err), 502
    try:
        text_resp = data["candidates"][0]["content"]["parts"][0]["text"]
        match = re.search(r"```json\s*(.*?)\s*```", text_resp, re.DOTALL)
        json_str = match.group(1) if match else text_resp
        questions = json.loads(json_str)
    except Exception:
        questions = []
    return jsonify({"questions": questions})

@ai_bp.route('/api/gemini_feynman', methods=['POST'])
def gemini_feynman():
    data = request.get_json() or {}
    texto = data.get("texto", "")
    conteudo = data.get("conteudo", "")
    prompt = (
        f'O estudante explicou o conteúdo assim: "{texto}"\n'
        f'O conteúdo original é: "{conteudo}"\n'
        "Dê um feedback construtivo, aponte acertos e pontos a melhorar."
    )
    data, err = _call_gemini(prompt, timeout=20)
    if err:
        return jsonify(err), 502
    try:
        feedback = data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception:
        feedback = ""
    return jsonify({"feedback": feedback})

@ai_bp.route('/api/quiz_feedback', methods=['POST'])
def quiz_feedback():
    data = request.get_json() or {}
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
    data, err = _call_gemini(prompt, timeout=25)
    if err:
        return jsonify(err), 502
    try:
        feedback = data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception:
        feedback = ""
    return jsonify({"feedback": feedback})

@ai_bp.route('/api/generate_mindmap', methods=['POST'])
def generate_mindmap():
    try:
        payload = request.get_json(force=True) or {}
        content = (payload.get("content") or "").strip()
        topic = (payload.get("topic") or "").strip()
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
        data, err = _call_gemini(prompt)
        if err:
            return jsonify(err), 502
        try:
            response_text = data["candidates"][0]["content"]["parts"][0]["text"]
            match = re.search(r"\{[\s\S]+\}", response_text)
            if not match:
                return jsonify({"error": "Resposta da IA não contém JSON válido."}), 500
            mindmap = json.loads(match.group(0))
        except Exception:
            return jsonify({"error": "Falha ao interpretar resposta da IA"}), 500
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
    except Exception as e:
        return jsonify({"error": "Erro interno no servidor", "details": str(e)}), 500

@ai_bp.route('/api/gemini', methods=['POST'])
def gemini_schedule():
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
    data, err = _call_gemini(prompt)
    if err:
        return jsonify(err), 502
    try:
        text_resp = data["candidates"][0]["content"]["parts"][0]["text"]
        return jsonify({"resultado": text_resp})
    except Exception:
        return jsonify({"resultado": ""})
