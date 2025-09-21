# Makefile utilitário para operações comuns
# Uso: make <alvo>
# Variáveis ajustáveis
PROJECT?=evolutiva
COMPOSE?=docker compose

# Containers
build:
	$(COMPOSE) build

up:
	$(COMPOSE) up -d

up-recreate:
	$(COMPOSE) up -d --build --force-recreate

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f --tail=150

logs-api:
	$(COMPOSE) logs -f api

logs-worker:
	$(COMPOSE) logs -f worker

restart-api:
	$(COMPOSE) restart api

restart-worker:
	$(COMPOSE) restart worker

stop:
	$(COMPOSE) stop

down:
	$(COMPOSE) down

down-v:
	$(COMPOSE) down -v

# Banco (Alembic)
migrate:
	$(COMPOSE) run --rm api alembic upgrade head

revision:
	$(COMPOSE) run --rm api alembic revision --autogenerate -m "msg"

shell:
	$(COMPOSE) run --rm api bash

prune:
	docker system prune -f

health:
	$(COMPOSE) ps && echo "\nAPI health:" && curl -fsS http://localhost/api/health || true

.PHONY: build up up-recreate ps logs logs-api logs-worker restart-api restart-worker stop down down-v migrate revision shell prune health
