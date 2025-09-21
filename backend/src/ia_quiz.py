from __future__ import annotations
import json, re, random, unicodedata, time
from dataclasses import dataclass, asdict
from typing import List, Literal, Optional, Tuple

# --- Gemini client (ex: google-generativeai / Vertex ou seu wrapper local) ---
# You must implement or adapt this import:
from your_gemini_client import gemini_generate_json

QuizType = Literal["mcq", "tf", "cloze"]
FormatTag = Literal["default", "assertion_reason", "ordering"]

@dataclass
class QuizItem:
    id: str
    type: QuizType
    question: str
    options: Optional[List[str]] = None     # mcq
    answer: Optional[object] = None         # idx | bool | str
    explanation: Optional[str] = None
    difficulty: Literal["easy","medium","hard"]="medium"
    format: FormatTag="default"
    source_id: Optional[str]=None
    topic: Optional[str]=None

# ------------- Utils -------------
def _norm(s:str)->str:
    s = unicodedata.normalize("NFD", s)
    s = re.sub(r"\p{Mn}+", "", s)
    s = re.sub(r"<[^>]*>", "", s)            # strip HTML
    s = s.replace("window","")               # ruído comum
    s = re.sub(r"\s{2,}", " ", s)
    return s.strip().lower()

def sane_len(s:str, maxlen:int=280)->bool:
    return 1 <= len(s.strip()) <= maxlen

def looks_like_question(q:str)->bool:
    q = q.strip()
    return q.endswith("?") and len(q.split())>=5

def options_ok(opts:List[str])->bool:
    if not opts or len(opts)<3: return False
    cleaned = [ _norm(o) for o in opts ]
    return len(set(cleaned))==len(cleaned) and all(sane_len(o, 160) for o in opts)

def explanation_ok(exp:str, ans_text:str)->bool:
    expn = _norm(exp)
    # não pode ser mera repetição da resposta ou do enunciado
    return len(expn.split())>=6 and not expn.startswith(ans_text[:20])

def similar(a:str,b:str)->float:
    # jaccard simples por tokens (barato e razoável p/ dedupe)
    A, B = set(_norm(a).split()), set(_norm(b).split())
    if not A or not B: return 0.0
    return len(A&B)/len(A|B)

# ------------- Qualidade + revisão -------------
SYSTEM_RULES = """
Você é um professor universitário de didática em Português (Brasil).
Gere ITENS DE PROVA curtos, objetivos, sem ambiguidade.
SEMPRE responda ESTRITAMENTE no SCHEMA JSON fornecido.
NUNCA invente termos como 'window', 'lorem', ou trechos de interface.
Varie formatos: múltipla escolha, verdadeiro/falso, lacuna (cloze). Evite repetir cabeçalhos.
"""

JSON_SCHEMA = {
  "type":"object",
  "properties":{
    "items":{
      "type":"array",
      "items":{
        "type":"object",
        "required":["type","question","answer"],
        "properties":{
          "type":{"enum":["mcq","tf","cloze"]},
          "question":{"type":"string"},
          "options":{"type":"array","items":{"type":"string"}},
          "answer":{},  # number|boolean|string
          "explanation":{"type":"string"},
          "difficulty":{"enum":["easy","medium","hard"]},
          "format":{"enum":["default","assertion_reason","ordering"]}
        }
      }
    }
  },
  "required":["items"]
}

FEW_SHOT = [
  # 3 exemplos curtos, em PT-BR, que o modelo pode imitar
  {
    "type":"mcq",
    "question":"No contexto de densidade demográfica, qual alternativa define melhor o conceito?",
    "options":[
      "Número de habitantes por área territorial",
      "Soma de nascimentos em um ano",
      "Média de idade da população",
      "Taxa de imigração acumulada"
    ],
    "answer":0,
    "explanation":"Densidade demográfica = população total dividida pela área ocupada.",
    "difficulty":"easy","format":"default"
  },
  {
    "type":"tf",
    "question":"A soma dos ângulos internos de um triângulo é igual a 180°?",
    "answer": True,
    "explanation":"No plano euclidiano, a soma é 180°. Em geometria não-euclidiana pode variar.",
    "difficulty":"easy","format":"default"
  },
  {
    "type":"cloze",
    "question":"O processo de separação por ______ utiliza diferença de pontos de ebulição (química).",
    "answer":"destilação",
    "explanation":"Na destilação, a mistura é aquecida e os componentes se separam pela ebulição.",
    "difficulty":"medium","format":"default"
  }
]

