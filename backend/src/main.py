"""Main legado minimizado.

Todas as rotas foram movidas para blueprints dentro de routes/ e registradas em create_app().
Este arquivo agora apenas expõe a aplicação para execução direta (python main.py).
"""

from app_factory import create_app  # noqa: E402

app = create_app()


@app.route("/api/login", methods=["POST"])  # alias histórico
def legacy_login_alias():  # pragma: no cover
    from routes.auth_routes import login as auth_login  # import tardio
    return auth_login()


if __name__ == "__main__":  # pragma: no cover
    import os
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)

