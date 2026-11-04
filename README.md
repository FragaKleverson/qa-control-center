# QA Control Center

## Estado da feature — 04/11/2026

Projects possui catálogo independente em /projects; Test Cases mantém /projetos
com Project opcional. Test Plans têm execução única e imutabilidade após execução.
Admin exclui/restaura; QA cria/edita/consulta; Reader consulta.

Validações confirmadas: **651 isolados/27 suítes**, **339 integrados anteriores**,
ensaio histórico sintético aprovado (**10 migrations, 60 registros preservados**),
fluxo manual **9/9**, RBAC manual **6/6** e visual homologado pelo usuário. Prisma
validate, build Vite e ESLint aprovados anteriormente. Não equivalem a deploy em
banco original nem a testes de grande volume. Este resumo não reexecutou validações.

Usar **Node 22.13+ na linha 22**; homologado com **22.17.1**. Os Dockerfiles usam
node:22-alpine. Os manifests aceitam outras linhas, que não foram homologadas aqui.
[Resultados, ambientes protegidos, contratos e limitações](backend/FEATURE-VALIDATION-STATUS.md).

As instruções genéricas de instalação abaixo destinam-se somente a uma instalação
nova autorizada. Neste workspace não iniciar/recriar serviços existentes nem usar
5433/5434/5435 para migrations ou limpeza. Banco descartável com evidências também
deve ser preservado. Nenhum arquivo de ambiente, senha ou snapshot deve ser commitado.


Plataforma completa de gerenciamento e execução de testes para times de QA.

Inspirada em ferramentas como TestRail, Xray e QMetry — mas sem a burocracia e sem o preço.

> **Stack:** React 19 + Vite · Node.js + Express 5 · PostgreSQL 15 · Docker Compose · JWT

---

## Funcionalidades

### Autenticação
- Login com e-mail e senha (JWT, expiração configurável — padrão 8h)
- Cadastro de novos usuários protegido por `REGISTER_TOKEN` (apenas quem tem o token pode criar conta)
- Senhas armazenadas com bcrypt
- Redirecionamento automático para `/login` quando o token expira
- Informações do usuário logado e botão de logout na sidebar

### Dashboard
- Métricas gerais: total de execuções, taxa de sucesso, test cases, projetos
- Últimas execuções e projetos recentes

### Test Cases
- Criação com ID padronizado automático (`TC0001`, `TC0002`…)
- Campos: título, descrição, feature, tipo (funcional, regressão, smoke…)
- Suporte a cenários **Gherkin** (Given / When / Then) com syntax highlight
- Edição e exclusão inline

### Test Suites
- Agrupamento de test cases em suites reutilizáveis
- Listagem com contagem de casos por suite

### Test Plans
- Criação de planos com nome, escopo, objetivo e ambiente
- Vinculação de uma ou mais test suites ao plano
- Execução direta a partir do plano (botão **Execute**)

### Executions
- Geração de execução a partir de um test plan
- Rastreabilidade individual por test case dentro da execução
- Status por test case: `pending` · `running` · `passed` · `failed` · `blocked` · `skipped`
- Atualização de status inline com seletor por linha
- Exclusão de execuções com confirmação
- Filtro e busca por ambiente / status

### Requirements
- Cadastro de requisitos com prioridade e descrição
- Vinculação a projetos

### Reports
- Visão geral com cards de métricas (total, passed, failed, pending)
- Barra de taxa de sucesso global
- Breakdown por **Test Suite** com barra de progresso individual
- **Gerar Relatório Filtrado**: filtros por data início, data fim e suite → exibe resumo + tabela de execuções filtradas
- Histórico recente de execuções
- Exportação de documentação em `.docx`

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite + React Router v6 |
| Backend | Node.js + Express 5 |
| Banco | PostgreSQL 15 |
| Autenticação | JWT (`jsonwebtoken`) + bcrypt |
| Segurança | Helmet · CORS configurável · Rate Limiting · HPP |
| Infra | Docker + Docker Compose |
| Testes | Jest + Supertest e testes isolados; integração somente por runner protegido |
| Docs | docx |

---

## Estrutura do Projeto

```
qa-control-center/
├── backend/
│   ├── src/
│   │   ├── routes/          # auth, executions, projetos, testSuites, testPlans, requirements, relatorios, stats
│   │   ├── services/        # lógica de negócio e queries
│   │   ├── db.js            # pool PostgreSQL
│   │   └── server.js
│   ├── tests/               # testes de integração (Jest + Supertest)
│   ├── .env                 # variáveis locais (não comitar)
│   ├── .env.example         # template
│   ├── .env.test            # configuração legada protegida; não usar para ensaio
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/           # Dashboard, Login, TestCases, TestSuites, TestPlan, Executions, Requirements, Reports
│   │   ├── components/      # Modal, Sidebar, GherkinDisplay, Header
│   │   ├── contexts/        # AuthContext (estado global de autenticação)
│   │   ├── routes/          # AppRoutes, ProtectedRoute
│   │   └── services/api.js  # cliente HTTP centralizado com Bearer token automático
│   └── Dockerfile
├── db/
│   └── init.sql/            # migrations iniciais (00-projetos-executions, 01-test-suites-requirements-plans)
├── .env                     # variáveis do docker-compose (não comitar)
├── .env.example             # template completo com descrição de cada variável
├── docker-compose.yml
└── QA_Control_Center_API.postman_collection.json
```

