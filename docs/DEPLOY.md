# Execução e deploy do OverLog

## Desenvolvimento

Na raiz, copie `.env.example` para `.env`, configure uma chave JWT aleatória de
pelo menos 32 caracteres e execute `docker compose up --build -d`.
O ambiente existente usa a porta 5174; uma cópia nova do exemplo usa 5173.
A documentação da API fica em http://localhost:8000/docs.

```bash
python3 -c 'import secrets; print(secrets.token_urlsafe(48))'
docker compose ps
docker compose logs --tail=100 backend
```

O frontend de desenvolvimento continua usando Vite. Os dados são preservados no
volume `postgres_data`; `docker compose down` não remove esse volume.

## Produção

A configuração `compose.production.yaml` é independente da configuração de
desenvolvimento. Usa frontend estático servido por Nginx sem privilégios, API sem
privilégios e PostgreSQL em rede interna. Somente `127.0.0.1:8080` é publicado.
A API e o banco não expõem portas no host.

Copie `.env.production.example` para `.env.production` e preencha os valores.
O arquivo real fica **fora do controle de versão**:

```dotenv
POSTGRES_DB=overlog
POSTGRES_USER=overlog
POSTGRES_PASSWORD=preencha-com-uma-senha-aleatoria-exclusiva
JWT_SECRET_KEY=preencha-com-uma-chave-aleatoria-de-pelo-menos-32-caracteres
APP_ORIGIN=https://treinos.seu-dominio.com
PRODUCTION_PORT=8080
```

Substitua os exemplos por valores reais. `APP_ORIGIN` não deve terminar com `/`.
Instale um proxy HTTPS no host (por exemplo, Caddy ou Nginx com certificado válido)
apontando o domínio para `127.0.0.1:8080`. Preserve `Host` e `Origin`. O navegador
usa `/api` na mesma origem. A stack de produção força cookies `Secure`, portanto
login exige HTTPS; acessar diretamente a porta HTTP não valida o fluxo autenticado.

```bash
docker compose -p overlog-production --env-file .env.production -f compose.production.yaml config --quiet
docker compose -p overlog-production --env-file .env.production -f compose.production.yaml up --build -d --wait
docker compose -p overlog-production --env-file .env.production -f compose.production.yaml exec backend alembic current
curl --fail https://treinos.seu-dominio.com/api/health
```

Não foi publicado um domínio nesta entrega. O proxy TLS, o certificado e o DNS
precisam ser configurados no servidor escolhido. A imagem de produção foi testada
localmente por HTTP na stack descartável; o certificado HTTPS público não foi testado.

### Proteções e limites

- Nginx serve assets com hash e cache longo, aplica compressão, impede frames e
  limita scripts, estilos e conexões à própria origem por CSP. Não há fontes remotas.
- Login e cadastro têm limite de 10 requisições/minuto por endereço visto pelo
  Nginx, com burst de 10; excesso retorna 429 em JSON. Um proxy à frente pode fazer
  vários usuários compartilharem esse endereço. Configure `real_ip` somente para
  o proxy/rede de confiança do seu servidor antes de usar esse limite em escala;
  nunca confie indiscriminadamente em `X-Forwarded-For` enviado pelo cliente.
- POST, PUT e DELETE exigem o cabeçalho de segurança e rejeitam `Origin` informado
  que não conste na configuração permitida. Toda leitura de dados depende do JWT.
- Respostas da API usam `Cache-Control: no-store`. Falhas de validação não repetem
  senhas ou corpos de requisição; falhas do banco retornam mensagem sanitizada.
- O frontend encerra chamadas que excedem 15 segundos. Salvamentos têm identificador
  idempotente para reenviar uma alteração cuja resposta se perdeu.
- A limitação de tentativas está no Nginx da imagem estática. O Vite de desenvolvimento
  e acessos diretos à API não passam por ela; não exponha esses serviços em produção.

### Atualização, backup e restauração

Antes de atualizar, guarde um backup do banco e o identificador da versão em uso:

