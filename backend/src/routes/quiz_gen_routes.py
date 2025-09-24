import re
import os
import json
import logging
import unicodedata
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional
import hashlib
import random
from dataclasses import asdict

from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from sqlalchemy import and_

from models.models import db, SubjectContent, CompletedContent, WeeklyQuiz
from ia_quiz import generate_refined_quiz, QuizItem, fallback_vf_from_topics

bp_quiz_gen = Blueprint('quiz_gen', __name__)

# ---- Utils ----
PT_STOPWORDS = {
    "a","o","as","os","de","da","do","das","dos","em","no","na","nos","nas","um","uma","uns","umas",
    "e","ou","para","por","com","sem","se","que","como","mais","menos","muito","muita","muitos","muitas",
    "é","são","ser","está","estão","foi","foram","será","serão","ao","à","às","aos","sobre","entre",
    "pela","pelo","pelas","pelos","também","até","após","antes","porque","pois","onde","quando","qual","quais",
}

def strip_html(s: str) -> str:
    return re.sub(r"<[^>]*>", " ", s or " ")

def normalize(s: str) -> str:
    s = s or ""
    s = s.lower()
    s = unicodedata.normalize("NFD", s)
    s = "".join(ch for ch in s if unicodedata.category(ch) != 'Mn')
    s = re.sub(r"\s+", " ", s).strip()
    return s

def tokenize(s: str) -> List[str]:
    s = normalize(s)
    s = re.sub(r"[^a-z0-9\s-]", " ", s)
    return [w for w in s.split() if w]

def split_sentences(s: str) -> List[str]:
    s = re.sub(r"\s+", " ", s or "").strip()
    m = re.findall(r"[^.!?]+[.!?]", s)
    return [x.strip() for x in m] if m else ([s] if s else [])

def extract_key_terms(text: str, max_terms: int = 10) -> List[str]:
    freq: Dict[str, int] = {}
    for w in tokenize(text):
        if w in PT_STOPWORDS:
            continue
        if len(w) < 3:
            continue
        freq[w] = freq.get(w, 0) + 1
    return [w for w, _ in sorted(freq.items(), key=lambda kv: (-kv[1], kv[0]))][:max_terms]

def pick_good_sentence(sentences: List[str], min_len: int = 60, max_len: int = 180) -> Optional[str]:
    """Pick first valid sentence within length bounds (already filtered)."""
    cand = [re.sub(r"\s+", " ", s).strip() for s in sentences if min_len <= len(s) <= max_len]
    return cand[0] if cand else None

def rng_for_user_week(user_id: int) -> random.Random:
    # deterministic seed using Monday of current week + user_id
    today = datetime.now()
    monday = today - timedelta(days=(today.weekday()))
    seed_str = f"{user_id}-{monday.strftime('%Y-%m-%d')}"
    seed = int(hashlib.sha256(seed_str.encode()).hexdigest(), 16) % (2**32)
    return random.Random(seed)

# ---- Feature flags / env helpers ----
def _is_truthy(val: Optional[str]) -> bool:
    try:
        return (val or "").strip().lower() in {"1", "true", "yes", "y", "on"}
    except Exception:
        return False

def is_polish_enabled() -> bool:
    """Effective switch for Gemini polishing.
    Rules:
    - If QUIZ_POLISH_WITH_GEMINI is explicitly set to a truthy value => enabled.
    - If explicitly set to a falsy value => disabled.
    - If not set, enable automatically when GOOGLE_API_KEY is present.
    """
    flag = os.getenv('QUIZ_POLISH_WITH_GEMINI')
    if flag is None or flag == "":
        return bool(os.getenv('GOOGLE_API_KEY'))
    return _is_truthy(flag)

# ---- Advanced helpers (added) ----
NEGATION_PAIRS = [
    ("sempre", "às vezes"), ("nunca", "às vezes"),
    ("aumenta", "diminui"), ("diminui", "aumenta"),
    ("maior", "menor"), ("menor", "maior"),
    ("verdadeiro", "falso"), ("correto", "incorreto"),
]

def extract_key_phrases(text: str, max_terms: int = 8) -> List[str]:
    """Bigramas simples e frequentes (sem stopwords), priorizando substantivos/nomes próprios por heurística."""
    toks = tokenize(text)
    bigrams = []
    for i in range(len(toks)-1):
        a, b = toks[i], toks[i+1]
        if a in PT_STOPWORDS or b in PT_STOPWORDS:
            continue
        if len(a) < 3 or len(b) < 3:
            continue
        bigrams.append(f"{a} {b}")
    # rank por frequência
    freq = {}
    for bg in bigrams:
        freq[bg] = freq.get(bg, 0) + 1
    ranked = sorted(freq.items(), key=lambda kv: (-kv[1], kv[0]))
    return [bg for bg, _ in ranked[:max_terms]]

def difficulty_of_sentence(s: str, has_number: bool, rare_term: bool) -> str:
    L = len(s)
    score = 0
    if L >= 140: score += 2
    elif L >= 90: score += 1
    if has_number: score += 1
    if rare_term: score += 1
    return "hard" if score >= 3 else ("medium" if score >= 1 else "easy")

