from flask import Blueprint, request, jsonify
import google.generativeai as genai
import os
import logging

bp_ia_sugestao = Blueprint('ia_sugestao', __name__)

def resumir_lista(lista, max_itens=3):
    # Se for lista, retorna só os primeiros itens; se for string, retorna como está
    if isinstance(lista, list):
        return lista[:max_itens]
    return lista

@bp_ia_sugestao.route('/api/ia/sugestao-estudo', methods=['POST'])
def sugestao_estudo():
    try:
        dados = request.get_json()
        progresso = resumir_lista(dados.get("progresso", ""))
        pendencias = resumir_lista(dados.get("pendencias", ""))
        duvidas = resumir_lista(dados.get("duvidas", ""))

        if not any([progresso, pendencias, duvidas]):
            return jsonify({"error": "É necessário informar pelo menos um dos campos: progresso, pendencias ou duvidas."}), 400

        prompt = f"""
Você é um tutor educacional especializado em análise de desempenho estudantil e orientação personalizada.

Receberá dados do aluno com seu progresso, atividades pendentes e dúvidas não resolvidas.

Com base nesses dados, forneça uma resposta objetiva e personalizada, seguindo estas orientações:
- Analise o desempenho do aluno, destacando pontos fortes e fracos.
- Recomende quais matérias ou tópicos devem ser priorizados nos próximos dias, explicando o motivo.
- Indique 1 ou 2 métodos de estudo ou revisão eficazes para os pontos fracos detectados.
- Finalize com uma frase motivacional curta, com tom humano e encorajador.

**Importante:**  
- Não use títulos ou enumerações nas respostas.  
- Escreva em parágrafos curtos e diretos, como se estivesse conversando com o aluno.  
- Use frases curtas e objetivas.  
- Evite linguagem genérica e não repita os dados recebidos.  
- Use emojis com moderação para motivação.

--- DADOS DO ALUNO ---
Progresso: {progresso}
Pendências: {pendencias}
Dúvidas: {duvidas}
"""

        genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))
        model_name = os.environ.get("GOOGLE_DEFAULT_MODEL", "gemini-1.5-flash")
        max_tokens = int(os.environ.get("GOOGLE_DEFAULT_MAX_TOKENS", 2048))
        temperature = float(os.environ.get("GOOGLE_DEFAULT_TEMPERATURE", 0.3))
        model = genai.GenerativeModel(model_name=model_name)
        response = model.generate_content(
            prompt,
            generation_config={
                "max_output_tokens": max_tokens,
                "temperature": temperature
            }
        )

        return jsonify({"sugestao": response.text.strip()})

    except Exception as e:
        logging.exception("Erro ao gerar conteúdo com IA")
        if "429" in str(e) or "Too Many Requests" in str(e):
            return jsonify({"error": "Limite diário da IA atingido. Tente novamente amanhã ou revise seu plano da API Gemini."}), 429
        return jsonify({"error": "Falha ao gerar conteúdo com IA.", "detalhe": str(e)}), 500