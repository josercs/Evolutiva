"""Seed inicial de dados básicos.
Executa de forma idempotente: só insere se não existir.
Uso (local):
  cd backend/src
  python -m scripts.seed_data
Dentro do container (via dev-up -Seed):
  alembic upgrade head (se necessário) e depois executamos este script.
"""
from __future__ import annotations
import os
import sys
from datetime import datetime

# garantir que src esteja no path quando rodado de fora
def _ensure_path():
    base = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src'))
    if base not in sys.path:
        sys.path.insert(0, base)
_ensure_path()

from models.models import db, Curso, SubjectContent, User, HorariosEscolares, CursoMateria  # type: ignore
from app_factory import create_app  # type: ignore

APP = create_app()

BASIC_CURSOS = [
    {"nome": "Ensino Médio - Geral", "descricao": "Conteúdos base para estudantes do ensino médio."},
]

# Cursos principais esperados na UI
TARGET_COURSES = [
    "IFRS",
    "ENEM",
    "CTISM",
    "Colégios Militares",
]

# Matérias base
BASE_MATERIAS = [
    "Matemática",
    "Língua Portuguesa",
    "Redação",
    "Física",
    "Química",
    "Biologia",
    "História",
    "Geografia",
]

# Mapeamento curso -> matérias (prioridades iniciais)
COURSE_TO_MATERIAS = {
    "IFRS": ["Matemática", "Língua Portuguesa", "Física", "Química"],
    "ENEM": ["Matemática", "Língua Portuguesa", "História", "Geografia", "Biologia"],
    "CTISM": ["Matemática", "Língua Portuguesa", "Física", "Química"],
    "Colégios Militares": ["Matemática", "Língua Portuguesa", "Redação"],
}

BASIC_CONTENT = [
    {"subject": "Matemática", "topic": "Frações", "descricao": "Introdução a frações", "dificuldade": 1},
    {"subject": "Ciências", "topic": "Sistema Solar", "descricao": "Planetas e características", "dificuldade": 1},
]

ADMIN_EMAIL = os.getenv("SEED_ADMIN_EMAIL", "admin@example.com")
ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD", "admin123")

def seed():
    inserted = {"cursos": 0, "conteudos": 0, "admin_created": False, "materias": 0, "vinculos": 0}
    with APP.app_context():
        # 1) Cursos obrigatórios
        for c in BASIC_CURSOS:
            if not db.session.query(Curso).filter_by(nome=c["nome"]).first():
                db.session.add(Curso(**c))
                inserted["cursos"] += 1
        for nome in TARGET_COURSES:
            if not db.session.query(Curso).filter_by(nome=nome).first():
                db.session.add(Curso(nome=nome))
                inserted["cursos"] += 1

        db.session.flush()

        # 2) Materias base
        materia_map: dict[str,int] = {}
        for mnome in BASE_MATERIAS:
            m = db.session.query(HorariosEscolares).filter_by(materia=mnome).first()
            if not m:
                m = HorariosEscolares(materia=mnome, horario="")
                db.session.add(m)
                inserted["materias"] += 1
                db.session.flush()
            materia_map[m.materia] = m.id

        # 3) Vinculos curso<->materia
        cursos = {c.nome: c for c in db.session.query(Curso).all()}
        for curso_nome, materias in COURSE_TO_MATERIAS.items():
            c = cursos.get(curso_nome)
            if not c:
                continue
            for mnome in materias:
                mid = materia_map.get(mnome)
                if not mid:
                    continue
                exists = db.session.query(CursoMateria).filter_by(curso_id=c.id, materia_id=mid).first()
                if not exists:
                    db.session.add(CursoMateria(curso_id=c.id, materia_id=mid))
                    inserted["vinculos"] += 1

        for cont in BASIC_CONTENT:
            if not db.session.query(SubjectContent).filter_by(subject=cont["subject"], topic=cont["topic"]).first():
                db.session.add(SubjectContent(**cont))
                inserted["conteudos"] += 1
        # Admin user
        if not db.session.query(User).filter_by(email=ADMIN_EMAIL).first():
            admin = User(name="Admin", email=ADMIN_EMAIL, role="admin")
            admin.set_password(ADMIN_PASSWORD)
            db.session.add(admin)
            inserted["admin_created"] = True
        # Commit dentro do app_context
        if any([
            inserted["cursos"],
            inserted["conteudos"],
            inserted["admin_created"],
            inserted["materias"],
            inserted["vinculos"],
        ]):
            db.session.commit()
    return inserted

if __name__ == "__main__":
    import argparse, json
    ap = argparse.ArgumentParser()
    ap.add_argument('--json', action='store_true', help='Saída JSON')
    args = ap.parse_args()
    result = seed()
    if args.json:
        print(json.dumps({"seed": result}, ensure_ascii=False))
    else:
        print(
            "Seed executado. "
            f"Cursos adicionados={result['cursos']} "
            f"Matérias adicionadas={result['materias']} "
            f"Vínculos adicionados={result['vinculos']} "
            f"Conteúdos adicionados={result['conteudos']} "
            f"AdminCriado={result['admin_created']}"
        )