def make_numeric_distractors(value: float) -> List[str]:
    import math
    deltas = [0.8, 0.9, 1.1, 1.25]
    outs = []
    for d in deltas:
        v = value * d
        # formato inteiro quando faz sentido
        fmt = f"{int(round(v))}" if v >= 10 else f"{v:.1f}".replace(".", ",")
        outs.append(fmt)
    return list(dict.fromkeys(outs))

def build_term_distractors(term: str, pool: List[str], k: int = 3) -> List[str]:
    # distratores com mesmo “shape” (tamanho/silabas simples)
    same_len = [p for p in pool if p != term and abs(len(p)-len(term)) <= 2]
    others = [p for p in pool if p != term and p not in same_len]
    out = same_len[:k] + others[:max(0, k-len(same_len))]
    return list(dict.fromkeys(out))[:k]

def sanitize(s: str) -> str:
    # simples proteção caso venha HTML do conteúdo
    s = re.sub(r"<[^>]*>", "", s or "").strip()
    # remove marcações markdown simples (** __ * _ `)
    s = re.sub(r"\*\*|__|\*|_|`", "", s)
    return s

# ---- Sanitation & validation helpers (new) ----
# tokens ruins comuns de HTML/UI/URLs/arquivos
BAD_TOKENS = {
    "http", "https", "www", "window", "onclick", "href", "src",
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".mp3", ".mp4", ".pdf",
}

# marcadores simples de verbo em PT (heurístico)
VERB_MARKERS = {
    "é", "são", "foi", "foram", "era", "eram", "será", "serão",
    "tem", "têm", "haver", "há", "faz", "fazem", "pode", "podem",
    "deve", "devem", "representa", "consiste", "refere", "indica",
}

def clean_text(s: str) -> str:
    s = strip_html(s or "")
    s = re.sub(r"[\u2022\-–—•]+", " ", s)  # bullets/traços
    s = re.sub(r"\s+", " ", s).strip()
    return s

def contains_verb_pt(s: str) -> bool:
    toks = set(tokenize(s))
    return any(v in toks for v in VERB_MARKERS)

def looks_like_heading(s: str) -> bool:
    s0 = s.strip()
    if not s0:
        return False
    # Heurística: tem ':' e não tem verbo => título
    if ":" in s0 and not contains_verb_pt(s0):
        return True
    # muitas palavras capitalizadas e poucas palavras => título
    words = [w for w in re.split(r"\s+", s0) if w]
    if 1 < len(words) <= 8:
        caps = sum(1 for w in words if w[:1].isupper())
        if caps / max(1, len(words)) >= 0.5 and not contains_verb_pt(s0):
            return True
    return False

def is_valid_sentence(s: str, min_len: int = 50, max_len: int = 200) -> bool:
    s = clean_text(s)
    if not (min_len <= len(s) <= max_len):
        return False
    ns = normalize(s)
    if any(tok in ns for tok in BAD_TOKENS):
        return False
    if looks_like_heading(s):
        return False
    if not contains_verb_pt(s):
        return False
    # evita 3+ números que parecem listas/códigos
    if len(re.findall(r"\d", s)) >= 5:
        return False
    return True

def filter_sentences(text: str) -> List[str]:
    out: List[str] = []
    seen = set()
    for s in split_sentences(text):
        s2 = clean_text(s)
        # tenta aparar ruídos de cabeçalho repetido antes da cópula ("é", "são")
        s2 = trim_noise_before_copula(s2)
        if not s2:
            continue
        if is_valid_sentence(s2):
            key = normalize(s2)
            if key not in seen:
                seen.add(key)
                out.append(s2)
    return out

def finalize_question_text(s: str) -> str:
    # Não remove HTML, apenas normaliza espaços e pontuação final
    s = (s or "").strip()
    s = re.sub(r"\s+", " ", s)
    # remove dois-pontos finais estranhos
    s = re.sub(r"[:\s]+$", "", s)
    # se não terminar com pontuação, adiciona ponto
    if not re.search(r"[.!?]$", s):
        s += "."
    return s

def dedupe_options_casefold(options: List[str]) -> List[str]:
    seen = set()
    out: List[str] = []
    for o in options:
        k = (o or "").casefold().strip()
        if k and k not in seen:
            seen.add(k)
            out.append(o)
    return out

def trim_noise_before_copula(s: str) -> str:
    """Se a sentença começar com várias palavras/títulos e contiver 'é' ou 'são', recorta para 'Assunto é ...'."""
    try:
        m = re.search(r"\b(é|são)\b", s)
        if not m:
            return s
        before = s[:m.start()]
        caps = re.findall(r"([A-ZÁ-Ú][\wÁ-ú-]*)", before)
        if caps:
            subject = caps[-1]
            tail = s[m.start():].lstrip()
            return f"{subject} {tail}"
        return s
    except Exception:
        return s

def find_original_cased_term(s: str, term_norm: str) -> Optional[str]:
    """Retorna a forma original (com acentos/caixa) de um termo presente na sentença, comparando por normalize()."""
    try:
        words = re.findall(r"\b[\wÁ-ú-]+\b", s)
        # prioriza palavras mais longas para evitar pegar substrings curtas
        for w in sorted(set(words), key=len, reverse=True):
            if normalize(w) == term_norm:
                return w
        return None
    except Exception:
        return None

