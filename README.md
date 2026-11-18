# QA Control Center

Plataforma de gerenciamento de testes para times de QA: organize casos, suítes e
planos, acompanhe execuções e gere relatórios em um só lugar.

Inspirada em ferramentas como TestRail, Xray e QMetry.

> **Stack:** React 19 + Vite + React Router 7 · Node.js + Express 5 · PostgreSQL · Prisma Migrate · Docker Compose · JWT

---

## Funcionalidades

### Autenticação e permissões

- Login com e-mail e senha, JWT e cadastro protegido por `REGISTER_TOKEN`.
- Perfis **Admin**, **QA** e **Reader**: administração, manutenção e consulta conforme a operação.
- Logout na sidebar; revogação de token disponível separadamente na API.

### Dashboard

- Métricas gerais, taxa de sucesso e execuções recentes.

### Projects

- Catálogo independente em `/projects`, com nome e descrição.
- Exclusão lógica e restauração pela API; vínculo opcional dos casos ao catálogo.

### Test Cases

- Casos de teste no endpoint legado `/projetos`, separado de `/projects`.
- Título, descrição, feature e cenários Gherkin; criação, edição e exclusão conforme perfil.

### Requirements

- Cadastro de requisitos com descrição, status e prioridade.
- Sem vínculo implementado com Projects.

### Test Suites

- Agrupamento de casos em suítes reutilizáveis.
- Associação e remoção de casos conforme permissões.

### Test Plans

- Planos com título, escopo, objetivo, ambiente e suítes associadas.
- Execução única dos planos elegíveis; planos executados ficam bloqueados para edição e reexecução.

### Executions

- Execuções geradas por planos, com resultados individuais por caso.
- Atualização de status e comentários, acompanhamento e finalização.
- Criação direta pela API não popula resultados nem executa scripts de automação.

### Reports

- Resumos, agregados por suíte e histórico de execuções.
- Geração com filtros por período e suíte; exportação em **DOCX**.

---

## Tecnologias utilizadas

- **Frontend:** React 19, React Router 7 e Vite 8.
- **Backend:** Node.js, Express 5, Zod e driver PostgreSQL `pg`.
- **Banco:** PostgreSQL 15 nas imagens Compose; evolução do schema com Prisma Migrate.
- **Autenticação e segurança:** JWT, bcryptjs, Helmet, CORS, HPP e rate limiting.
- **Qualidade e documentação:** Jest, Supertest, ESLint, Swagger/OpenAPI e `docx`.
- **Infraestrutura:** Docker Compose e Nginx para servir o frontend estático.

## Estrutura do projeto

```text
qa-control-center/
├── backend/
│   ├── src/               # Rotas, serviços, validação, autenticação e banco
│   ├── prisma/            # Schema e migrations
│   └── tests/             # Testes unitários e HTTP/integração
├── frontend/
│   ├── src/               # Páginas, componentes, hooks e cliente HTTP
│   └── tests/             # Testes isolados da interface
├── docs/                  # Documentação técnica e funcional
├── db/init.sql/           # Inicialização SQL legada
├── docker-compose.yml
├── docker-compose.prod.yml
├── openapi.json
├── QA_Control_Center.postman_collection.json
└── postman/environments/   # Ambientes importáveis do Postman
```

## Configuração e inicialização local

1. Use Ubuntu no WSL, Node **22.13+ na linha 22** e dependências Linux compatíveis.
2. Siga o [guia de instalação](docs/instalacao.md) para instalar dependências, preparar um banco novo autorizado e configurar o ambiente.
3. Configure `DB_*`, `JWT_SECRET`, `REGISTER_TOKEN` e `DATABASE_URL` no backend; no frontend, `VITE_API_BASE_URL`. Não reutilize credenciais versionadas.
4. Com banco, schema e configuração aprovados, inicie em dois terminais:

```bash
# Terminal 1, a partir da raiz
cd backend
npm run dev
```

```bash
# Terminal 2, a partir da raiz
cd frontend
npm run dev
```

URLs locais padrão: frontend **http://localhost:5173** e API **http://localhost:3001**.
O cadastro inicial usa `POST /auth/register`, campos `name`, `email`, `password`
e header `x-register-token`.

