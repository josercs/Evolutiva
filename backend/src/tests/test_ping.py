import json

def test_ping(client):
    r = client.get('/api/ping')
    assert r.status_code == 200
    data = r.get_json()
    assert data.get('pong') is True
    assert isinstance(data.get('uptime'), int)
