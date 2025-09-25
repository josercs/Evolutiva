#!/usr/bin/env bash
# Verificação rápida da stack Evolutiva (Linux/macOS)
# Uso: ./scripts/verifica.sh [BASE_URL] [API_PREFIX]
# Ex:  ./scripts/verifica.sh http://localhost:8080 /api
set -euo pipefail
BASE_URL="${1:-http://localhost}"
API_PREFIX="${2:-/api}"
TIMEOUT=5
FAIL=0

log(){ echo -e "$1"; }
ok(){ log "[OK ] $1"; }
fail(){ log "[FAIL] $1"; FAIL=1; }

get_json(){
  local url="$1"
  local body
  body=$(curl -fsS --max-time $TIMEOUT "$url" || true)
  if [[ -z "$body" ]]; then return 1; fi
  echo "$body"
}

# api health
ahealth=$(get_json "${BASE_URL}${API_PREFIX}/health") || fail "api_health" || true
if [[ -n "${ahealth:-}" ]]; then ok "api_health"; fi

# api ping
aping=$(get_json "${BASE_URL}${API_PREFIX}/ping") || fail "api_ping" || true
if [[ -n "${aping:-}" ]]; then ok "api_ping"; fi

# api progress root
aprog=$(get_json "${BASE_URL}${API_PREFIX}/progress") || fail "api_progress_root" || true
if [[ -n "${aprog:-}" ]]; then ok "api_progress_root"; fi

# security headers
headers=$(curl -I -fsS --max-time $TIMEOUT "$BASE_URL" || true)
need=("Content-Security-Policy" "X-Frame-Options" "X-Content-Type-Options" "Referrer-Policy")
missing=()
for h in "${need[@]}"; do
  if ! echo "$headers" | grep -qi "^$h:"; then missing+=("$h"); fi
done
if [[ ${#missing[@]} -gt 0 ]]; then fail "security_headers faltando: ${missing[*]}"; else ok "security_headers"; fi

# SPA index
if curl -fsS --max-time $TIMEOUT "${BASE_URL}/index.html" | grep -qi '<div'; then
  ok "spa_index"
else
  fail "spa_index"
fi

if [[ $FAIL -eq 0 ]]; then
  log "Tudo OK"
else
  log "Falhas detectadas"
fi
exit $FAIL
