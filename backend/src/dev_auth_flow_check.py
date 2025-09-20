import os
import sys
import json

# Ensure backend/src on path
CURRENT_DIR = os.path.dirname(__file__)
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

# Honor .env already loaded by main.py; ensure dev vars exist for autocreate
os.environ.setdefault('USE_SQLITE', 'true')
os.environ.setdefault('DEBUG_SESSIONS', 'true')
os.environ.setdefault('DEV_MASTER_PASSWORD', 'senhadev')
os.environ.setdefault('DEV_AUTOCREATE_USER', 'true')

from main import app  # type: ignore


def check(resp, msg):
    ok = 200 <= resp.status_code < 300
    print(f"[{('OK' if ok else 'FAIL')}] {msg} -> {resp.status_code}", flush=True)
    try:
        print("Body:", resp.get_json(), flush=True)
    except Exception:
        try:
            print("Body(raw):", (resp.data or b'')[:200], flush=True)
        except Exception:
            pass
    return ok


def run_flow(client, email, use_legacy=False):
    path = '/api/login' if use_legacy else '/api/auth/login'
    r = client.post(path, json={'email': email, 'password': 'senhadev'})
    set_cookie = 'Set-Cookie' in r.headers and 'session=' in ';'.join(r.headers.getlist('Set-Cookie'))
    print(f"Login via {path}: status={r.status_code}, set_cookie={set_cookie}", flush=True)
    try:
        print("Login headers:", dict(r.headers), flush=True)
    except Exception:
        pass
    if r.is_json:
        data = r.get_json()
        print("Login payload keys:", sorted(list(data.keys())), flush=True)
    else:
        print("Login non-JSON body", (r.data or b'')[:200], flush=True)

    r_me = client.get('/api/user/me')
    check(r_me, '/api/user/me after login')

    r_me2 = client.get('/api/users/me')
    check(r_me2, '/api/users/me alias after login')

    r_logout = client.post('/api/auth/logout')
    check(r_logout, '/api/auth/logout')

    r_me_unauth = client.get('/api/user/me')
    print("After logout /api/user/me status:", r_me_unauth.status_code, flush=True)


if __name__ == '__main__':
    with app.test_client() as c:
        print('=== New endpoint flow ===', flush=True)
        run_flow(c, 'autotest+dev@example.com', use_legacy=False)
        print('\n=== Legacy endpoint flow ===', flush=True)
        run_flow(c, 'autotest+legacy@example.com', use_legacy=True)
    print('Done.', flush=True)
