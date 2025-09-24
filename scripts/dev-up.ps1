param(
    [switch]$Rebuild,
    [switch]$ForceLocalFallback,
    [switch]$Local,
    [int]$DockerWaitSeconds = 25,
    [switch]$Diag,
    # Executa alembic upgrade head (docker ou local)
    [switch]$AutoMigrate,
    [switch]$Seed,
    [switch]$CheckOnly,
    [switch]$DropLocalDB,
    [string]$StatusJson,
    # Não abrir frontend (útil para pipelines ou somente backend)
    [switch]$NoFrontend,
    # Minimiza saída (apenas mensagens essenciais)
    [switch]$Quiet
)

if (-not $Quiet) { Write-Host "== Evolutiva Dev Up ==" -ForegroundColor Cyan }

# Normaliza flags
if ($Local) { $ForceLocalFallback = $true }

# 1. Funções utilitárias
function Test-DockerEngine {
    try { docker version --format '{{.Server.Version}}' 2>$null | Out-Null; return $true } catch { return $false }
}

function Get-DockerDiagnostics {
    Write-Host "--- Diagnóstico Docker ---" -ForegroundColor DarkCyan
    $svc = Get-Service -Name com.docker.service -ErrorAction SilentlyContinue
    if ($svc) { Write-Host ("Service com.docker.service: {0}" -f $svc.Status) } else { Write-Host "Service com.docker.service: NÃO ENCONTRADO" }
    $proc = Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue
    if ($proc) { Write-Host "Processo Docker Desktop: Ativo" } else { Write-Host "Processo Docker Desktop: Não encontrado" }
    $dockerHost = $Env:DOCKER_HOST
    if ($dockerHost) { Write-Host "DOCKER_HOST definido: $dockerHost" } else { Write-Host "DOCKER_HOST não definido (ok)" }
    try {
        $wslInfo = wsl.exe -l -v 2>$null | Select-Object -First 10
        if ($wslInfo) { Write-Host "WSL distros (topo):"; $wslInfo | ForEach-Object { Write-Host "  $_" } }
    }
    catch { Write-Host "WSL info não disponível" }
    Write-Host "-------------------------" -ForegroundColor DarkCyan
}

if ($Diag) { Get-DockerDiagnostics }

$dockerOk = $false
if (-not $ForceLocalFallback) {
    # Espera progressiva pelo engine
    $wait = [Math]::Max(1, $DockerWaitSeconds)
    $start = Get-Date
    while (-not (Test-DockerEngine)) {
        if ( (New-TimeSpan -Start $start -End (Get-Date)).TotalSeconds -ge $wait ) { break }
        if (-not $Quiet) { Write-Host "Aguardando Docker Engine..." -ForegroundColor DarkGray }
        Start-Sleep -Seconds 2
    }
    $dockerOk = Test-DockerEngine
    if (-not $dockerOk) {
        Write-Warning "Docker daemon não acessível (pipe não encontrado)."
        if (-not $Diag) { Get-DockerDiagnostics }
        if (-not $Quiet) {
            Write-Host "Possíveis ações:" -ForegroundColor Yellow
            Write-Host "  1. Abrir Docker Desktop (GUI) e aguardar inicializar." -ForegroundColor Yellow
            Write-Host "  2. Se já aberto: sair pelo tray e reabrir." -ForegroundColor Yellow
            Write-Host "  3. Reiniciar serviço: Stop-Service com.docker.service ; Start-Service com.docker.service" -ForegroundColor Yellow
            Write-Host "  4. Verificar WSL: wsl -l -v" -ForegroundColor Yellow
            Write-Host "  5. wsl --update (se necessário)." -ForegroundColor Yellow
            Write-Host "  6. Reiniciar máquina se travado." -ForegroundColor Yellow
            Write-Host "  7. Ou usar -Local" -ForegroundColor Yellow
        }
    }
}
else {
    Write-Host "Ignorando Docker (modo local)." -ForegroundColor Yellow
}

if ($CheckOnly) { $AutoMigrate = $false; $Seed = $false; $DropLocalDB = $false }

$statusObj = [ordered]@{
    mode       = $null
    docker     = $false
    migrations = [ordered]@{ executed = $false; skipped = $false; error = $false }
    seed       = [ordered]@{ executed = $false; admin_created = $false }
    health     = $null
    timestamp  = (Get-Date).ToString('o')
}

