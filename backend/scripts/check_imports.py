"""Script rápido para comparar imports reais vs requirements-core.
Uso:
    python backend/scripts/check_imports.py
"""
from __future__ import annotations
import ast
import sys
import json
import hashlib
import time
import importlib.util
from pathlib import Path
from functools import lru_cache
import argparse

SRC_ROOT = Path(__file__).resolve().parents[1] / "src"
REQ_CORE = SRC_ROOT.parent / "requirements-core.txt"
SCAN_DIRS = [
    SRC_ROOT / "routes",
    SRC_ROOT / "models",
    SRC_ROOT / "servicos",
]
SCAN_SINGLE_FILES = [
    SRC_ROOT / "app_factory.py",
    SRC_ROOT / "main.py",
]

IGNORE_INTERNAL = {"__future__"}
PREFIX_IGNORE = {"_", "test", "dev_"}

# Whitelists:
DEFAULT_WHITELIST_NOT_DECLARED = {
    # internal modules accidentally picked up via dynamic imports / structure
    "app_factory", "config", "db", "ia_quiz",
    # transitives we purposely do NOT pin separately (Flask brings werkzeug/blinker/jinja2 etc.)
    "werkzeug",
    # Namespace for optional google generative AI (only matters if extra installed)
    "google",
}

DEFAULT_WHITELIST_MISSING_CORE = {
    # Indirect runtime deps required by extensions, not imported explicitly in scanned dirs
    "limits",      # used internally by Flask-Limiter
    "psycopg2",    # SQLAlchemy engine / driver
}

@lru_cache(maxsize=1)
def stdlib_modules() -> set[str]:
    """Approximate set of stdlib top-level module names for filtering.
    Uses sys.stdlib_module_names when available (3.10+) and falls back to a heuristic.
    """
    names: set[str] = set()
    if hasattr(sys, "stdlib_module_names"):
        names |= {m.split('.') [0] for m in sys.stdlib_module_names}  # type: ignore[attr-defined]
    # Always include some common ones (defensive union)
    names |= {"os", "sys", "json", "re", "pathlib", "typing", "dataclasses", "subprocess", "logging", "datetime", "functools", "itertools"}
    return names


def load_core_requirements() -> set[str]:
    pkgs = set()
    for line in REQ_CORE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ">=" in line:
            name = line.split(">=", 1)[0]
        else:
            name = line
        pkgs.add(name.lower())
    return pkgs


def collect_python_files() -> list[Path]:
    files: list[Path] = []
    for d in SCAN_DIRS:
        if d.exists():
            files.extend([p for p in d.rglob("*.py") if not p.name.startswith("test_")])
    for f in SCAN_SINGLE_FILES:
        if f.exists():
            files.append(f)
    return files


def extract_top_level_imports(path: Path) -> set[str]:
    mods: set[str] = set()
    try:
        tree = ast.parse(path.read_text(encoding="utf-8"))
    except Exception:
        return mods
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for n in node.names:
                top = n.name.split(".")[0]
                if top not in IGNORE_INTERNAL:
                    mods.add(top)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                top = node.module.split(".")[0]
                if top not in IGNORE_INTERNAL:
                    mods.add(top)
    return mods


WHITELIST_FILE = Path('.audit_whitelist.json')
CACHE_FILE = Path('.audit_cache.json')
CACHE_TTL_SECONDS = 600  # 10 minutos

def file_fingerprint(paths: list[Path]) -> str:
    h = hashlib.sha256()
    for p in sorted(paths):
        try:
            stat = p.stat()
            h.update(str(p).encode())
            h.update(str(int(stat.st_mtime)).encode())
            h.update(str(stat.st_size).encode())
        except Exception:
            continue
    return h.hexdigest()

def load_external_whitelist() -> dict:
    if WHITELIST_FILE.exists():
        try:
            data = json.loads(WHITELIST_FILE.read_text(encoding='utf-8'))
            return {
                'not_declared': set(data.get('not_declared', [])),
                'missing_core': set(data.get('missing_core', [])),
            }
        except Exception:
            return {'not_declared': set(), 'missing_core': set()}
    return {'not_declared': set(), 'missing_core': set()}

