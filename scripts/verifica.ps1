<#!
.SYNOPSIS
  Script de verificação rápida da stack Evolutiva (Windows/PowerShell).
.DESCRIPTION
  Executa checagens de saúde da API, headers de segurança via Nginx, presença de SPA, e rotas de compatibilidade.
.PARAMETER BaseUrl
  URL base (default: http://localhost)
.PARAMETER ApiPrefix
  Prefixo API (default: /api)
.PARAMETER TimeoutSeconds
  Timeout de cada requisição (default: 5)
.PARAMETER Json
  Saída em JSON (resumo + lista de falhas)
.EXAMPLE
  .\scripts\verifica.ps1
.EXAMPLE
  .\scripts\verifica.ps1 -BaseUrl http://localhost:8080 -Json
.NOTES
  Retorna código de saída 0 se tudo OK, 1 se houver falhas.
#>
param(
  [string]$BaseUrl = "http://localhost",
  [string]$ApiPrefix = "/api",
  [int]$TimeoutSeconds = 5,
  [switch]$Json
)

$ErrorActionPreference = 'Stop'

function Invoke-Check {
  param(
    [string]$Name,
    [scriptblock]$Script
  )
  $result = [ordered]@{ name = $Name; ok = $false; info = $null; error = $null }
  try {
    $value = & $Script
    $result.ok = $true
    $result.info = $value
  } catch {
    $result.error = $_.Exception.Message
  }
  return $result
}

function Get-Json($url) {
  $resp = Invoke-WebRequest -Uri $url -TimeoutSec $TimeoutSeconds -UseBasicParsing
  if($resp.StatusCode -ge 400){ throw "Status $($resp.StatusCode)" }
  if($resp.Content){ return $resp.Content | ConvertFrom-Json -ErrorAction Stop }
  return $null
}

$checks = @()
$apiHealth = "$BaseUrl$ApiPrefix/health"
$apiPing   = "$BaseUrl$ApiPrefix/ping"
$apiProgress = "$BaseUrl$ApiPrefix/progress"

$checks += Invoke-Check -Name "api_health" -Script { (Get-Json $apiHealth).status }
$checks += Invoke-Check -Name "api_ping" -Script { (Get-Json $apiPing) }
$checks += Invoke-Check -Name "api_progress_root" -Script { (Get-Json $apiProgress) }

# Headers de segurança (CSP / X-Frame-Options) via request raiz
$checks += Invoke-Check -Name "security_headers" -Script {
  $resp = Invoke-WebRequest -Uri $BaseUrl -TimeoutSec $TimeoutSeconds -UseBasicParsing
  $needed = @('Content-Security-Policy','X-Frame-Options','X-Content-Type-Options','Referrer-Policy')
  $missing = @()
  foreach($h in $needed){ if(-not $resp.Headers[$h]){ $missing += $h } }
  if($missing.Count -gt 0){ throw "Faltando: $($missing -join ', ')" }
  return "OK"
}

# SPA index.html presente?
$checks += Invoke-Check -Name "spa_index" -Script {
  $resp = Invoke-WebRequest -Uri "$BaseUrl/index.html" -TimeoutSec $TimeoutSeconds -UseBasicParsing -ErrorAction Stop
  if($resp.StatusCode -ge 400){ throw "Status $($resp.StatusCode)" }
  if($resp.Content -match '<div' -or $resp.Content.Length -gt 100){ return "present" } else { throw "conteudo inesperado" }
}

# Resultado final
$failures = $checks | Where-Object { -not $_.ok }
if($Json){
  $out = [ordered]@{
    base_url = $BaseUrl
    api_prefix = $ApiPrefix
    total = $checks.Count
    ok = ($checks.Count - $failures.Count)
    failed = $failures.Count
    failures = $failures
  } | ConvertTo-Json -Depth 5
  Write-Output $out
} else {
  foreach($c in $checks){
    if($c.ok){ Write-Host "[OK ] $($c.name): $($c.info)" -ForegroundColor Green }
    else { Write-Host "[FAIL] $($c.name): $($c.error)" -ForegroundColor Red }
  }
  if($failures.Count -gt 0){
    Write-Host "Falhas: $($failures.Count)" -ForegroundColor Red
  } else {
    Write-Host "Tudo OK" -ForegroundColor Green
  }
}
exit ([int]([bool]($failures.Count -gt 0)))
