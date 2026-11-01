export type User = { id: string; name: string; email: string; created_at: string };
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function api<T>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST'): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`/api${path}`, {
      signal: controller.signal,
      credentials: 'same-origin',
      method,
      headers: method === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-Requested-With': 'OverLog' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 401 && path !== '/auth/me') window.dispatchEvent(new Event('overlog:unauthorized'));
    if (response.status === 204) return undefined as T;
    let data: unknown;
    try { data = await response.json(); }
    catch (error) {
      if (controller.signal.aborted) throw error;
      throw new ApiError(response.status || 502, 'O serviço respondeu de forma inesperada. Tente novamente.');
    }
    if (!response.ok) {
      const detail = data && typeof data === 'object' && 'detail' in data ? data.detail : null;
      throw new ApiError(response.status, typeof detail === 'string' ? detail : response.status >= 500 ? 'Serviço temporariamente indisponível. Tente novamente.' : 'Confira os campos e tente novamente.');
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, controller.signal.aborted ? 'A conexão demorou demais. Tente novamente; seus registros pendentes serão reenviados.' : 'Não foi possível conectar. Verifique sua conexão e tente novamente.');
  } finally { window.clearTimeout(timeout); }
}