def needs_polish(item: Dict[str, Any]) -> bool:
    """Heurística simples para decidir se um item precisa ser polido pelo Gemini."""
    q = str(item.get('question') or '')
    qn = normalize(q)
    if not q or len(q) < 40:
        return True
    if ("_____" not in q) and not re.search(r"[.!?]$", q.strip()):
        return True
    toks = qn.split()
    if toks:
        from collections import Counter
        c = Counter(toks)
        if any(v >= 4 for v in c.values()):
            return True
    if any(t in qn for t in ("window", "http", "www", "onclick")):
        return True
    return False

# --- Enumeration helpers (added) ---
def extract_enumerations(text: str, min_items: int = 4, max_items: int = 6) -> List[List[str]]:
    """
    Procura sentenças com enumerações do tipo 'A, B, C e D' ou separadas por ';'.
    Retorna listas de itens curtos (título/etapa).
    """
    cands: List[List[str]] = []
    for s in split_sentences(text):
        s_clean = clean_text(s)
        if not s_clean:
            continue
        if looks_like_heading(s_clean):
            continue
        # heurística: presença de vírgulas + conjunção final
        if (s_clean.count(",") >= (min_items - 2) and re.search(r"\b(e|ou)\b", s_clean)) or ";" in s_clean:
            parts = re.split(r",|;|\be\b|\bou\b", s_clean)
            items = [re.sub(r"^[\s\-–—•]+", "", p).strip(" .:;") for p in parts]
            items = [i for i in items if 2 <= len(i) <= 40]  # itens curtos
            # filtra "fragmentos" muito genéricos
            items = [i for i in items if len(i.split()) <= 6]
            if min_items <= len(items) <= max_items:
                cands.append(items)
    return cands

def perturb_orders(items: List[str], k: int = 3, rng: Optional[random.Random] = None) -> List[List[str]]:
    """
    Gera k variações plausíveis: troca adjacentes, inverte pares, pequena rotação.
    """
    rng = rng or random
    outs: List[List[str]] = []
    base = list(items)
    n = len(base)
    tried = set()
    def add_variant(v):
        key = tuple(v)
        if key not in tried and v != items:
            tried.add(key); outs.append(v)
    # swap adjacente
    for i in range(n-1):
        v = list(base); v[i], v[i+1] = v[i+1], v[i]; add_variant(v)
    # inverter primeiros 3
    if n >= 3:
        v = list(base); v[:3] = reversed(v[:3]); add_variant(v)
    # rotação simples
    v = base[1:] + base[:1]; add_variant(v)
    # aleatórias até k
    while len(outs) < k:
        v = list(base)
        i, j = rng.randrange(n), rng.randrange(n)
        if i != j:
            v[i], v[j] = v[j], v[i]
            add_variant(v)
        if len(outs) >= k: break
    return outs[:k]

# ---- Question generators ----

def make_cloze(sent: str, terms: List[str], source: int) -> Optional[Dict[str, Any]]:
    if not sent:
        return None
    s = clean_text(sent)
    norm = normalize(s)
    # evita termos genéricos (ex.: 'brasil')
    blacklist = {"brasil", "brasileira", "português", "matemática"}
    term = next((t for t in terms if t not in blacklist and re.search(rf"\b{re.escape(t)}\b", norm, flags=re.I)), None)
    if not term:
        return None

    # tenta gerar opções (cloze-MCQ) usando distratores
    options = build_term_distractors(term, terms, 3)
    if options:
        opt = dedupe_options_casefold([term] + options)
        rng = rng_for_user_week(current_user.id if current_user and getattr(current_user, 'id', None) else 0)
        rng.shuffle(opt)
        # termo pode ter acentuação distinta; substitui pela forma original detectada
        orig = find_original_cased_term(s, normalize(term)) or term
        answer_idx = next((i for i, o in enumerate(opt) if normalize(o) == normalize(term)), 0)
        q = re.sub(rf"\b({re.escape(orig)})\b", "_____", s)
        diffic = difficulty_of_sentence(s, bool(re.search(r"\d", s)), term not in terms[:3])
        return {
            "id": f"cloze-mcq-{source}-{abs(hash(q))%100000}",
            "type": "mcq",  # tratamos como MCQ
            "question": finalize_question_text(q + "<br/><small>Complete a lacuna.</small>"),
            "options": opt,
            "answer": answer_idx,
            "source": source,
            "difficulty": diffic,
            "explanation": f"Sentença original: “{s}”",
        }

    # fallback: cloze aberto
    orig = find_original_cased_term(s, normalize(term)) or term
    q = re.sub(rf"\b({re.escape(orig)})\b", "_____", s)
    diffic = difficulty_of_sentence(s, bool(re.search(r"\d", s)), term not in terms[:3])
    return {
        "id": f"cloze-open-{source}-{abs(hash(q))%100000}",
        "type": "cloze",
        "question": finalize_question_text(q),
        "answer": term,
        "source": source,
        "difficulty": diffic,
        "explanation": f"Sentença original: “{s}”",
    }

