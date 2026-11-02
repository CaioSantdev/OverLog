# Frontend no Pages, API na Oracle e banco Supabase

Este é o fluxo do deploy separado. `compose.cloud.yaml` descreve outra opção,
com frontend também na Oracle. Preserve o `compose.oracle.yaml` existente na VM
e seu `.env` privado; não os substitua automaticamente pelo Compose anterior.

## Estado confirmado em 02/11/2026

Frontend: `https://overlog-7q5.pages.dev`, root directory `frontend`, branch `master`,
build `npm run build`, output `dist`. O SSH da Oracle foi verificado. O Compose tem
somente backend com porta `127.0.0.1:8000`, Uvicorn explícito e Supabase externo no
schema `overlog`. A API não está usando o bootstrap de provisionamento local.
O Quick Tunnel do relatório é uma origem temporária de teste, não um hostname fixo.

## Proxy do Pages

A Function `frontend/functions/api/[[path]].js` encaminha `/api/*` à variável de
**runtime** `API_ORIGIN`. Exemplo: `https://seu-subdominio.duckdns.org`, sem `/api`.
Configure em Workers & Pages → projeto → Settings → Variables and Secrets,
ambiente Production, e faça novo deploy. Não use variável `VITE_*` para esse valor.
O diretório `functions` deve ficar na raiz `frontend`, fora de `dist`; o Pages
compila as Functions automaticamente na integração Git. Confirme o nome dos menus
na versão atual do painel. Não configure previews para usar o banco de produção.

O navegador continua usando `/api` no Pages e cookies first-party. A Function
preserva Cookie, Set-Cookie, Origin e X-Requested-With, sem fabricar uma origem
permitida para contornar CSRF. A API deve manter
`CORS_ORIGINS=["https://overlog-7q5.pages.dev"]` e cookies Secure, HttpOnly e
SameSite=Strict. Não é preciso migrar tokens para localStorage ou cookies de terceiros.

O proxy usa uma origem fixa, ignora destinos indicados por clientes, não segue
redirecionamentos com cookies/senhas e sanitiza falhas. Respostas de API recebem
no-store no navegador e na CDN. `_routes.json` limita invocações às rotas da API,
preservando o atendimento estático. Functions consomem a franquia de Workers/Pages
Functions; acompanhe os limites da conta gratuita. Não crie redirects 301/302 de
`/api` para a Oracle: eles mudariam a origem e não substituem o reverse proxy.

Sem API_ORIGIN a Function responde 503 controlado. O Quick Tunnel pode ser usado
apenas em testes, com atualização do valor quando mudar. Não o trate como produção.

## Endereço HTTPS permanente sem comprar domínio

Uma opção gratuita é um subdomínio DuckDNS apontado para o IP público atual da VM.
O hostname fica associado à conta enquanto for mantido, ao contrário do Quick
Tunnel. O provedor de DNS passa a ser uma dependência adicional; não há garantia
de disponibilidade nem de permanência do IP efêmero da Oracle. Se o IP mudar,
atualize o registro e valide novamente. Se já houver domínio próprio, um Tunnel
nomeado com o DNS correspondente também é opção; pages.dev não é uma zona própria.

Na VM, Nginx ou Caddy atende esse hostname com certificado público Let's Encrypt
e renovação automática persistente. O reverse proxy recebe 443 e encaminha para
127.0.0.1:8000; a API permanece fechada externamente na porta 8000. Abra 80 para
validação HTTP-01/redirect e 443 no host e na Security List/NSG da Oracle. Preserve
as regras de acesso SSH. Use o hostname real escolhido e confirme DNS, rotas e
firewall antes de pedir o certificado. Não execute comandos com domínio de exemplo.
Verifique o serviço no boot, renovação e expiração. Não faça fallback para HTTP nem
aceite certificados inválidos. Workers precisam de hostname para fetch, não IP direto.

## Segurança da configuração existente

O relatório informa exposição anterior de credenciais. Antes de abrir o acesso a
usuários reais, rotacione a senha principal pelo painel Supabase, a senha do login
restrito e a JWT_SECRET_KEY, atualizando os arquivos privados correspondentes.
A troca da chave encerra sessões antigas; preserve a nova chave entre reinícios.
Não publique senhas em SQL compartilhado, Git, comandos ou logs.

Remova MIGRATION_POSTGRES_USER e MIGRATION_POSTGRES_PASSWORD do environment do
serviço backend; elas não precisam entrar no container HTTP. O Compose atual ainda
as injeta. Migrações são manutenção separada com schema overlog. Não execute o CMD
padrão do Dockerfile: `app.db.bootstrap` provisiona local/public. Preserve o comando
Uvicorn explícito do Compose Oracle e não reexecute criação de roles já existentes.

