import os
import sys
import json
import pytest

# Ensure backend/src on path
CURRENT_DIR = os.path.dirname(os.path.dirname(__file__))  # backend/src
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

# Dev-friendly env for tests (SQLite, autocreate user)
os.environ.setdefault('USE_SQLITE', 'true')
os.environ.setdefault('DEBUG_SESSIONS', 'true')
os.environ.setdefault('DEV_MASTER_PASSWORD', 'senhadev')
os.environ.setdefault('DEV_AUTOCREATE_USER', 'true')

from main import app  # noqa: E402
from models.models import db, Curso, HorariosEscolares, CursoMateria, SubjectContent, User  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with app.app_context():
        db.create_all()
    with app.test_client() as c:
        yield c


def seed_minimal():
    with app.app_context():
        curso = Curso.query.first()
        if not curso:
            curso = Curso(nome='Curso Teste (pytest)')
            db.session.add(curso)
            db.session.commit()
        materias_nomes = ['Matemática', 'Português', 'História']
        materias = []
        for nome in materias_nomes:
            m = HorariosEscolares.query.filter_by(materia=nome).first()
            if not m:
                m = HorariosEscolares(materia=nome, horario='')
                db.session.add(m)
                db.session.commit()
            materias.append(m)
            if not CursoMateria.query.filter_by(curso_id=curso.id, materia_id=m.id).first():
                db.session.add(CursoMateria(curso_id=curso.id, materia_id=m.id))
                db.session.commit()
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


def json_body(resp):
    try:
        return resp.get_json() or {}
    except Exception:
        return {}


def test_auth_user_payload(client):
    email = 'pytest_user@example.com'
    r = client.post('/api/auth/login', json={'email': email, 'password': os.getenv('DEV_MASTER_PASSWORD', 'senhadev')})
    assert 200 <= r.status_code < 300

    r_me = client.get('/api/user/me')
    assert r_me.status_code == 200
    data = json_body(r_me)
    assert set(['id','name','email','has_onboarding','curso_id']).issubset(set(data.keys()))

    r_me2 = client.get('/api/users/me')
    assert r_me2.status_code == 200
    data2 = json_body(r_me2)
    assert data2.get('email') == data.get('email')


def test_browsing_endpoints(client):
    seed_minimal()

    # cursos
    rc = client.get('/api/cursos')
    assert rc.status_code == 200
    cursos = rc.get_json()
    assert isinstance(cursos, list) and len(cursos) >= 1
    curso_id = cursos[0]['id']

    # materias por curso
    rm = client.get(f'/api/materias?course_id={curso_id}')
    assert rm.status_code == 200
    materias = rm.get_json().get('materias', [])
    assert isinstance(materias, list) and len(materias) >= 1
    materia_id = materias[0]['id']

    # conteudos por materia
    rct = client.get(f'/api/materias/{materia_id}/conteudos')
    assert rct.status_code == 200
    conteudos = rct.get_json().get('conteudos', [])
    assert isinstance(conteudos, list) and len(conteudos) >= 1


def test_plan_flow_endpoints(client):
    curso_id = seed_minimal()

    email = 'pytest_user_plan@example.com'
    pwd = os.getenv('DEV_MASTER_PASSWORD', 'senhadev')

    # login
    r_login = client.post('/api/auth/login', json={'email': email, 'password': pwd})
    assert 200 <= r_login.status_code < 300

    # onboarding with curso_id
    payload_onb = {
        'idade': 18,
        'escolaridade': 'Ensino Médio',
        'objetivo': 'Aprovação',
        'dias_disponiveis': ['Segunda', 'Quarta', 'Sexta'],
        'tempo_diario': 90,
        'estilo_aprendizagem': 'visual',
        'ritmo': 'moderate',
        'horario_inicio': '19:00',
        'curso_id': curso_id,
    }
    r_onb = client.post('/api/onboarding', json=payload_onb)
    assert 200 <= r_onb.status_code < 300

    # generate plan
    r_gen = client.post('/api/plano-estudo/gerar')
    assert 200 <= r_gen.status_code < 300
    plan_payload = json_body(r_gen)
    assert 'plano_estudo' in plan_payload
    plano = plan_payload.get('plano_estudo') or {}
    assert isinstance(plano, dict) and 'days' in plano

    # fetch plan by email
    r_plan = client.get(f'/api/planos/por-email?email={email}')
    assert 200 <= r_plan.status_code < 300
    fetched = json_body(r_plan).get('plano_estudo') or {}
    assert isinstance(fetched, dict) and 'days' in fetched
    days = fetched.get('days') or []
    assert isinstance(days, list) and len(days) >= 1

    # update status for first block
    first_day = days[0]
    date = first_day.get('date')
    blocks = first_day.get('blocks') or []
    assert blocks, 'plan must contain blocks'
    first_block_id = blocks[0].get('id')
    r_upd = client.post('/api/planos/atualizar-status-bloco', json={
        'email': email,
        'date': date,
        'id': first_block_id,
        'status': 'pendente'
    })
    assert 200 <= r_upd.status_code < 300

    # list pendencias must include at least one
    r_pend = client.get(f'/api/planos/pendencias?email={email}')
    assert 200 <= r_pend.status_code < 300
    pend = json_body(r_pend).get('pendencias')
    assert isinstance(pend, list)

    # schedule review for a content
    with app.app_context():
        sc = SubjectContent.query.first()
        sc_id = sc.id if sc else None
    assert sc_id is not None
    r_rev = client.post('/api/planos/marcar-revisao', json={'email': email, 'conteudo_id': sc_id})
    assert 200 <= r_rev.status_code < 300

    # fetch plan again after review
    r_plan2 = client.get(f'/api/planos/por-email?email={email}')
    assert 200 <= r_plan2.status_code < 300
    fetched2 = json_body(r_plan2).get('plano_estudo') or {}
    assert 'days' in fetched2


def test_progress_endpoints(client):
    curso_id = seed_minimal()

    # create and login
    email = 'pytest_user_progress@example.com'
    r = client.post('/api/auth/login', json={'email': email, 'password': os.getenv('DEV_MASTER_PASSWORD', 'senhadev')})
    assert 200 <= r.status_code < 300

    # set curso via onboarding minimal
    r_onb = client.post('/api/onboarding', json={'curso_id': curso_id})
    assert 200 <= r_onb.status_code < 300

    # progress endpoints
    # progresso por materias
    # get user id
    r_me = client.get('/api/user/me')
    uid = json_body(r_me).get('id')
    rm = client.get(f'/api/progress/materias/{uid}/{curso_id}')
    assert 200 <= rm.status_code < 300

    # xp/streak
    rx = client.get(f'/api/progress/user/{uid}/xp')
    assert 200 <= rx.status_code < 300

    # curso info
    rc = client.get(f'/api/progress/user/{uid}/curso')
    assert 200 <= rc.status_code < 300