# ---------------------------
# CAMINHO DOCKER
# ---------------------------
if ($dockerOk) {

    $statusObj.mode = 'docker'
    $statusObj.docker = $true

    if (-not (Test-Path .env)) {
        if (Test-Path .env.example) { Copy-Item .env.example .env; if (-not $Quiet) { Write-Host "Copiado .env.example -> .env" } }
        else { Write-Warning "Sem .env ou .env.example" }
    }

    if ($Rebuild) {
        if (-not $Quiet) { Write-Host "Rebuild imagens..." -ForegroundColor DarkCyan }
        docker compose build --pull
        if ($LASTEXITCODE -ne 0) { Write-Error "Falha no build"; exit 2 }
    }

    docker compose up -d
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Falha ao subir docker compose"
        Write-Host "Use -Diag para mais detalhes ou tente -Local" -ForegroundColor Yellow
        exit 2
    }

    if (-not $Quiet) { docker compose ps }

    if (-not $Quiet) { Write-Host "Aguardando API ficar saudável..." -ForegroundColor Cyan }
    $max = 30; $ok = $false
    for ($i = 0; $i -lt $max; $i++) {
        try {
            $health = Invoke-RestMethod -Uri http://localhost/api/health -TimeoutSec 3
            if ($health.status -eq 'online') { $ok = $true; break }
        }
        catch { Start-Sleep -Seconds 2 }
    }
    if ($ok) {
        if (-not $Quiet) { Write-Host "API online." -ForegroundColor Green }
        $statusObj.health = $health
    }
    elseif (-not $Quiet) {
        Write-Warning "API não respondeu dentro do tempo."
    }

    if ($AutoMigrate -and -not $CheckOnly) {
        $current = docker compose exec -T api bash -lc "alembic current --verbose 2>/dev/null | tail -n1"
        $heads = docker compose exec -T api bash -lc "alembic heads --verbose 2>/dev/null | tail -n1"
        $needMig = $true
        if ($current -and $heads -and ($current.Split()[-1] -eq $heads.Split()[-1])) { $needMig = $false }
        if ($needMig) {
            if (-not $Quiet) { Write-Host "Executando migrations (alembic upgrade head)..." -ForegroundColor DarkCyan }
            docker compose exec -T api bash -lc 'alembic upgrade head'
            if ($LASTEXITCODE -ne 0) {
                $statusObj.migrations.error = $true
                Write-Warning "Falha nas migrations (ver logs)."
            }
            else {
                $statusObj.migrations.executed = $true
                if (-not $Quiet) { Write-Host "Migrations OK." -ForegroundColor Green }
            }
        }
        else {
            $statusObj.migrations.skipped = $true
            if (-not $Quiet) { Write-Host "Banco já em head. (skip)" -ForegroundColor DarkGray }
        }
    }

    if ($Seed -and -not $CheckOnly) {
        if (-not $Quiet) { Write-Host "Executando seed inicial..." -ForegroundColor DarkCyan }
        $seedOut = docker compose exec -T api bash -lc 'python -m scripts.seed_data --json'
        try { $parsed = $seedOut | ConvertFrom-Json } catch {}
        if ($parsed) {
            $statusObj.seed.executed = $true
            $statusObj.seed.admin_created = [bool]$parsed.seed.admin_created
        }
    }

    if ($CheckOnly) {
        try {
            $health = Invoke-RestMethod -Uri http://localhost/api/health -TimeoutSec 5
            $statusObj.health = $health
            Write-Host ("Health: status={0} db_ok={1}" -f $health.status, $health.db_ok) -ForegroundColor Green
        }
        catch { Write-Warning "Falha ao consultar health." }
    }

    if ($StatusJson) { $statusObj | ConvertTo-Json -Depth 6 | Out-File -Encoding UTF8 $StatusJson }

    if (-not $CheckOnly -and -not $Quiet) { Write-Host "Abra: http://localhost" -ForegroundColor Cyan }
    exit 0
}

# ---------------------------
# FALLBACK LOCAL
# ---------------------------

if (-not $ForceLocalFallback -and -not $Quiet -and -not $CheckOnly) {
    Write-Host "Entrando em fallback local automático (Docker indisponível)." -ForegroundColor Yellow
}

if (-not $Quiet -and -not $CheckOnly) { Write-Host "Iniciando backend local (SQLite)." -ForegroundColor Cyan }

