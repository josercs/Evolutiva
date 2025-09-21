import os, time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
_APP_START_TS = time.time()

class Config:
    APP_NAME = "EvolutivaAPI"
    APP_VERSION = os.getenv("APP_VERSION", "0.1.0")
    ENVIRONMENT = os.getenv("APP_ENV", os.getenv("FLASK_ENV", "development"))
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-change-me")
    SQLALCHEMY_DATABASE_URI = os.getenv("SQLALCHEMY_DATABASE_URI")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    FRONTEND_ORIGINS = os.getenv("FRONTEND_ORIGINS")
    USE_SQLITE = os.getenv("USE_SQLITE", "false").lower() in {"1","true","yes"}
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    RATE_LIMIT_DEFAULT = os.getenv("RATE_LIMIT_DEFAULT", "60 per hour")
    RATE_LIMIT_BURST = os.getenv("RATE_LIMIT_BURST", "10 per minute")
    START_TIME = _APP_START_TS

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.getenv("TEST_DATABASE_URI", "sqlite:///:memory:")

config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'test': TestConfig,
}

def get_config():
    env = os.getenv('APP_ENV') or os.getenv('FLASK_ENV') or 'development'
    return config_by_name.get(env, DevelopmentConfig)()