def save_external_whitelist(not_declared: set[str], missing_core: set[str]) -> None:
    payload = {
        'not_declared': sorted(not_declared),
        'missing_core': sorted(missing_core),
        'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    }
    WHITELIST_FILE.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description='Auditoria de imports vs core requirements')
    parser.add_argument('--json', action='store_true', help='Saída em JSON (machine-readable)')
    parser.add_argument('--no-cache', action='store_true', help='Ignora cache de análise')
    parser.add_argument('--update-whitelist', action='store_true', help='Promove diferenças atuais para whitelist externa')
    parser.add_argument('--fail-on-missing-only', action='store_true', help='Exit 1 apenas se houver missing_core (ignorando extras)')
    parser.add_argument('--fail-on-extra-only', action='store_true', help='Exit 1 apenas se houver not_declared (ignorando missing)')
    parser.add_argument('--warn-only', action='store_true', help='Nunca retorna exit!=0; apenas imprime resultado')
    parser.add_argument('--list-files', action='store_true', help='Lista arquivos escaneados (também em JSON)')
    args = parser.parse_args()

    ext_wl = load_external_whitelist()
    wl_not_declared = set(DEFAULT_WHITELIST_NOT_DECLARED) | ext_wl['not_declared']
    wl_missing_core = set(DEFAULT_WHITELIST_MISSING_CORE) | ext_wl['missing_core']
    core = load_core_requirements()
    imports: set[str] = set()
    t_start = time.time()
    files = collect_python_files()
    fp = file_fingerprint(files)
    cache_hit = False
    cache_data = {}
    if CACHE_FILE.exists() and not args.no_cache:
        try:
            cache_data = json.loads(CACHE_FILE.read_text(encoding='utf-8'))
            if cache_data.get('fingerprint') == fp and (time.time() - cache_data.get('ts', 0)) < CACHE_TTL_SECONDS:
                imports = set(cache_data.get('imports', []))
                cache_hit = True
        except Exception:
            cache_hit = False

    if not cache_hit:
        for py in files:
            imports |= extract_top_level_imports(py)
        try:
            CACHE_FILE.write_text(json.dumps({'fingerprint': fp, 'imports': sorted(list(imports)), 'ts': time.time()}), encoding='utf-8')
        except Exception:
            pass

    # Filter noise: stdlib, private/prefix ignored, internal modules not representing new deps
    filtered_imports: set[str] = set()
    for name in imports:
        if name in stdlib_modules():
            continue
        if any(name.startswith(pref) for pref in PREFIX_IGNORE):
            continue
        if name in {"routes", "models", "servicos", "tests"}:
            continue
        # Determine origin path to exclude internal project modules.
        try:
            spec = importlib.util.find_spec(name)
            if spec and spec.origin:
                origin_path = Path(spec.origin)
                if str(SRC_ROOT) in str(origin_path):
                    # module lives inside repo -> not a dependency signal
                    continue
        except Exception:
            pass
        filtered_imports.add(name)

    # Map heuristic (package name might differ from import name)
    mapping_extra = {
        "python-dotenv": "dotenv",
        "psycopg2-binary": "psycopg2",
        "flask-sqlalchemy": "flask_sqlalchemy",
        "flask-cors": "flask_cors",
        "flask-jwt-extended": "flask_jwt_extended",
        "flask-limiter": "flask_limiter",
        "flask-login": "flask_login",
    }

    normalized_core = {mapping_extra.get(p, p).replace('-', '_') for p in core}

    missing_in_code = sorted(normalized_core - filtered_imports)
    not_declared = sorted(filtered_imports - normalized_core)

    print("== IMPORT CHECK ==")
    # Apply whitelists
    eff_missing = [m for m in missing_in_code if m not in wl_missing_core]
    eff_not_declared = [n for n in not_declared if n not in wl_not_declared]

    # Extra gating: if google.generativeai usado mas não listado em requirements-extra
    extras_file = REQ_CORE.parent / 'requirements-extra.txt'
    extras_text = extras_file.read_text(encoding='utf-8') if extras_file.exists() else ''
    gemini_listed = 'google-generativeai' in extras_text
    gemini_flagged = False
    if 'google' in not_declared and not gemini_listed:
        # 'google' namespace pode ser amplo, mas marcamos explicitamente
        eff_not_declared.append('google.generativeai (namespace google usado; adicione google-generativeai em requirements-extra.txt)')
        gemini_flagged = True

    if args.update_whitelist and (eff_missing or eff_not_declared):
        # Merge new entries into external whitelist
        wl_not_declared |= set(eff_not_declared)
        wl_missing_core |= set(eff_missing)
        save_external_whitelist(wl_not_declared, wl_missing_core)
        eff_missing = []
        eff_not_declared = []

    duration = time.time() - t_start
    if args.json:
        print(json.dumps({
            'missing_core': eff_missing,
            'not_declared': eff_not_declared,
            'cache_hit': cache_hit,
            'fingerprint': fp,
            'duration_seconds': round(duration, 4),
            'whitelist_file': str(WHITELIST_FILE if WHITELIST_FILE.exists() else ''),
            'files': [str(f) for f in files] if args.list_files else None,
            'gemini_flagged': gemini_flagged,
        }, ensure_ascii=False))
    else:
        print("== IMPORT CHECK ==")
        print(f"Cache: {'HIT' if cache_hit else 'MISS'}")
        print(f"Tempo: {duration:.3f}s")
        if args.list_files:
            print("Arquivos escaneados ({}):".format(len(files)))
            for f in files:
                print("  -", f)
        print("Core declarados não importados (filtrado):", eff_missing)
        print("Imports não declarados no core (filtrado):")
        if eff_not_declared:
            for n in eff_not_declared:
                print("  -", n)
        else:
            print("  <nenhum>")
        if args.update_whitelist:
            print("Whitelist externa atualizada (se havia diferenças).")

    # Determine exit logic
    if not eff_missing and not eff_not_declared:
        return
    if args.warn_only:
        return
    if args.fail_on_missing_only and eff_missing:
        sys.exit(1)
    if args.fail_on_extra_only and eff_not_declared:
        sys.exit(1)
    if not args.fail_on_missing_only and not args.fail_on_extra_only:
        sys.exit(1)


if __name__ == "__main__":  # pragma: no cover
    main()
