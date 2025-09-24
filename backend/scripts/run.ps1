Param(
    [switch]$SQLite,
    [string]$ListenHost = "0.0.0.0",
    [int]$Port = 5000,
    [switch]$UseFlask
)

$ErrorActionPreference = 'Stop'

# Caminhos
$backend = Split-Path -Parent $PSScriptRoot
$venv = Join-Path $backend 'venv'
$activate = Join-Path $venv 'Scripts\Activate.ps1'
$src = Join-Path $backend 'src'

if (!(Test-Path $activate)) {
    Write-Error "Venv não encontrado em '$venv'. Crie-o com: python -m venv venv"
}

# Ativa venv padronizado em backend\venv
. $activate

# Vai para backend/src
Set-Location $src

# SQLite opcional para desenvolvimento rápido
if ($SQLite) {
    $env:USE_SQLITE = '1'
}

if ($UseFlask) {
    $env:FLASK_APP = 'main.py'
    if (-not $env:FLASK_ENV) { $env:FLASK_ENV = 'development' }
    python -m flask run --host=$ListenHost --port=$Port
} else {
    python .\main.py
}