**Cuidados com o workspace existente:** não executar Compose ou migrations
indiscriminadamente. Os bancos nas portas **5433, 5434, 5435 e 5436** estão
preservados; o Compose local inclui o banco de testes legado e SQL de inicialização
que não substitui as migrations atuais. Consulte o guia antes de iniciar recursos.

## Fluxo de uso

**Test Cases → Test Suites → Test Plans → Executions → Reports**

1. Cadastre os casos, opcionalmente vinculados a um Project.
2. Agrupe os casos em suítes e associe as suítes a um plano.
3. Execute o plano elegível e registre os resultados de cada caso.
4. Finalize a execução e consulte ou exporte o relatório.

## Testes automatizados

- **Backend:** testes unitários isolados e suítes HTTP/integração com Jest e Supertest.
- **Frontend:** testes de componentes, sessão, permissões e fluxos com mocks; não são E2E reais.
- **E2E Playwright:** planejado para repositório separado.

Comandos, resultados históricos e limitações estão no [guia de testes](docs/testes.md).
Não usar `npm test` backend indiscriminadamente: o setup legado aponta para o banco protegido em 5434.

## Postman e API

A [coleção QA_Control_Center.postman_collection.json](QA_Control_Center.postman_collection.json) reúne 62 requisições organizadas por módulos, correspondentes às operações do [OpenAPI](openapi.json). O Swagger UI está disponível em `/api-docs/`.

### Importação e configuração

No Postman, use **Import** para importar a coleção e os três arquivos de ambiente.

| Ambiente | Arquivo | `baseUrl` inicial |
|---|---|---|
| DEV | [QA_Control_Center_DEV.postman_environment.json](postman/environments/QA_Control_Center_DEV.postman_environment.json) | `http://localhost:3001` |
| TESTE | [QA_Control_Center_TESTE.postman_environment.json](postman/environments/QA_Control_Center_TESTE.postman_environment.json) | Vazio |
| PROD | [QA_Control_Center_PROD.postman_environment.json](postman/environments/QA_Control_Center_PROD.postman_environment.json) | Vazio |

1. Selecione o ambiente no Postman. Para TESTE e PROD, preencha `baseUrl` com a URL confirmada da API, sem barra final. A conexão com o PostgreSQL é configurada no backend.
2. Preencha localmente `synthetic_email` e `synthetic_password` e execute `POST /auth/login`. A coleção captura `jwt_token` no ambiente ativo e o usa como Bearer nas rotas autenticadas. O cadastro usa `register_token`. O logout bem-sucedido limpa o token e os dados da sessão nesse mesmo ambiente.
3. Use os IDs capturados das respostas de criação ou informe os IDs dos recursos existentes no ambiente selecionado. Ative os parâmetros opcionais de paginação e filtros na aba **Params** quando necessário. Os valores capturados e os ajustes de variáveis ficam separados por ambiente.

### Cuidados ao executar requisições

A coleção é uma ferramenta de desenvolvimento e testes e fica fora do deploy da aplicação. Escritas e exclusões modificam os dados no backend selecionado. A rota `GET /stats` pode executar DDL. Selecionar PROD não autoriza testes destrutivos. Mantenha tokens, senhas e credenciais reais nos valores locais do Postman e fora do Git.

Consulte o contrato de endpoints, autenticação e respostas em [API.md](API.md).

## Segurança

- Senhas com bcryptjs; JWT com expiração configurável e autorização no backend.
- A interface armazena sessão no navegador; logout local não equivale à revogação do token.
- Não versionar segredos nem reutilizar valores públicos de exemplos em produção.
- Projeto em evolução, com limitações e pendências no [roadmap](roadmap.md); não declarado pronto para produção.

Consulte [SECURITY.md](SECURITY.md) para política de reporte e cuidados operacionais.

## Documentação completa

- [Índice técnico e funcional](docs/README.md)
- [Instalação](docs/instalacao.md) e [desenvolvimento](docs/desenvolvimento.md)
- [Testes e evidências](docs/testes.md)
- [Preparação para produção](docs/preparacao-producao.md)