---

## Configuração

### 1. Clone o repositório

```bash
git clone https://github.com/FragaKleverson/qa-control-center.git
cd qa-control-center
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais. As principais variáveis:

```env
# PostgreSQL
POSTGRES_USER=qauser
POSTGRES_PASSWORD=senha_forte_aqui
POSTGRES_DB=qa_control

# Conexão backend → banco
DB_HOST=db
DB_PORT=5432
DB_USER=qauser
DB_PASSWORD=senha_forte_aqui
DB_DATABASE=qa_control

# JWT — gere com: node -e "require('crypto').randomBytes(32).toString('hex')"
JWT_SECRET=GERE_UM_VALOR_AQUI
JWT_EXPIRES_IN=8h

# Token para criação de conta — compartilhe só com quem precisa
REGISTER_TOKEN=GERE_UM_VALOR_AQUI

# Portas (defaults: 3001/5173)
BACKEND_PORT=3001
FRONTEND_PORT=5173

# Em desenvolvimento, exponha o banco para ferramentas locais (DBeaver, psql...)
DB_PORT_EXPOSED=5433

# CORS — em produção, coloque a URL real do frontend
ALLOWED_ORIGINS=http://localhost:5173
```

### 3. Suba os containers

```bash
docker compose up -d --build
```

### 4. Acesse

| Serviço | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |

### 5. Crie o primeiro usuário

Use a rota `POST /auth/register` com o `REGISTER_TOKEN` definido no `.env`.  
A collection do Postman (`QA_Control_Center_API.postman_collection.json`) já tem a requisição **Register** configurada.

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -H "x-register-token: SEU_REGISTER_TOKEN" \
  -d '{"nome":"Seu Nome","email":"voce@email.com","password":"senha123"}'
```

Após registrar, faça login pela interface web ou via **Login** na collection do Postman — o token JWT é salvo automaticamente na variável `{{token}}`.

---

## Fluxo de Uso

```
Test Cases  →  Test Suites  →  Test Plans  →  Execute  →  Executions
                                                              ↓
                                              Marcar cada TC: Passed / Failed / ...
```

1. Crie **Test Cases** com título, descrição, feature e passos Gherkin
2. Agrupe em **Test Suites**
3. Monte um **Test Plan** com suites, escopo e ambiente
4. Clique em **Execute** para gerar uma execução
5. Em **Executions**, expanda e atualize o status de cada test case individualmente
6. Em **Reports**, filtre por período ou suite e exporte

---

## Testes automatizados

O fluxo anterior usava qa_control_test:5434 e npm test. Foi substituído para este
fechamento porque esse banco contém dados a preservar. Não executar o setup Jest
legado, nem levantar/recriar db-test como forma de preparar testes.

- [Comando isolado e runtime validado](backend/FEATURE-VALIDATION-STATUS.md).
- [Runner de integração e restrições atuais](backend/DISPOSABLE-INTEGRATION.md).
- [Ensaio independente com dados históricos sintéticos](backend/HISTORICAL-MIGRATION-REHEARSAL.md).
- [Checklist e resultados](backend/FEATURE-HOMOLOGATION-CHECKLIST.md).

As execuções integradas anteriores usaram 5435, agora preservado com dados de
homologação. O ensaio histórico usou 5436 e também permanece preservado. Não copiar
os comandos antigos contra 5434 ou executar testes destrutivos sem nova autorização.

---

## Desenvolvimento local (sem Docker)

### Backend

```bash
cd backend
npm install
# .env já configurado apontando para localhost
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Postman

Importe `QA_Control_Center_API.postman_collection.json`. A collection já tem:

- Variáveis `baseUrl` (`http://localhost:3001`) e `token`
- **Register**: usa `x-register-token` header — sem auth obrigatória
- **Login**: test script que salva o token automaticamente em `{{token}}`
- Todas as demais rotas herdam o Bearer token da collection

---

## Segurança

- Senhas com `bcrypt` (12 rounds)
- JWT com expiração (padrão 8h) — redirecionamento automático ao expirar
- `REGISTER_TOKEN` controla quem pode criar contas
- `helmet` + `hpp` nos headers HTTP
- CORS restrito às origens em `ALLOWED_ORIGINS`
- Rate limiting configurável (`RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX`)
- Porta do banco não exposta em produção (remova `DB_PORT_EXPOSED` do `.env`)
