# 🏋️ OverLog

**Track. Lift. Evolve.**

OverLog é uma aplicação web responsiva para gerenciamento de treinos de musculação, registro de cargas, acompanhamento de desempenho e evolução progressiva.

O objetivo é permitir que usuários organizem seus treinos, registrem séries e repetições durante a execução e acompanhem seu progresso ao longo do tempo.

O projeto será desenvolvido incrementalmente, utilizando metodologias ágeis e dividido em sprints.

**Status:** Sprint 3 implementada — execução e persistência de sessões.

---

# 1. Tecnologias

## Backend
- Python 3
- FastAPI
- Uvicorn
- SQLAlchemy
- Pydantic
- Alembic
- PostgreSQL
- Autenticação JWT

## Frontend
- React
- TypeScript
- Vite
- React Router
- CSS responsivo
- API REST

## Infraestrutura
- Docker
- Docker Compose
- Git e GitHub
- Variáveis de ambiente com `.env`

O projeto utilizará um único repositório contendo frontend, backend e configurações de infraestrutura.

---

# 2. Arquitetura do projeto

Estrutura inicial sugerida:

```text
OverLog/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── db/
│   │   └── main.py
│   │
│   ├── alembic/
│   ├── tests/
│   ├── Dockerfile
│   └── pyproject.toml
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── contexts/
│   │   ├── types/
│   │   ├── styles/
│   │   └── main.tsx
│   │
│   ├── Dockerfile
│   └── package.json
│
├── compose.yaml
├── .env.example
├── .gitignore
└── README.md
```

A organização poderá evoluir conforme as necessidades do projeto.

Evitar complexidade desnecessária e abstrações prematuras.

---

# 3. Requisitos funcionais

## RF01 — Cadastro de usuários

O sistema deverá permitir:

- Criar uma conta.
- Realizar login.
- Encerrar sessão.
- Consultar informações do próprio usuário.
- Acessar funcionalidades privadas mediante autenticação.

### Informações do usuário

- Identificador único.
- Nome.
- E-mail.
- Senha armazenada como hash.
- Data de criação.

### Segurança

A autenticação utilizará JWT.

O backend deverá validar a identidade do usuário em todas as operações protegidas.

Cada usuário poderá acessar somente seus próprios treinos, exercícios e históricos.

---

## RF02 — Gerenciamento de treinos

Cada usuário poderá cadastrar **até 6 treinos**.

Exemplo:

- Treino A — Peito e tríceps
- Treino B — Costas e bíceps
- Treino C — Pernas
- Treino D — Ombros
- Treino E — Upper
- Treino F — Lower

O usuário poderá:

- Criar um treino.
- Editar o nome.
- Adicionar exercícios.
- Remover exercícios.
- Alterar a ordem dos exercícios.
- Excluir um treino.
- Iniciar uma sessão de treino.

O limite de seis treinos deverá ser validado no backend.

---

## RF03 — Exercícios

Cada treino possuirá uma lista de exercícios.

Exemplo:

**Treino A — Peito e tríceps**

```text
Supino reto
├── Série 1
├── Série 2
└── Série 3

Supino inclinado
├── Série 1
├── Série 2
└── Série 3

Tríceps francês
├── Série 1
└── Série 2
```

O usuário deverá conseguir adicionar, remover e reorganizar exercícios.

Cada exercício terá suas próprias séries.

---

## RF04 — Tipos de séries

As séries poderão ser classificadas conforme sua finalidade.

Tipos iniciais:

| Tipo | Descrição |
|---|---|
| Aquecimento | Preparação para o exercício |
| Feeder | Preparação progressiva para séries principais |
| Work Set | Série principal de trabalho |
| Backoff Set | Série realizada com carga reduzida |
| Falha | Série executada até a falha muscular |

Cada série deverá possuir:

- Identificador.
- Exercício associado.
- Ordem.
- Tipo.
- Repetições planejadas.
- Carga planejada opcional.

O usuário poderá alterar essas informações conforme sua evolução.

---

# 4. Execução de treinos

## RF05 — Iniciar treino

Cada treino possuirá um botão:

**▶ Iniciar treino**

Ao selecionar essa opção:

1. O backend criará uma sessão de treino.
2. A sessão armazenará a data e a hora de início.
3. Os exercícios planejados serão carregados.
4. O usuário poderá registrar seu desempenho.

A sessão deverá manter uma cópia da estrutura planejada no momento do início.

Assim, alterações futuras no treino não modificarão os registros históricos.

