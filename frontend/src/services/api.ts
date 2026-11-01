export type User = { id: string; name: string; email: string; created_at: string };
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      credentials: 'same-origin',
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-Requested-With': 'OverLog' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch { throw new ApiError(0, 'Não foi possível conectar. Verifique sua conexão e tente novamente.'); }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(response.status, typeof data?.detail === 'string' ? data.detail : 'Confira os campos e tente novamente.');
  }
  return response.status === 204 ? undefined as T : response.json();
}
