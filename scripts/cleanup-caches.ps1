<#
  Cleanup caches and transient build artifacts (safe).
  Usage examples:
    powershell -ExecutionPolicy Bypass -File .\scripts\cleanup-caches.ps1 -All
    .\scripts\cleanup-caches.ps1 -Node -Python -Dist
#>
[CmdletBinding()]
param(
  [switch]$Node,
  [switch]$Python,
  [switch]$Dist,
  [switch]$Tests,
  [switch]$Docker,
  [switch]$All,
  [switch]$Yes
)

if($All){ $Node=$true; $Python=$true; $Dist=$true; $Tests=$true }

function Confirm-Action($Msg){
  if($Yes){ return $true }
  $r = Read-Host "$Msg (y/N)"
  return ($r -match '^[Yy]')
}

Write-Host "== Evolutiva Cache Cleanup ==" -ForegroundColor Cyan
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$proj = Resolve-Path (Join-Path $root '..')
Set-Location $proj

$removed = @()

if($Node){
  $targets = @(
    'frontend/sistema-estudos/node_modules',
    'backend/src/node_modules'
  )
  foreach($t in $targets){ if(Test-Path $t){ if(Confirm-Action "Remover $t?"){ Remove-Item -Recurse -Force $t; $removed += $t } } }
}

if($Python){
  $py = @('backend/.pytest_cache','backend/src/.pytest_cache','backend/.mypy_cache','backend/src/.mypy_cache')
  foreach($p in $py){ if(Test-Path $p){ if(Confirm-Action "Remover $p?"){ Remove-Item -Recurse -Force $p; $removed += $p } } }
  Get-ChildItem -Recurse -Directory -Filter '__pycache__' | ForEach-Object {
    if(Confirm-Action "Remover $($_.FullName)?"){ Remove-Item -Recurse -Force $_; $removed += $_.FullName }
  }
  $venvCandidates = @('backend/venv','backend/.venv','backend/src/venv','backend/src/.venv')
  foreach($v in $venvCandidates){ if(Test-Path $v){ if(Confirm-Action "Remover virtualenv $v? (requer reinstalar deps) "){ Remove-Item -Recurse -Force $v; $removed += $v } } }
}

if($Dist){
  $distPaths = @('frontend/sistema-estudos/dist','frontend/sistema-estudos/.vite')
  foreach($d in $distPaths){ if(Test-Path $d){ if(Confirm-Action "Remover build $d?"){ Remove-Item -Recurse -Force $d; $removed += $d } } }
}

if($Tests){
  $cov = @('backend/.coverage','backend/coverage','backend/src/coverage','.coverage')
  foreach($c in $cov){ if(Test-Path $c){ if(Confirm-Action "Remover artefato teste $c?"){ Remove-Item -Recurse -Force $c; $removed += $c } } }
}

if($Docker){
  if(Confirm-Action "Prune Docker builder cache (global)?"){ docker builder prune -f }
  if(Confirm-Action "Prune Docker images dangling?"){ docker image prune -f }
}

if(-not $removed.Count){ Write-Host "Nenhum diretório removido (ver flags)." -ForegroundColor Yellow }
else { Write-Host "Removidos:" -ForegroundColor Green; $removed | ForEach-Object { Write-Host " - $_" } }
Write-Host "Concluído." -ForegroundColor Cyan
