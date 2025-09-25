# Sistema Web Autônomo de Estudos (Evolutiva)

![CI](https://github.com/josercs/Evolutiva/actions/workflows/ci.yml/badge.svg)

Plataforma moderna para estudantes do ensino médio: trilhas de estudo, plano personalizado, quizzes e progresso.

---

## Sumário

1. Visão Geral
2. Início Rápido (2 cliques)
   2.1 Sequência Detalhada de Inicialização (Frontend, Backend, Docker)
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

### 2.1 Sequência Detalhada de Inicialização (Frontend, Backend, Docker)

Este guia cobre três modos: (A) Stack completa via Docker, (B) Modo híbrido (backend Docker + frontend local), (C) Modo totalmente local (sem containers). Inclui verificação e troubleshooting rápido.

#### Pré-requisitos
- Docker Desktop instalado e em execução (para modos A/B).
- Node.js 18+ e Python 3.11+ instalados (para modos B/C e desenvolvimento geral).
- Porta 80 livre (ou usar `HTTP_PORT`). Para conflitos (IIS/Skype): defina `$Env:HTTP_PORT=8080`.

#### Passo 0: Clonar e preparar variáveis
```powershell
git clone https://github.com/josercs/Evolutiva.git
cd Evolutiva
Copy-Item .env.example .env
# Edite .env conforme necessidade (SECRET_KEY, JWT_SECRET_KEY, etc.)
```

#### Modo A – Docker Completo (recomendado)
1. (Opcional) Limpeza rápida (evitar caches antigos):
   ```powershell
   ./scripts/cleanup-caches.ps1 -Python -Dist
   ```
2. Subir stack (frontend + api + db + redis + nginx):
   ```powershell
   .\start-easy.bat  # ou ./scripts/dev-up.ps1
   ```
3. Aguardar logs (opcional):
   ```powershell
   docker compose ps
   docker logs api --tail 30
   docker logs nginx --tail 20
   ```
4. Acessar a aplicação: `http://localhost` (ou `http://localhost:8080` se usou HTTP_PORT).
5. Healthcheck direto (via Nginx proxy):
   ```powershell
   curl http://localhost/api/health
   ```
6. Se frontend estiver vazio, siga "Troubleshooting Frontend Ausente".

#### Modo B – Híbrido (Backend em Docker, Frontend Local)
Use quando quer HMR rápido do Vite mas manter DB/Redis isolados.
1. Subir somente serviços infra + api (sem build container se quiser):
   ```powershell
   $Env:HTTP_PORT=8080
   docker compose up -d db redis api
   ```
2. Verificar API:
   ```powershell
   curl http://localhost:8080/api/health  # se nginx não estiver ativo ainda, usar porta interna
   # OU acessar direto o container API se exposto (ajuste compose se necessário)
   ```
3. Rodar frontend local:
   ```powershell
   cd frontend/sistema-estudos
   npm ci
   npm run dev
   ```
4. Ajustar chamadas API: frontend usa `/api`. Como não está rodando nginx, você pode:
   - Executar também o nginx (`docker compose up -d nginx`) para manter a mesma origem.
   - OU configurar variável Vite `VITE_API_URL=http://127.0.0.1:5000/api` (se acessar API direta).
5. Acessar: `http://localhost:5173` (ou URL indicada pelo Vite) e confirmar `/api/user/me` após login.

#### Modo C – Totalmente Local (sem Docker)
1. Backend:
   ```powershell
   cd backend
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   set USE_SQLITE=1  # PowerShell: $Env:USE_SQLITE='1'
   cd src
   python main.py
   ```
2. Frontend (novo terminal):
   ```powershell
   cd frontend/sistema-estudos
   npm ci
   npm run dev
   ```
3. Acessar: `http://localhost:5173` | API: `http://127.0.0.1:5000`
4. Healthcheck: `curl http://127.0.0.1:5000/api/health`

#### Sequência Recomendada (Resumo Visual)
| Objetivo | Comando Principal | URL Final |
|----------|-------------------|-----------|
| Docker completo | `start-easy.bat` | http://localhost |
| Híbrido | `docker compose up -d db redis api nginx` + `npm run dev` | http://localhost / http://localhost:5173 |
| Local puro | `python main.py` + `npm run dev` | http://localhost:5173 |

#### Verificações Essenciais Pós-Start
1. API: `curl http://localhost/api/ping` → `{ "status": "ok" }` ou similar.
2. Autenticação: POST `/api/auth/login` retorna tokens.
3. Conteúdo: GET `/api/conteudos/materia/1` responde lista (se seed existente).
4. Progresso (compat): `GET /api/progress` → JSON com mensagem (evita 404).
5. CSP sem bloqueios inesperados (DevTools > Console): se bloquear fontes legítimas, ajustar `infra/nginx/nginx.conf`.

#### Troubleshooting Rápido
| Sintoma | Causa Comum | Ação |
|--------|-------------|------|
| ERR_CONNECTION_REFUSED | Porta 80 ocupada ou nginx parado | Defina `HTTP_PORT=8080`; `docker compose up -d nginx` |
| 404 /api/user/me | Não logado / token ausente | Refazer login; verificar Authorization header |
| 429 em /api/user/me | Limite padrão antigo | Confirmar nova config (reiniciar api) ou ajustar env `YT_RATE_LIMIT` |
| Frontend em branco | Volume webroot vazio | Rodar build: `scripts/build-frontend.ps1` |
| CSP bloqueando fonte | Domínio ausente em CSP | Editar diretivas style-src/font-src no nginx.conf |
| 404 /api/conteudo_html/{id} | ID inexistente na base | Ver seed / inserir SubjectContent |

#### Parar / Limpar
```powershell
docker compose down
docker compose down -v  # inclui volumes (cuidado – apaga dados)
```

#### Próximos Passos Após Primeiro Start
- Criar usuário → `/api/auth/register`.
- Completar onboarding → fluxo SPA /onboarding.
- Validar plano de estudo `/api/planos/me`.
- Executar testes rápidos: `pytest backend/src/tests/test_import_smoke.py::test_core_imports -q`.

---

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

### 12.1 Proxy Nginx & CSP

Funções do Nginx nesta stack:
- Servir a SPA (estáticos em `/usr/share/nginx/html`).
- Fazer proxy para a API Flask em `/api` (preserva `Authorization` e a URI completa).

Pontos-chave da configuração (resumo do `infra/nginx/nginx.conf`):
- DNS dinâmico para containers (evita upstream IPs obsoletos): `resolver 127.0.0.11 valid=10s;`
- Proxy direto por service name do Compose: `proxy_pass http://api:5000$request_uri;`
- Encaminha cabeçalhos: `proxy_set_header Authorization $http_authorization;`
- CSP endurecida: script/style/font/connect restritos a `self` e CDNs específicos (Google Fonts, jsDelivr quando necessário). Evite scripts externos no `index.html`.

Publicação de build (estáticos):
- O Nginx monta o volume `webroot` como somente-leitura (`:ro`).
- O serviço `frontend-build` constrói e copia os artefatos para esse volume automaticamente.
- Alternativa: copiar manualmente o `dist/` local para o volume `webroot` com um contêiner utilitário:
   - Linux/macOS:
      ```bash
      docker run --rm -v "$(pwd)/dist:/src" -v sistema_estudos_core_webroot:/dest alpine sh -lc 'cp -r /src/* /dest/'
      ```
   - Windows (PowerShell): use caminhos entre aspas no `-v` e evite `||` (use `if($LASTEXITCODE -ne 0){ ... }`).

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

### 14.1 Build & Publicação

Opção A – via Docker (recomendado):
```powershell
# Task VS Code: "frontend: build vite simple"
docker compose run --rm frontend-build
```

Opção B – Local (Node instalado):
```powershell
cd frontend/sistema-estudos
npm ci   # ou npm i
npm run build
```

Publicar build local no volume `webroot` (Docker rodando):
- Linux/macOS:
```bash
docker run --rm -v "$(pwd)/dist:/src" -v sistema_estudos_core_webroot:/dest alpine sh -lc 'cp -r /src/* /dest/'
```
- Windows PowerShell (exemplo simplificado):
```powershell
$src = "$(Get-Location)\dist\."
$cid = (docker compose ps -q nginx).Trim()
docker cp $src ($cid + ':/usr/share/nginx/html/')  # pode falhar com mount :ro
# Preferível usar o método do volume acima em vez de copiar direto para o container
```

Observações:
- O mount `:ro` do Nginx impede escrita direta dentro do container; publique no volume.
- A SPA usa base `/api` e evita scripts externos para cumprir a CSP.

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

Notas adicionais de CI:
- Workflow `backend-ci.yml` roda lint (ruff), format check (black), testes (SQLite) e segurança (`safety`).
- Auditoria de imports (AST) pode ser adicionada: `python backend/scripts/check_imports.py --json` (falhar apenas quando `missing_core` não estiver vazio).

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

Limpar caches / artefatos:
```powershell
# Windows (interativo por default)
./scripts/cleanup-caches.ps1 -All
# Apenas Python e builds (sem Node):
./scripts/cleanup-caches.ps1 -Python -Dist
```
```bash
# Linux/macOS
bash scripts/cleanup-caches.sh --all
# Somente caches Python e dist/
bash scripts/cleanup-caches.sh --python --dist
```
Remove diretórios comuns: node_modules, __pycache__, .pytest_cache, .mypy_cache, dist/, .vite/ e (opcional) virtualenvs e cobertura. Usa confirmações a menos que passe -Yes / -y.

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

---

## Infra & Backend Avançado (Anexo)

### Migrações & Self-heal
- Alembic configurado para Postgres; baseline e proteções em dev para evitar SQLite acidental.
- Campo `users.dias_disponiveis`: migração dedicada e auto-correção para JSONB quando detectado `text[]` legado durante o startup.
- Endpoints de diagnóstico (quando habilitados): `/api/dev/db-info`, `/api/dev/migrate`.

### Mapa de Endpoints (principais)
- Health: `GET /api/health`, `GET /api/v1/health`, `GET /api/ping`
- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `GET /api/auth/token/verify`, `GET /api/auth/user/me`
- Compatibilidade “me”: `GET /api/user/me`, `GET /api/users/me` (tenta JWT e fallback para sessão)
- Conteúdo:
   - `GET /api/conteudo_html/{id}` → { id, subject, topic, content_html, materia }
   - `GET /api/conteudos/materia/{materiaId}`
   - `POST /api/conteudos/concluir`
- Progresso (alias legacy `/api/progresso/*`):
   - `GET /api/progress/materias/{userId}/{cursoId}`
   - `GET /api/progress/achievements/{userId}`
   - `GET /api/progress/user/{userId}/curso`

### Conectividade e Proxy
- Dentro de containers, `localhost` do host é mapeado para `host.docker.internal` pela app.
- Nginx utiliza DNS do Docker (`127.0.0.11`) com validade curta para evitar cache de IP.

### Troubleshooting rápido
- Pulls falhando do Docker Hub: rode o frontend localmente, gere `dist/` e publique para o volume `webroot`.
- 502 entre Nginx e API: valide `api:5000` de dentro do container Nginx; confira `resolver` e `proxy_pass`.
- CSP bloqueando recursos: mantenha `index.html` sem scripts externos; fontes via Google Fonts já permitidas.
- PowerShell: evite `||`; prefira `if($LASTEXITCODE -ne 0){ ... }`.

### Troubleshooting Frontend Ausente
Se http://localhost não mostrar a SPA (página em branco ou listagem vazia):
1. Garantir Docker ativo: `docker info`
2. Criar (se faltar) volume webroot: `docker volume create sistema_estudos_core_webroot`
3. Rodar build:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-frontend.ps1
```
4. Verificar conteúdo no Nginx:
```powershell
docker compose ps -q nginx | % { docker exec $_ ls -1 /usr/share/nginx/html | Select-Object -First 20 }
```
Fallback local sem Docker:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-frontend.ps1 -Local
```

### Porta 80 recusada / Conexão recusada
Se http://localhost/ (ou /login) retorna ERR_CONNECTION_REFUSED:
1. Verifique se Docker está ativo: `docker info`
2. Verifique containers: `docker compose ps`
3. Logs Nginx: `docker logs nginx --tail 50`
4. Porta 80 já em uso (IIS / outro serviço). Rode com porta alternativa:
```powershell
$Env:HTTP_PORT=8080; docker compose up -d nginx api
```
Acesse: http://localhost:8080/login
Para tornar permanente, adicione `HTTP_PORT=8080` ao seu `.env`.
5. Se frontend vazio, veja seção "Troubleshooting Frontend Ausente".

### Erro Nginx: "resolving names at run time requires upstream ... in shared memory"
Se logs repetem esse erro e o container reinicia:
1. Atualize repo (config já ajustada removendo bloco `upstream api_upstream`).
2. Ou edite `infra/nginx/nginx.conf` removendo o bloco `upstream` com `resolve` e deixe o `proxy_pass` direto:
```
location /api/ {
   proxy_pass http://api:5000$request_uri;
   ...
}
```
3. Recrie container:
```powershell
docker compose up -d --force-recreate nginx
```