### Exemplo de execução

**Supino reto**

| Série | Tipo | Carga | Repetições | Status |
|---|---|---|---|---|
| 1 | Aquecimento | 20 kg | 15 | ✅ |
| 2 | Feeder | 40 kg | 10 | ✅ |
| 3 | Work Set | 60 kg | 8 | ✅ |
| 4 | Work Set | 60 kg | 7 | ⬜ |
| 5 | Backoff | 50 kg | 10 | ⬜ |

Durante o treino, o usuário poderá:

- Alterar a carga.
- Alterar as repetições.
- Alterar o tipo da série.
- Adicionar séries.
- Remover séries.
- Marcar séries como concluídas.

As alterações realizadas durante uma sessão não deverão modificar automaticamente o modelo de treino original.

A sessão em andamento deverá ser persistida no banco para evitar perda dos registros caso a página seja atualizada.

---

## RF06 — Finalização

A tela de execução deverá apresentar o botão:

**Finalizar treino**

Ao finalizar:

1. Registrar a data e a hora de término.
2. Calcular a duração.
3. Salvar as séries executadas.
4. Atualizar o histórico.
5. Verificar possíveis progressões.
6. Apresentar um resumo da sessão.

O sistema também deverá permitir retomar uma sessão em andamento.

Uma sessão não deverá ser descartada sem confirmação.

---

# 5. Cronômetro de descanso

## RF07 — Controle de descanso

Durante a execução do treino, haverá um ícone de relógio.

O usuário poderá:

- Iniciar a contagem.
- Pausar.
- Reiniciar.
- Visualizar o tempo decorrido.

O cronômetro deverá continuar calculando corretamente o tempo mesmo quando o usuário alternar entre aplicativos ou bloquear a tela do celular.

Inicialmente, será utilizado um cronômetro crescente.

A possibilidade de configurar um temporizador regressivo será avaliada posteriormente.

---

# 6. Histórico e progressão

## RF08 — Histórico de treinos

O usuário deverá conseguir consultar sessões realizadas anteriormente.

Cada registro armazenará:

- Treino realizado.
- Data.
- Horário de início.
- Horário de término.
- Duração.
- Exercícios.
- Séries executadas.
- Cargas.
- Repetições.

O histórico deverá permanecer consistente mesmo que o usuário altere seus treinos planejados.

## RF09 — Comparação de desempenho

O sistema deverá comparar o desempenho de exercícios entre sessões.

Exemplo:

**Supino reto**

Treino anterior:

```text
60 kg × 8 repetições
```

Treino atual:

```text
60 kg × 10 repetições
```

Resultado:

🏆 **Novo recorde de repetições!**

Outro exemplo:

Treino anterior:

```text
60 kg × 10 repetições
```

Treino atual:

```text
65 kg × 10 repetições
```

Resultado:

🏆 **Progressão de carga!**

A comparação deverá considerar séries equivalentes. Os critérios definitivos, incluindo comparação entre diferentes tipos de série, serão definidos na sprint correspondente.

## RF10 — Conquistas

O sistema deverá apresentar indicadores visuais quando o usuário atingir uma progressão válida.

Inicialmente:

- Progressão de carga.
- Progressão de repetições.

Futuramente poderão ser adicionadas conquistas relacionadas a volume total, recordes pessoais e consistência.

---

# 7. Modelagem inicial do banco

Entidades principais:

### User

```text
id
name
email
password_hash
created_at
```

### WorkoutTemplate

```text
id
user_id
name
position
created_at
updated_at
```

### TemplateExercise

```text
id
workout_template_id
name
position
```

### PlannedSet

```text
id
template_exercise_id
position
set_type
target_repetitions
target_weight
```

### WorkoutSession

```text
id
user_id
workout_template_id
name_snapshot
status
started_at
finished_at
```

### SessionExercise

```text
id
workout_session_id
name_snapshot
position
```

### PerformedSet

```text
id
session_exercise_id
position
set_type
weight
repetitions
is_completed
```

Esse é um modelo conceitual inicial.

O Codex deverá implementar os relacionamentos e constraints necessários conforme cada sprint.

Utilizar migrations com Alembic.

Para cargas, utilizar tipo decimal adequado no PostgreSQL, evitando problemas de precisão.

---

# 8. Interface e responsividade

O OverLog será uma aplicação **mobile-first**.

A maior parte das interações acontecerá durante os treinos, utilizando smartphones.

Consequentemente, a experiência mobile deverá ser prioridade.

