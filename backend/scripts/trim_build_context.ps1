<#
.SYNOPSIS
  Remove artefatos pesados do contexto de build Docker do backend para acelerar builds.
.DESCRIPTION
  Exclui diretórios de virtualenv (.venv, venv, .venv_backend) e node_modules residuais dentro de backend/.
  Mostra tamanho antes/depois.
.NOTES
  Execute na raiz do repositório:
    powershell -File backend/scripts/trim_build_context.ps1
  Use -DryRun para apenas exibir tamanhos.
#>
[CmdletBinding()]
param(
    [switch]$DryRun
)

function Get-SizeMB($Path) {
    if (-not (Test-Path $Path)) { return 0 }
    $bytes = (Get-ChildItem -Recurse -Force $Path -ErrorAction SilentlyContinue | Where-Object { -not $_.PSIsContainer } | Measure-Object Length -Sum).Sum
    if (-not $bytes) { return 0 }
    return [math]::Round($bytes / 1MB, 2)
}

$Targets = @(
    'backend/venv',
    'backend/.venv',
    'backend/.venv_backend',
    'backend/node_modules'
) | ForEach-Object { $_ -replace '\\', '/' }

Write-Host "== Tamanhos atuais ==" -ForegroundColor Cyan
$report = @()
foreach ($t in $Targets) {
    $report += [pscustomobject]@{Path = $t; MB = (Get-SizeMB $t) }
}
$report | Format-Table -AutoSize

if ($DryRun) { Write-Host "DryRun ativo - nada será removido" -ForegroundColor Yellow; exit 0 }

foreach ($t in $Targets) {
    if (Test-Path $t) {
        Write-Host "Removendo $t..." -ForegroundColor Magenta
  try { Remove-Item -Recurse -Force $t } catch { Write-Warning ('Falha removendo {0}: {1}' -f $t, $_.Exception.Message) }
    }
}

Write-Host "== Após limpeza ==" -ForegroundColor Green
$report2 = @()
foreach ($t in $Targets) { $report2 += [pscustomobject]@{Path = $t; MB = (Get-SizeMB $t) } }
$report2 | Format-Table -AutoSize

Write-Host "Sugestão: recrie virtualenv fora de backend/ (ex.: ./.venv_root) ou use pipx/uv para evitar novo acúmulo." -ForegroundColor DarkGray