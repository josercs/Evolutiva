param([switch]$SkipInstall)
$ErrorActionPreference = "Stop"

# Paths
$root = Split-Path -Parent $PSScriptRoot
$venv = Join-Path $root ".venv"
$python = Join-Path $venv "Scripts/python.exe"

# Ensure venv
if (-not (Test-Path $venv)) {
  Write-Host "Creating virtualenv at $venv"
  python -m venv $venv
}

# Install deps
if (-not $SkipInstall) {
  Write-Host "Upgrading pip and installing requirements..."
  & $python -m pip install --upgrade pip
  & $python -m pip install -r (Join-Path $root "requirements.txt")
}

# Dev env vars
$env:USE_SQLITE = "true"
$env:DEV_AUTOCREATE_DATA = "true"
$env:DEV_AUTOCREATE_USER = "true"
$env:DEV_MASTER_PASSWORD = "senhadev"
$env:DEBUG_SESSIONS = "true"

# Run tests
Push-Location (Join-Path $root "src")
& $python -m pytest -q
$exitCode = $LASTEXITCODE
Pop-Location

exit $exitCode
