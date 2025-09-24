<#
 start-easy.ps1
 Objetivo: 2 cliques para levantar ambiente.
 - Inicia serviço Docker (se existir) e abre Docker Desktop se não estiver rodando.
 - Espera engine ficar pronto.
 - Chama dev-up.ps1 (Docker preferencial) com flags opcionais.
 - Se após timeout não subir Docker, cai em modo local automático.
#>
param(
  [switch]$Rebuild,
  [int]$DockerWaitSeconds = 60,
  [switch]$Local,
  [switch]$Diag,
  [switch]$AutoMigrate,
  [switch]$Seed,
  [switch]$CheckOnly,
  [switch]$DropLocalDB,
  [string]$StatusJson,
  [switch]$NoFrontend,
  [switch]$Quiet
)

if(-not $Quiet){ Write-Host "== Evolutiva Start Easy ==" -ForegroundColor Cyan }
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptRoot '..')
Set-Location $repoRoot

function Start-DockerDesktop {
  $svc = Get-Service -Name com.docker.service -ErrorAction SilentlyContinue
  if($svc -and $svc.Status -ne 'Running') {
    Write-Host "Iniciando serviço com.docker.service..." -ForegroundColor DarkCyan
    try { Start-Service com.docker.service } catch { Write-Warning "Falha ao iniciar serviço: $_" }
  }
  # Tenta abrir GUI se processo não existir
  $proc = Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue
  if(-not $proc) {
    $possible = @(
      "$Env:ProgramFiles\\Docker\\Docker\\Docker Desktop.exe",
      "$Env:LOCALAPPDATA\\Docker\\Docker Desktop.exe"
    ) | Where-Object { Test-Path $_ }
    if($possible.Count -gt 0) {
      Write-Host "Abrindo Docker Desktop GUI..." -ForegroundColor DarkCyan
      Start-Process -FilePath $possible[0] | Out-Null
    } else {
      Write-Warning "Não encontrei Docker Desktop.exe automaticamente. Abra manualmente se necessário." 
    }
  }
}

function Test-DockerEngine { try { docker version --format '{{.Server.Version}}' 2>$null | Out-Null; return $true } catch { return $false } }

if(-not $Local) { Start-DockerDesktop }

if(-not $Local) {
  if(-not $Quiet){ Write-Host "Aguardando Docker Engine (até $DockerWaitSeconds s)..." -ForegroundColor DarkGray }
  $start = Get-Date
  while(-not (Test-DockerEngine)) {
    if((New-TimeSpan -Start $start -End (Get-Date)).TotalSeconds -ge $DockerWaitSeconds) { break }
    Start-Sleep -Seconds 2
  }
}

$engineOk = $Local -or (Test-DockerEngine)
if($engineOk) {
  if(-not $Quiet){ Write-Host "Docker Engine detectado: $([bool](-not $Local))" -ForegroundColor Green }
} else {
  if(-not $Quiet){ Write-Warning "Docker não respondeu dentro do tempo. Usando modo local." }
  $Local = $true
}

# Monta parâmetros para dev-up (corrige Join-Path: usar dois segmentos)
$devUp = Join-Path (Join-Path $repoRoot 'scripts') 'dev-up.ps1'
if(-not (Test-Path $devUp)) {
  Write-Error "Não encontrei script dev-up em: $devUp"; exit 99
}
$flags = @()
if($Rebuild) { $flags += '-Rebuild' }
if($Local) { $flags += '-Local' }
if($Diag) { $flags += '-Diag' }
if($AutoMigrate) { $flags += '-AutoMigrate' }
if($Seed) { $flags += '-Seed' }
if($CheckOnly) { $flags += '-CheckOnly' }
if($NoFrontend) { $flags += '-NoFrontend' }
if($DropLocalDB) { $flags += '-DropLocalDB' }
if($StatusJson) { $flags += '-StatusJson'; $flags += $StatusJson }
if($Quiet) { $flags += '-Quiet' }

if(-not $Quiet){ Write-Host "Chamando dev-up.ps1 $($flags -join ' ')" -ForegroundColor Cyan }
& $devUp @flags
$exitCode = $LASTEXITCODE
if($exitCode -ne 0) { Write-Warning "dev-up retornou código $exitCode" }
