# Segurança operacional

## Limites persistidos

A migração `0007` cria contadores no PostgreSQL. Upserts atômicos funcionam entre
processos da API e os limites sobrevivem a reinícios. A janela começa na primeira
requisição e não se prolonga a cada tentativa bloqueada. Limpeza probabilística
remove até 500 registros expirados por passagem. Os identificadores usam HMAC-SHA256
com a chave JWT; alterar a chave invalida tokens e troca as chaves dos contadores.

| Variável da API | Padrão | Janela / identidade |
| --- | --- | --- |
| RATE_LIMIT_AUTH | 30 | 60 s / endereço, login e cadastro juntos |
| RATE_LIMIT_REGISTER | 10 | 600 s / endereço |
| RATE_LIMIT_LOGIN_ACCOUNT | 10 | 900 s / e-mail normalizado |
| RATE_LIMIT_IP | 600 | 60 s / endereço, demais rotas |
| RATE_LIMIT_READ | 300 | 60 s / usuário com JWT válido |
| RATE_LIMIT_WRITE | 120 | 60 s / usuário com JWT válido |

As variáveis são lidas no ambiente do backend; para alterá-las pelo Compose, adicione
as desejadas ao bloco `environment` do backend e recrie o serviço. Não há opção de
desabilitar os limites. Login conta tentativas bem-sucedidas e malsucedidas, incluindo
contas inexistentes. Isso reduz enumeração, mas permite bloqueio temporário de um
e-mail atacado; após a janela o acesso volta automaticamente. O limite por endereço
antecede a verificação de senha. JSON inválido ainda conta nesse limite geral.

A API responde 429 em JSON com `Retry-After` em segundos. O Nginx mantém uma camada
adicional de 10/minuto com burst de 10 para login/cadastro na imagem estática.
Health checks ficam fora dos contadores. Sem acesso ao banco, operações privadas
falham com 503 sanitizado; não há fallback que libere tráfego sem proteção.

A identidade de rede vem do peer ASGI e o Uvicorn ignora cabeçalhos de proxy.
No Vite/Nginx/ngrok vários usuários podem compartilhar o peer. Isso é deliberado:
aceitar cabeçalhos arbitrários permitiria burlar limites. Antes de aumentar a escala,
configure uma cadeia de proxies de confiança e monitore a taxa de 429. Os limites
por usuário e por e-mail continuam independentes do endereço visto pelo proxy.

## Corpo, conexões e dados

O backend verifica o tamanho real de cada corpo antes de analisar JSON: até 2 MiB,
com ou sem Content-Length e mesmo em envio em partes. Excesso retorna 413 e envio
que não termina em 15 segundos retorna 408. O Nginx também limita corpo, tempo de
cabeçalho e envio. O Uvicorn limita concorrência e keep-alive.

SQLAlchemy usa consultas parametrizadas, oculta parâmetros nas mensagens de erro,
valida conexões antes de reutilizá-las e limita o pool a 5 conexões + 5 extras por
processo, com espera máxima de 5 segundos. Na conexão da API, `statement_timeout`
é 10 s, `lock_timeout` é 3 s e `idle_in_transaction_session_timeout` é 30 s. As
migrações usam conexão própria, sem herdar esses limites de consultas da API.
Não alteramos globalmente os timeouts de todas as conexões do PostgreSQL.

Os limites de dados e paginação, chaves estrangeiras, constraints, transações,
revisões otimistas e isolamento por usuário existentes permanecem ativos. Segredos,
senhas, parâmetros SQL e corpos inválidos não são repetidos nas respostas de erro.
Cabeçalhos bloqueiam frames e acesso a câmera, microfone e geolocalização. A CSP é
aplicada pelo Nginx de produção; o Vite é ferramenta de desenvolvimento.

## Banco e containers de produção

Configure `POSTGRES_PASSWORD` para o proprietário e `POSTGRES_APP_PASSWORD` para
`overlog_app`, ambos aleatórios, distintos e com ao menos 16 caracteres. O bootstrap
executa migrações como proprietário e provisiona o login restrito. O processo HTTP
remove as variáveis `MIGRATION_POSTGRES_*` antes de iniciar; o administrador do Docker
ainda tem acesso à configuração do container, portanto proteja o host e os arquivos
`.env`. O volume de dados existente de desenvolvimento não é convertido nem recriado.

O login da API não é superusuário, não cria bancos ou roles e não ignora RLS. Recebe
SELECT nas tabelas e INSERT/UPDATE/DELETE apenas nas tabelas operacionais; catálogo
e controle de migrações ficam sem escrita. Não recebe CREATE no schema nem TRUNCATE.
Use um nome novo para essa role, sem privilégios ou memberships herdados de outros
sistemas. O proprietário continua reservado à manutenção. Backups são executados
como proprietário conforme o guia de deploy. Faça restaurações de teste em banco
separado e proteja os dumps, que contêm dados privados.

Containers de API e frontend de produção são sem privilégios, sem capabilities,
com root filesystem somente leitura e `/tmp` temporário. Banco e API não publicam
portas no host nessa configuração. HTTPS, certificados, backup externo criptografado,
retenção, monitoração e proteção de borda devem ser configurados no servidor. Rate
limit no banco não substitui contenção de grandes ataques de volume no provedor.

Referências: [timeouts do PostgreSQL 17](https://www.postgresql.org/docs/17/runtime-config-client.html)
e [middleware ASGI do Starlette](https://starlette.dev/middleware/).

## Validação desta entrega

- 105 testes de backend, incluindo limites, expiração, concorrência, origem forjada,
  corpo em partes e timeout de envio; quatro testes completos com banco real nos
  perfis desktop e celular.
- Stack de produção descartável: migração `0007`, cadastro, criação de plano,
  gravação e finalização de sessão com a role restrita, cookie Secure e docs inativas.
- Conferência de permissões e timeouts na conexão real; filesystem somente leitura
  e ausência das credenciais de migração no processo HTTP.
- No PostgreSQL, 20 tentativas concorrentes contra limite cinco aceitaram exatamente
  cinco. Requisições HTTP excedentes retornaram 429 e Retry-After mesmo alternando
  X-Forwarded-For.

A validação usou bancos descartáveis. Não foi realizado teste de carga em grande
escala, auditoria externa ou certificação de segurança; não há domínio público de
produção configurado nesta entrega.
