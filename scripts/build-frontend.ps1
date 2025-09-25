Param(
  [switch]$Local,
  [switch]$NoInstall
)

Write-Host "[frontend] Iniciando build..." -ForegroundColor Cyan

if(-not $Local){
  # Tenta via docker compose run frontend-build
  Write-Host "[frontend] Tentando build em container (frontend-build)" -ForegroundColor Yellow
  docker compose run --rm frontend-build
  if($LASTEXITCODE -eq 0){
    Write-Host "[frontend] Build via container finalizada. Verificando Nginx..." -ForegroundColor Green
    $ng = (docker compose ps -q nginx)
    if($ng){
      try { docker exec $ng ls -1 /usr/share/nginx/html | Select-Object -First 10 } catch { Write-Warning "Falha listar conteudo nginx: $_" }
    }
    exit 0
  } else {
    Write-Warning "[frontend] Falhou build em container. Fallback local..."
  }
}

# Build local
Push-Location frontend/sistema-estudos
try {
  if(-not $NoInstall){
    if(Test-Path pnpm-lock.yaml){
      if(Get-Command pnpm -ErrorAction SilentlyContinue){ pnpm install } else { npm install }
    } else {
      npm install
    }
  }
  npm run build
  if(-not (Test-Path dist)){ throw "dist não gerado" }
  Write-Host "[frontend] Build local OK." -ForegroundColor Green
} finally { Pop-Location }

# Publicar para volume docker se existir
$volName = "sistema_estudos_core_webroot"
$hasVol = docker volume ls --format '{{.Name}}' | Select-String $volName -Quiet
if($hasVol){
  Write-Host "[frontend] Publicando dist/ para volume $volName" -ForegroundColor Cyan
  $tmp = "tmp-publish-" + ([guid]::NewGuid().ToString())
  New-Item -ItemType Directory -Name $tmp | Out-Null
  try {
    Copy-Item -Recurse -Force frontend/sistema-estudos/dist/* $tmp/
    # Usa container alpine transitório
    docker run --rm -v (Resolve-Path $tmp):/src -v $volName:/dest alpine sh -lc "cp -r /src/* /dest/"
    Write-Host "[frontend] Publicação concluída." -ForegroundColor Green
  } finally {
    Remove-Item -Recurse -Force $tmp
  }
} else {
  Write-Warning "[frontend] Volume $volName não encontrado. Apenas build local gerado em frontend/sistema-estudos/dist." 
}