def make_mcq_definition(text: str, terms: List[str], source: int) -> Optional[Dict[str, Any]]:
    sentences = split_sentences(text)
    norm_sentences = [normalize(s) for s in sentences]
    phrases = extract_key_phrases(text, 6)
    candidates = terms + phrases

    for t in candidates:
        for i, ns in enumerate(norm_sentences):
            # padrões de definição
            if re.search(rf"\b{re.escape(t)}\b\s+(e|é|são|refere-se|representa|consiste|define-se)", ns):
                s = trim_noise_before_copula(sentences[i])
                m = re.search(rf"{re.escape(t)}[^.]*?(é|são|refere-se|representa|consiste|define-se)([^.]+)", s, flags=re.I)
                if not m:
                    continue
                answer_text = sanitize(re.sub(r"^(a|o|um|uma)\s+", "", m.group(2).strip(), flags=re.I))
                if len(answer_text.split()) < 3:
                    continue

                # distratores por termo + pequenas variações textuais
                base_pool = list(dict.fromkeys(terms + phrases))
                d_terms = build_term_distractors(t, base_pool, 3)
                options = [answer_text] + [f"Está relacionado a {d}." for d in d_terms]
                options = dedupe_options_casefold(options)
                while len(options) < 4:
                    filler = "Nenhuma das anteriores."
                    if options and options[-1].casefold() == filler.casefold():
                        filler = "Nenhuma das alternativas."
                    options.append(filler)

                rng = rng_for_user_week(current_user.id if current_user and getattr(current_user, 'id', None) else 0)
                rng.shuffle(options)
                answer_idx = options.index(answer_text)

                has_num = bool(re.search(r"\d", s))
                rare = t not in terms[:3]  # heurística: menos frequente = mais raro
                diffic = difficulty_of_sentence(s, has_num, rare)

                return {
                    "id": f"mcq-{source}-{abs(hash(t))%100000}",
                    "type": "mcq",
                    "question": finalize_question_text(f"O que é <b>{sanitize(t)}</b>?"),
                    "options": options,
                    "answer": answer_idx,
                    "source": source,
                    "difficulty": diffic,
                    "explanation": f"Trecho base: “{sanitize(s)}”",
                }
    return None

def make_assertion_reason(text: str, source: int) -> Optional[Dict[str, Any]]:
    """
    Gera item do tipo:
    I. Asserção
    PORQUE
    II. Razão
    Alternativas A–E (Ambas verdadeiras com/sem justificativa, etc.)
    Heurística: procura conectivos 'porque/pois/portanto/logo'.
    """
    # une frases adjacentes se houver conectivo
    for s in split_sentences(text):
        s_clean = clean_text(s)
        if not s_clean or len(s_clean) < 60:
            continue
        if looks_like_heading(s_clean):
            continue
        m = re.search(r"(.+?)\s+(porque|pois|portanto|logo)\s+(.+)", s_clean, flags=re.I)
        if not m:
            continue
        I, conn, II = m.group(1).strip(" ."), m.group(2).lower(), m.group(3).strip(" .")
        if len(I) < 30 or len(II) < 30:
            continue

        # Heurística de gabarito:
        # - 'porque'/'pois' => II explica I => alternativa A
        # - 'portanto'/'logo' => II é conclusão de I => alternativa B (verdadeiras, mas II não justifica I)
        correct = "A" if conn in ("porque", "pois") else "B"

        options = [
            "A) As assertivas I e II são verdadeiras, e a II justifica corretamente a I.",
            "B) As assertivas I e II são verdadeiras, mas a II não justifica a I.",
            "C) A assertiva I é verdadeira, e a II é falsa.",
            "D) A assertiva I é falsa, e a II é verdadeira.",
            "E) As assertivas I e II são falsas.",
        ]
        answer_idx = ["A","B","C","D","E"].index(correct)
        diffic = difficulty_of_sentence(s_clean, bool(re.search(r"\d", s_clean)), False)

        return {
            "id": f"ar-{source}-{abs(hash(I+II))%100000}",
            "type": "mcq",
            "format": "assertion_reason",
            "question": finalize_question_text(f"<b>I.</b> {I}<br/><b>PORQUE</b><br/><b>II.</b> {II}"),
            "options": options,
            "answer": answer_idx,
            "source": source,
            "difficulty": diffic,
            "explanation": f"Conectivo identificado: “{conn}”.",
        }
    return None

def make_ordering_mcq(text: str, source: int) -> Optional[Dict[str, Any]]:
    """
    Detecta uma enumeração e pede a ordem correta.
    Sai como MCQ com 4 alternativas (1 correta + 3 variações plausíveis).
    """
    rng = rng_for_user_week(current_user.id if current_user and getattr(current_user, 'id', None) else 0)
    enums = extract_enumerations(text, 4, 6)
    if not enums:
        return None
    items = enums[0]
    distractors = perturb_orders(items, k=3, rng=rng)
    options_seq = [items] + distractors
    rng.shuffle(options_seq)

    def fmt(seq): return " → ".join(seq)
    options = [fmt(seq) for seq in options_seq]
    answer_idx = options_seq.index(items)
    diffic = "medium" if len(items) <= 4 else "hard"

    return {
        "id": f"ord-{source}-{abs(hash(' '.join(items)))%100000}",
        "type": "mcq",
        "format": "ordering",
        "question": finalize_question_text("Qual é a <b>ordem correta</b> do processo descrito no texto?"),
        "options": options,
        "answer": answer_idx,
        "source": source,
        "difficulty": diffic,
        "explanation": f"Itens detectados: {', '.join(items)}.",
    }