```bash
git rev-parse HEAD
umask 077
docker compose -p overlog-production --env-file .env.production -f compose.production.yaml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > overlog-backup.dump
```

O arquivo contém dados privados: guarde-o com acesso restrito, fora do repositório.
Teste a restauração em uma instância separada antes de depender de um backup.
Não restaure por cima do banco ativo. Em um banco de destino vazio, com a API parada:

```bash
docker compose -p overlog-restoration --env-file .env.restoration -f compose.production.yaml up -d db
docker compose -p overlog-restoration --env-file .env.restoration -f compose.production.yaml exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges' < overlog-backup.dump
```

O comando inicia somente o banco do projeto de restauração.
Use outro projeto, volume e porta no destino. As migrations são executadas na
inicialização da API. Atualize com `up --build -d --wait` e verifique health check,
login, retomada e histórico. Se uma atualização falhar, examine os logs e o estado
da migration antes de trocar a versão. Uma imagem antiga só deve voltar a ser usada
se for compatível com o schema; restauração deve ocorrer em ambiente separado.

Trocar `JWT_SECRET_KEY` encerra as sessões existentes. Trocar variáveis do PostgreSQL
não altera automaticamente os usuários/senhas de um volume já inicializado.

## Testes reproduzíveis

As versões Python de execução ficam em `backend/requirements.lock`; o frontend usa
`package-lock.json`. Os testes isolados de backend usam SQLite com chaves estrangeiras.
O teste completo usa PostgreSQL real, Nginx e as quatro migrations em uma stack separada.

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.lock -e './backend[test]'
.venv/bin/python -m pytest backend/tests -q
cd frontend
npm ci
npx playwright install chromium
npm run test:e2e
npm run build
cd ..
docker compose -p overlog-integration -f compose.test.yaml up --build -d --wait
cd frontend
npm run test:integration
cd ..
docker compose -p overlog-integration -f compose.test.yaml down
```

Se o host não tiver `venv`, execute os testes dentro de um container:

```bash
docker compose -p overlog-integration -f compose.test.yaml run --rm --no-deps -v "$PWD/backend/tests:/app/tests:ro" backend sh -c 'python -m venv --system-site-packages /tmp/tests && /tmp/tests/bin/pip install ".[test]" --quiet && /tmp/tests/bin/python -m pytest tests -q'
```

O banco de integração usa `tmpfs`: os dados descartáveis somem ao remover o container.
Esses testes criam usuários e treinos. Execute-os **somente** nessa stack, nunca em
produção ou no seu banco de desenvolvimento. A porta padrão de teste é 5180;
se mudar `TEST_FRONTEND_PORT`, ajuste também `OVERLOG_BASE_URL` no frontend.

A CI em `.github/workflows/ci.yaml` executa testes de backend, frontend e integração.
Os perfis de navegador cobrem desktop e viewport/touch mobile em Chromium. Isso
não substitui uma validação física em Android/iOS nem cobre diferenças do Safari.


## Resultado da verificação da Sprint 6

- 77 testes de backend e 28 testes de interface (desktop/mobile) aprovados.
- Dois testes completos na imagem estática, com PostgreSQL real, aprovados.
- `npm audit` e `pip-audit`: nenhuma vulnerabilidade conhecida encontrada nesta execução.
- Limite de autenticação retornou 429 com `Retry-After`; API interrompida na stack
  descartável retornou 503 em JSON pelo proxy e voltou após reiniciar o serviço.
- Backup restaurado em um banco novo, com registros de sessão conferidos.
- Todas as migrations aplicadas, revertidas até `base` e reaplicadas em banco vazio;
  `alembic check` não apontou divergências. Isso não garante rollback sem perda de
  dados em produção: o teste de reversão usou exclusivamente um banco descartável.
- Execução sem root confirmada para API e frontend estático.

Os testes foram executados localmente. A CI hospedada e o HTTPS público ainda
não foram executados porque não houve push ou publicação externa nesta entrega.

Referências de configuração: [limite de requisições do Nginx](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html), [setup-node](https://github.com/actions/setup-node) e [setup-python](https://github.com/actions/setup-python).