### Diretrizes

- Layout responsivo.
- Interface limpa e intuitiva.
- Botões apropriados para telas sensíveis ao toque.
- Campos de carga e repetições fáceis de editar.
- Navegação simples entre exercícios.
- Feedback visual ao concluir séries.
- Evitar rolagem horizontal.
- Suporte a desktop, tablet e smartphone.

### Telas previstas

1. Login.
2. Cadastro.
3. Dashboard / Meus treinos.
4. Criar ou editar treino.
5. Treino em andamento.
6. Resumo do treino.
7. Histórico.
8. Evolução e conquistas.

A identidade visual será definida posteriormente.

---

# 9. Planejamento por sprints

## Sprint 0 — Configuração do ambiente

**Objetivo:** estruturar o projeto.

### Atividades

- Criar monorepo.
- Configurar Docker Compose.
- Criar container PostgreSQL.
- Criar backend FastAPI.
- Configurar Uvicorn.
- Configurar SQLAlchemy.
- Preparar Alembic.
- Criar frontend React/Vite/TypeScript.
- Configurar comunicação frontend/backend.
- Criar endpoint de health check.
- Documentar os comandos de execução.

### Critério de aceite

Executar:

```bash
docker compose up --build
```

Os três serviços deverão iniciar corretamente.

O frontend deverá conseguir consultar o endpoint de saúde da API.

---

## Sprint 1 — Autenticação

**Objetivo:** implementar usuários e autenticação JWT.

### Atividades

- Modelar usuário.
- Criar migration.
- Implementar cadastro.
- Implementar login.
- Gerar JWT.
- Implementar validação de token.
- Criar telas de login e cadastro.
- Proteger rotas privadas.

### Critério de aceite

Um usuário deverá conseguir criar conta, autenticar-se e acessar a área privada.

---

## Sprint 2 — Gerenciamento de treinos

**Objetivo:** permitir a criação e personalização dos treinos.

### Atividades

- CRUD de treinos.
- Limite de seis treinos.
- Cadastro de exercícios.
- Ordenação dos exercícios.
- Criação de séries planejadas.
- Configuração dos tipos de séries.
- Edição de cargas e repetições.
- Interface responsiva para edição.

### Critério de aceite

O usuário deverá conseguir montar seus próprios treinos e reutilizá-los.

---

## Sprint 3 — Execução

**Objetivo:** permitir registrar treinos em tempo real.

### Atividades

- Iniciar sessão.
- Criar snapshot do treino.
- Registrar cargas.
- Registrar repetições.
- Alterar séries durante execução.
- Marcar séries concluídas.
- Salvar andamento.
- Retomar sessão.
- Finalizar sessão.
- Persistir histórico.

### Critério de aceite

O usuário deverá conseguir executar um treino completo e salvar todos os dados.

---

## Sprint 4 — Cronômetro

**Objetivo:** implementar o controle de descanso.

### Atividades

- Criar componente de cronômetro.
- Implementar iniciar.
- Implementar pausar.
- Implementar resetar.
- Integrar à tela de execução.
- Validar comportamento mobile.

### Critério de aceite

Cronômetro funcional durante a sessão, sem perda dos registros.

---

## Sprint 5 — Evolução e conquistas

**Objetivo:** implementar acompanhamento de desempenho.

### Atividades

- Histórico detalhado.
- Comparação entre sessões.
- Definição dos critérios de progressão.
- Identificação de progressões.
- Conquistas visuais.
- Resumo pós-treino.

### Critério de aceite

O usuário deverá visualizar seus resultados e receber indicadores ao superar marcas anteriores.

---

## Sprint 6 — Qualidade e MVP

**Objetivo:** preparar a primeira versão utilizável.

### Atividades

- Testes backend.
- Testes frontend.
- Testes de integração.
- Revisão de segurança.
- Validação de permissões.
- Melhorias de performance.
- Revisão de responsividade.
- Tratamento de erros.
- Documentação de execução e deploy.

### Critério de aceite

O fluxo completo deverá funcionar tanto no desktop quanto no smartphone.

---

# 10. Regras para desenvolvimento com Codex

O desenvolvimento deverá seguir as seguintes orientações:

