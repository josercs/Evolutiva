import os
import sys
import time
import json

# Ensure backend/src on path
CURRENT_DIR = os.path.dirname(__file__)
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

os.environ.setdefault('DEBUG_SESSIONS', 'true')

from main import app  # type: ignore


def get_headers(resp):
    try:
        return {k: v for k, v in resp.headers.items() if k.lower().startswith('x-ratelimit') or k.lower() in ('retry-after',)}
    except Exception:
        return {}


def json_body(resp):
    try:
        return resp.get_json()
    except Exception:
        return None


def call_stats(client):
    s = client.get('/api/videos/cache/stats')
    return s.status_code, json_body(s)


if __name__ == '__main__':
    with app.test_client() as c:
        # Purge expired and memory
        p = c.post('/api/videos/cache/purge', json={'clear_memory': True})
        print('purge ->', p.status_code, json_body(p))

        s1_code, s1 = call_stats(c)
        print('stats before ->', s1_code, s1)

        # Single search
        r1 = c.get('/api/videos?q=matematica&maxResults=3')
        print('GET /api/videos #1 ->', r1.status_code, 'headers:', get_headers(r1))
        j1 = json_body(r1)
        print('videos count #1:', len((j1 or {}).get('videos', [])))

        s2_code, s2 = call_stats(c)
        print('stats after first fetch ->', s2_code, s2)

        # Second call should hit cache; persistent_total should not grow
        r2 = c.get('/api/videos?q=matematica&maxResults=3')
        print('GET /api/videos #2 ->', r2.status_code, 'headers:', get_headers(r2))
        j2 = json_body(r2)
        print('videos count #2:', len((j2 or {}).get('videos', [])))

        s3_code, s3 = call_stats(c)
        print('stats after second fetch ->', s3_code, s3)

        # Batch
        payload = {
            'queries': [
                {'key': 'k1', 'q': 'trigonometria', 'maxResults': 2},
                {'key': 'k2', 'q': 'derivadas', 'maxResults': 2},
                {'key': 'k3', 'q': 'geometria analitica', 'maxResults': 2},
            ]
        }
        b1 = c.post('/api/videos/batch', json=payload)
        print('POST /api/videos/batch ->', b1.status_code, 'headers:', get_headers(b1))
        jb1 = json_body(b1)
        print('batch keys:', list((jb1 or {}).get('results', {}).keys()))

        # Final stats
        s4_code, s4 = call_stats(c)
        print('stats final ->', s4_code, s4)
