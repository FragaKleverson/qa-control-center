# QA Control Center

Plataforma para organizar requisitos, casos, suítes e planos de teste, registrar
execuções e resultados e gerar relatórios JSON/DOCX. As execuções representam
registro e acompanhamento de testes; a aplicação não executa automaticamente
scripts de automação.

## Estado do projeto

Revisão documental estática de 17/11/2026, baseada no código e no working tree da
branch `docs/requisitos-api-documentacao`, HEAD-base
`f6e2465a95516789760c70b6eeb39e01297aa33c`. Nenhum teste, build ou serviço foi
executado nesta revisão. O projeto foi usado localmente e em experimento de servidor
de testes; **não está declarado pronto ou homologado para produção**.

O [roadmap.md](roadmap.md) é a única fonte oficial de planejamento e progresso.
O item 17 está **concluído com ressalvas**, por aceite do responsável; a Fase 5
continua aberta. Cobertura backend, cenário integrado posterior de relatórios e
E2E continuam pendentes. Carga/performance backend permanece adiada a pedido.

| Termo | Interpretação nesta documentação |
|---|---|
| Implementado | Comportamento localizado no código; não significa homologação |
| Testado historicamente | Resultado anterior com escopo/ambiente delimitados |
| Pendente de validação | Garantia ainda não demonstrada para o cenário atual |
| Planejado | Trabalho futuro no roadmap; não funcionalidade entregue |

## Stack e arquitetura

| Camada | Implementação confirmada nos manifests/artefatos |
|---|---|
| Interface | React 19, React Router DOM 7, Vite 8; SPA |
| API | Node.js, Express 5, JavaScript CommonJS, Zod |
| Persistência | PostgreSQL 15 nas imagens Compose; pool `pg` e SQL nos serviços |
| Evolução do schema | Prisma Migrate 7.8; API não consulta via Prisma Client |
| Autenticação | `jsonwebtoken`, `bcryptjs`, JWT com JTI e RBAC |
| Relatórios e contratos | `docx`, `swagger-jsdoc`, `swagger-ui-express`, OpenAPI |
| Qualidade | Jest 30, Supertest, ESLint; frontend com VM/hooks/mocks |
| Infraestrutura disponível | Dockerfiles Node 22 Alpine, Compose e Nginx 1.27 Alpine |

As versões exatas são registradas nos lockfiles; imagens com tags não comprovam
versão efetivamente implantada. Linha operacional documentada: Node 22.13+ na
linha 22, com histórico em 22.17.1. Validações recentes específicas também usaram
Node Linux 26.13.0; isso não estabelece suporte irrestrito a outras versões.

Fluxo: navegador → React/cliente fetch → Express/JWT/RBAC/validators → serviços
com SQL → PostgreSQL. Prisma versiona o schema separadamente. Consulte a
[arquitetura](docs/arquitetura.md) e o [guia de desenvolvimento](docs/desenvolvimento.md).

## Funcionalidades implementadas e limites

- **Autenticação:** cadastro controlado por `x-register-token`, login e emissão de
  JWT com expiração configurável (padrão 8h). Cadastro recebe `name`, `email` e
  `password`; primeiro usuário recebe Admin, demais QA. Bootstrap concorrente não
  está serializado. Forgot/reset existem na API, sem entrega de e-mail implementada.
- **Sessão:** token/usuário em localStorage. Rotas visuais usam presença do token;
  chamadas protegidas com 401 limpam sessão e redirecionam ao login. Não há timer
  de expiração no cliente; 403 não encerra sessão. Logout da interface é local;
  revogação por JTI é operação separada no backend.
- **Usuários e permissões:** administração via API; Admin/QA criam/editam,
  Admin exclui/restaura/remove vínculos, Reader consulta. Administração exige
  Admin; gerar/exportar relatórios exige Admin/QA. Não há isolamento geral por
  dono, projeto ou tenant. Restrições de estado também se aplicam ao Admin.
- **Projects:** catálogo independente em `/projects`, com nome/descrição,
  auditoria transacional, exclusão lógica e restauração na API.
- **Test Cases:** `/projetos` mantém o recurso legado de casos, com título,
  descrição, feature e cenários JSON. `project_id` é vínculo opcional ao catálogo;
  omissão no PUT preserva, `null` remove. A interface oferece edição Gherkin do
  primeiro cenário, preservando adicionais; não implica execução automática.
