/**
 * API client — fetch wrapper con seguridad por defecto.
 *
 * Consideraciones de seguridad:
 * - credentials: 'include'  → las cookies HttpOnly se envían en cada request
 * - X-Requested-With        → header custom que CORS impide a páginas externas setear,
 *                             sirve como primera línea de defensa contra CSRF
 * - Los tokens/sesiones NUNCA se guardan en localStorage o sessionStorage
 *
 * Refresh automático:
 * - ACCESS_TOKEN dura 5 min. Si expira, se llama POST /auth/RefreshToken y se reintenta.
 * - Si el refresh también falla (REFRESH_TOKEN expirado), se lanza el error al caller.
 */

const BASE_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '');

/** Lee el token CSRF desde una cookie (Double Submit Cookie pattern). */
function getCsrfToken(): string | null {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrftoken='));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

/** Error tipado que incluye el HTTP status code. */
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Intenta renovar el ACCESS_TOKEN usando el REFRESH_TOKEN en cookie. */
async function tryRefreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/Aunth/RefreshToken`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const csrfToken = getCsrfToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers,
    });
  } catch {
    throw new ApiError('Sin conexión. Verifica tu red e intenta de nuevo.', 0);
  }

  // 401 — intentar refresh una sola vez
  if (response.status === 401 && !isRetry) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return request<T>(path, options, true);
    }
  }

  // 204 No Content — respuesta válida sin body
  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    let message = 'Error del servidor. Intenta de nuevo.';
    try {
      const body = await response.json();
      message =
        (body as { message?: string; detail?: string; error?: string }).message ??
        (body as { detail?: string }).detail ??
        (body as { error?: string }).error ??
        message;
    } catch {
      // body no es JSON — usar mensaje por defecto
    }
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { method: 'GET', ...options }),

  post: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),

  put: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),

  patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { method: 'DELETE', ...options }),
};
