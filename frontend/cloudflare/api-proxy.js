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
    // Construct an outbound request explicitly. Cloning the incoming Pages
    // Request also carries Cloudflare-specific request metadata to the fetch.
    const headers = new Headers(request.headers);
    for (const name of ['host', 'connection', 'keep-alive', 'transfer-encoding',
                        'proxy-authorization', 'proxy-authenticate']) {
      headers.delete(name);
    }
    headers.set('Host', target.host);
    // Origin, cookies and the CSRF header remain exactly as sent by the browser.
    const init = { method: request.method, headers, redirect: 'manual' };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = request.body;
      init.duplex = 'half';
    }
    const upstream = new Request(target.toString(), init);
    const response = await fetch(upstream, {
      redirect: 'manual', cache: 'no-store', signal: controller.signal,
    });
    // Never follow redirects with session cookies or password-bearing bodies.
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      return failure(502, 'A API respondeu com um redirecionamento inesperado.');
    }
    // Cloudflare origin/DNS errors can be HTTP responses (e.g. 530), not
    // rejected fetches. Do not pass their HTML error pages to the JSON client.
    const json = /(?:\/|\+)json(?:;|$)/i.test(response.headers.get('content-type') || '');
    if (response.status !== 204 && request.method !== 'HEAD' && !json) {
      console.warn('API returned a non-JSON response', { status: response.status, host: target.hostname });
      await response.body?.cancel();
      return failure(502, 'A API está temporariamente indisponível. Tente novamente.');
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
