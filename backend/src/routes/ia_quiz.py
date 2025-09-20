from flask import Blueprint, request, jsonify
import importlib
import os

bp_quiz = Blueprint('ia_quiz', __name__)

@bp_quiz.route('/api/ia/quiz-feedback', methods=['POST'])
def quiz_feedback():
    dados = request.json or {}
    perguntas = dados.get("questions")
    respostas = dados.get("answers")
    prompt = f"""
    Você é um tutor. Analise as perguntas e respostas do aluno abaixo e gere um resumo do desempenho, destacando pontos fortes, tópicos que precisam de revisão e sugestões de estudo.
    Perguntas: {perguntas}
    Respostas do aluno: {respostas}
    """
    try:
        genai = importlib.import_module("google.generativeai")
    except Exception:
        return jsonify({"error": "IA não disponível (dependência ausente)"}), 503

    try:
        genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))
        model = genai.GenerativeModel(model_name=os.environ.get("GOOGLE_DEFAULT_MODEL", "gemini-1.5-flash"))
        response = model.generate_content(prompt)
        text = getattr(response, 'text', '')
        return jsonify({"feedback": (text or '').strip()})
    except Exception as e:
        return jsonify({"error": "Falha ao gerar feedback", "details": str(e)}), 500