- **Requirements:** título, descrição, status e prioridade. **Sem vínculo
  implementado com Projects ou Test Cases.**
- **Test Suites e Plans:** associação de casos/suítes; planos novos elegíveis
  podem ser executados uma vez, com transação/lock e ambiente persistido. Planos
  executados ou legados `review_required` bloqueiam mutações/reexecução conforme
  o contrato. Exclusão/restauração não libera execução; não há endpoint de liberação.
- **Execuções:** execução de plano materializa resultados; criação direta insere
  só o registro. Resultados aceitam status/comentário; finalização agrega o estado.
  Bloqueios e atomicidade têm limites documentados no [contrato HTTP](API.md).
- **Relatórios/Dashboard:** filtros, agregados, histórico e DOCX. Paginação opt-in
  nas listagens elegíveis; seletores/relatórios ainda podem carregar coleções
  completas. Dashboard mantém referências legadas, DDL em consulta e zeros em erro.
- **Operação:** health check 200/503, auditoria nos pontos instrumentados e
  exclusão lógica dos recursos principais; usuários/associações têm DELETE físico.

Descrições completas: [26 RFs](docs/requisitos/funcionais.md),
[15 RNFs](docs/requisitos/nao-funcionais.md), [19 RNs](docs/regras-de-negocio.md)
e [rastreabilidade](docs/rastreabilidade.md). Os critérios propostos nesses
catálogos não equivalem a requisitos homologados.

## Estrutura do repositório

```text
backend/
  src/                 # app/server, config, middleware, validators, routes, services
  prisma/              # schema e histórico de migrations
  scripts/             # runners com guardas; não são autorização de execução
  tests/               # HTTP/integração, segurança e unitários
  jest*.js             # separar isolados do setup legado de banco
frontend/
  src/                 # pages, components, contexts, routes, hooks, services
  tests/               # testes isolados com mocks; sem E2E real
  vite.config.js
  eslint.config.js
db/init.sql/           # inicialização SQL legada, não histórico completo atual
docs/                  # requisitos, arquitetura, regras, rastreabilidade e guias
openapi.json           # exportação derivada de Swagger/anotações
QA_Control_Center.postman_collection.json
docker-compose*.yml    # configurações disponíveis, não prova de implantação
```

## Instalação e execução local

Siga o [guia de instalação](docs/instalacao.md). No Windows, usar **Ubuntu no WSL**
e confirmar o caminho real do checkout. Docker Desktop não está instalado nesta
máquina; não presumir integração ou Engine disponível. Instalação de dependências,
serviços e preparação de schema exigem autorização e destino aprovado.

Não executar `docker compose up` indiscriminadamente: o Compose local inclui
`db-test`, nomes/volumes fixos e SQL legado. Não usar os bancos preservados nas
portas **5433, 5434, 5435 ou 5436** para migrations, reset ou testes destrutivos.
Uma instalação nova precisa de banco exclusivo e histórico de schema aprovado;
SQL de inicialização do Compose não substitui as migrations atuais.

Após instalação autorizada, configuração e schema confirmados, os scripts são
`npm run dev` em `backend/` e, em outro terminal, em `frontend/`. Backend inicia
`node src/server.js`, sem watcher. Frontend usa Vite. URLs locais padrão: interface
`http://localhost:5173`, API `http://localhost:3001`; não presumir que estejam ativas.

### Configuração

- Backend: `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`,
  `JWT_SECRET`, `REGISTER_TOKEN`; `PORT`, `JWT_EXPIRES_IN`, `ALLOWED_ORIGINS` e
  limites/custo opcionais. Detalhes e defaults: [instalação](docs/instalacao.md).
- Prisma: `DATABASE_URL`, coerente com `DB_*`; configuração padrão importa dotenv.
- Frontend: `VITE_API_BASE_URL`, pública e incorporada no build; nunca colocar
  segredos em variáveis `VITE_*`. Sem configuração, usa `http://localhost:3001`.
- Arquivo raiz do Compose não substitui automaticamente `backend/.env`. Templates
  e valores historicamente versionados são públicos e **não devem ser reutilizados
  como credenciais**, mesmo em implantação de teste exposta. Não copiar valores
  reais para documentação ou exemplos.

