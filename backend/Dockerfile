FROM python:3.11.9-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

# deps de build
RUN apt-get update && apt-get install -y --no-install-recommends build-essential curl && rm -rf /var/lib/apt/lists/*

# requirements
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# código
COPY backend/ /app/

# gunicorn (produção) parametrizado
EXPOSE 5000
ENV WORKERS=3 THREADS=4 GUNICORN_TIMEOUT=120 GRACEFUL_TIMEOUT=30
CMD ["bash","-lc","gunicorn -w ${WORKERS} -k gthread --threads ${THREADS} -b 0.0.0.0:5000 'main:create_app()' --timeout ${GUNICORN_TIMEOUT} --graceful-timeout ${GRACEFUL_TIMEOUT}"]
