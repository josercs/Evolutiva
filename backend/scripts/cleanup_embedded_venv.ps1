<#!
.SYNOPSIS
  Remove venv acidental dentro de backend/src que aumenta contexto Docker.
.DESCRIPTION
  Apaga pasta backend/src/venv (se existir) com confirmação opcional.
#>
[CmdletBinding()] param(
  [switch]$Force
)
$venvPath = Join-Path $PSScriptRoot '..' | Join-Path -ChildPath 'src/venv'
$venvPath = (Resolve-Path $venvPath -ErrorAction SilentlyContinue)
if (-not $venvPath) { Write-Host 'Nenhum backend/src/venv encontrado.' -ForegroundColor Yellow; exit 0 }
if (-not $Force) {
  $ans = Read-Host "Remover venv em $venvPath ? (y/N)"
  if ($ans -notin @('y','Y','s','S')) { Write-Host 'Abortado.'; exit 1 }
}
Write-Host 'Removendo...' -ForegroundColor Cyan
Remove-Item -Recurse -Force $venvPath
Write-Host 'OK. Refaça build: docker compose build api' -ForegroundColor Green
