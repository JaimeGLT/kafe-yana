const BASE_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '');

let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/Aunth/RefreshToken`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (res.ok) {
      try {
        const userData = await res.clone().json() as { nombre?: string; email?: string; rol?: string };
        if (userData.nombre && userData.rol) {
          window.dispatchEvent(new CustomEvent('auth:user-refreshed', { detail: userData }));
        }
      } catch {
        // body no parseable — ignorar
      }
    }
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Singleton refresh: si hay un refresh en vuelo, todos los callers esperan
 * el mismo promise en vez de disparar peticiones concurrentes al backend.
 * Evita race condition con refresh token rotation.
 */
export function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
  return refreshPromise;
}