1. Ler este README antes de implementar funcionalidades.
2. Trabalhar exclusivamente na sprint solicitada.
3. Não antecipar funcionalidades de sprints posteriores.
4. Manter responsabilidades separadas entre API, serviços, modelos e interface.
5. Seguir boas práticas das tecnologias utilizadas.
6. Documentar decisões importantes.
7. Evitar dependências desnecessárias.
8. Criar migrations para alterações no banco.
9. Implementar testes para funcionalidades críticas.
10. Não incluir credenciais ou informações sensíveis no repositório.
11. Priorizar responsividade desde o início.
12. Explicar alterações e arquivos criados ao concluir cada sprint.
13. Criar um commit ao concluir cada sprint ou funcionalidade relativamente grande.
14. Escrever as mensagens de commit em português, com uma breve descrição do que foi feito.

Quando surgirem novas regras de negócio, atualizar este README antes ou durante sua implementação.

O Codex deverá apresentar um breve planejamento antes de realizar alterações relevantes.

---

# 11. Próxima etapa

## Tarefa inicial para o Codex (Sprint 0 — concluída)

Implementar exclusivamente a **Sprint 0 — Configuração do ambiente**.

Criar a estrutura do projeto utilizando:

- Python
- FastAPI
- Uvicorn
- PostgreSQL
- SQLAlchemy
- Alembic
- Docker Compose
- React
- TypeScript
- Vite

O objetivo inicial é ter backend, frontend e banco de dados comunicando-se corretamente.

**Esta restrição se aplica à Sprint 0. A Sprint 1 adiciona autenticação conforme a seção 13.**

Ao concluir, explicar a estrutura criada e os comandos necessários para iniciar e testar o ambiente.

---

**OverLog — Track. Lift. Evolve.**

# 12. Executando a Sprint 0

Requisitos: Docker Engine (ou Docker Desktop) e Docker Compose v2.

Na raiz do projeto:

```bash
cp .env.example .env
# Gere uma chave e preencha JWT_SECRET_KEY no .env:
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
docker compose up --build
```

O Compose inicia o PostgreSQL, aguarda seu health check, executa `alembic upgrade head`
e inicia a API. A interface inicia após a API confirmar conexão com o banco.
O `.env.example` contém somente valores de desenvolvimento local; não use esses valores em produção.

- Interface: http://localhost:5173
- API / documentação interativa: http://localhost:8000/docs
- Saúde da API e do banco: http://localhost:8000/api/health

Na interface, a mensagem de conexão confirma a chamada real da API. O frontend usa
`/api` com proxy do Vite para o backend, evitando endereços de containers no navegador.
A página permite repetir a verificação e informa falhas de conexão.

```bash
curl --fail http://localhost:8000/api/health
# {"status":"ok","database":"connected"}
docker compose ps
docker compose logs backend
docker compose down
```

Os dados ficam no volume `postgres_data` e são preservados ao executar `down`.
O banco não expõe uma porta no host; frontend e API são expostos somente em localhost.
Se alterar as credenciais no `.env` após criar o volume, ajuste também o usuário no banco:
as variáveis do PostgreSQL só inicializam um volume vazio.

## Estrutura implementada

- `backend/app/api`: endpoints REST, inicialmente `/api/health`.
- `backend/app/core`: configuração por variáveis de ambiente.
- `backend/app/db`: engine SQLAlchemy, sessões e base declarativa.
- `backend/app/models`, `schemas` e `services`: pacotes preparados para as próximas sprints.
- `backend/alembic`: infraestrutura de migrations. Não há tabelas de negócio nesta sprint.
- `backend/tests`: testes do health check com banco disponível e indisponível.
- `frontend/src`: React, TypeScript, React Router, serviço de API e CSS mobile-first.
- `compose.yaml`: serviços, rede interna, health checks e volume persistente.

O endpoint executa `SELECT 1`: retorna HTTP 200 quando há conexão com o banco e
HTTP 503 quando o banco está indisponível, sem expor detalhes internos do erro.
O Dockerfile do frontend valida o build e usa o servidor Vite para este ambiente
de desenvolvimento. A configuração de publicação será definida em uma sprint futura.

## Comandos de desenvolvimento e verificação

Frontend local (Node.js 22.12+):

```bash
cd frontend
npm ci
npm run dev
# Em outro terminal, na pasta frontend:
npm run build
```

O proxy local aponta para `http://localhost:8000`; a API pode continuar no Compose.

Como os testes ficam fora da imagem de execução, execute-os em um container temporário
com o diretório de testes montado:

```bash
docker compose run --rm --no-deps -v "$PWD/backend/tests:/app/tests:ro" backend sh -c 'pip install ".[test]" && pytest tests'
```

Alternativamente, com Python 3.12+ e suporte a venv instalados:

