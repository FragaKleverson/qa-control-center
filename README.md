# QA Control Center

Plataforma de gerenciamento, documentação e execução de testes para times de QA.

O QA Control Center permite criar projetos de teste, organizar cenários em Gherkin, salvar tudo em banco de dados, exportar documentação `.docx` e futuramente executar testes com rastreabilidade completa.


# Visão Geral

O projeto nasceu como um gerador de documentação `.docx` para QA.

Hoje evoluiu para uma plataforma completa de:

- gerenciamento de cenários
- documentação de testes
- persistência em PostgreSQL
- execução de testes
- rastreabilidade
- geração de relatórios
- exportação de evidências

Inspirado em ferramentas como:

- Xray
- QMetry
- TestRail
- Jira Test Management


# Principais Funcionalidades

## Gestão de Projetos

- criação de projetos de teste
- descrição funcional
- organização por feature


## Gestão de Cenários

- criação dinâmica de cenários
- categorização:
  - Happy Path
  - Sad Path
  - Regression
  - Validation
  - Smoke Test
  - Security
  - etc


## Escrita Gherkin

Suporte para:

```gherkin
Given ...
When ...
Then ...
```


## Persistência em Banco

Todos os projetos e cenários são armazenados em PostgreSQL.


## Exportações

- DOCX
- JSON


## Execução de Testes (em evolução)

Status disponíveis:

- PASSED
- FAILED
- BLOCKED
- N/A

Com suporte planejado para:

- evidências
- comentários
- relatórios
- histórico de execução


# Arquitetura

## Frontend

- React
- Vite
- CSS customizado


## Backend

- Node.js
- Express


## Banco de Dados

- PostgreSQL


# Estrutura do Projeto

```bash
qa-control-center/
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── db.js
│   │   ├── init-db.js
│   │   └── app.js
│
├── dashboard/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│
├── Testes/
│
└── README.md
```


# Tecnologias Utilizadas

## Frontend

- React
- Vite

## Backend

- Node.js
- Express

## Database

- PostgreSQL

## Documentação

- docx


# Instalação

## Clone o projeto

```bash
git clone https://github.com/FragaKleverson/qa-control-center.git
```


# Backend

Entre na pasta:

```bash
cd backend
```

Instale dependências:

```bash
npm install
```

Execute:

```bash
node src/app.js
```

Servidor:

```bash
http://localhost:3001
```


# Frontend

Entre na pasta:

```bash
cd dashboard
```

Instale dependências:

```bash
npm install
```

Execute:

```bash
npm run dev
```

Frontend:

```bash
http://localhost:5173
```


# Banco de Dados

Necessário:

- PostgreSQL

Execute:

```bash
node src/init-db.js
```

Tabelas criadas:

- projetos
- cenarios
- test_runs
- test_executions


# Roadmap

## Próximas evoluções

- autenticação de usuários
- upload de evidências
- screenshots automáticas
- dashboard analítico
- gráficos QA
- integração Cypress
- integração Playwright
- relatórios PDF
- execução automatizada
- CI/CD
- histórico de execução
- permissões por perfil


# Objetivo do Projeto

Centralizar todo o fluxo de QA em uma única plataforma:

- documentação
- gerenciamento
- execução
- rastreabilidade
- evidências
- relatórios


# Autor

Kleverson Fraga Costa

QA Analyst | Test Automation | Quality Engineering


# Resumo sincero

Se você ainda controla testes em Excel, Word e print no Teams...

talvez esteja na hora de evoluir.