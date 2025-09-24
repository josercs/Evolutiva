#############################
# Backend Multi-stage Dockerfile
# Objetivos:
#  - Cache de wheels (builder) separado do runtime
#  - Imagem final mínima (sem build-essential)
#  - Execução como usuário não-root (appuser)
#  - ARG opcional INSTALL_DEV para incluir deps de desenvolvimento em ambientes específicos
#############################

FROM python:3.11.9-slim AS builder
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 POETRY_VIRTUALENVS_CREATE=0
WORKDIR /build

# Dependências de sistema necessárias apenas para compilação de libs Python (psycopg2, etc.)
RUN apt-get update \
	&& apt-get install -y --no-install-recommends build-essential curl gcc libpq-dev \
	&& rm -rf /var/lib/apt/lists/*

# Copiamos somente arquivos de requirements para maximizar cache
COPY requirements-core.txt requirements-extra.txt requirements-dev.txt requirements.txt ./

# ARG para permitir incluir dependências de desenvolvimento quando desejado (ex.: execução de testes dentro da imagem)
ARG INSTALL_DEV=0

# Instalação isolada: primeiro core, depois condicional dev (evita reinstalar tudo em alterações menores de código)
RUN --mount=type=cache,target=/root/.cache/pip \
	if [ "$INSTALL_DEV" = "1" ]; then \
		pip install --upgrade pip setuptools wheel && \
		pip install -r requirements-dev.txt ; \
	else \
		pip install --upgrade pip setuptools wheel && \
		pip install -r requirements-core.txt ; \
	fi

# Segunda fase: copiar código + instalar extras opcionais que dependam de código (se houver) mantendo wheels prontos
FROM python:3.11.9-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

# Pacotes mínimos de runtime (libpq para psycopg2)
RUN apt-get update \
	&& apt-get install -y --no-install-recommends libpq5 \
	&& rm -rf /var/lib/apt/lists/*

# Criar usuário não-root
RUN useradd -ms /bin/bash appuser

# Copiamos somente as libs instaladas da fase builder
COPY --from=builder /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY --from=builder /usr/local/bin /usr/local/bin

# Copiar somente arquivos necessários (evita invalidar cache por mudanças irrelevantes)
COPY alembic/ /app/alembic/
COPY src/ /app/src/
COPY scripts/ /app/scripts/
COPY requirements*.txt /app/
COPY alembic.ini /app/
COPY MIGRATION.md /app/
COPY entrypoint.sh /app/


# Ajustar permissões apenas onde necessário (evitando recursivo pesado)
RUN chown -R appuser:appuser /app && chmod +x /app/entrypoint.sh && chmod +x /app/scripts/*.py || true
USER appuser

EXPOSE 5000
ENV WORKERS=3 THREADS=4 GUNICORN_TIMEOUT=120 GRACEFUL_TIMEOUT=30 PYTHONPATH=/app/src

# Health (opcional para futuras ferramentas)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD python -c "import urllib.request,sys;\
	import os;\
	url=os.environ.get('HEALTHCHECK_URL','http://localhost:5000/api/health');\
	urllib.request.urlopen(url).read() and sys.exit(0)"

# Prefer referencing the stable wsgi entrypoint which imports app from main
ENTRYPOINT ["/app/entrypoint.sh"]
CMD []
