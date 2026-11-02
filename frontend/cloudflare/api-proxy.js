// Pages Function: the browser keeps first-party /api cookies; only this proxy
// knows the backend origin. Configure API_ORIGIN in Pages runtime settings.
const privateHeaders = {
  'Cache-Control': 'no-store',
  'CDN-Cache-Control': 'no-store',
  'Cloudflare-CDN-Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
};

function failure(status, message) {
  return Response.json({ detail: message }, { status, headers: privateHeaders });
}

export async function onRequest({ request, env }) {
  const incoming = new URL(request.url);
  if (incoming.pathname !== '/api' && !incoming.pathname.startsWith('/api/')) {
    return failure(404, 'Rota não encontrada.');
  }
  let target;
  try {
    target = new URL(env.API_ORIGIN);
    if (target.protocol !== 'https:' || target.username || target.password ||
        target.pathname !== '/' || target.search || target.hash || target.origin === incoming.origin) {
      throw new Error('Invalid origin');
    }
  } catch {
    return failure(503, 'A conexão com a API ainda não foi configurada.');
  }
  target.pathname = incoming.pathname;
  target.search = incoming.search;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const upstream = new Request(target, request);
    // Cookies, Origin and X-Requested-With are preserved. Do not manufacture an
    // allowed Origin: the backend must reject cross-site writes itself.
    for (const name of ['host', 'connection', 'keep-alive', 'transfer-encoding',
                        'proxy-authorization', 'proxy-authenticate']) {
      upstream.headers.delete(name);
    }
    const response = await fetch(upstream, {
      redirect: 'manual', cache: 'no-store', signal: controller.signal,
    });
    // Never follow redirects with session cookies or password-bearing bodies.
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      return failure(502, 'A API respondeu com um redirecionamento inesperado.');
    }
    const result = new Response(response.body, response);
    for (const [name, value] of Object.entries(privateHeaders)) result.headers.set(name, value);
    return result;
  } catch {
    return failure(controller.signal.aborted ? 504 : 502,
      'Não foi possível acessar a API. Tente novamente.');
  } finally {
    clearTimeout(timeout);
  }
}
