# Sistema Web Autônomo de Estudos (Evolutiva)

![CI](https://github.com/josercs/Evolutiva/actions/workflows/ci.yml/badge.svg)

Plataforma moderna para estudantes do ensino médio: trilhas de estudo, plano personalizado, quizzes e progresso.

---

## Sumário

1. Visão Geral
2. Início Rápido (2 cliques)
3. Estrutura do Projeto
4. Requisitos
5. Ambiente & Execução Manual
6. Backend: Split de Dependências e Auditoria
7. Variáveis de Ambiente
8. Healthcheck
9. Scripts & Automação (Windows/PowerShell)
10. Geração de Plano de Estudo (Onboarding)
11. Autenticação JWT
12. Docker / Containers / Build
13. Segurança & Hardening
14. Frontend: Tecnologias & Reduções
15. CI / Pipeline
16. Roadmap & Próximos Passos
17. Referência Rápida de Comandos

---

## 1. Visão Geral

- Frontend: React + TypeScript + Tailwind + React Query.
- Backend: Flask (API REST), PostgreSQL (ou SQLite em dev), Redis (tokens/filas).
- Infra: Docker Compose (api, worker, db, redis, frontend-build, nginx).
- Objetivo: experiência rápida de setup, build enxuto e segurança básica aplicada.

---

## 2. Início Rápido (2 cliques) – Windows

Duplo clique em `start-easy.bat` (raiz) ou:
```powershell
.\start-easy.bat
```
O script:
- Inicia Docker Desktop (se necessário) e aguarda engine (padrão 60s).
- Sobe stack via `scripts/dev-up.ps1`.
- Fallback automático para modo local (API SQLite + Vite) se Docker não estiver pronto.

Flags úteis:
```powershell
.\start-easy.bat -Rebuild
.\start-easy.bat -Local
.\start-easy.bat -DockerWaitSeconds 90
.\start-easy.bat -Diag
.\start-easy.bat -AutoMigrate
.\start-easy.bat -NoFrontend
.\start-easy.bat -Seed
.\start-easy.bat -CheckOnly
.\start-easy.bat -DropLocalDB
.\start-easy.bat -StatusJson status.json
```

URLs:
- Docker (proxy único): http://localhost (SPA + /api)
- Fallback local: Frontend http://localhost:5173 | API http://127.0.0.1:5000

Logs rápidos (Docker):
```powershell
docker compose ps
docker logs api --tail 50
docker logs nginx --tail 30
```

Diagnóstico Docker pipe:
```powershell
start-easy.bat -Diag
```

---

## 3. Estrutura do Projeto

- frontend/
- backend/
   - src/
   - scripts/
   - requirements-*.txt
- infra/nginx/
- scripts/ (auxiliares raiz)
- .github/workflows/
- Makefile

---

## 4. Requisitos

- Node.js 16+ (pnpm ou npm)
- Python 3.8+ (3.11 recomendado)
- PostgreSQL 12+ (opcional em dev se usar SQLite)
- Docker / Docker Compose (opcional para stack completa)
- Redis (já orquestrado no Compose)

---

## 5. Ambiente & Execução Manual

### Frontend
```bash
cd frontend/sistema-estudos
pnpm install   # ou npm install
pnpm run dev   # ou npm run dev
# http://localhost:5173
```

### Backend (modo simples)
```bash
cd backend
python -m venv venv
# PowerShell: .\venv\Scripts\Activate.ps1
# Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
cd src
# Opcional usar SQLite:
export USE_SQLITE=1  # PowerShell: $env:USE_SQLITE='1'
python main.py
```

Health:
```bash
curl -s http://127.0.0.1:5000/api/health
```

### Execução via Flask CLI (opcional)
```bash
export FLASK_APP=main.py
export FLASK_ENV=development
python -m flask run --host=0.0.0.0 --port=5000
```

Scripts auxiliares (Windows):
```powershell
.\backend\scripts\run.ps1
.\backend\scripts\run.ps1 -SQLite
.\backend\scripts\run.ps1 -UseFlask -Host 0.0.0.0 -Port 5000
```

---

## 6. Backend: Split de Dependências & Auditoria

Arquivos:
- requirements-core.txt (runtime)
- requirements-extra.txt (comentadas / experimentais)
- requirements-dev.txt (testes/QA, inclui core)
- requirements.txt (agregador)

Auditoria AST:
```bash
python backend/scripts/check_imports.py
python backend/scripts/check_imports.py --json > audit_report.json
```

Test smoke:
```bash
pytest backend/src/tests/test_import_smoke.py::test_core_imports -q
```

Política:
1. Entrar em core só se for importado em runtime.
2. Experimentos ficam comentados em extra.
3. Ferramentas de teste só em dev.

---

## 7. Variáveis de Ambiente

Arquivo `.env.example` (copiar → `.env`):
```
APP_ENV=development
APP_VERSION=0.1.0
LOG_LEVEL=DEBUG
SECRET_KEY=altere-isto
JWT_SECRET_KEY=altere-isto-jwt
USE_SQLITE=1
DB_USERNAME=postgres
DB_PASSWORD=1234
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sistema_estudos
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
RATE_LIMIT_DEFAULT=60 per hour
RATE_LIMIT_BURST=10 per minute
ENABLE_WEEKLY_QUIZ_CRON=true
DEV_AUTOCREATE_DATA=1
```

---

## 8. Healthcheck

Endpoints:
- GET /api/health (compat)
- GET /api/v1/health (versionado)
- GET /api/ping (liveness ultrarrápido – sem acesso a DB)
Exemplo:
```json
{
   "status":"online",
   "version":"0.1.0",
   "environment":"development",
   "uptime_seconds":123,
   "db_ok":true,
   "meta":{"service":"evolutiva-api"}
}
```

Quando usar:
- /api/ping: probes de liveness (responde mesmo se DB lento / indisponível temporariamente).
- /api/health: checagem completa incluindo tentativa de SELECT 1.
- /api/v1/health: versão estrutural futura (mantém compatibilidade enquanto migramos).

---

## 9. Scripts & Automação (PowerShell)

Principal: `scripts/dev-up.ps1`
```powershell
./scripts/dev-up.ps1
./scripts/dev-up.ps1 -Rebuild
./scripts/dev-up.ps1 -ForceLocalFallback
```

Rebuild completo:
```powershell
.\scripts\start-easy.ps1 -Rebuild -AutoMigrate -Seed
```

Full rebuild automatizado:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\full-rebuild.ps1 -NoCache -Seed
```

---

## 10. Geração de Plano de Estudo (Onboarding)

Fluxo:
1. Usuário loga.
2. Se não completou onboarding → /onboarding (4 etapas).
3. Salva dados em `/api/onboarding`.
4. Gera plano `/api/plano-estudo/gerar`.
5. Acesso via `/api/planos/me`.

Modelo de bloco:
```json
{ "horario": "08:00-08:40", "atividade": "Estudo: Matemática - Frações" }
```

Alterna conteúdos com base na disponibilidade diária (blocos de 40 minutos).

---

## 11. Autenticação JWT

Principais rotas:
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh
- GET  /api/auth/token/verify
- GET  /api/auth/user/me

Fluxo:
1. Login retorna access + refresh.
2. Access curto (Bearer Authorization).
3. Refresh rotacionado (Redis blocklist).
4. Reuso → 401.

Exemplo login:
```bash
curl -X POST http://localhost:5000/api/auth/login \
   -H "Content-Type: application/json" \
   -d '{"email":"aluno@example.com","password":"senha123"}'
```

---

## 12. Docker / Compose / Build

Serviços:
- db (Postgres)
- redis
- api (Flask + Gunicorn)
- worker (RQ)
- frontend-build (gera estáticos)
- nginx (serve SPA + proxy /api)

Rebuild backend:
```powershell
docker compose build api
docker compose up -d
```

Otimizações de build (Docker):
```powershell
# Habilitar BuildKit (se ainda não ativo)
$Env:DOCKER_BUILDKIT=1; docker compose build api

# Forçar rebuild limpo
docker compose build --no-cache api

# Limpar imagens e cache antigos (cuidado!)
docker image prune -f
docker builder prune -f
```

Notas de tamanho:
- Garanta que nenhum `venv/` ou `site-packages` caiu dentro de `backend/src`.
- Remova qualquer `backend/src/node_modules` (às vezes criado por engano rodando npm dentro do backend):
```powershell
powershell -ExecutionPolicy Bypass -File backend/scripts/cleanup_node_modules.ps1 -Force
```
- Uploads e artefatos grandes devem ficar fora do contexto (já ignorados em `.dockerignore`).
- Reduza modificações em arquivos de requirements para preservar cache de layer.
- Se existir `backend/src/venv` (acidental), remova:
```powershell
Remove-Item -Recurse -Force backend/src/venv
# ou Linux/macOS
rm -rf backend/src/venv
```
Depois: `docker compose build api` novamente.

Sem cache:
```powershell
docker compose build --no-cache api
```

Monitor tamanho backend:
```powershell
du -sh backend
# PowerShell (preciso):
(Get-ChildItem -Recurse backend | Measure-Object Length -Sum).Sum/1MB
```

---

## 13. Segurança & Hardening

Aplicado:
- Dependências runtime mínimas.
- Rotação/Revogação de refresh tokens (Redis).
- Nginx: CSP, X-Frame-Options, nosniff, etc.
- Containers: read_only (api), no-new-privileges, tmpfs /tmp.
- Gunicorn parametrizado (workers/threads/timeouts).
- Sanitização HTML (DOMPurify).

Recomendações futuras:
- Métricas/telemetria (latência p95, erros).
- Key rotation (SECRET_KEY/JWT).
- Rate limit granular em rotas sensíveis.
- Sentry (backend/frontend).
- Scan imagens (trivy/grype).

---

## 14. Frontend

Stack efetiva: React, React Router, React Query, Tailwind, Lucide Icons, DOMPurify, Recharts (gráficos), react-confetti (efeitos), toastify.

Removido (bloat): MUI, Radix, libs de formulário duplicadas, múltiplos toasts, axios (migrado para fetch), date-fns, zod (a substituir por pydantic lado servidor).

Próximos passos:
1. Avaliar lazy load de libs pouco usadas (confetti / charts).
2. Script de auditoria (ts-prune / dep-check).
3. Análise bundle (vite plugin visualizer).

---

## 15. CI / Pipeline (.github/workflows/ci.yml)

Jobs:
- backend-test: ruff + black --check + pytest (SQLite)
- frontend-build: lint + build
- docker-build: imagens backend/frontend

Melhorias planejadas:
- Cobertura pytest + badge
- Matriz Python (3.11/3.12)
- Auditoria de imports como job dedicado

Execução local testes backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export USE_SQLITE=1
cd src
pytest -q
```

---

## 16. Roadmap (Resumo)

Curto (0-30d):
- App factory final
- JWT refresh + limites CORS
- CI unificado + Docker Compose

Médio (31-60d):
- Fila assíncrona (RQ)
- Cache + telemetria básica
- Testes E2E (Playwright)

Longo (61-90d):
- Pagamentos / assinaturas
- Métricas pedagógicas
- RBAC (admin/professor/aluno)

Próximos passos internos imediatos:
1. Refatorar `main.py` → `create_app()`
2. Schemas validação (pydantic/marshmallow)
3. Logging estruturado (request_id)
4. Ajustar expirações JWT via env
5. Testes onboarding/planos

---

## 17. Referência Rápida de Comandos

Docker (modo rápido):
```powershell
.\start-easy.bat
```

Fallback local (forçando):
```powershell
.\start-easy.bat -Local
```

Rebuild imagens:
```powershell
docker compose build --no-cache api
```

Scripts diretos:
```powershell
.\scripts\start-easy.ps1 -Rebuild -AutoMigrate -Seed
```

Auditoria imports:
```bash
python backend/scripts/check_imports.py
```

Health (Docker via proxy):
```bash
curl http://localhost/api/health
```

Testes backend:
```bash
USE_SQLITE=1 pytest -q
```

---

## Funcionalidades Principais (Resumo)

- Autenticação JWT + rotação
- Trilhas e conteúdos
- Plano de estudo automático
- Quizzes (base)
- Dashboard de progresso
- Interface responsiva

---

## Observações

- Dados simulados em dev
- Em produção: ajustes de SECRET/JWT, TLS, PostgreSQL gerenciado, logs estruturados
- Senhas devem ser armazenadas com hashing adequado (ex.: bcrypt)

---

## Rotas de Compatibilidade Temporária

Mantidas para transição:
- /api/health
- /api/auth/login | /api/auth/register
- /api/auth/user/me | /api/user/me | /api/users/me

Planejado: migrar definitivo para prefixo /api/v1/*

---

Contribuições e melhorias são bem-vindas.