def make_tf(text: str, terms: List[str], source: int) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    sentences = filter_sentences(text)[:2]
    rng = rng_for_user_week(current_user.id if current_user and getattr(current_user, 'id', None) else 0)

    for s in sentences:
        has_num = bool(re.search(r"\d", s))
        rare = any(t for t in terms[3:] if t in normalize(s))
        diffic = difficulty_of_sentence(s, has_num, rare)

        out.append({
            "id": f"tf-true-{source}-{abs(hash(s))%100000}",
            "type": "tf",
            "question": finalize_question_text(s),
            "answer": True,
            "source": source,
            "difficulty": diffic,
        })

        # Falsa: 1) numérica ou 2) negação/antônimo ou 3) swap de termo
        false_q = s
        m = re.search(r"\b(\d+(?:[.,]\d+)?)", s)
        if m:
            try:
                val = float(m.group(1).replace(',', '.'))
                new_val = rng.choice(make_numeric_distractors(val))
                false_q = s[:m.start()] + new_val + s[m.end():]
            except Exception:
                pass
        if false_q == s:
            for a, b in NEGATION_PAIRS:
                pat = re.compile(rf"\b{a}\b", flags=re.I)
                if pat.search(normalize(s)):
                    false_q = pat.sub(b, s)
                    break
        if false_q == s:
            norm = normalize(s)
            t = next((t for t in terms if re.search(rf"\b{re.escape(t)}\b", norm)), None)
            swap = next((x for x in terms if x != t), None)
            if t and swap:
                false_q = re.sub(rf"\b({re.escape(t)})\b", swap, s, flags=re.I)

        if false_q != s:
            out.append({
                "id": f"tf-false-{source}-{abs(hash(false_q))%100000}",
                "type": "tf",
                "question": finalize_question_text(false_q),
                "answer": False,
                "source": source,
                "difficulty": diffic,
                "explanation": "Altere números/termos para validar o senso crítico.",
            })
    return out

# ---- Main generator ----

def generate_weekly_quiz(contents: List[Dict[str, Any]], per_content: int = 5) -> List[Dict[str, Any]]:
    """
    Blueprint por conteúdo (prioridade):
      1) MCQ de definição (se existir)
      2) Asserção–Razão (se existir)
      3) Ordem correta (se enumeração for detectada)
      4) Cloze (com alternativas se possível)
      5) V/F (1–2 itens)
    Ajusta automaticamente se per_content < ou > 5.
    """
    quiz: List[Dict[str, Any]] = []
    seen = set()

    def add(q):
        key = normalize(q.get("question",""))
        if not key or key in seen:
            return
        seen.add(key)
        quiz.append(q)

    for c in contents:
        raw_text = c.get('text') or ''
        text = clean_text(raw_text)
        sentences = filter_sentences(text)
        if not sentences:
            # pula conteúdos com frases inválidas (títulos/listas/artefatos)
            continue
        terms = extract_key_terms(text, 12)

        bucket: List[Dict[str, Any]] = []

        # 1) Definição
        mcq_def = make_mcq_definition(text, terms, c['id'])
        if mcq_def:
            bucket.append(mcq_def)

        # 2) Asserção–Razão
        ar = make_assertion_reason(text, c['id'])
        if ar:
            bucket.append(ar)

        # 3) Ordem correta
        ordq = make_ordering_mcq(text, c['id'])
        if ordq:
            bucket.append(ordq)

        # 4) Cloze
        sent = pick_good_sentence(sentences)
        cloze = make_cloze(sent, terms, c['id']) if sent else None
        if cloze:
            bucket.append(cloze)

        # 5) V/F (até 2)
        tfs = make_tf(text, terms, c['id'])[:2]
        bucket.extend(tfs)

        # Seleção conforme per_content, preservando diversidade e prioridade
        # prioridade: def > ar > ord > cloze > tf
        prio = {"mcq_def": 0, "ar": 1, "ord": 2, "cloze": 3, "tf": 4}
        def tag(q):
            if q.get("format") == "assertion_reason":
                return "ar"
            if q.get("format") == "ordering":
                return "ord"
            if q["type"] == "cloze":
                return "cloze"
            if q["type"] == "tf":
                return "tf"
            return "mcq_def"

        # ordena pela prioridade + dificuldade (mistura easy/medium/hard)
        bucket_sorted = sorted(
            bucket,
            key=lambda q: (prio[tag(q)], {"easy": 0, "medium": 1, "hard": 2}.get(q.get("difficulty", "medium"), 1)),
        )
        chosen: List[Dict[str, Any]] = []

        for q in bucket_sorted:
            if len(chosen) >= per_content:
                break
            # garante diversidade mínima
            kinds = {tag(x) for x in chosen}
            if tag(q) not in kinds or len(chosen) < per_content:
                chosen.append(q)

        # fallback se ficou curto
        i = 0
        while len(chosen) < per_content and i < len(bucket_sorted):
            if bucket_sorted[i] not in chosen:
                chosen.append(bucket_sorted[i])
            i += 1

        for q in chosen:
            add(q)

    # Embaralha globalmente (determinístico por usuário/semana)
    rng = rng_for_user_week(current_user.id if current_user and getattr(current_user, 'id', None) else 0)
    rng.shuffle(quiz)
    return quiz