A VM está com POSTGRES_SSLMODE=require, que cifra sem validar a identidade do banco.
Antes de produção, restaure verify-full com POSTGRES_SSLROOTCERT apontando ao CA
Supabase montado somente para leitura. O teste anterior com esse CA funcionou.
Não imprima docker compose config completo ou .env; use config --quiet,
config --services, ps e campos não secretos selecionados.

## Validação

Após cada comando interativo, confira a saída antes do seguinte. Valide health pela
origem HTTPS estável e pelo Pages: ambos devem retornar JSON, nunca index.html.
Teste cadastro/login, cookie HttpOnly/Secure/Path=/api, plano, séries, salvamento,
recarga, finalização, histórico, logout e isolamento entre contas. Reinicie serviços
e confira DNS, TLS e banco. Mantenha backups privados com restauração de teste.

Execute `npm run test:proxy --prefix frontend` e `npm run build --prefix frontend`
para validar localmente. A Function, o hostname permanente, a rotação e os testes
públicos ainda precisam ser publicados/concluídos. Build local não prova deploy.

Referências: [Pages Functions](https://developers.cloudflare.com/pages/functions/get-started/),
[roteamento](https://developers.cloudflare.com/pages/functions/routing/),
[limitações de fetch em Workers](https://developers.cloudflare.com/workers/platform/known-issues/)
e [DuckDNS](https://www.duckdns.org/about.jsp).

## HTTPS instalado na Oracle — 02/11/2026

Origem permanente configurada: `https://overlog-api-caio.duckdns.org`.
O registro A aponta para `159.112.178.203`. O Caddy 2.11.7 foi instalado pelo
repositório oficial, com certificado público e manutenção automática de TLS.
Caddy e a regra de firewall estão habilitados no systemd. Nenhuma credencial do
banco, chave JWT ou token DuckDNS foi inserida nestes arquivos versionados.

Arquivos de referência em `deploy/oracle`:

- `Caddyfile`: proxy de `/api` e `/api/*` para 127.0.0.1:8000, com cabeçalhos de
  segurança e 404 para outros caminhos. Usa a variável API_HOSTNAME.
- `overlog-web-firewall`: regra idempotente de INPUT liberando somente TCP 80/443;
  não remove nem altera regras de SSH/Docker. A regra é inserida antes do REJECT
  já existente na imagem Ubuntu da Oracle.
- `overlog-web-firewall.service`: aplica essa regra no boot, antes do Caddy.

Na VM, o Caddyfile fica em `/etc/caddy/Caddyfile` e o arquivo original foi guardado
em `/etc/caddy/Caddyfile.before-overlog`. O drop-in
`/etc/systemd/system/caddy.service.d/overlog.conf` define
`Environment=API_HOSTNAME=overlog-api-caio.duckdns.org`. O helper de firewall foi
instalado em `/usr/local/sbin/overlog-web-firewall`, modo 755, e sua unidade em
`/etc/systemd/system/overlog-web-firewall.service`. O CA/certificado e chave privada
HTTPS são gerenciados pelo Caddy em seu diretório privado; não os coloque no Git.

Validação externa, sem ignorar certificados: `/api/health` respondeu HTTP/2 200 e
`{"status":"ok","database":"connected"}`. HTTP redirecionou para HTTPS com 308;
`/api/workouts` sem cookie respondeu 401. A API continuou escutando apenas em
127.0.0.1:8000. Foram confirmados `is-active` e `is-enabled` dos dois serviços.
Não foi feito reboot da VM nem aguardada uma renovação real do certificado.

Ainda falta publicar a Function do Pages e configurar, no runtime Production,
`API_ORIGIN=https://overlog-api-caio.duckdns.org`. A rotação de credenciais e a
correção do SSL do banco descritas acima também continuam pendentes; a instalação
do HTTPS externo não substitui essas etapas. O teste autenticado via Pages ainda
não foi executado. O Quick Tunnel existente foi preservado durante a configuração.

Para verificar o Caddyfile após alterações na VM, execute com a variável definida:
`sudo env API_HOSTNAME=overlog-api-caio.duckdns.org caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile`.
Após validar, use reload do serviço. O domínio depende da conta DuckDNS e do IP da
VM; mudança de IP exige atualizar o DNS antes de verificar o certificado novamente.
