import type { ApiFailure, ApiSuccess, Role } from '@smartschool/shared';

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1';

export interface ListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  schoolId: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  isActive?: boolean;
  lastLoginAt?: string | null;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

let refreshPromise: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        if (!res.ok) return null;
        const body = (await res.json()) as ApiSuccess<{ accessToken: string }>;
        if (body.success && body.data?.accessToken) {
          accessToken = body.data.accessToken;
          return accessToken;
        }
        return null;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export function buildQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

async function send(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<ApiSuccess<unknown> | ApiFailure> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: 'include' });

  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    const token = await refreshAccessToken();
    if (token) return send(path, init, false);
    onUnauthorized?.();
  }

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    const failure = (body ?? null) as ApiFailure | null;
    throw new ApiError(
      failure?.error?.message ?? `Request failed with status ${res.status}`,
      res.status,
      failure?.error?.code,
      failure?.error?.details,
    );
  }

  return (body ?? { success: true, data: null }) as ApiSuccess<unknown> | ApiFailure;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const body = await send(path, init);
  if (!body.success) throw new ApiError(body.error.message, 400, body.error.code);
  return body.data as T;
}

export async function apiList<T>(
  path: string,
  params?: Record<string, unknown>,
): Promise<{ items: T[]; meta: ListMeta }> {
  const body = await send(`${path}${buildQuery(params)}`);
  if (!body.success) throw new ApiError(body.error.message, 400, body.error.code);
  const meta = body.meta as Partial<ListMeta> | undefined;
  return {
    items: (body.data as T[]) ?? [],
    meta: {
      total: meta?.total ?? 0,
      page: meta?.page ?? 1,
      limit: meta?.limit ?? 20,
      totalPages: meta?.totalPages ?? 1,
    },
  };
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, payload?: unknown) =>
    apiRequest<T>(path, {
      method: 'POST',
      body: payload === undefined ? undefined : JSON.stringify(payload),
    }),
  patch: <T>(path: string, payload?: unknown) =>
    apiRequest<T>(path, {
      method: 'PATCH',
      body: payload === undefined ? undefined : JSON.stringify(payload),
    }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
  list: apiList,
};

export type LoginPortal = 'admin' | 'teacher' | 'parent';

const LOGIN_ENDPOINTS: Record<LoginPortal, string> = {
  admin: '/auth/login/admin',
  teacher: '/auth/login/teacher',
  parent: '/auth/login/parent',
};

export async function loginRequest(
  email: string,
  password: string,
  portal: LoginPortal = 'admin',
): Promise<SessionUser> {
  const data = await apiRequest<{ user: SessionUser; accessToken: string }>(
    LOGIN_ENDPOINTS[portal],
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
  );
  setAccessToken(data.accessToken);
  return data.user;
}

export async function restoreSession(): Promise<SessionUser | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!res.ok) return null;
    const body = (await res.json()) as ApiSuccess<{ user: SessionUser; accessToken: string }>;
    if (body.success && body.data?.accessToken) {
      setAccessToken(body.data.accessToken);
      return body.data.user;
    }
    return null;
  } catch {
    return null;
  }
}

export async function logoutRequest(): Promise<void> {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } catch {
    // ignore network errors on logout
  } finally {
    setAccessToken(null);
  }
}
