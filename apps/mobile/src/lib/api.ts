import type { ApiFailure, ApiSuccess, Role } from '@smartschool/shared';

/**
 * Base URL of the SmartSchool REST API.
 *
 * In the web app this comes from Vite's `VITE_API_BASE` variable. Expo exposes
 * environment variables with the `EXPO_PUBLIC_` prefix, read through
 * `process.env`, so the mobile app uses `EXPO_PUBLIC_API_BASE` instead.
 */
const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? '/api/v1';

/**
 * How long the startup session restore may block before we give up and show the
 * sign-in flow. Keeps an unreachable/unresponsive API from leaving the user on
 * a loading screen.
 */
const SESSION_RESTORE_TIMEOUT_MS = 8000;

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

/**
 * Upper bound on a single API call.
 *
 * A phone is not guaranteed to reach the backend (wrong LAN IP, off Wi-Fi,
 * backend stopped). Without a timeout the underlying `fetch` never settles, so
 * the sign-in button stayed on "Signing in…" forever and the screen could not
 * recover. Aborting the request turns an unreachable host into an ordinary,
 * catchable error the caller can show.
 */
const REQUEST_TIMEOUT_MS = 20_000;

/** True when a fetch failed because we aborted it (timeout or caller cancel). */
function wasAborted(error: unknown): boolean {
  return (
    error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')
  );
}

/**
 * Translates a low-level fetch failure into a friendly, catchable `ApiError`
 * so screens such as the login form can explain what went wrong instead of
 * spinning indefinitely. `status: 0` marks a transport-level failure (no HTTP
 * response was received), which is distinct from a 4xx/5xx API error.
 */
function toNetworkError(error: unknown): ApiError {
  if (wasAborted(error)) {
    return new ApiError(
      `The server took too long to respond (${API_BASE}). Make sure the phone is on the same Wi-Fi as the computer and that the backend allows connections.`,
      0,
      'REQUEST_TIMEOUT',
    );
  }
  return new ApiError(
    `Cannot reach the SmartSchool server at ${API_BASE}. Make sure the phone is on the same Wi-Fi as the computer.`,
    0,
    'NETWORK_ERROR',
  );
}

/** `fetch` bounded by a timeout, forwarding any caller-supplied abort signal. */
async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const external = init.signal ?? null;
  const forwardAbort = () => controller.abort();
  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener('abort', forwardAbort);
  }
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    external?.removeEventListener('abort', forwardAbort);
  }
}

let refreshPromise: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetchWithTimeout(`${API_BASE}/auth/refresh`, {
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

  let res: Response;
  try {
    res = await fetchWithTimeout(`${API_BASE}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    });
  } catch (error) {
    // Timeout / offline: surface a readable error instead of hanging forever.
    throw toNetworkError(error);
  }

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
    // Bound the startup request: on a device that cannot reach the API the
    // fetch would otherwise block the app on the loading screen for a long
    // time. A short timeout lets the Welcome/Login screen appear promptly.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SESSION_RESTORE_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
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