def _gemini_generate_raw(topics:list[str], n:int=8)->List[dict]:
    prompt = {
      "role": "user",
      "content": {
        "pt": SYSTEM_RULES + "\n\nGere apenas perguntas do tipo VERDADEIRO/FALSO (tf), curtas, objetivas, sem ambiguidade, e SEMPRE citando explicitamente o tópico em cada enunciado. Evite frases genéricas, perguntas sobre o plano de estudos ou afirmações vagas. Cada pergunta deve trazer um fato, conceito ou evento relevante do tópico. Sempre inclua explicação didática e detalhada para cada item. Varie o grau de dificuldade e evite perguntas óbvias. NÃO repita perguntas ou explicações.\n\nExemplo de pergunta ruim: 'O tema X faz parte do seu plano de estudos?'\nExemplo de pergunta boa: 'A Proclamação da República no Brasil ocorreu em 1889?' (tópico: História do Brasil)\nExemplo de pergunta boa: 'O benzeno é um hidrocarboneto aromático?' (tópico: Química Orgânica)\nExemplo de pergunta boa: 'A energia potencial depende da altura?' (tópico: Física Moderna)\n",
        "context": "Resumo dos tópicos estudados (PT-BR):\n- " + "\n- ".join(topics),
        "few_shot": [
          {
            "type": "tf",
            "question": "A Proclamação da República no Brasil ocorreu em 1889?",
            "answer": True,
            "explanation": "Data correta do evento.",
            "difficulty": "easy",
            "format": "default"
          },
          {
            "type": "tf",
            "question": "O benzeno é um hidrocarboneto aromático?",
            "answer": True,
            "explanation": "Benzeno é aromático.",
            "difficulty": "easy",
            "format": "default"
          },
          {
            "type": "tf",
            "question": "Dom Pedro II foi o primeiro presidente do Brasil?",
            "answer": False,
            "explanation": "Dom Pedro II foi imperador, não presidente.",
            "difficulty": "easy",
            "format": "default"
          },
          {
            "type": "tf",
            "question": "O tema X faz parte do seu plano de estudos?",
            "answer": True,
            "explanation": "Pergunta genérica, não recomendada.",
            "difficulty": "easy",
            "format": "default"
          }
        ],
        "task": f"Gere {n} itens do tipo verdadeiro/falso, equilibrados, didáticos, relevantes e sempre contextualizados para os tópicos. Use Português (Brasil)."
      }
    }
    return gemini_generate_json(prompt, schema=JSON_SCHEMA, temperature=0.4).get("items",[])

def _validate_fix(item:QuizItem)->Tuple[bool,QuizItem,str]:
    q = item
    q.question = re.sub(r"\s+", " ", q.question or "").strip()
    q.question = q.question.replace("window","").strip()
    if q.type=="mcq" and q.options:
        q.options = [ re.sub(r"\s+"," ",o).strip() for o in q.options ]
    # regras
    if not sane_len(q.question, 240) or not looks_like_question(q.question):
        return False, q, "enunciado_fraco"
    if q.type=="mcq":
        if not (isinstance(q.answer,int) and q.options and 0<=q.answer<len(q.options)):
            return False, q, "mcq_sem_resposta"
        if not options_ok(q.options):
            return False, q, "mcq_opcoes_invalidas"
        ans_text = _norm(q.options[q.answer])
    elif q.type=="tf":
        if not isinstance(q.answer, bool):
            return False, q, "tf_sem_bool"
        ans_text = "verdadeiro" if q.answer else "falso"
    else: # cloze
        if not isinstance(q.answer,str) or not sane_len(q.answer, 80):
            return False, q, "cloze_resposta_ruim"
        ans_text = _norm(q.answer)
    if not q.explanation or not explanation_ok(q.explanation, ans_text):
        return False, q, "explicacao_fraca"
    return True, q, ""

def _refine_with_gemini(q:QuizItem, reason:str)->QuizItem|None:
    """Pede ao Gemini para reescrever o item apontando o problema."""
    payload = {
      "role":"user",
      "content":{
        "instr":"Reescreva o item mantendo o MESMO TIPO e formato, corrigindo o problema: "+reason,
        "item":asdict(q),
        "constraints":[
          "Português (Brasil)", "Sem duplicações de texto", "Sem palavras de UI",
          "Se MCQ: alternativas únicas, curtas; 1 correta. Sempre termine enunciado com '?'"
        ],
        "schema":asdict(QuizItem(
          id="id", type="mcq", question="?", options=["A","B","C","D"],
          answer=0, explanation="exp", difficulty="medium", format="default"))
      }
    }
    fixed = gemini_generate_json(payload, schema=None, temperature=0.3)
    try:
      # aceite apenas se mantiver tipo e campos básicos
      fused = {**asdict(q), **fixed}
      return QuizItem(**fused)
    except Exception:
      return None

