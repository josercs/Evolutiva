// Lightweight fetch helper centralizing credentials and headers
export type ApiOptions = RequestInit & { throwOn401?: boolean };

async function apiFetch<T = any>(url: string, opts: ApiOptions = {}): Promise<T> {
  const { throwOn401 = false, headers, ...rest } = opts;
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      ...(headers || {}),
    },
    ...rest,
  });
  if (!res.ok) {
    if (res.status === 401 && !throwOn401) {
      // Allow caller to handle gracefully
      throw new Error('Unauthorized');
    }
    const msg = await res.text().catch(() => 'Request failed');
    throw new Error(msg || `HTTP ${res.status}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return (await res.json()) as T;
  // Fallback to text
  return (await res.text()) as unknown as T;
}

export async function getJSON<T = any>(url: string, opts: ApiOptions = {}) {
  return apiFetch<T>(url, { method: 'GET', ...opts });
}

export async function postJSON<T = any>(url: string, body?: any, opts: ApiOptions = {}) {
  return apiFetch<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...opts,
  });
}

export async function patchJSON<T = any>(url: string, body?: any, opts: ApiOptions = {}) {
  return apiFetch<T>(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...opts,
  });
}

export async function putJSON<T = any>(url: string, body?: any, opts: ApiOptions = {}) {
  return apiFetch<T>(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...opts,
  });
}

export async function deleteJSON<T = any>(url: string, opts: ApiOptions = {}) {
  return apiFetch<T>(url, { method: 'DELETE', ...opts });
}
