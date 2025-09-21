import os, time
import json
import pytest
from app_factory import create_app
from models.models import db

@pytest.fixture(scope="module")
def app():
    os.environ.setdefault("APP_ENV", "test")
    os.environ.setdefault("USE_SQLITE", "1")
    os.environ.setdefault("AUTO_DDL_ON_START", "1")
    application = create_app()
    with application.app_context():
        db.create_all()
    yield application

@pytest.fixture()
def client(app):
    return app.test_client()

def test_health_legacy(client):
    resp = client.get('/api/health')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data.get('status') == 'online'
    assert 'uptime_seconds' in data
    assert 'db_ok' in data

def test_health_v1(client):
    resp = client.get('/api/v1/health')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data.get('status') == 'online'
    assert isinstance(data.get('db_ok'), bool)
    assert 'uptime_seconds' in data
    assert 'version' in data
    assert 'environment' in data
    assert data.get('meta', {}).get('service') == 'evolutiva-api'
