import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from './api-proxy.js';

const origin = 'https://overlog-7q5.pages.dev';
const env = { API_ORIGIN: 'https://api.example.com' };
const request = (path = '/api/health', options = {}) => new Request(origin + path, options);

test('encaminha caminho, busca e cookie para origem fixa sem cache', async t => {
  t.mock.method(globalThis, 'fetch', async (outgoing, options) => {
    assert.equal(outgoing.url, 'https://api.example.com/api/exercise-catalog?q=supino&offset=5');
    assert.equal(outgoing.headers.get('cookie'), 'overlog_session=test-token');
    assert.equal(outgoing.headers.get('host'), null);
    assert.equal(options.cache, 'no-store');
    assert.equal(options.redirect, 'manual');
    return Response.json({ count: 1 });
  });
  const response = await onRequest({ request: request('/api/exercise-catalog?q=supino&offset=5', {
    headers: { Cookie: 'overlog_session=test-token', Host: 'untrusted.example' },
  }), env });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { count: 1 });
});

test('preserva corpo e origem real, inclusive origem não autorizada', async t => {
  t.mock.method(globalThis, 'fetch', async outgoing => {
    assert.equal(outgoing.method, 'POST');
    assert.equal(outgoing.headers.get('origin'), 'https://untrusted.example');
    assert.equal(outgoing.headers.get('x-requested-with'), 'OverLog');
    assert.deepEqual(await outgoing.json(), { email: 'test@example.com', password: 'test-only' });
    return Response.json({ detail: 'Origem não autorizada.' }, { status: 403 });
  });
  const response = await onRequest({ request: request('/api/auth/login', {
    method: 'POST', headers: { Origin: 'https://untrusted.example', 'X-Requested-With': 'OverLog', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'test-only' }),
  }), env });
  assert.equal(response.status, 403);
});

test('devolve Set-Cookie seguro sem mudar domínio ou caminho', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 204, headers: {
    'Set-Cookie': 'overlog_session=test; HttpOnly; Secure; SameSite=Strict; Path=/api',
  } }));
  const response = await onRequest({ request: request('/api/auth/logout', { method: 'POST' }), env });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('set-cookie'), 'overlog_session=test; HttpOnly; Secure; SameSite=Strict; Path=/api');
});

test('preserva 429 e Retry-After, sem cache', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ detail: 'Aguarde.' }, {
    status: 429, headers: { 'Retry-After': '42', 'Cache-Control': 'public, max-age=60' },
  }));
  const response = await onRequest({ request: request(), env });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '42');
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('configuração ausente, insegura ou recursiva falha antes do fetch', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch', () => { throw new Error('Não deveria executar'); });
  for (const value of [undefined, 'http://api.example.com', origin, 'https://user:secret@api.example.com',
    'https://api.example.com/api', 'https://api.example.com/?secret=private']) {
    const response = await onRequest({ request: request(), env: { API_ORIGIN: value } });
    assert.equal(response.status, 503);
    assert.ok(!(await response.text()).includes('private'));
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('redirecionamentos não são enviados ao navegador e falhas não vazam detalhes', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.redirect('https://other.example', 307));
  let response = await onRequest({ request: request(), env });
  assert.equal(response.status, 502);
  assert.equal(response.headers.get('location'), null);
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('private database credentials'); });
  response = await onRequest({ request: request(), env });
  assert.equal(response.status, 502);
  assert.ok(!(await response.text()).includes('credentials'));
});

test('rotas do frontend não são tratadas como API', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch', () => { throw new Error('Não deveria executar'); });
  const response = await onRequest({ request: request('/perfil'), env });
  assert.equal(response.status, 404);
  assert.equal(fetchMock.mock.callCount(), 0);
});
