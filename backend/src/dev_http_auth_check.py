import requests
import sys
import time

BACKEND_BASE = "http://localhost:5000"
FRONTEND_BASE = "http://localhost:5173"
ORIGIN = "http://localhost:5173"
TEST_EMAIL = "devcheck@example.com"
TEST_PASSWORD = "senhadev"


def ping(url: str) -> bool:
    try:
        r = requests.get(url, timeout=2)
        return r.status_code < 500
    except Exception:
        return False


def show_headers(label: str, r: requests.Response):
    print(f"\n[{label}] {r.request.method} {r.url} -> {r.status_code}")
    print("Headers:")
    for k, v in r.headers.items():
        if k.lower() == 'set-cookie':
            print(f"  {k}: {v}")
        else:
            print(f"  {k}: {v}")
    try:
        print("Body:", r.json())
    except Exception:
        print("Body(raw):", (r.text or "")[:200])


def run_flow(base: str, label: str):
    s = requests.Session()

    print(f"\n=== Testing via {label} ({base}) ===")

    # Preflight (optional demonstration)
    try:
        pre = s.options(
            f"{base}/api/auth/login",
            headers={
                "Origin": ORIGIN,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type, x-requested-with",
            },
            timeout=5,
        )
        show_headers("Preflight /api/auth/login", pre)
    except Exception as e:
        print("Preflight error:", e)

    r = s.post(
        f"{base}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        headers={
            "Origin": ORIGIN,
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/json",
        },
        timeout=10,
    )
    show_headers("Login", r)

    if not (200 <= r.status_code < 300):
        print("Login failed; trying legacy /api/login ...")
        r = s.post(
            f"{base}/api/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            headers={
                "Origin": ORIGIN,
                "X-Requested-With": "XMLHttpRequest",
                "Content-Type": "application/json",
            },
            timeout=10,
        )
        show_headers("Login (legacy)", r)

    # Check that session cookie exists in the jar
    cookie_names = [c.name for c in s.cookies]
    print("Cookie jar:", cookie_names)
    has_session = any(name.lower().startswith("session") for name in cookie_names)
    print("Has session cookie:", has_session)

    r_me = s.get(f"{base}/api/user/me", headers={"Origin": ORIGIN, "X-Requested-With": "XMLHttpRequest"}, timeout=10)
    show_headers("/api/user/me", r_me)

    r_me2 = s.get(f"{base}/api/users/me", headers={"Origin": ORIGIN, "X-Requested-With": "XMLHttpRequest"}, timeout=10)
    show_headers("/api/users/me", r_me2)

    r_logout = s.post(f"{base}/api/auth/logout", headers={"Origin": ORIGIN, "X-Requested-With": "XMLHttpRequest"}, timeout=10)
    show_headers("Logout", r_logout)

    r_me_after = s.get(f"{base}/api/user/me", headers={"Origin": ORIGIN, "X-Requested-With": "XMLHttpRequest"}, timeout=10)
    show_headers("/api/user/me after logout", r_me_after)


if __name__ == "__main__":
    print("Checking backend health ...")
    if not ping(f"{BACKEND_BASE}/api/health"):
        print("Backend not responding at", BACKEND_BASE)
        sys.exit(2)
    run_flow(BACKEND_BASE, "backend:5000")

    print("\nChecking dev server (Vite) ...")
    if ping(FRONTEND_BASE):
        run_flow(FRONTEND_BASE, "vite proxy:5173")
    else:
        print("Vite dev server not detected at", FRONTEND_BASE, "(skipping proxy test)")