```bash
python3 -m venv .venv
.venv/bin/pip install -e './backend[test]'
.venv/bin/python -m pytest backend/tests
```

Os testes de health check usam substituição da dependência de banco, sem exigir PostgreSQL.
Para futuras tabelas, importar os modelos em `backend/alembic/env.py` antes de gerar
migrations com `alembic revision --autogenerate -m "descricao"`.

Se a porta 5173 estiver ocupada, configure `FRONTEND_PORT=5174` no `.env` e
acesse http://localhost:5174. Neste ambiente, o `.env` local já usa a porta 5174.


# 13. Sprint 1 — Autenticação

Implementados cadastro, login, logout, usuário autenticado e rotas privadas.
O cadastro autentica automaticamente. O dashboard mostra somente os dados do usuário
atual; o gerenciamento de treinos fica para a Sprint 2.

## Decisões

- E-mail validado e normalizado (espaços externos removidos e letras minúsculas),
  com constraint única no banco, inclusive para cadastros concorrentes.
- Nome obrigatório de até 100 caracteres; senha entre 8 e 128 caracteres,
  armazenada somente como hash Argon2. Dados públicos nunca incluem hash ou senha.
- JWT HS256, com emissor, destinatário e expiração de 60 minutos, em cookie
  `HttpOnly`, `SameSite=Strict` e restrito ao caminho `/api`.
- `JWT_SECRET_KEY` é obrigatório e deve ter pelo menos 32 caracteres. Gere uma
  chave aleatória por ambiente; ela não é versionada. Em HTTPS, use `COOKIE_SECURE=true`.
- O logout incrementa `token_version` no banco: todos os tokens anteriores da
  conta são rejeitados, inclusive cópias do cookie. O logout encerra todos os dispositivos.
- POSTs exigem `X-Requested-With: OverLog`; o navegador só permite essa chamada
  de outra origem após preflight CORS autorizado. O frontend usa o proxy de mesma origem.
- A sessão é recuperada ao carregar e ao retornar à aba. Falhas de rede oferecem
  nova tentativa; credenciais inválidas e sessão expirada são tratadas na interface.
- Não há refresh token: ao expirar a sessão, o usuário faz login novamente.

A implementação de hash e JWT usa `pwdlib` e `PyJWT`, conforme a
[documentação de segurança do FastAPI](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/).

## Execução

O `.env` local já tem uma chave aleatória e mantém `FRONTEND_PORT=5174`.
Em uma instalação nova, copie `.env.example` e preencha `JWT_SECRET_KEY` antes de subir.

```bash
docker compose up --build -d
```

- Cadastro: http://localhost:5174/cadastro
- Login: http://localhost:5174/login
- Área privada: http://localhost:5174/

Se usar a porta padrão, substitua 5174 por 5173. O health check continua em `/api/health`;
a tela inicial agora é a área privada.

## API

| Método | Endpoint | Comportamento |
|---|---|---|
| POST | `/api/auth/register` | JSON com nome (`name`), e-mail (`email`) e senha (`password`); retorna 201 e cookie |
| POST | `/api/auth/login` | JSON com `email` e `password`; retorna usuário e cookie |
| GET | `/api/auth/me` | Retorna o usuário do cookie JWT ou 401 |
| POST | `/api/auth/logout` | Invalida sessões e remove cookie; retorna 204 |

Os POSTs exigem o cabeçalho `X-Requested-With: OverLog`. A API usa JSON e não
retorna o JWT no corpo. Para testar com curl, use `-c cookies.txt` para salvar e
`-b cookies.txt` para enviar cookies. Evite versionar esses arquivos.

## Banco e testes

A migration `0001` cria `users`. O Alembic é executado automaticamente na subida.
O campo `token_version` dá suporte à invalidação das sessões.

```bash
docker compose exec backend alembic current
docker compose run --rm --no-deps -v "$PWD/backend/tests:/app/tests:ro" backend sh -c 'pip install ".[test]" && pytest tests'
cd frontend
npm run build
```

Os testes isolados usam SQLite em memória e cobrem cadastro, hash, validação,
e-mail duplicado, login, logout, identidade do usuário, proteção contra POST sem
cabeçalho e rejeição de JWT expirado, adulterado ou incompleto.
A validação da migration e da integração usa o PostgreSQL do Compose.

## Validação executada na Sprint 1

