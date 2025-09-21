// Centralized API client with base URL, credentials, JSON handling, refresh flow placeholder.
// Adjust VITE_API_URL in .env files (e.g., VITE_API_URL=http://localhost:5000/api) or leave blank to use relative paths.

export interface ApiError {
  status: number;
  message: string;
  details?: any;
}

export interface FetchOptions extends RequestInit {
  auth?: boolean; // if true, attaches bearer token from localStorage
  raw?: boolean;  // if true, skips json parsing
}

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function getAccessToken(): string | null {
  return localStorage.getItem('access_token') || localStorage.getItem('token');
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) return null;
  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${refresh}` },
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.access_token) {
      localStorage.setItem('access_token', data.access_token);
      return data.access_token;
    }
    return null;
  } catch {
    return null;
  }
}

export async function apiFetch<T=any>(path: string, opts: FetchOptions = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  const headers: Record<string, string> = { 'Accept': 'application/json', ...(opts.headers as any) };
  if (!opts.raw && !(opts.body instanceof FormData)) {
    if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof Blob)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      if (headers['Content-Type'] === 'application/json') {
        opts.body = JSON.stringify(opts.body);
      }
    }
  }
  if (opts.auth) {
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const finalInit: RequestInit = {
    method: opts.method || 'GET',
    ...opts,
    headers,
    credentials: 'include',
  };

  let res = await fetch(url, finalInit);

  // Auto refresh on 401 (access token expired) if refresh token exists
  if (res.status === 401 && opts.auth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, { ...finalInit, headers });
    }
  }

  if (opts.raw) return res as any;

  let data: any = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    const err: ApiError = { status: res.status, message: data?.message || data?.error || res.statusText, details: data };
    throw err;
  }
  return data as T;
}

// Helper endpoints wrappers (extend as needed)
export const AuthAPI = {
  login: (email: string, password: string) => apiFetch('/api/auth/login', { method: 'POST', body: { email, password } }),
  register: (name: string, email: string, password: string) => apiFetch('/api/auth/register', { method: 'POST', body: { name, email, password } }),
  me: () => apiFetch('/api/auth/user/me', { auth: true }),
  refresh: () => apiFetch('/api/auth/refresh', { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('refresh_token')}` } }),
  logout: () => apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {}),
};

// React Query helpers
export const QueryKeys = {
  me: ['auth','me'] as const,
  planoAtual: ['planos','me'] as const,
};

export const queryFetchers = {
  me: () => AuthAPI.me(),
  planoAtual: () => PlanosAPI.ultimo(),
};

export const PlanosAPI = {
  gerar: () => apiFetch('/api/plano-estudo/gerar', { method: 'POST', auth: true }),
  ultimo: () => apiFetch('/api/planos/me', { auth: true }),
};

export const OnboardingAPI = {
  salvar: (payload: any) => apiFetch('/api/onboarding', { method: 'POST', body: payload, auth: true }),
  status: () => apiFetch('/api/onboarding/status/me', { auth: true }),
};

// Generic error boundary util (optional)
export function isApiError(e: unknown): e is ApiError {
  return typeof e === 'object' && !!e && 'status' in e;
}