if ($DropLocalDB -and -not $dockerOk) {
    $dbPath = Join-Path (Join-Path $PSScriptRoot '..' ) 'backend/src/dev.db'
    if (Test-Path $dbPath) {
        if (-not $Quiet) { Write-Host "Removendo dev.db antigo..." -ForegroundColor DarkCyan }
        Remove-Item $dbPath -Force
    }
}

Push-Location backend
if (-not (Test-Path venv)) { python -m venv venv }
.\venv\Scripts\Activate.ps1
pip install -q -r requirements-dev.txt
$env:USE_SQLITE = '1'
Push-Location src
if (-not $CheckOnly) {
    Start-Process powershell -ArgumentList '-NoExit', '-Command', 'python main.py' -WindowStyle Minimized
}
Pop-Location
Pop-Location

if ($CheckOnly) {
    try {
        $health = Invoke-RestMethod -Uri http://127.0.0.1:5000/api/health -TimeoutSec 5
        Write-Host ("Health local: status={0} db_ok={1}" -f $health.status, $health.db_ok) -ForegroundColor Green
        $statusObj.health = $health
    }
    catch { Write-Warning "Health local indisponível (serviço não iniciado)." }
    if (-not $statusObj.mode) { $statusObj.mode = 'local' }
    if ($StatusJson) { $statusObj | ConvertTo-Json -Depth 6 | Out-File -Encoding UTF8 $StatusJson }
    exit 0
}

if (-not $NoFrontend) {
    if (-not $Quiet) { Write-Host "Iniciando frontend (Vite)." -ForegroundColor Cyan }
    Push-Location frontend\sistema-estudos
    if (Test-Path pnpm-lock.yaml) {
        if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { npm install -g pnpm | Out-Null }
        pnpm install | Out-Null
    }
    else {
        npm install | Out-Null
    }
    Start-Process powershell -ArgumentList '-NoExit', '-Command', 'npm run dev' -WindowStyle Minimized
    Pop-Location
}
elseif (-not $Quiet) {
    Write-Host "Flag -NoFrontend: ignorando start do Vite." -ForegroundColor Yellow
}

if ($AutoMigrate) {
    if (-not $Quiet) { Write-Host "Verificando migrations locais..." -ForegroundColor DarkCyan }
    Push-Location backend
    .\venv\Scripts\Activate.ps1
    Push-Location src
    $current = try { (alembic current 2>$null | Select-Object -Last 1) } catch { '' }
    $head = try { (alembic heads 2>$null | Select-Object -Last 1) } catch { '' }
    $need = $true
    if ($current -and $head -and ($current.Split()[-1] -eq $head.Split()[-1])) { $need = $false }
    if ($need) {
        if (-not $Quiet) { Write-Host "Aplicando alembic upgrade head..." -ForegroundColor DarkCyan }
        try { alembic upgrade head } catch { Write-Warning "Falha migrations locais: $_" }
        if (-not $?) { $statusObj.migrations.error = $true } else { $statusObj.migrations.executed = $true }
    }
    else {
        if (-not $Quiet) { Write-Host "Banco local já em head (skip)." -ForegroundColor DarkGray }
        $statusObj.migrations.skipped = $true
    }
    Pop-Location
    Pop-Location
}

if ($Seed) {
    if (-not $Quiet) { Write-Host "Executando seed local..." -ForegroundColor DarkCyan }
    Push-Location backend
    .\venv\Scripts\Activate.ps1
    Push-Location src
    try {
        $seedOut = python -m scripts.seed_data --json
        $parsed = $seedOut | ConvertFrom-Json
        if ($parsed) {
            $statusObj.seed.executed = $true
            $statusObj.seed.admin_created = [bool]$parsed.seed.admin_created
        }
    }
    catch { Write-Warning "Falha seed local: $_" }
    Pop-Location
    Pop-Location
}

if (-not $Quiet) {
    Write-Host "Fallback iniciado. Frontend: http://localhost:5173  API: http://127.0.0.1:5000" -ForegroundColor Green
}

if (-not $statusObj.mode) { $statusObj.mode = 'local' }
if (-not $statusObj.docker) { $statusObj.docker = $false }

try {
    $health = Invoke-RestMethod -Uri http://127.0.0.1:5000/api/health -TimeoutSec 3
    $statusObj.health = $health
}
catch {}

if ($StatusJson) { $statusObj | ConvertTo-Json -Depth 6 | Out-File -Encoding UTF8 $StatusJson }

exit 0