- 16 testes de backend aprovados (health check e autenticação).
- Build TypeScript/Vite aprovado, localmente e na imagem Docker.
- Migration PostgreSQL em `0001 (head)`.
- Fluxo HTTP pelo proxy do frontend aprovado: cadastro, consulta do usuário,
  logout, rejeição do token revogado e novo login. A conta de teste foi removida.

A validação do frontend nesta entrega cobre compilação e integração HTTP;
a interação visual em navegador não foi automatizada.


# 14. Sprint 2 — Gerenciamento de treinos

A área privada agora lista os treinos do usuário e permite criar, editar e excluir
planos. O editor permite adicionar, remover e reordenar exercícios e séries,
selecionar os cinco tipos de série e editar carga e repetições. A exclusão de
um treino pede confirmação. A execução de sessões continua reservada à Sprint 3.

## Regras e decisões

- Cada usuário tem até seis treinos. Criações bloqueiam a linha do usuário durante
  a transação no PostgreSQL; seis posições possíveis, com constraint única por
  usuário, também garantem o limite no banco. Uma posição excluída pode ser reutilizada.
- O nome de treino e exercício é obrigatório, com até 100 caracteres, sem espaços
  externos. Um plano pode ser salvo vazio para ser completado posteriormente.
- Cada treino aceita até 100 exercícios e cada exercício até 30 séries planejadas.
  Esses limites operacionais mantêm os formulários e payloads manejáveis.
- Repetições são inteiras, de 1 a 999. A carga é opcional, de 0 a 99999,99 kg,
  com até duas casas decimais, armazenada em `NUMERIC(7,2)`. A API serializa cargas
  como strings decimais para preservar a precisão.
- Tipos: `warmup` (Aquecimento), `feeder`, `work` (Work Set), `backoff` e `failure` (Falha).
- A ordem das listas enviadas define a posição dos exercícios e séries a partir de zero.
  A interface oferece botões subir/descer, sem depender de arrastar no celular.
- `PUT` salva o plano inteiro em uma transação. IDs existentes devem pertencer ao
  treino/exercício correspondente e não podem se repetir. Itens novos omitem o ID;
  itens removidos da lista são excluídos. IDs dos itens mantidos são preservados.
- Todas as consultas e alterações filtram o usuário autenticado. Recursos de outra
  conta retornam 404, sem revelar sua existência. Escritas exigem o cabeçalho de segurança.
