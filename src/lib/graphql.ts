/**
 * Cliente GraphQL — POST a VITE_GRAPH_URL con cookies HttpOnly.
 * Refresh automático: si devuelve 401, renueva el ACCESS_TOKEN y reintenta una vez.
 */

const GRAPH_URL = ((import.meta.env.VITE_GQL_URL as string | undefined) ?? '').replace(/\/$/, '');
import { ApiError } from './api';
import { tryRefreshToken } from './auth-refresh';

export async function gql<T>(query: string, variables?: Record<string, unknown>, isRetry = false): Promise<T> {
  let response: Response;
  try {
    response = await fetch(GRAPH_URL, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new ApiError('Sin conexión. Verifica tu red e intenta de nuevo.', 0);
  }

  // 401 — intentar refresh una sola vez
  if (response.status === 401 && !isRetry) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return gql<T>(query, variables, true);
    }
    // Refresh también falló → forzar logout global
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }

  if (!response.ok) {
    throw new ApiError('Error del servidor GraphQL.', response.status);
  }

  const json = (await response.json()) as { data?: T; errors?: { message: string; extensions?: { code?: string } }[] };

  // GraphQL puede devolver 200 pero con errores en el body
  if (json.errors?.length) {
    const firstError = json.errors[0];
    const code = firstError.extensions?.code;
    const msg = firstError.message.toLowerCase();
    const isUnauthorized = code === 'AUTH_NOT_AUTHORIZED' || msg.includes('autorizado') || msg.includes('unauthorized') || msg.includes('not authorized') || msg.includes('authorized');

    if (isUnauthorized && !isRetry) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        return gql<T>(query, variables, true);
      }
    }

    if (isUnauthorized) {
      // Refresh también falló → forzar logout global
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      throw new ApiError(firstError.message, 401);
    }

    // Error no-auth: si hay data parcial la usamos (spec GraphQL permite errors + data juntos).
    // Solo tiramos excepción si no hay data en absoluto.
    if (json.data != null) {
      console.warn('[gql] Errores parciales en la respuesta GraphQL:', json.errors);
      return json.data as T;
    }

    throw new ApiError(firstError.message, 400);
  }

  return json.data as T;
}