# ---- Optional polishing with Gemini (AI assist) ----

def polish_quiz_with_gemini(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    If enabled via env (QUIZ_POLISH_WITH_GEMINI=true) and GOOGLE_API_KEY is set,
    ask Gemini to minimally correct grammar/coherence of the generated items while
    preserving structure, options length, and the correct answer mapping.
    Fallback to original items on any failure.
    """
    try:
        enabled = (os.getenv('QUIZ_POLISH_WITH_GEMINI', 'false').lower() in {'1','true','yes'})
        api_key = os.getenv('GOOGLE_API_KEY')
        model_name = os.getenv('GOOGLE_DEFAULT_MODEL', 'gemini-1.5-flash')
        if not (enabled and api_key):
            return items

        # dynamic import to avoid hard dependency
        try:
            import importlib
            genai = importlib.import_module('google.generativeai')  # type: ignore
        except Exception:
            return items

        import json as _json

        # Configuração para reduzir variação e forçar JSON
        chunk_size = 8
        genai.configure(api_key=api_key)  # type: ignore
        generation_config = {
            "temperature": 0.15,
            "top_p": 0.3,
            "top_k": 32,
            "max_output_tokens": 2048,
            "response_mime_type": "application/json",
        }
        model = genai.GenerativeModel(model_name=model_name, generation_config=generation_config)  # type: ignore

        def merge_one(orig: Dict[str, Any], new: Dict[str, Any]) -> Dict[str, Any]:
            try:
                qtype = new.get('type') or orig.get('type')
                qtext = str(new.get('question') or orig.get('question') or '').strip()
                qtext = finalize_question_text(qtext)

                if qtype == 'mcq':
                    orig_opts = [str(x) for x in (orig.get('options') or [])]
                    opts = new.get('options') if isinstance(new.get('options'), list) else orig_opts
                    opts = [str(x) for x in (opts or [])]
                    opts = dedupe_options_casefold(opts)
                    # Exige mesmo número de opções; fallback total se quebrar
                    if len(opts) != len(orig_opts) or len(opts) < 2:
                        opts = orig_opts[:]
                    ans = new.get('answer')
                    if not isinstance(ans, int) or not (0 <= ans < len(opts)):
                        ans = orig.get('answer') if isinstance(orig.get('answer'), int) else 0
                        if isinstance(ans, int) and 0 <= ans < len(orig_opts):
                            correct_text = orig_opts[ans]
                            idx = next((i for i, o in enumerate(opts) if o.casefold() == correct_text.casefold()), None)
                            ans = idx if idx is not None else (ans if ans < len(opts) else 0)
                        else:
                            ans = 0
                    merged = dict(orig)
                    merged.update({'question': qtext, 'options': opts, 'answer': int(ans)})
                    return merged
                elif qtype == 'tf':
                    ans_bool = new.get('answer') if isinstance(new.get('answer'), bool) else orig.get('answer')
                    merged = dict(orig)
                    merged.update({'question': qtext, 'answer': bool(ans_bool)})
                    return merged
                elif qtype == 'cloze':
                    merged = dict(orig)
                    if 'options' in new and isinstance(new.get('options'), list):
                        opts = [str(x) for x in new.get('options')]
                        opts = dedupe_options_casefold(opts)
                        ans = new.get('answer')
                        if not isinstance(ans, int) or not (0 <= ans < len(opts)):
                            ans = orig.get('answer') if isinstance(orig.get('answer'), int) else 0
                            if not isinstance(ans, int) or not (0 <= ans < len(opts)):
                                ans = 0
                        merged.update({'question': qtext, 'options': opts, 'answer': int(ans), 'type': 'mcq'})
                    else:
                        ans_text = str(new.get('answer') or orig.get('answer') or '').strip()
                        merged.update({'question': qtext, 'answer': ans_text, 'type': 'cloze'})
                    return merged
                else:
                    merged = dict(orig)
                    merged.update({'question': qtext})
                    return merged
            except Exception:
                return orig

        # Seleciona apenas itens que precisam de polimento
        candidates = [it for it in items if needs_polish(it)]
        if not candidates:
            return items
        indices = [i for i, it in enumerate(items) if it in candidates]
        result = list(items)

        for i in range(0, len(candidates), chunk_size):
            chunk = candidates[i:i+chunk_size]
            try:
                payload = _json.dumps(chunk, ensure_ascii=False)
                sys_prompt = (
                    "Você é um assistente de revisão. Receberá uma lista JSON de questões de quiz em PT-BR.\n"
                    "Corrija gramática/coerência do campo 'question' e, se necessário, pequenas correções nas 'options',\n"
                    "SEM alterar o significado nem a resposta correta.\n"
                    "- Mantenha estrutura, tamanho da lista e quantidade de opções por item.\n"
                    "- Para 'mcq', não altere a ordem das opções a menos que ajuste 'answer' coerentemente.\n"
                    "- Para 'tf', devolva 'answer' como boolean.\n"
                    "- Para 'cloze', preserve '_____'.\n"
                    "- Responda SOMENTE com JSON válido."
                )
                user_prompt = f"{payload}"
                resp = model.generate_content([sys_prompt, user_prompt])  # type: ignore
                text = getattr(resp, 'text', '') or ''
                new_list = _json.loads(text)
                if not isinstance(new_list, list) or len(new_list) != len(chunk):
                    continue
                polished_block: List[Dict[str, Any]] = [merge_one(o, n) for o, n in zip(chunk, new_list)]
                for j, it in enumerate(polished_block):
                    result[indices[i+j]] = it
            except Exception:
                continue
        return result
    except Exception:
        return items

# ---- Data fetch helpers ----

def get_week_range():
    today = datetime.now()
    start = today - timedelta(days=today.weekday())  # Monday
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=7)
    return start, end

def get_week_start_date() -> date:
    today = datetime.now()
    monday = today - timedelta(days=today.weekday())
    return date(monday.year, monday.month, monday.day)


def fetch_weekly_contents_for_user(user_id: int, limit_fallback: int = 6) -> List[Dict[str, Any]]:
    start, end = get_week_range()
    rows = (
        db.session.query(SubjectContent)
        .join(CompletedContent, CompletedContent.content_id == SubjectContent.id)
        .filter(and_(CompletedContent.user_id == user_id, CompletedContent.completed_at >= start, CompletedContent.completed_at < end))
        .order_by(CompletedContent.completed_at.desc())
        .all()
    )
    contents: List[Dict[str, Any]] = []
    for sc in rows:
        contents.append({
            'id': sc.id,
            'subject': sc.subject or '',
            'title': sc.topic or '',
            'text': strip_html(sc.content_html or ''),
        })
    if contents:
        return contents
    # Fallback: recent SubjectContent by created_at
    rows2 = (
        db.session.query(SubjectContent)
        .filter(SubjectContent.created_at != None)
        .order_by(SubjectContent.created_at.desc())
        .limit(limit_fallback)
        .all()
    )
    for sc in rows2:
        contents.append({
            'id': sc.id,
            'subject': sc.subject or '',
            'title': sc.topic or '',
            'text': strip_html(sc.content_html or ''),
        })
    return contents

# ---- Routes ----

@bp_quiz_gen.route('/api/ai/health', methods=['GET'])
def ai_health():
    """Lightweight health check for Gemini availability and config."""
    try:
        enabled = is_polish_enabled()
        api_key = os.getenv('GOOGLE_API_KEY')
        model_name = os.getenv('GOOGLE_DEFAULT_MODEL', 'gemini-1.5-flash')
        info: Dict[str, Any] = {
            'polish_enabled': enabled,
            'has_api_key': bool(api_key),
            'model': model_name,
            'library_installed': False,
            'effective_policy': 'auto' if os.getenv('QUIZ_POLISH_WITH_GEMINI') in (None, '') else os.getenv('QUIZ_POLISH_WITH_GEMINI')
        }
        try:
            import importlib  # noqa: F401
            import google.generativeai  # type: ignore # noqa: F401
            info['library_installed'] = True
        except Exception:
            info['library_installed'] = False
        status = 200
        return jsonify({'status': 'ok', 'gemini': info}), status
    except Exception as e:
        return jsonify({'status': 'error', 'error': str(e)}), 500

@bp_quiz_gen.route('/api/quizzes/weekly', methods=['POST'])
@login_required
def post_weekly_quiz():
    try:
        body = request.get_json(silent=True) or {}
        per_content = int(body.get('per_content', 5))
        force_regen = bool(body.get('regenerate') or body.get('force') or False)
        wk = get_week_start_date()
        # idempotent upsert: if exists, return existing
        existing = (
            db.session.query(WeeklyQuiz)
            .filter(WeeklyQuiz.user_id == current_user.id, WeeklyQuiz.week_start == wk)
            .first()
        )
        if existing and existing.status == 'ready' and not force_regen:
            return jsonify({
                'user_id': current_user.id,
                'week_start': existing.week_start.isoformat(),
                'status': existing.status,
                'version': existing.version,
                'items': existing.data or [],
            })

        contents = fetch_weekly_contents_for_user(current_user.id)
        quiz = generate_weekly_quiz(contents, per_content=per_content)
        # Optional Gemini polish
        if is_polish_enabled():
            quiz = polish_quiz_with_gemini(quiz)

        if existing:
            existing.data = quiz
            existing.status = 'ready'
            existing.version = (existing.version or 1)
            record = existing
        else:
            record = WeeklyQuiz(user_id=current_user.id, week_start=wk, status='ready', version=1, data=quiz)
            db.session.add(record)
        db.session.commit()
        return jsonify({
            'user_id': current_user.id,
            'week_start': record.week_start.isoformat() if record.week_start else None,
            'status': record.status,
            'version': record.version,
            'created_at': record.created_at.isoformat() if record.created_at else None,
            'items': quiz,
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp_quiz_gen.route('/api/quizzes/weekly/latest', methods=['GET'])
@login_required
def get_latest_weekly_quiz():
    try:
        wk = get_week_start_date()
        row = (
            db.session.query(WeeklyQuiz)
            .filter(WeeklyQuiz.user_id == current_user.id, WeeklyQuiz.week_start == wk)
            .first()
        )
        if not row:
            # No quiz yet for this week
            return jsonify({'status': 'missing', 'items': []}), 200
        if row.status != 'ready':
            return jsonify({'status': row.status, 'items': []}), 202
        return jsonify({
            'user_id': current_user.id,
            'week_start': row.week_start.isoformat() if row.week_start else None,
            'status': row.status,
            'version': row.version,
            'created_at': row.created_at.isoformat() if row.created_at else None,
            'items': row.data or []
        })
    except Exception as e:
        # If the table doesn't exist yet, treat as missing instead of 500
        msg = str(e).lower()
        logging.warning(f"/api/quizzes/weekly/latest error: {e}")
        try:
            db.session.rollback()
        except Exception:
            pass
        if 'no such table' in msg or 'does not exist' in msg or 'relation' in msg and 'does not exist' in msg:
            return jsonify({'status': 'missing', 'items': []}), 200
        return jsonify({'error': str(e)}), 500


# Idempotent GET that creates (or queues) when missing
@bp_quiz_gen.route('/api/me/weekly-quiz', methods=['GET'])
@login_required
def get_or_enqueue_weekly_quiz():
    try:
        wk = get_week_start_date()
        force_regen = request.args.get('regenerate') or request.args.get('force')
        force_regen = _is_truthy(force_regen) if isinstance(force_regen, str) else False
        row = (
            db.session.query(WeeklyQuiz)
            .filter(WeeklyQuiz.user_id == current_user.id, WeeklyQuiz.week_start == wk)
            .first()
        )
        if row and row.status == 'ready' and not force_regen:
            return jsonify({
                'user_id': current_user.id,
                'week_start': row.week_start.isoformat(),
                'status': row.status,
                'version': row.version,
                'items': row.data or []
            })
        if row and row.status == 'pending':
            return jsonify({'status': 'pending'}), 202

        # Get recent topics for the user (titles/subjects)
        topics = [c['title'] for c in fetch_weekly_contents_for_user(current_user.id)]
        if not topics:
            return jsonify({'status': 'missing', 'items': []}), 200

        # Generate and refine quiz items
        items = [asdict(q) for q in generate_refined_quiz(topics, n=8)]
        if not items:
            # fallback: generate 2-4 simple TF items
            items = [
                {
                    "id": "fallback-tf-1",
                    "type": "tf",
                    "question": "O Brasil é um país da América do Sul?",
                    "answer": True,
                    "explanation": "O Brasil está localizado na América do Sul.",
                    "difficulty": "easy",
                    "format": "default"
                },
                {
                    "id": "fallback-tf-2",
                    "type": "tf",
                    "question": "A água ferve a 100°C ao nível do mar?",
                    "answer": True,
                    "explanation": "Ao nível do mar, a água ferve a 100°C.",
                    "difficulty": "easy",
                    "format": "default"
                }
            ]

        # Save to DB
        if row:
            row.data = items
            row.status = 'ready'
            row.version = (row.version or 1)
            record = row
        else:
            record = WeeklyQuiz(user_id=current_user.id, week_start=wk, status='ready', version=1, data=items)
            db.session.add(record)
        db.session.commit()
        return jsonify({
            'user_id': current_user.id,
            'week_start': record.week_start.isoformat(),
            'status': record.status,
            'version': record.version,
            'items': record.data or []
        })
    except Exception as e:
        logging.exception(f"/api/me/weekly-quiz error: {e}")
        try:
            db.session.rollback()
        except Exception:
            pass
        msg = str(e).lower()
        if 'no such table' in msg or 'does not exist' in msg or ('relation' in msg and 'does not exist' in msg):
            return jsonify({'status': 'missing', 'items': []}), 200
        return jsonify({'error': str(e)}), 500


# Event hook: content completion (micro-quiz placeholder)
@bp_quiz_gen.route('/api/events/content-completed', methods=['POST'])
@login_required
def on_content_completed_event():
    try:
        body = request.get_json(silent=True) or {}
        content_id = int(body.get('content_id'))
        if not content_id:
            return jsonify({'error': 'content_id required'}), 400
        # Could create 3-5 micro questions and append to current week quiz
        # Keeping as a no-op stub for now
        return jsonify({'status': 'ok'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Optional debug endpoint to test quiz generation without auth (uses fallback)
@bp_quiz_gen.route('/api/debug/weekly-quiz', methods=['GET'])
def debug_weekly_quiz():
    try:
        if not _is_truthy(os.getenv('DEBUG_OPEN_ENDPOINTS', '0')):
            return jsonify({'error': 'disabled'}), 404
        topic = (request.args.get('topic') or '').strip() or 'Revisão Geral'
        items = fallback_vf_from_topics([topic], n=4)
        return jsonify({'status': 'ok', 'items': [asdict(it) if hasattr(it, '__dict__') else it for it in items]})
    except Exception as e:
        logging.exception(f"/api/debug/weekly-quiz error: {e}")
        return jsonify({'error': str(e)}), 500
