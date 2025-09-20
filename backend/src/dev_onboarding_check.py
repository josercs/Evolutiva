import os
import sys
import json

# Ensure backend/src on path
CURRENT_DIR = os.path.dirname(__file__)
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

# Enable debug logging in auth
os.environ.setdefault('DEBUG_SESSIONS', 'true')
os.environ.setdefault('USE_SQLITE', 'true')

from main import app  # type: ignore


def pp(label, resp):
    try:
        body = resp.get_json()
    except Exception:
        body = None
    print(label, '->', resp.status_code, body)


if __name__ == '__main__':
    email = os.getenv('DEV_EMAIL', 'testuser@example.com').lower()
    password = os.getenv('DEV_PASSWORD', os.getenv('DEV_MASTER_PASSWORD', 'senhadev'))

    payload_onboarding_min = {
        "idade": 18,
        "escolaridade": "Ensino Médio",
        "objetivo": "Aprovação vestibular",
        "dias_disponiveis": ["Segunda", "Quarta", "Sexta"],
        "tempo_diario": 90,
        "estilo_aprendizagem": "visual",
        "ritmo": "moderate",
        "horario_inicio": "08:30"
        # curso_id opcional
    }

    with app.test_client() as c:
        # 1) Login via /api/auth/login (will autocreate in dev if enabled)
        r_login = c.post('/api/auth/login', json={"email": email, "password": password})
        pp('login', r_login)

        # 2) Session hydration
        r_me = c.get('/api/user/me')
        pp('user/me', r_me)

        # 3) POST /api/onboarding minimal payload
        r_onb = c.post('/api/onboarding', json=payload_onboarding_min)
        pp('onboarding POST', r_onb)

        # 4) Status check
        r_status = c.get('/api/onboarding/status/me')
        pp('onboarding status/me', r_status)

        # 5) Optional: alias path under /api/auth/onboarding using email+answers
        r_alias = c.post('/api/auth/onboarding', json={"email": email, "answers": {"ok": True}})
        pp('auth onboarding (alias)', r_alias)

        # 6) Confirm hydration reflects onboarding
        r_me2 = c.get('/api/users/me')
        pp('users/me alias', r_me2)
