# Sistema Web Autônomo de Estudos

![CI](https://github.com/josercs/Evolutiva/actions/workflows/ci.yml/badge.svg)

Este documento contém instruções para instalação e execução do Sistema Web Autônomo de Estudos, uma plataforma moderna e intuitiva voltada para estudantes do ensino médio.

## Estrutura do Projeto

O projeto está dividido em duas partes principais:

1. **Frontend (React)**: Interface moderna e responsiva desenvolvida com React, TypeScript e Tailwind CSS
2. **Backend (Flask)**: API RESTful desenvolvida com Flask e PostgreSQL

## Requisitos do Sistema

- Node.js 16+ e npm/pnpm (para o frontend)
- Python 3.8+ (para o backend)
- PostgreSQL 12+ (para o banco de dados)

## Instruções de Instalação e Execução

### Frontend (React)

1. Navegue até o diretório do frontend:
   ```
   cd frontend/sistema-estudos
   ```

2. Instale as dependências:
   ```
   pnpm install
   ```
   ou
   ```
   npm install
   ```

3. Execute o servidor de desenvolvime```
   pnpm run dev
   ```
   ou
   ```
   npm run dev
   ```

4. Acesse o frontend em: `http://localhost:5173`

### Backend (Flask)

1. Navegue até o diretório do backend:
   ```
   cd backend
   ```

2. Crie e ative um ambiente virtual (padronizado em `backend\\venv`):
    - Windows (PowerShell):
       ```powershell
       python -m venv venv
       .\venv\Scripts\Activate.ps1
       ```
    - Linux/macOS:
       ```bash
       python -m venv venv
       source venv/bin/activate
       ```

3. Instale as dependências:
   ```
   pip install -r requirements.txt
   ```

### Split de Dependências (Backend)
O backend agora utiliza separação de arquivos de requirements para reduzir bloat e facilitar auditoria:

| Arquivo | Propósito |
|---------|-----------|
| `requirements-core.txt` | Somente libs necessárias em runtime (produção) |
| `requirements-extra.txt` | Opcionais (comentadas até adoção real) |
| `requirements-dev.txt` | Ferramentas de teste/QA (inclui `-r requirements-core.txt`) |
| `requirements.txt` | Arquivo de agregação que referencia os outros via `-r` |

Comandos típicos:
```bash
# Ambiente de produção mínimo
pip install -r backend/requirements-core.txt

# Desenvolvimento completo (inclui core + pytest + auditoria)
pip install -r backend/requirements-dev.txt

# Após adicionar uma nova lib efetivamente usada em runtime
# 1. Adicione em requirements-core.txt
# 2. Rode testes / smoke import
pytest backend/src/tests/test_import_smoke.py::test_core_imports -q
```

Verificação de consistência (script de apoio):
```bash
python backend/scripts/check_imports.py
```
Saída indica:
- "Core declarados não importados": dependências que podem ser removidas do core
- "Imports não declarados no core": algo usado no código mas não listado (mover para core)

Política de adição:
1. Adicionar em `core` apenas se houver import real em runtime.
2. Caso seja experimento/feature futura → comentar em `requirements-extra.txt`.
3. Ferramentas de testes/formatadores/auditoria sempre em `requirements-dev.txt`.

Impactos positivos:
- Instalação mais rápida
- Menos CVEs potenciais
- Build CI mais previsível
- Facilita revisão em PRs (mudanças de dependências ficam explícitas)

#### Classificação atual (racional)

Core (runtime): Flask stack, SQLAlchemy, auth/limiter, dotenv, banco (`psycopg2-binary`), além de `requests` (consumo HTTP real em rotas de vídeo) e `pydantic` (modelos estruturados em `servicos/plano_estudo_avancado.py`).

Extras: mantidos apenas como comentários — habilite descomentando em `requirements-extra.txt`. Ex.: `google-generativeai` para funcionalidades de IA (polimento de quiz ou sugestões). As rotas que usam IA fazem import dinâmico / protegido; se a lib não estiver instalada retornam 503 amigável sem quebrar o restante da API.

Dev: adiciona somente ferramentas de teste/auditoria (`pytest`, `pytest-cov`, `pip-audit`) sem poluir produção.

### Auditoria de Imports

Script automatiza verificação de alinhamento entre código e `requirements-core.txt`:

Uso básico:
```bash
python backend/scripts/check_imports.py
```

JSON (para integrações):
```bash
python backend/scripts/check_imports.py --json > audit_report.json
```

Flags úteis:
- `--list-files` lista arquivos escaneados
- `--update-whitelist` promove diferenças para `.audit_whitelist.json`
- `--fail-on-missing-only` falha só se algo do core não for importado
- `--fail-on-extra-only` falha só se houver import não declarado
- `--warn-only` nunca retorna exit != 0 (modo observação)
- `--no-cache` ignora cache incremental

Gating de extras: se o namespace `google` aparecer e `google-generativeai` não estiver listado em `requirements-extra.txt`, o script sinaliza recomendando adicionar a dependência (ou remover o uso).

CI: pipeline gera artefato `audit_report.json` e adiciona sumário no Job Summary para revisão rápida.

Política de evolução:
- Antes de promover algo para core: comprovar import direto em código de produção.
- Funcionalidade experimental: deixar comentada em extras até haver uso consistente.
- Dependência removida do código → retirar do core e validar com `test_import_smoke`.

4. Configure as variáveis de ambiente para o PostgreSQL:
    - Linux/macOS (bash):
       ```bash
       export DB_USERNAME=seu_usuario
       export DB_PASSWORD=sua_senha
       export DB_HOST=localhost
       export DB_PORT=5432
       export DB_NAME=sistema_estudos
       ```
    - Windows (PowerShell):
       ```powershell
       $env:DB_USERNAME = 'seu_usuario'
       $env:DB_PASSWORD = 'sua_senha'
       $env:DB_HOST     = 'localhost'
       $env:DB_PORT     = '5432'
       $env:DB_NAME     = 'sistema_estudos'
       ```
5. Crie o banco de dados PostgreSQL:
    - Linux/macOS:
       ```bash
       createdb sistema_estudos
       ```
    - Windows (PowerShell) usando psql:
       ```powershell
       psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE sistema_estudos;"
       ```

6. Execute o servidor Flask (modo simples):
    - Windows (PowerShell):
       ```powershell
   cd backend\src
   # opcional: usar SQLite local em vez de PostgreSQL durante o dev
   # (só para esta sessão)
   $env:USE_SQLITE = '1'
   python .\main.py
       ```
    - Linux/macOS:
       ```bash
       cd backend/src
       # opcional: usar SQLite local em vez de PostgreSQL durante o dev
       export USE_SQLITE=1
       python ./main.py
       ```

   Opcional (modo flask run):
    - Windows (PowerShell):
       ```powershell
      cd backend\src
      $env:FLASK_APP = 'main.py'
      $env:FLASK_ENV = 'development'
      python -m flask run --host=0.0.0.0 --port=5000
       ```
    - Linux/macOS:
       ```bash
       cd backend/src
       export FLASK_APP=main.py
       export FLASK_ENV=development
       python -m flask run --host=0.0.0.0 --port=5000
       ```

      Opcional (Windows): script para facilitar
      - PowerShell:
         ```powershell
         # Sempre usa o venv padronizado em backend\venv
         # Executa diretamente (debug on por padrão do main.py)
         .\backend\scripts\run.ps1

         # Com SQLite para desenvolvimento rápido
         .\backend\scripts\run.ps1 -SQLite

         # Usando Flask CLI
         .\backend\scripts\run.ps1 -UseFlask -Host 0.0.0.0 -Port 5000
         ```

7. Verificar saúde da API:
    - Windows (PowerShell):
       ```powershell
   curl.exe -s http://127.0.0.1:5000/api/health
       ```
    - Linux/macOS:
       ```bash
       curl -s http://127.0.0.1:5000/api/health
       ```

8. A API estará disponível em: `http://localhost:5000`

### Variáveis de Ambiente

Um arquivo `.env.example` foi adicionado. Copie para `.env` e ajuste:

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

### Healthcheck

Endpoints disponíveis:
- `GET /api/health` (legado, mantém compatibilidade)
- `GET /api/v1/health` (versionado) retorna por exemplo:

```json
{
   "status": "online",
   "version": "0.1.0",
   "environment": "development",
   "uptime_seconds": 123,
   "db_ok": true,
   "meta": {"service": "evolutiva-api"}
}
```

### Pre-commit Hooks

Instale para garantir qualidade automática antes de cada commit:

```bash
pip install pre-commit
pre-commit install
```

Ferramentas configuradas: Black, Ruff, Isort, Prettier, correções de whitespace/EOF.

### Roadmap Técnico (Resumo)

Curto prazo (0-30 dias):
- App factory (`create_app`) e carregamento de config central
- JWT + refresh tokens e expiração curta
- Restringir CORS via FRONTEND_ORIGINS
- Docker Compose (api, db, redis, frontend, nginx)
- CI (lint + testes) com GitHub Actions

Médio prazo (31-60 dias):
- Fila assíncrona (Redis + RQ ou Celery) para geração de planos/quiz
- Cache de conteúdos e resultados IA
- Telemetria básica (latência p95, taxa de erro) + Sentry
- Testes E2E principais fluxos (Playwright)

Longo prazo (61-90 dias):
- Pagamentos/assinaturas
- Painel de métricas pedagógicas
- RBAC básico (admin/professor/aluno)

### Próximos Passos Internos

1. Refatorar `main.py` para `create_app()` usando `config.get_config()`
2. Introduzir schemas de validação (pydantic ou marshmallow)
3. Logging estruturado (request_id, user_id, latency)
4. Implementar tokens JWT + refresh
5. Adicionar testes automáticos cobrindo onboarding/planos

### Autenticação JWT

O backend utiliza `flask-jwt-extended` para autenticação stateless com rotação de refresh tokens e revogação assistida por Redis. Fluxo básico atualizado:

1. Registro (`POST /api/auth/register`) ou login (`POST /api/auth/login`) retornam:
    - `access_token`: curta duração (definida via configuração padrão do pacote – ajustar futuramente via variáveis `JWT_ACCESS_TOKEN_EXPIRES`).
    - `refresh_token`: longa duração para obter novos tokens de acesso (`POST /api/auth/refresh`).
2. O header deve conter `Authorization: Bearer <access_token>` para rotas protegidas com `@jwt_required()`.
3. Quando o access token expira, o cliente chama `/api/auth/refresh` enviando o refresh token no header Authorization para obter um novo par de tokens (access + refresh). O refresh anterior é imediatamente marcado como rotacionado e não poderá ser reutilizado (previne replay).
4. Endpoints principais:
    - `POST /api/auth/register`
    - `POST /api/auth/login`
    - `POST /api/auth/refresh` (usa refresh token)
    - `GET  /api/auth/token/verify` (validação rápida)
    - `GET  /api/auth/user/me` (dados do usuário autenticado)

Detalhes de segurança implementados:
- Rotação de refresh tokens: cada chamada a `/api/auth/refresh` invalida o token anterior (set Redis `jwt:refresh:rotated` + blocklist `jwt:refresh:revoked`). Reuso gera 401.
- Revogação em Redis: callback `token_in_blocklist_loader` verifica se `jti` está revogado.
- Cookies seguros configurados (`SESSION_COOKIE_SECURE`, `HTTPONLY`, `SAMESITE=Lax`) e flags preparadas para eventual migração de tokens para cookies.
- Nginx com cabeçalhos de segurança (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) reduzindo superfícies de ataque XSS / clickjacking.

Boas práticas adicionais recomendadas (ainda configuráveis conforme necessidade):
- Ajustar expirações via env: `JWT_ACCESS_TOKEN_EXPIRES=1800` (30m), `JWT_REFRESH_TOKEN_EXPIRES=604800` (7d)
- Migrar refresh tokens para cookies httpOnly se for desejado reforço contra exfiltração por XSS.
- Implementar logout explícito de refresh token em cliente (já suportado — apenas descartar localmente e aguardar expiração se não houver cookie).

Exemplo uso com curl (login):
```bash
curl -X POST http://localhost:5000/api/auth/login \
   -H "Content-Type: application/json" \
   -d '{"email":"aluno@example.com","password":"senha123"}'
```

Resposta esperada:
```json
{
   "access_token": "...",
   "refresh_token": "...",
   "id": 1,
   "email": "aluno@example.com"
}
```

Uso em requisição autenticada:
```bash
curl http://localhost:5000/api/auth/user/me -H "Authorization: Bearer $ACCESS_TOKEN"
```

Renovar token de acesso:
```bash
curl -X POST http://localhost:5000/api/auth/refresh -H "Authorization: Bearer $REFRESH_TOKEN"
```

### Pipeline CI (GitHub Actions)

Arquivo: `.github/workflows/backend-ci.yml`

Jobs principais:
- `test`: Instala dependências, roda linters (Ruff + Black --check) e executa testes Pytest usando SQLite (variável `USE_SQLITE=1`). Artefatos de cache do pytest são publicados.
- `security`: Executa verificação simples com `safety` (não falha o build se encontrar vulnerabilidades por enquanto).

Disparo:
- `push` ou `pull_request` afetando `backend/**` ou o próprio workflow.

Resumo dos passos do job `test`:
1. Checkout
2. Setup Python 3.11 com cache de pip
3. Instala `requirements.txt` (raiz e `backend/src` se existir outro arquivo)
4. Instala ferramentas de desenvolvimento (pytest, ruff, black)
5. Lint (`ruff check`) e formato (`black --check`)
6. Executa `pytest -q`
7. Publica artefatos

Como rodar localmente (usando SQLite):
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: .\\venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
export USE_SQLITE=1  # Windows: $env:USE_SQLITE='1'
cd src
pytest -q
```

Próximas melhorias de CI sugeridas:
- Adicionar cobertura (`pytest --cov`) e badge
- Adicionar matriz de versões Python (3.11, 3.12)

### Script de Inicialização Rápida (Windows)

Para facilitar o start em ambiente local foi adicionado `scripts/dev-up.ps1`.

Funções:
- Verifica se o Docker daemon está acessível.
- Caso Docker esteja ok: executa `docker compose up -d` (opcional rebuild com `-Rebuild`) e aguarda health da API.
- Caso Docker não esteja rodando e seja passado `-ForceLocalFallback`: sobe backend local (SQLite) + frontend Vite em janelas separadas.

Uso (PowerShell na raiz do repositório):
```powershell
./scripts/dev-up.ps1              # sobe stack docker
./scripts/dev-up.ps1 -Rebuild     # força rebuild das imagens
./scripts/dev-up.ps1 -ForceLocalFallback  # roda sem Docker (SQLite + Vite)
```

Após sucesso (modo Docker): acessar `http://localhost`.

Fallback local:
- API: `http://127.0.0.1:5000`
- Frontend: `http://localhost:5173`

Logs rápidos (modo Docker):
```powershell
docker compose ps
docker logs api --tail 50
docker logs nginx --tail 30
```

Health:
```powershell
Invoke-RestMethod -Uri http://localhost/api/health
```

### Redis & RQ

Adicionados a `requirements-core.txt` para suportar:
- Revogação e rotação de refresh tokens (Redis)
- Futuras filas assíncronas (RQ) para tarefas pesadas (ex.: geração de planos avançados, pré-processamento de conteúdos).

Ambiente:
- Serviço Redis já definido no `docker-compose.yml`.
- Variável `REDIS_URL` pode sobrescrever host/pipeline. Padrão: `redis://redis:6379/0` em containers.

### Cabeçalhos de Segurança (Nginx)

`infra/nginx/nginx.conf` inclui:
- `Content-Security-Policy: default-src 'self' data: blob:` (ajuste conforme novas integrações externas)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` (agrupar recursos conforme necessidade futura)

### React Query Integração

Adicionada a dependência `@tanstack/react-query` e provider global em `src/main.tsx`:
- Cache configurado (staleTime 30s, gc 5min) evitando requisições redundantes para endpoints de perfil/planos.
- Chaves padrão em `apiClient.ts`: `QueryKeys.me`, `QueryKeys.planoAtual`.
- Futuras rotas podem reutilizar `apiFetch` + `useQuery(QueryKeys.xyz, queryFetchers.xyz)`.

Benefícios:
- Desacoplamento entre componentes e lógica de fetch.
- Revalidação reativa opcional.
- Facilita estratégia offline (futuro) e otimizações.

### Sanitização de HTML

Componentes que exibem conteúdo HTML utilizam `DOMPurify` (ex.: `ContentDisplay`) para neutralizar riscos de XSS quando renderizando material dinâmico.

### Resumo de Hardening Atual
- Dependências core minimalistas auditadas (script AST).
- Rotação e revogação de refresh tokens com Redis.
- Cookies e sessão endurecidos (Secure, HttpOnly, SameSite=Lax).
- Nginx com CSP e cabeçalhos de segurança padrão.
- Build frontend efêmero (gera estáticos, container final somente serve via Nginx).
- Gunicorn parametrizado (workers/threads/timeouts) e filesystem read-only para serviços em produção.

Próximos incrementos sugeridos:
- Métricas/telemetria (latência p95, contagem 401/429) + dashboard.
- Testes E2E (Playwright) para fluxo onboarding/autenticação.
- Política de rotação de SECRET_KEY/JWT keys (key versioning) se múltiplas instâncias escaladas.
- Falhar build em vulnerabilidades críticas (safety / pip-audit)
- Cache de dependências Node e build do frontend (workflow separado full-stack)


## Funcionalidades Principais

- **Autenticação de Usuários**: Sistema de login e registro
- **Trilhas de Estudo**: Cursos organizados por disciplinas do ensino médio
- **Avaliações Automáticas**: Quizzes e exercícios com correção automática
- **Monitoramento de Progresso**: Dashboard com estatísticas de desempenho
- **Design Responsivo**: Interface adaptada para dispositivos móveis e desktop

## Observações

- O sistema utiliza dados simulados para demonstração
- Em um ambiente de produção, seria necessário configurar um banco de dados PostgreSQL real
- As senhas devem ser armazenadas com criptografia adequada em ambiente de produção
#   E v o l u t i v a 
 
 
# 🎓 Sistema de Onboarding e Geração de Plano de Estudo

Este módulo faz parte do projeto Evolutiva. Ele permite que o aluno preencha suas informações iniciais (onboarding) e gere automaticamente um plano de estudos personalizado com base nos conteúdos disponíveis no banco de dados.

---

## ✅ Funcionalidades

- Cadastro de dados do aluno (idade, escolaridade, objetivo, estilo de aprendizagem etc.)
- Escolha de curso e dias disponíveis para estudo
- Geração automática de cronograma baseado em conteúdos cadastrados
- Armazenamento do plano de estudo no banco
- Cache para evitar múltiplas gerações para o mesmo aluno

---

## 🔁 Fluxo Resumido

1. Aluno faz login.
2. Se não completou o onboarding, é redirecionado para `/onboarding`.
3. O aluno preenche os dados em 4 etapas:
   - Dados pessoais
   - Estilo de aprendizagem
   - Disponibilidade de tempo e dias
   - Revisão final
4. Ao concluir, o sistema:
   - Salva os dados no backend via `/api/onboarding`
   - Chama `/api/plano-estudo/gerar` para gerar o cronograma
   - Salva o plano e redireciona o aluno para a página `/trilhas` ou dashboard.

---

## 🛠 Estrutura do Backend

- Arquivo: `onboarding_routes.py`
- Blueprints utilizados:
  - `/api/onboarding`: salva os dados do usuário no banco
  - `/api/plano-estudo/gerar`: gera o plano de estudo baseado em script (sem IA)
  - `/api/planos/me`: retorna o plano de estudo atual do aluno logado

---

## 📦 Banco de Dados

Modelos principais utilizados:

- `User`: contém dados do aluno e flag `has_onboarding`
- `SubjectContent`: base de conteúdos usados para gerar os blocos de estudo
- `PlanoEstudo`: onde os planos gerados são salvos (como JSON)

---

## 🧠 Como funciona a geração do plano?

- Usa o tempo diário disponível do aluno e divide em blocos de 40 minutos
- Gera blocos para cada dia disponível, alternando entre os conteúdos cadastrados
- Cada atividade inclui o nome da matéria (`subject`) e o tema (`topic`)
- Exemplo de bloco gerado:
  ```json
  {
    "segunda": [
      { "horario": "08:00-08:40", "atividade": "Estudo: Matemática - Frações" },
      { "horario": "08:40-09:20", "atividade": "Estudo: Ciências - Sistema Solar" }
    ]
  }
  ```

### Nota de Limpeza de Dependências (Frontend)
Foi realizada redução de dependências removendo stacks não utilizadas (MUI, Radix UI, form libs, flow libs, múltiplas bibliotecas de toast, zod, date-fns, etc.). Mantidas apenas libs efetivamente importadas em runtime: React core, roteamento, ícones (lucide), motion, sanitização (dompurify), gráficos (recharts), confetti e toastify, além do client central baseado em fetch (axios removido após migração).

Próximos passos planejados:
1. Monitorar necessidade real de `recharts` e `react-confetti` (considerar lazy import ou split se uso esporádico).
2. Adicionar verificação automatizada (script simples ou ts-prune) para garantir que novas dependências não usadas sejam evitadas.
3. Medir impacto de bundle (análise com `vite --debug` ou plugin visualizer) e otimizar se necessário.

Impacto estimado: menor tempo de instalação, menor superfície de vulnerabilidades e build mais rápido.

## Infra & Operação (Consolidado)

### Containers (docker-compose)
Serviços:
- db (Postgres 16-alpine) com healthcheck (+ start_period) e volume `pgdata`.
- redis (7-alpine) com AOF e volume `redisdata`.
- api (Flask/Gunicorn) read_only + tmpfs /tmp + parâmetros WORKERS/THREADS/GUNICORN_TIMEOUT/GRACEFUL_TIMEOUT.
- worker (RQ) reutiliza imagem backend.
- frontend-build (one-shot) gera artefatos e popula volume `webroot`.
- nginx (stable-alpine) serve SPA + proxy /api → api:5000, healthcheck simples.

Volumes nomeados: pgdata, redisdata, webroot.
Rede: bridge única `evolutiva`.

Hardening aplicado:
- `read_only: true` + `tmpfs:/tmp` no serviço api.
- `security_opt: no-new-privileges:true` (api, nginx).
- Gunicorn parametrizado + graceful shutdown.

### Backend Runtime
- App factory: `main:create_app()` usado pelo Gunicorn.
- Dependências core minimalistas (ver seção Split de Dependências).
- Import opcional de `google-generativeai` protegido por gating.

### Build & Imagens
- Backend: base `python:3.11.9-slim`, build deps mínimos, Gunicorn gthread.
- Frontend: multi-stage (deps → build → exporter) usando Node `20.11-alpine` com camada de cache de dependências.
- Artefatos estáticos copiados para volume compartilhado (`webroot`).

### CI (GitHub Actions)
Workflow unificado `.github/workflows/ci.yml`:
- backend-test: lint (ruff/black), pytest com SQLite, cobertura básica.
- frontend-build: eslint + build.
- docker-build: imagens backend/frontend (pronto para futura publicação).
Auditoria de imports integrada manualmente (script local disponível) — pode ser adicionada em job futuro.

### Auditoria de Imports
Script: `backend/scripts/check_imports.py`
Recursos: cache incremental, whitelist externa, JSON, flags (--list-files, --warn-only, fail-on-*), gating para extras, fingerprint.

### Makefile
Principais alvos: build, up, up-recreate, logs, logs-api, logs-worker, migrate, revision, shell, health, prune.
Exemplo: `make up` / `make migrate`.

### Variáveis de Performance
Ajuste via `.env` ou compose:
- WORKERS (default 3)
- THREADS (default 4)
- GUNICORN_TIMEOUT (default 120)
- GRACEFUL_TIMEOUT (default 30)

### Segurança & Boas Práticas Futuras
Recomendações adicionais:
- Adicionar rate limit específico em rotas sensíveis de auth.
- Implementar revogação JWT (Redis set) + rotation de refresh.
- Ativar Sentry (variável SENTRY_DSN) backend e frontend.
- Adicionar cabeçalhos de segurança via Nginx (Content-Security-Policy, X-Frame-Options, etc.).
- Considerar image scanning (trivy/grype) no CI.

### Próximos Melhoramentos Técnicos
1. Adicionar badge de cobertura.
2. Job de auditoria de imports dedicado (falhando em drift).
3. Script de bundle analysis do frontend (vite plugin visualizer) + budget.
4. Remover `Flask-Login` após confirmação de migração completa para JWT.
5. Rate limit adaptativo por usuário (Redis) para endpoints críticos.

### Resumo das Ações Aplicadas Nesta Iteração
- Separação de requirements (core/extra/dev) e auditoria AST.
- Docker Compose produção with Postgres + Redis + Gunicorn + Nginx.
- Multi-stage frontend e container build efêmero.
- Hardening (read_only, no-new-privileges, tmpfs, healthchecks, pinned images).
- Parametrização Gunicorn (WORKERS/THREADS/TIMEOUT/GRACEFUL_TIMEOUT).
- Makefile operacional criado.
- Script de auditoria avançado com caching/whitelist/gating.
- CI unificado (backend, frontend, docker build) com lint+tests.

---
