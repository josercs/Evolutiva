#!/usr/bin/env bash
set -euo pipefail
# Cleanup caches and transient build artifacts (safe-ish)
# Usage:
#  bash scripts/cleanup-caches.sh --all
#  bash scripts/cleanup-caches.sh --node --python --dist

NODE=false
PY=false
DIST=false
TESTS=false
DOCKER=false
YES=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --node) NODE=true ; shift ;;
    --python) PY=true ; shift ;;
    --dist) DIST=true ; shift ;;
    --tests) TESTS=true ; shift ;;
    --docker) DOCKER=true ; shift ;;
    --all) NODE=true; PY=true; DIST=true; TESTS=true ; shift ;;
    -y|--yes) YES=true ; shift ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

confirm(){
  local msg="$1"
  if $YES; then return 0; fi
  read -r -p "$msg (y/N) " ans || true
  [[ "$ans" =~ ^[Yy]$ ]]
}

removed=()

# Node modules
if $NODE; then
  for p in frontend/sistema-estudos/node_modules backend/src/node_modules; do
    if [[ -d $p ]] && confirm "Remove $p?"; then rm -rf "$p" && removed+=("$p") ; fi
  done
fi

# Python caches
if $PY; then
  for p in backend/.pytest_cache backend/src/.pytest_cache backend/.mypy_cache backend/src/.mypy_cache; do
    if [[ -d $p ]] && confirm "Remove $p?"; then rm -rf "$p" && removed+=("$p") ; fi
  done
  while IFS= read -r -d '' d; do
    if confirm "Remove $d?"; then rm -rf "$d" && removed+=("$d") ; fi
  done < <(find . -type d -name '__pycache__' -print0)
  for v in backend/venv backend/.venv backend/src/venv backend/src/.venv; do
    if [[ -d $v ]] && confirm "Remove virtualenv $v? (will require reinstall)"; then rm -rf "$v" && removed+=("$v") ; fi
  done
fi

# Build outputs
if $DIST; then
  for d in frontend/sistema-estudos/dist frontend/sistema-estudos/.vite; do
    if [[ -d $d ]] && confirm "Remove build $d?"; then rm -rf "$d" && removed+=("$d") ; fi
  done
fi

# Test coverage
if $TESTS; then
  for c in backend/.coverage backend/coverage backend/src/coverage .coverage; do
    if [[ -e $c ]] && confirm "Remove test artifact $c?"; then rm -rf "$c" && removed+=("$c") ; fi
  done
fi

# Docker prune (global)
if $DOCKER; then
  if confirm "Prune Docker builder cache?"; then docker builder prune -f; fi
  if confirm "Prune dangling images?"; then docker image prune -f; fi
fi

if (( ${#removed[@]} == 0 )); then
  echo "No directories removed (check flags)." >&2
else
  echo "Removed:"; for r in "${removed[@]}"; do echo " - $r"; done
fi

echo "Done."
