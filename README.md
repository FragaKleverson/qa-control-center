# QA Control Center

Plataforma completa de gerenciamento e execução de testes para times de QA.

Inspirada em ferramentas como TestRail, Xray e QMetry — mas sem a burocracia e sem o preço.

---

## Funcionalidades

- **Test Cases** — Criação, edição e listagem com ID padronizado (`TC0001`), cenários Gherkin e categorização por tipo
- **Test Suites** — Agrupamento de test cases em suites reutilizáveis
- **Test Plans** — Planos de teste com escopo, objetivo, ambiente e vinculação de suites
- **Executions** — Execução de plans com rastreabilidade por test case (Pending / Running / Passed / Failed / Blocked / Skipped)
- **Requirements** — Cadastro de requisitos com prioridade e vinculação
- **Reports** — Exportação de documentação em `.docx`
- **Dashboard** — Visão geral com métricas, projetos recentes e últimas execuções

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite + React Router |
| Backend | Node.js + Express 5 |
| Banco | PostgreSQL 15 |
| Infra | Docker + Docker Compose |
| Docs | docx |

---

## Estrutura do Projeto

```
qa-control-center/
├── backend/
│   ├── src/
│   │   ├── routes/          # executions, projetos, testSuites, testPlans, ...
│   │   ├── services/        # lógica de negócio e queries
│   │   ├── db.js            # pool PostgreSQL
│   │   └── server.js
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/           # Dashboard, TestCases, TestSuites, TestPlan, Executions, ...
│   │   ├── components/      # Modal, ConfirmDialog, GherkinDisplay, Sidebar, ...
│   │   ├── services/api.js  # cliente HTTP centralizado
│   │   └── routes/
│   └── Dockerfile
├── db/
│   └── init.sql/            # migrations iniciais (ordem garantida)
├── .env.example             # template de variáveis de ambiente
├── docker-compose.yml
└── README.md
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

Edite o `.env` com suas credenciais:

```env
POSTGRES_USER=qauser
POSTGRES_PASSWORD=sua_senha_aqui
POSTGRES_DB=qadb

DB_HOST=db
DB_PORT=5432
DB_USER=qauser
DB_PASSWORD=sua_senha_aqui
DB_DATABASE=qadb

BACKEND_PORT=3001
FRONTEND_PORT=5173
DB_PORT_EXPOSED=5432
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

---

## Desenvolvimento local (sem Docker)

### Backend

```bash
cd backend
npm install
# crie um .env na raiz com DB_HOST=localhost
node src/server.js
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Testes

```bash
cd backend
npm test
```
