"""Smoke test para garantir que imports core permanecem válidos.
Executa rápido e dá feedback imediato caso uma dependência necessária
seja removida indevidamente do requirements-core.
"""

CORE_MODULES = [
    "flask",
    "flask_sqlalchemy",
    "flask_cors",
    "flask_login",
    "flask_jwt_extended",
    "flask_limiter",
    "limits",
    "sqlalchemy",
    "dotenv",
    "pydantic",
    "requests",
]

OPTIONAL_BEST_EFFORT = [
    "psycopg2",  # pode não estar presente em ambiente SQLite local
]

def test_core_imports():
    missing = []
    for m in CORE_MODULES:
        try:
            __import__(m)
        except Exception as exc:  # pragma: no cover
            missing.append((m, repr(exc)))
    assert not missing, f"Falha import core: {missing}"


def test_optional_best_effort():
    soft_missing = []
    for m in OPTIONAL_BEST_EFFORT:
        try:
            __import__(m)
        except Exception as exc:  # pragma: no cover
            soft_missing.append((m, repr(exc)))
    # Não falha; apenas loga para visibilidade em output pytest
    if soft_missing:  # pragma: no cover
        print("[AVISO] Optional ausentes:", soft_missing)
