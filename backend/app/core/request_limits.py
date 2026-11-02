import asyncio

from starlette.responses import JSONResponse


class RequestLimitsMiddleware:
    """Check actual bytes, including chunked requests, before JSON is parsed."""
    def __init__(self, app, max_bytes=2 * 1024 * 1024, timeout=15):
        self.app, self.max_bytes, self.timeout = app, max_bytes, timeout

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            return await self.app(scope, receive, send)
        headers = dict(scope.get('headers', []))
        try:
            length = int(headers.get(b'content-length', b'0'))
            if length < 0:
                raise ValueError
        except ValueError:
            return await JSONResponse({'detail': 'Tamanho de requisição inválido.'}, 400)(scope, receive, send)
        if length > self.max_bytes:
            return await JSONResponse({'detail': 'Requisição muito grande.'}, 413)(scope, receive, send)
        chunks, size = [], 0
        try:
            async with asyncio.timeout(self.timeout):
                while True:
                    message = await receive()
                    if message['type'] == 'http.disconnect':
                        return
                    chunk = message.get('body', b'')
                    size += len(chunk)
                    if size > self.max_bytes:
                        return await JSONResponse({'detail': 'Requisição muito grande.'}, 413)(scope, receive, send)
                    chunks.append(chunk)
                    if not message.get('more_body', False):
                        break
        except TimeoutError:
            return await JSONResponse({'detail': 'Tempo de envio excedido.'}, 408)(scope, receive, send)
        delivered = False

        async def replay():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {'type': 'http.request', 'body': b''.join(chunks), 'more_body': False}
            return await receive()

        await self.app(scope, replay, send)
