import os
import sys
import json

# Ensure backend/src on path
CURRENT_DIR = os.path.dirname(__file__)
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

# Dev-friendly env
os.environ.setdefault('USE_SQLITE', 'true')
os.environ.setdefault('DEBUG_SESSIONS', 'true')
os.environ.setdefault('DEV_MASTER_PASSWORD', 'senhadev')
os.environ.setdefault('DEV_AUTOCREATE_USER', 'true')

from main import app  # type: ignore
from models.models import db, Curso, HorariosEscolares, CursoMateria, SubjectContent, User


def seed_minimal():
    with app.app_context():
        # Create a test course if none exists
        curso = Curso.query.first()
        if not curso:
            curso = Curso(nome='Curso Teste')
            db.session.add(curso)
            db.session.commit()
        # Create 2-3 materias (HorariosEscolares)
        materias_nomes = ['Matemática', 'Português', 'História']
        materias = []
        for nome in materias_nomes:
            m = HorariosEscolares.query.filter_by(materia=nome).first()
            if not m:
                m = HorariosEscolares(materia=nome, horario='')
                db.session.add(m)
                db.session.commit()
            materias.append(m)
            # Ensure CursoMateria link
            if not CursoMateria.query.filter_by(curso_id=curso.id, materia_id=m.id).first():
                db.session.add(CursoMateria(curso_id=curso.id, materia_id=m.id))
                db.session.commit()
        # Seed SubjectContent for each materia
        for m in materias:
            existing = SubjectContent.query.filter_by(materia_id=m.id).count()
            if existing < 3:
                for i in range(1, 4):
                    sc = SubjectContent(
                        subject=m.materia,
                        topic=f'Tópico {i} de {m.materia}',
                        content_html=f'<h1>{m.materia} - Tópico {i}</h1><p>Conteúdo de teste.</p>',
                        created_at=db.func.now(),
                        materia_id=m.id,
                        curso_id=curso.id,
                    )
                    db.session.add(sc)
                db.session.commit()
        return curso.id


def pp(label: str, resp):
    try:
        body = resp.get_json()
    except Exception:
        body = None
    print(f"[{label}] -> {resp.status_code}")
    try:
        print(json.dumps(body, ensure_ascii=False)[:500])
    except Exception:
        try:
            print((resp.data or b'')[:200])
        except Exception:
            pass


def run_flow():
    email = 'qa@example.com'
    password = os.getenv('DEV_MASTER_PASSWORD', 'senhadev')
    curso_id = seed_minimal()

    with app.test_client() as c:
        r = c.post('/api/auth/login', json={'email': email, 'password': password})
        pp('login', r)

        r_me = c.get('/api/user/me')
        pp('user/me', r_me)

        # Onboarding with curso_id and minimal prefs
        payload_onb = {
            'idade': 18,
            'escolaridade': 'Ensino Médio',
            'objetivo': 'Aprovação vestibular',
            'dias_disponiveis': ['Segunda', 'Quarta', 'Sexta'],
            'tempo_diario': 90,
            'estilo_aprendizagem': 'visual',
            'ritmo': 'moderate',
            'horario_inicio': '19:00',
            'curso_id': curso_id,
        }
        r_onb = c.post('/api/onboarding', json=payload_onb)
        pp('onboarding', r_onb)

        # Generate plan
        r_gen = c.post('/api/plano-estudo/gerar')
        pp('plano-estudo/gerar', r_gen)

        # Fetch plan by email
        r_plan = c.get(f'/api/planos/por-email?email={email}')
        pp('planos/por-email', r_plan)

        # Extract first day/block to test status updates
        try:
            plan = r_plan.get_json() or {}
            days = (plan.get('plano_estudo') or {}).get('days') or []
            first_day = days[0] if days else None
            date = first_day.get('date') if isinstance(first_day, dict) else None
            blocks = first_day.get('blocks') if isinstance(first_day, dict) else None
            first_block_id = (blocks[0] or {}).get('id') if isinstance(blocks, list) and blocks else None
        except Exception:
            date = None
            first_block_id = None

        if date and first_block_id:
            r_upd = c.post('/api/planos/atualizar-status-bloco', json={
                'email': email,
                'date': date,
                'id': first_block_id,
                'status': 'pendente'
            })
            pp('planos/atualizar-status-bloco', r_upd)

        # List pendencias
        r_pend = c.get(f'/api/planos/pendencias?email={email}')
        pp('planos/pendencias', r_pend)

        # Find a content id to schedule review
        with app.app_context():
            sc = SubjectContent.query.first()
            sc_id = sc.id if sc else None
        if sc_id:
            r_rev = c.post('/api/planos/marcar-revisao', json={
                'email': email,
                'conteudo_id': sc_id,
                'duration': 45,
            })
            pp('planos/marcar-revisao', r_rev)

        # Fetch plan again to confirm review appended
        r_plan2 = c.get(f'/api/planos/por-email?email={email}')
        pp('planos/por-email (after review)', r_plan2)


if __name__ == '__main__':
    run_flow()
