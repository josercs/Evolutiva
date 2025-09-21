import os, sys, json
import pytest

CURRENT_DIR = os.path.dirname(os.path.dirname(__file__))  # backend/src
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

# Ensure dev-like env but with SQLite and deterministic master password
os.environ.setdefault('USE_SQLITE', 'true')
os.environ.setdefault('DEV_MASTER_PASSWORD', 'senhadev')
os.environ.setdefault('DEV_AUTOCREATE_USER', 'true')

from main import app  # noqa: E402
from models.models import db  # noqa: E402

@pytest.fixture(scope="module")
def client():
    with app.app_context():
        db.create_all()
    with app.test_client() as c:
        yield c


def _login_get_tokens(c, email: str):
    r = c.post('/api/auth/login', json={'email': email, 'password': os.getenv('DEV_MASTER_PASSWORD', 'senhadev')})
    assert 200 <= r.status_code < 300, r.data
    data = r.get_json() or {}
    return data['access_token'], data['refresh_token']


def test_refresh_rotation_reuse_denied(client):
    email = 'rotation_user@example.com'
    access, refresh = _login_get_tokens(client, email)

    # First refresh: should succeed and return a new refresh token
    r1 = client.post('/api/auth/refresh', headers={'Authorization': f'Bearer {refresh}'})
    assert r1.status_code == 200, r1.data
    data1 = r1.get_json() or {}
    new_access = data1.get('access_token')
    new_refresh = data1.get('refresh_token')
    assert new_access and new_refresh and new_refresh != refresh

    # Reusing the old refresh should now fail (rotation & revocation)
    r_reuse = client.post('/api/auth/refresh', headers={'Authorization': f'Bearer {refresh}'})
    assert r_reuse.status_code == 401, r_reuse.data
    payload_reuse = r_reuse.get_json() or {}
    assert 'reutilizado' in json.dumps(payload_reuse).lower()

    # Using the new refresh again (single reuse) should succeed once, then fail if reused again
    r2 = client.post('/api/auth/refresh', headers={'Authorization': f'Bearer {new_refresh}'})
    assert r2.status_code == 200, r2.data
    data2 = r2.get_json() or {}
    newer_refresh = data2.get('refresh_token')
    assert newer_refresh and newer_refresh != new_refresh

    # Old new_refresh is now rotated; second attempt should fail
    r_reuse2 = client.post('/api/auth/refresh', headers={'Authorization': f'Bearer {new_refresh}'})
    assert r_reuse2.status_code == 401, r_reuse2.data