- Os relacionamentos usam exclusão em cascata e remoção de órfãos, conforme a
  [documentação de cascatas do SQLAlchemy](https://docs.sqlalchemy.org/en/20/orm/cascades.html).
- Uma resposta 401 limpa a sessão na interface e leva o usuário à tela de login.

## Arquivos principais

- `backend/app/models/workout.py`: treinos, exercícios e séries planejadas.
- `backend/app/schemas/workout.py`: contratos e validação dos planos.
- `backend/app/services/workout.py`: propriedade, limite de treinos e atualização dos itens.
- `backend/app/api/workouts.py`: endpoints autenticados.
- `backend/alembic/versions/0002_workout_templates.py`: tabelas, índices e constraints.
- `backend/tests/test_workouts.py`: testes de regras de negócio e permissões.
- `frontend/src/pages/Dashboard.tsx`: listagem dos treinos.
- `frontend/src/pages/WorkoutEditor.tsx`: criação e edição responsiva.
- `frontend/src/types/workout.ts`: tipos e payloads do frontend.

## API

| Método | Endpoint | Comportamento |
|---|---|---|
| GET | `/api/workouts` | Lista somente os planos do usuário autenticado |
| POST | `/api/workouts` | Cria plano; retorna 201 ou 409 ao atingir seis treinos |
| GET | `/api/workouts/{id}` | Consulta um plano com exercícios e séries |
| PUT | `/api/workouts/{id}` | Salva nome, exercícios, ordem e séries do plano |
| DELETE | `/api/workouts/{id}` | Exclui o plano e seus itens; retorna 204 |

Exemplo de criação (`Content-Type: application/json`, cookie de sessão e
`X-Requested-With: OverLog`):

```json
{
  "name": "Peito e tríceps",
  "exercises": [
    {
      "name": "Supino reto",
      "sets": [
        {"set_type": "warmup", "target_repetitions": 15, "target_weight": "20.00"},
        {"set_type": "work", "target_repetitions": 8, "target_weight": "60.50"}
      ]
    }
  ]
}
```

As respostas incluem IDs e posições. Para editar, envie apenas `name`, `exercises`,
e os campos de cada item do exemplo, acrescentando os IDs dos itens existentes.
Não envie campos de resposta como `position`, `created_at` e `updated_at`.

## Execução e verificação

```bash
docker compose up --build -d
docker compose exec backend alembic current
# Deve retornar 0002 (head)
docker compose run --rm --no-deps -v "$PWD/backend/tests:/app/tests:ro" backend sh -c 'pip install ".[test]" --quiet && pytest tests -q'
cd frontend
npm run build
```

Acesse http://localhost:5174 para montar seus treinos. No ambiente padrão sem
alteração de porta, use http://localhost:5173. A migration é aplicada automaticamente
na inicialização, preservando as contas existentes.

## Validação executada na Sprint 2

- 36 testes de backend aprovados, incluindo regressão da autenticação.
- Build TypeScript/Vite aprovado localmente e no Docker.
- Migration PostgreSQL em `0002 (head)`.
- Oito criações HTTP simultâneas: seis retornaram 201 e duas retornaram 409.
- Fluxo automatizado em Chromium: cadastro, criação, consulta, edição, reordenação
  de exercícios e séries, remoção de itens, persistência após recarga e confirmação
  de exclusão. Nenhum erro JavaScript capturado.
- Editor verificado nas larguras de 320, 360, 768 e 1280 px, sem rolagem horizontal.
- Contas temporárias de validação removidas após os testes.

O teste de navegador foi executado com Playwright instalado temporariamente fora
do repositório; a suíte versionada de regras de negócio está em `backend/tests`.


# 15. Sprint 3 — Execução de treinos

Implementa início, registro de séries em tempo real, salvamento automático,
retomada, finalização e persistência das sessões. O dashboard mostra o treino em
andamento, e a listagem de treinos concluídos dá acesso ao resumo de cada sessão.
Cronômetro, comparação de desempenho e conquistas continuam nas Sprints 4 e 5.

## Regras e decisões

- Uma sessão em andamento por usuário. Repetir o início do mesmo plano retoma
  a sessão existente; iniciar outro plano retorna 409 enquanto houver sessão ativa.
  A criação bloqueia a linha do usuário e usa índice único parcial no PostgreSQL,
  conforme a [documentação de índices](https://www.postgresql.org/docs/17/sql-createindex.html).
- Só é possível iniciar um plano com pelo menos uma série. Exercícios e séries
  são copiados com IDs próprios, nome e ordem. Editar o plano não muda a sessão;
  excluir o plano apenas remove sua referência, mantendo o snapshot e o histórico.
- Edição, exclusão e cópia do plano usam bloqueio da linha do treino para manter
  a leitura do snapshot consistente com atualizações simultâneas.
- Durante a execução é possível alterar carga, repetições e tipo, adicionar ou
  remover séries e marcar conclusão. Os exercícios copiados permanecem na ordem
  original. Cada exercício aceita até 60 séries na sessão.
- Cargas usam `NUMERIC(7,2)` e são opcionais enquanto a série está pendente.
  Para concluir uma série é necessário informar carga não negativa (zero para peso
  corporal). Repetições executadas são inteiras entre 0 e 999, permitindo registrar
  uma tentativa sem repetição completa.
- O backend salva a sessão inteira em uma transação e incrementa `revision`.
  Revisões antigas recebem 409 para evitar que outra aba sobrescreva os registros.
  Um `mutation_id` identifica o último salvamento e permite repetir uma requisição
  cuja resposta foi perdida, sem duplicar séries. Os IDs das novas séries são UUIDs
  gerados pelo cliente e validados pelo backend.
- A interface salva após 500 ms sem edição e indica se há alterações pendentes,
  erro, conflito ou confirmação do banco. Em falhas, permite tentar novamente e
  tenta reenviar ao recuperar a conexão. A finalização aguarda o salvamento.
- Um rascunho por usuário e sessão fica no `localStorage` para recuperar alterações
  ainda não confirmadas após recarga. O rascunho não contém token ou senha.
  Se o armazenamento local estiver bloqueado, a interface avisa para aguardar o
  salvamento antes de sair. Esse mecanismo não torna o aplicativo totalmente offline:
  a interface e a sessão precisam ser carregadas com conexão.
- Em conflito de revisão o rascunho não é sobrescrito automaticamente. A interface
  solicita confirmação para descartá-lo e carregar os dados atuais do servidor.
- Finalizar exige pelo menos uma série concluída e confirmação. Séries pendentes
  permanecem registradas como não concluídas. O backend define término, duração e
  quantidade de séries concluídas; sessões encerradas não podem ser editadas.
- Descartar também exige confirmação na interface. A sessão recebe status `discarded`
  e fica fora da listagem de treinos concluídos. O descarte não altera o plano.
- Finalizar e descartar novamente a mesma sessão são operações idempotentes.
  O histórico básico é paginado, com até 100 registros por requisição.
- Todos os endpoints verificam o usuário autenticado e as escritas exigem o mesmo
  cabeçalho de segurança das sprints anteriores. Dados de outras contas retornam 404.

## Estrutura

- `backend/app/models/session.py`: sessões, exercícios copiados e séries executadas.
- `backend/app/schemas/session.py`: contratos de início, edição, encerramento e leitura.
- `backend/app/services/session.py`: snapshot, revisão, idempotência e finalização.
- `backend/app/api/sessions.py`: API autenticada.
- `backend/alembic/versions/0003_workout_sessions.py`: tabelas, índices e constraints.
- `backend/tests/test_sessions.py`: regras da execução e isolamento de dados.
- `frontend/src/hooks/useWorkoutSession.ts`: fila de salvamento e recuperação do rascunho.
- `frontend/src/pages/SessionPage.tsx`: execução e resumo somente leitura.
- `frontend/src/pages/HistoryPage.tsx`: listagem básica de sessões concluídas.

## API

| Método | Endpoint | Comportamento |
|---|---|---|
| POST | `/api/sessions` | Inicia ou retoma com `workout_template_id` |
| GET | `/api/sessions/active` | Retorna a sessão ativa ou `null` |
| GET | `/api/sessions?offset=0&limit=20` | Lista sessões concluídas do usuário |
| GET | `/api/sessions/{id}` | Recupera snapshot e andamento ou resumo final |
| PUT | `/api/sessions/{id}` | Salva séries com revisão e identificador da alteração |
| POST | `/api/sessions/{id}/finish` | Finaliza usando `revision` |
| POST | `/api/sessions/{id}/discard` | Descarta usando `revision` |

No PUT, envie somente `revision`, `mutation_id` (UUID novo por alteração) e
`exercises`, mantendo a ordem e os IDs dos exercícios da sessão. Cada exercício
contém `id` e `sets`. Cada série contém `id` (UUID), `set_type`, `weight`,
`repetitions` e `is_completed`. IDs conhecidos são mantidos, IDs novos criam séries,
e séries omitidas são removidas. Para repetir um envio sem resposta, mantenha
exatamente o mesmo corpo e `mutation_id`.

## Execução

```bash
docker compose up --build -d
docker compose exec backend alembic current
# 0003 (head)
docker compose exec backend alembic check
docker compose run --rm --no-deps -v "$PWD/backend/tests:/app/tests:ro" backend sh -c 'pip install ".[test]" --quiet && pytest tests -q'
cd frontend
npm run build
```

Em http://localhost:5174, crie um plano, selecione **Iniciar treino**, registre as
séries e aguarde **Tudo salvo no banco**. Ao voltar à tela inicial, use **Retomar treino**.
Depois de finalizar, o resumo fica disponível em **Treinos concluídos**.


## Validação executada na Sprint 3

- 59 testes de backend aprovados, com regressão das Sprints 0, 1 e 2, chaves
  estrangeiras habilitadas no banco isolado e casos de duração e imutabilidade.
- Build TypeScript/Vite aprovado localmente e na imagem Docker.
- PostgreSQL em `0003 (head)`; `alembic check` não encontrou divergências dos modelos.
- Oito inícios simultâneos retornaram a mesma sessão. Duas gravações simultâneas
  com a mesma revisão resultaram em uma confirmação e um conflito HTTP 409.
- Fluxo automatizado em Chromium: início, conclusão de séries, edição de carga,
  tipo e repetições, adição/remoção, autosave, recarga, retomada, confirmação de
  finalização, resumo, histórico após excluir o plano e descarte confirmado.
- Falhas simuladas: resposta perdida após salvar no servidor, rede indisponível
  durante o salvamento e conflito com alteração remota. O rascunho foi recuperado
  após recarga e a alteração remota não foi sobrescrita silenciosamente.
- Tela de execução verificada em 320, 360, 768 e 1280 px, sem rolagem horizontal
  ou erros JavaScript capturados. O Playwright foi usado temporariamente fora do
  repositório; os testes versionados estão em `backend/tests/test_sessions.py`.
- As duas contas temporárias criadas para validar esta sprint foram removidas.
