<#
.SYNOPSIS
  Monitora tamanho estimado do contexto de build Docker do backend.
.DESCRIPTION
  Soma bytes de arquivos (excluindo padrões típicos) e alerta ou retorna código de saída >0 se ultrapassar thresholds.
.PARAMETER WarnMB
  Limite em MB para aviso (default 80).
.PARAMETER FailMB
  Limite em MB para falha (default 150).
.PARAMETER Json
  Retorna saída em JSON (com fields sizeMB,status,thresholdWarn,thresholdFail) sem prints extras.
.EXAMPLE
  powershell -File backend/scripts/monitor_build_size.ps1
.EXAMPLE
  powershell -File backend/scripts/monitor_build_size.ps1 -WarnMB 60 -FailMB 120 -Json
#>
[CmdletBinding()]
param(
  [int]$WarnMB = 80,
  [int]$FailMB = 150,
  [switch]$Json,
  [int]$Top = 0
)

$Root = 'backend'
if(-not (Test-Path $Root)){ Write-Error "Diretório backend não encontrado"; exit 2 }

# Padrões extras (além do .dockerignore) para exclusão nesta métrica:
$ExcludePatterns = @(
  '\\?venv', '\\?\.venv', '\\?\.venv_backend', 'node_modules', '__pycache__', '\\.pytest_cache', '\\.mypy_cache', '\\.cache', '\\.git', '\\.tsbuildinfo$'
)

$files = Get-ChildItem -Recurse -Force $Root | Where-Object { -not $_.PSIsContainer }
$filtered = $files | Where-Object {
  $path = $_.FullName
  $hasMatch = ($ExcludePatterns | Where-Object { $path -match $_ })
  -not $hasMatch
}
$bytes = ($filtered | Measure-Object Length -Sum).Sum
$sizeMB = if($bytes){ [math]::Round($bytes/1MB,2) } else { 0 }

$status = 'ok'
if($sizeMB -ge $WarnMB){ $status='warn' }
if($sizeMB -ge $FailMB){ $status='fail' }

if($Json){
  $obj = [pscustomobject]@{ sizeMB=$sizeMB; status=$status; thresholdWarn=$WarnMB; thresholdFail=$FailMB; filesCount=$filtered.Count }
  $obj | ConvertTo-Json -Depth 2
  if($status -eq 'fail'){ exit 3 } elseif($status -eq 'warn'){ exit 0 } else { exit 0 }
}

Write-Host ("Contexto (estimado filtrado) = {0} MB ({1} arquivos)" -f $sizeMB,$filtered.Count) -ForegroundColor Cyan
Write-Host ("Limites -> warn: {0} MB | fail: {1} MB" -f $WarnMB,$FailMB) -ForegroundColor DarkGray

switch($status){
  'ok'   { Write-Host 'Status: OK' -ForegroundColor Green }
  'warn' { Write-Warning 'Status: WARN (acima do limite de aviso)'; }
  'fail' { Write-Error 'Status: FAIL (acima do limite de falha)'; exit 3 }
}

if($Top -gt 0){
  Write-Host "Top $Top diretórios (MB)" -ForegroundColor Cyan
  $rootResolved = (Resolve-Path $Root).Path
  # Garantir barra final para cálculo de substring correto
  if(-not $rootResolved.EndsWith([IO.Path]::DirectorySeparatorChar)){
    $rootResolved = $rootResolved + [IO.Path]::DirectorySeparatorChar
  }
  $sepChars = [char[]]"\\/"
  $agg = $filtered | ForEach-Object {
    $full = $_.FullName
    if($full.StartsWith($rootResolved)){
      $rel = $full.Substring($rootResolved.Length)
    } else {
      # fallback raro: resolve novamente relativo
      $rel = (Resolve-Path $full).Path
    }
    $rel = $rel.TrimStart($sepChars)
    if([string]::IsNullOrWhiteSpace($rel)){ $rel='.' }
    $parent = Split-Path -Parent $rel
    if([string]::IsNullOrWhiteSpace($parent)){ $parent='.' }
    [pscustomobject]@{Parent=$parent; Size=$_.Length}
  } | Group-Object Parent | ForEach-Object {
    $sum = ($_.Group | Measure-Object Size -Sum).Sum
    [pscustomobject]@{Dir=$_.Name; MB=[math]::Round($sum/1MB,2)}
  } | Sort-Object MB -Descending | Select-Object -First $Top
  if($agg){ $agg | Format-Table -AutoSize } else { Write-Host "(sem dados)" }
}
