param(
    [switch]$Rebuild,
    [switch]$ForceLocalFallback
)

Write-Host "== Evolutiva Dev Up ==" -ForegroundColor Cyan

# 1. Check Docker Engine
function Test-Docker {
  try { docker version --format '{{.Server.Version}}' | Out-Null; return $true } catch { return $false }
}

$dockerOk = Test-Docker
if(-not $dockerOk) {
  Write-Warning "Docker daemon não acessível."
  if(-not $ForceLocalFallback) {
    Write-Host "Abra o Docker Desktop e depois reexecute ou use -ForceLocalFallback para rodar sem containers." -ForegroundColor Yellow
    exit 1
  } else {
    Write-Host "Forçando fallback local (sem containers)." -ForegroundColor Yellow
  }
}

if($dockerOk) {
  # 2. Ensure .env exists
  if(-not (Test-Path .env)) {
    if(Test-Path .env.example) { Copy-Item .env.example .env; Write-Host "Copiado .env.example -> .env" }
    else { Write-Warning "Sem .env ou .env.example" }
  }

  # 3. Compose actions
  if($Rebuild) { docker compose build --pull }
  docker compose up -d
  if($LASTEXITCODE -ne 0) { Write-Error "Falha ao subir docker compose"; exit 2 }
  docker compose ps
  Write-Host "Aguardando API ficar saudável..." -ForegroundColor Cyan
  $max=30; $ok=$false
  for($i=0;$i -lt $max;$i++) {
    try {
      $health = Invoke-RestMethod -Uri http://localhost/api/health -TimeoutSec 3
      if($health.status -eq 'online') { $ok=$true; break }
    } catch { Start-Sleep -Seconds 2 }
  }
  if($ok) { Write-Host "API online." -ForegroundColor Green } else { Write-Warning "API não respondeu dentro do tempo." }
  Write-Host "Abra: http://localhost" -ForegroundColor Cyan
  exit 0
}

# 4. Local fallback (Python + Vite)
Write-Host "Iniciando backend local (SQLite)." -ForegroundColor Cyan
Push-Location backend
if(-not (Test-Path venv)) { python -m venv venv }
.\venv\Scripts\Activate.ps1
pip install -q -r requirements-dev.txt
$env:USE_SQLITE='1'
Push-Location src
Start-Process powershell -ArgumentList '-NoExit','-Command','python main.py' -WindowStyle Minimized
Pop-Location
Pop-Location

Write-Host "Iniciando frontend (Vite)." -ForegroundColor Cyan
Push-Location frontend\sistema-estudos
if(Test-Path pnpm-lock.yaml) { if(-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { npm install -g pnpm | Out-Null } pnpm install } else { npm install }
Start-Process powershell -ArgumentList '-NoExit','-Command','npm run dev' -WindowStyle Minimized
Pop-Location

Write-Host "Fallback iniciado. Frontend: http://localhost:5173  API: http://127.0.0.1:5000" -ForegroundColor Green