def generate_refined_quiz(topics:List[str], n:int=8)->List[QuizItem]:
  try:
    raw = _gemini_generate_raw(topics, n*2)  # gera extra p/ poder filtrar
    items:List[QuizItem] = []
    for i, it in enumerate(raw):
      try:
        q = QuizItem(
          id=f"wk-{int(time.time())}-{i}",
          type=it["type"], question=it["question"],
          options=it.get("options"), answer=it.get("answer"),
          explanation=it.get("explanation",""),
          difficulty=it.get("difficulty","medium"),
          format=it.get("format","default"),
          topic=it.get("topic")
        )
      except Exception:
        continue
      ok, q2, reason = _validate_fix(q)
      if not ok:
        q3 = _refine_with_gemini(q2, reason)
        if not q3: 
          continue
        ok, q2, reason2 = _validate_fix(q3)
        if not ok:
          continue
      items.append(q2)

    # dedupe (≥ 0.8 similar)
    filtered:List[QuizItem] = []
    for q in items:
      if any(similar(q.question, p.question)>=0.8 for p in filtered):
        continue
      filtered.append(q)

    # equilibrio e corte final
    random.shuffle(filtered)
    result = filtered[:n]
    if result:
      return result
  except Exception:
    pass
  # Fallback determinístico V/F
  return fallback_vf_from_topics(topics, n)

def fallback_vf_from_topics(topics:List[str], n:int)->List[QuizItem]:
  """
  Gera perguntas V/F determinísticas baseadas nos tópicos do usuário.
  """
  items:List[QuizItem] = []
  # Templates didáticos por área (expandir conforme necessário)
  templates = {
    "Matemática": [
      ("A soma dos ângulos internos de um triângulo é igual a 180°?", True, "No plano euclidiano, a soma é 180°."),
      ("O número π é aproximadamente igual a 3,14?", True, "Valor aproximado de π."),
      ("A raiz quadrada de 16 é 5?", False, "A raiz quadrada de 16 é 4.")
    ],
    "História": [
      ("A Proclamação da República no Brasil ocorreu em 1889?", True, "Data correta do evento."),
      ("Dom Pedro II foi o primeiro presidente do Brasil?", False, "Dom Pedro II foi imperador, não presidente."),
      ("A escravidão foi abolida em 1888?", True, "A Lei Áurea foi assinada em 1888.")
    ],
    "Química": [
      ("O benzeno é um hidrocarboneto aromático?", True, "Benzeno é aromático."),
      ("A água é composta por hidrogênio e oxigênio?", True, "Fórmula H2O."),
      ("O sal de cozinha é cloreto de sódio?", True, "Fórmula NaCl.")
    ],
    "Física": [
      ("A velocidade da luz no vácuo é de aproximadamente 300.000 km/s?", True, "Valor aproximado da velocidade da luz."),
      ("A gravidade na Terra é cerca de 9,8 m/s²?", True, "Valor padrão da gravidade."),
      ("A energia potencial depende da altura?", True, "Energia potencial gravitacional depende da altura.")
    ]
  }
  # Gera perguntas didáticas se possível
  for i, topic in enumerate(topics):
    if len(items) >= n:
      break
    base = None
    for area, qs in templates.items():
      if area.lower() in topic.lower():
        base = qs
        break
    if base:
      for tpl in base:
        if len(items) >= n:
          break
        items.append(QuizItem(
          id=f"vf-{int(time.time())}-{i}-{tpl[0][:10]}",
          type="tf",
          question=tpl[0],
          answer=tpl[1],
          explanation=tpl[2],
          difficulty="easy",
          format="default",
          topic=topic
        ))
    else:
      # fallback genérico se não encontrar área
      items.append(QuizItem(
        id=f"vf-{int(time.time())}-{i}-GEN",
        type="tf",
        question=f"Sobre '{topic}': este tema é relevante para sua prova?",
        answer=True,
        explanation="Este tópico é parte do seu plano de estudos.",
        difficulty="easy",
        format="default",
        topic=topic
      ))
      if len(items) < n:
        items.append(QuizItem(
          id=f"vf-{int(time.time())}-{i}-GENF",
          type="tf",
          question=f"'{topic}' não será cobrado na sua prova?",
          answer=False,
          explanation="Na verdade, este tema pode ser cobrado.",
          difficulty="easy",
          format="default",
          topic=topic
        ))
  return items[:n]