## Contratos HTTP e Postman

- Swagger UI: `<origem-da-api>/api-docs/`; JSON gerado: `/openapi.json`.
- Fonte: [swagger.js](backend/src/swagger.js) e anotações dos
  [routers](backend/src/routes/); [openapi.json](openapi.json) é exportação derivada.
- **62 operações explícitas**, incluindo health e JSON da especificação;
  [API.md](API.md) detalha contratos, permissões e limites.
- Importar [QA_Control_Center.postman_collection.json](QA_Control_Center.postman_collection.json):
  62 requisições, 45 variáveis e 123 exemplos sintéticos. **Revisada offline,
  sem homologação de execução no Postman real.**
- Coleção bloqueada por padrão; requer destino descartável externamente verificado,
  IDs capturados com contexto e autorização individual por operação. Há 41
  operações controladas, incluindo `GET /stats` pelo DDL; 29 de alto impacto exigem
  confirmação adicional. Flags são consumidas antes do envio. Não usar Runner
  como autorização implícita. Variável de sessão: `jwt_token`, inicialmente vazia.
- Guardas não provam identidade do banco nem resistem a edição deliberada. Mocks
  não comprovam transporte real; limpar valores capturados antes de compartilhar.

## Qualidade e evidências

Resultados abaixo são **históricos**, não reexecuções desta revisão:

| Camada | Evidência registrada | Limite |
|---|---|---|
| Backend unitário | 22 suítes / 537 testes PASS; cobertura 59,11% statements, 52,63% branches, 58,36% functions, 58,47% lines | Três pisos pendentes frente a 70/50/65/70; não cobre integração |
| Regressão frontend | 15 suítes / 220 testes PASS, WSL Node 26.13.0 e Jest 30.4.2 | 14 suítes frontend + contrato de API; mocks, não E2E |
| ESLint frontend | 0 erros / 0 avisos em 53 arquivos | Sem nova execução aqui |
| Build Vite isolado | Código 0, 63 módulos, cinco artefatos | Build sem .env em /tmp não é release pronta para produção |
| Segurança/performance frontend | Auditorias estáticas aceitas no item 17 | Sem segurança integrada ou medição em navegador |
| Integração/manual anteriores | 339 integrados; fluxo 9/9 e RBAC 6/6; ensaio sintético com 10 migrations e 60 registros preservados | Escopos anteriores, não somar com contagens atuais nem presumir schema dos bancos protegidos |

O registro anterior de 651 isolados/27 suítes permanece no
[estado de 04/11](backend/FEATURE-VALIDATION-STATUS.md); não é a mesma seleção das
medições posteriores. Prisma validate foi aprovado historicamente nesse registro.
Caminhos de evidências e estratégia: [testes](docs/testes.md). Artefatos de `/tmp`
são efêmeros; existência/preservação não foram verificadas nesta entrega.

## Limitações e próximos passos

BUG-001 a BUG-004, SEC-01 a SEC-04 e PERF-01/PERF-02 permanecem no roadmap, sem
correção por esta documentação. Incluem respostas antigas em TestSuites,
callbacks após finalização, resposta inválida em Requirements e limpeza de URL
Blob em exceção. Há riscos de sessão, dados volumosos e configuração de implantação.

E2E Playwright está **planejado por último em repositório separado**, provisoriamente
`qa-control-center-e2e`; não instalado ou implementado neste repositório. Segurança
integrada, performance dinâmica, acessibilidade, CI/CD, recuperação e implantação
exigem critérios/validações próprios; metas não aprovadas seguem A DEFINIR.

## Documentação e segurança

- [Índice técnico e funcional](docs/README.md): documentos anteriores, com notas
  históricas sobre entregas então pendentes; para o estado atual de API/Postman,
  usar as fontes e a seção contratual deste README.
- [Instalação](docs/instalacao.md) · [Desenvolvimento](docs/desenvolvimento.md) ·
  [Testes](docs/testes.md) · [Preparação para produção](docs/preparacao-producao.md).
- [Política de segurança](SECURITY.md) e [roadmap oficial](roadmap.md).

Os guias descrevem procedimentos e pré-condições; não autorizam executar comandos
contra ambientes existentes nem declaram conformidade ou segurança de produção.
