# API HTTP — QA Control Center

Contrato revisado estaticamente no commit-base `16ebda87de71e8ea8f57cfb158089b02cba81c0f` e working tree inspecionado. Não comprova execução HTTP, segurança integrada ou deploy.

## Fonte canônica

- [swagger.js](backend/src/swagger.js): componentes/configuração; blocos `@openapi` dos [routers](backend/src/routes/): operações.
- [openapi.json](openapi.json): exportação derivada, não fonte independente. `GET /openapi.json` retorna o objeto gerado, não lê o arquivo estático.
- `/api-docs/`: Swagger UI por middleware, HTML e assets; `/api-docs` pode redirecionar à barra final.
- [Requisitos](docs/requisitos/funcionais.md), [regras RN](docs/regras-de-negocio.md), [rastreabilidade](docs/rastreabilidade.md), [Projects/Test Cases](backend/PROJECTS-PERSISTENCE-CONTRACT.md), [planos](backend/TEST-PLAN-LIFECYCLE.md) e [RBAC](backend/RBAC-PERMISSIONS.md) complementam o contrato.
- [Postman](QA_Control_Center.postman_collection.json) ainda contém divergências; atualização pendente em entrega separada. Não afirmar cobertura completa.

## Autenticação e permissões

Use `Authorization: Bearer <JWT>`. Login recebe email/password e devolve token/user com id/name/email/role, sem hash. Cadastro usa **name**, email e password; exige **x-register-token**, não JWT. Login, cadastro, forgot/reset são públicos em relação ao JWT; logout exige JWT inclusive em test. Saúde/documentação são públicos antes das camadas globais.

Admin/QA criam/editam/adicionam vínculos; Admin exclui/restaura/remove vínculos; Reader consulta. Administração é Admin-only; gerar/exportar Reports exige Admin/QA. Não há isolamento geral por dono/equipe. `x-roles` descreve a regra implementada, não cria controle adicional.

`NODE_ENV=test` injeta identidade nos recursos de negócio e desativa limitadores; não representa implantação ou autenticação integrada. JWT sem JTI não consulta blocklist. Mudança de papel não invalida automaticamente tokens emitidos. Logout da UI é local e não chama revogação.

## Validação e respostas

Erros comuns usam `{ error: string }`; Zod adiciona `detalhes: [{ campo, mensagem }]`. Códigos específicos pressupõem que camadas anteriores não rejeitaram a requisição. Campos desconhecidos são descartados nos schemas Zod aplicáveis; não generalizar a toda rota.

| Código | Condição |
|---|---|
| 200 / 201 | Sucesso/criação conforme operação; DELETE usa JSON, não 204 |
| 400 | JSON malformado, NOT NULL do banco ou erro de serviço; reset com token fornecido não encontrado/usado/expirado |
| 401 | JWT ausente/inválido/expirado/revogado ou credenciais de login incorretas |
| 403 | Perfil insuficiente, token de cadastro ou proteção da própria conta |
| 404 | Ausente/excluído ou estado incompatível de restore onde o serviço verifica; não universal para vínculos/resultados |
| 409 | Conflito de estado do plano, ausência de suítes/casos ativos, reexecução ou unicidade |
| 413 | Body JSON acima do limite de 500 kb |
| 422 | Zod, FK inválida ou regra específica; token de reset omitido/vazio também usa 422 |
| 429 | Limiter configurado atingido; não comprova capacidade de carga |
| 500 | Falha interna, mascarada pelo handler em produção; não garante rollback |
| 503 | Saúde degradada; não é código garantido de toda falha de banco |

CORS permite origens configuradas e requisições sem Origin. HTTPS depende da implantação, não é garantia deste contrato. `/health` ainda expõe mensagem do driver em erro, fora do mascaramento global.

## Identidades e formatos

- `/projects` é catálogo independente, campos nome/descricao. `/projetos` são casos legados, campos titulo/descricao/feature/cenarios. projeto_id de suíte/filtro de execução é legado, não projects.id.
- project_id do caso: número estrito positivo até 2147483647 ou null. POST omitido cria sem vínculo; PUT omitido preserva; null remove; ID ativo vincula. Nome/exclusão do pai no GET são atuais, não snapshot.
- cenarios aceita qualquer JSON; PUT omitido preserva, informado substitui, inclusive [] e JSON null.
- ID de rota em /projects é estrito, sem zero/zeros iniciais. IDs legados usam regex decimal que aceita zero/zeros iniciais. Inputs numéricos com z.coerce usam Number(); schemas de coerção descrevem isso sem impor tipo JSON artificialmente estrito.
- Page/limit são opt-in: envelope data/total/page/limit, defaults 1/20 e máximo 100 nas sete listagens elegíveis. Sem ambos, array legado. Reports retorna executions/stats/suiteStats; apenas executions é paginado e sem paginação limita a 100.
- Auditoria usa parseInt e paginação própria sem o limite/validator comum. COUNT/SUM brutos de pg podem ser strings; SUM pode ser null. Agregados normalizados pelos serviços são números.
- Respostas de SELECT/RETURNING podem conter colunas adicionais; campos enriquecidos/agregados não aparecem em todas as operações. Schemas de resposta não exigem indiscriminadamente esses campos.

## Estados e limitações

- Plano novo eligible exige título/ambiente. Executado/review_required bloqueia edição/vínculos/reexecução. Excluir/restaurar não libera; não há endpoint de liberação de legado. Execute usa ambiente persistido, casos ativos distintos, transação/lock e UNIQUE plan_id. Body é objeto; campos antigos são descartados.
- Criar execução diretamente só insere registro, sem materializar resultados ou executar scripts. Resultado atualizado marca running e verifica finalized sem transação abrangente. PUT geral não tem essa guarda.
- Finalize: algum failed gera failed; todos passed com total positivo gera passed; demais completed, inclusive pending/zero. Repetição 422, ausência 404; não filtra deleted_at nem tem lock/transação abrangente. Caracterização não é aprovação dos riscos.
- Recursos principais usam soft delete; usuários/associações usam DELETE físico. Agregados/históricos não filtram uniformemente excluídos.
- Reports usa startDate/endDate/suite_id truthy parametrizados, endDate inclusiva; sem Zod específico dos filtros. Geração integral/N+1, títulos atuais e suíte principal limitam histórico multi-suíte. DOCX é buffer, não recurso persistido.
- Projects audita na transação; helper legado é best-effort e não cobre toda mutação.
- Dashboard conta casos legados em totalProjects, executa DDL e pode responder zeros com 200 após erro. Forgot não envia e-mail; _dev_token somente fora de produção para usuário encontrado.
- BUG-001 a BUG-004 e ressalvas do roadmap não foram corrigidos nesta entrega.

## Inventário de operações explícitas

62 operações: 61 nos 11 routers e GET /openapi.json em app.js. HEAD implícito, OPTIONS/preflight e assets/HTML da UI são comportamentos Express/middleware, não novos endpoints de negócio. Parâmetros, body, validators, respostas, RN e limitações estão detalhados por operação na especificação.

| Método | Caminho | Autenticação/perfis | Parâmetros (local:nome) | Body | Respostas | RN |
|---|---|---|---|---|---|---|
| GET | `/openapi.json` | Público | — | — | 200 | — |
| GET | `/projetos` | JWT: admin, qa, reader | query:page, query:limit, query:sort_by, query:sort_dir | — | 200, 400, 401, 413, 422, 429, 500 | RN-006, RN-007, RN-008, RN-009, RN-015, RN-018, RN-019 |
| POST | `/projetos` | JWT: admin, qa | — | TestCaseCreate | 201, 400, 401, 403, 409, 413, 422, 429, 500 | RN-006, RN-007, RN-008, RN-009, RN-015, RN-018, RN-019 |
| GET | `/projetos/{id}` | JWT: admin, qa, reader | path:id | — | 200, 400, 401, 404, 413, 422, 429, 500 | RN-006, RN-007, RN-008, RN-009, RN-015, RN-018, RN-019 |
| PUT | `/projetos/{id}` | JWT: admin, qa | path:id | TestCaseUpdate | 200, 400, 401, 403, 404, 409, 413, 422, 429, 500 | RN-006, RN-007, RN-008, RN-009, RN-015, RN-018, RN-019 |
| DELETE | `/projetos/{id}` | JWT: admin | path:id | — | 200, 400, 401, 403, 404, 413, 422, 429, 500 | RN-006, RN-007, RN-008, RN-009, RN-015, RN-018, RN-019 |
| POST | `/projetos/{id}/restore` | JWT: admin | path:id | — | 200, 400, 401, 403, 404, 413, 422, 429, 500 | RN-006, RN-007, RN-008, RN-009, RN-015, RN-018, RN-019 |
| GET | `/projects` | JWT: admin, qa, reader | query:page, query:limit | — | 200, 400, 401, 413, 422, 429, 500 | RN-006, RN-007, RN-018 |
| POST | `/projects` | JWT: admin, qa | — | ProjectCreate | 201, 400, 401, 403, 409, 413, 422, 429, 500 | RN-006, RN-007, RN-018 |
| GET | `/projects/{id}` | JWT: admin, qa, reader | path:id | — | 200, 400, 401, 404, 413, 422, 429, 500 | RN-006, RN-007, RN-018 |
| PUT | `/projects/{id}` | JWT: admin, qa | path:id | ProjectUpdate | 200, 400, 401, 403, 404, 409, 413, 422, 429, 500 | RN-006, RN-007, RN-018 |
| DELETE | `/projects/{id}` | JWT: admin | path:id | — | 200, 400, 401, 403, 404, 413, 422, 429, 500 | RN-006, RN-007, RN-018 |
| POST | `/projects/{id}/restore` | JWT: admin | path:id | — | 200, 400, 401, 403, 404, 413, 422, 429, 500 | RN-006, RN-007, RN-018 |
| GET | `/test-suites` | JWT: admin, qa, reader | query:page, query:limit | — | 200, 400, 401, 413, 422, 429, 500 | RN-006, RN-007, RN-015, RN-018 |
| POST | `/test-suites` | JWT: admin, qa | — | TestSuiteCreate | 201, 400, 401, 403, 409, 413, 422, 429, 500 | RN-006, RN-007, RN-015, RN-018 |
| GET | `/test-suites/{id}` | JWT: admin, qa, reader | path:id | — | 200, 400, 401, 404, 413, 422, 429, 500 | RN-006, RN-007, RN-015, RN-018 |
| PUT | `/test-suites/{id}` | JWT: admin, qa | path:id | TestSuiteUpdate | 200, 400, 401, 403, 404, 409, 413, 422, 429, 500 | RN-006, RN-007, RN-015, RN-018 |
| DELETE | `/test-suites/{id}` | JWT: admin | path:id | — | 200, 400, 401, 403, 404, 413, 422, 429, 500 | RN-006, RN-007, RN-015, RN-018 |
| POST | `/test-suites/{id}/restore` | JWT: admin | path:id | — | 200, 400, 401, 403, 404, 413, 422, 429, 500 | RN-006, RN-007, RN-015, RN-018 |
| GET | `/test-suites/{id}/cases` | JWT: admin, qa, reader | path:id | — | 200, 400, 401, 413, 422, 429, 500 | RN-006, RN-007 |
| POST | `/test-suites/{id}/cases` | JWT: admin, qa | path:id | AddCaseInput | 201, 400, 401, 403, 409, 413, 422, 429, 500 | RN-006, RN-007 |
| DELETE | `/test-suites/{id}/cases/{projetoId}` | JWT: admin | path:id, path:projetoId | — | 200, 400, 401, 403, 413, 422, 429, 500 | RN-006, RN-015 |
| GET | `/requirements` | JWT: admin, qa, reader | query:page, query:limit | — | 200, 400, 401, 413, 422, 429, 500 | RN-006, RN-010, RN-015, RN-018 |
| POST | `/requirements` | JWT: admin, qa | — | RequirementCreate | 201, 400, 401, 403, 409, 413, 422, 429, 500 | RN-006, RN-010, RN-015, RN-018 |
| GET | `/requirements/{id}` | JWT: admin, qa, reader | path:id | — | 200, 400, 401, 404, 413, 422, 429, 500 | RN-006, RN-010, RN-015, RN-018 |
| PUT | `/requirements/{id}` | JWT: admin, qa | path:id | RequirementUpdate | 200, 400, 401, 403, 404, 409, 413, 422, 429, 500 | RN-006, RN-010, RN-015, RN-018 |
| DELETE | `/requirements/{id}` | JWT: admin | path:id | — | 200, 400, 401, 403, 404, 413, 422, 429, 500 | RN-006, RN-010, RN-015, RN-018 |
| POST | `/requirements/{id}/restore` | JWT: admin | path:id | — | 200, 400, 401, 403, 404, 413, 422, 429, 500 | RN-006, RN-010, RN-015, RN-018 |
| GET | `/test-plans` | JWT: admin, qa, reader | query:page, query:limit | — | 200, 400, 401, 413, 422, 429, 500 | RN-006, RN-011, RN-012, RN-015 |
| POST | `/test-plans` | JWT: admin, qa | — | TestPlanCreate | 201, 400, 401, 403, 409, 413, 422, 429, 500 | RN-006, RN-011, RN-012, RN-015 |
| GET | `/test-plans/{id}` | JWT: admin, qa, reader | path:id | — | 200, 400, 401, 404, 413, 422, 429, 500 | RN-006, RN-011, RN-012, RN-015 |
| PUT | `/test-plans/{id}` | JWT: admin, qa | path:id | TestPlanUpdate | 200, 400, 401, 403, 404, 409, 413, 422, 429, 500 | RN-006, RN-011, RN-012, RN-015 |
| DELETE | `/test-plans/{id}` | JWT: admin | path:id | — | 200, 400, 401, 403, 404, 413, 422, 429, 500 | RN-006, RN-011, RN-012, RN-015 |
| POST | `/test-plans/{id}/restore` | JWT: admin | path:id | — | 200, 400, 401, 403, 404, 413, 422, 429, 500 | RN-006, RN-011, RN-012, RN-015 |
| GET | `/test-plans/{id}/suites` | JWT: admin, qa, reader | path:id | — | 200, 400, 401, 404, 413, 422, 429, 500 | RN-011, RN-012 |
| POST | `/test-plans/{id}/suites` | JWT: admin, qa | path:id | AddSuiteInput | 201, 400, 401, 403, 404, 409, 413, 422, 429, 500 | RN-006, RN-011 |
| DELETE | `/test-plans/{id}/suites/{suiteId}` | JWT: admin | path:id, path:suiteId | — | 200, 400, 401, 403, 404, 409, 413, 422, 429, 500 | RN-006, RN-011 |
| POST | `/test-plans/{id}/execute` | JWT: admin, qa | path:id | ExecutePlanInput | 201, 400, 401, 403, 404, 409, 413, 422, 429, 500 | RN-011, RN-012 |
| GET | `/stats` | JWT: admin, qa, reader | — | — | 200, 400, 401, 413, 429, 500 | RN-007 |
| GET | `/execucoes` | JWT: admin, qa, reader | query:page, query:limit, query:projeto_id | — | 200, 400, 401, 413, 422, 429, 500 | RN-006, RN-014, RN-015 |
| POST | `/execucoes` | JWT: admin, qa | — | ExecutionCreate | 201, 400, 401, 403, 409, 413, 422, 429, 500 | RN-006, RN-014, RN-015 |
| GET | `/execucoes/{id}` | JWT: admin, qa, reader | path:id | — | 200, 400, 401, 404, 413, 422, 429, 500 | RN-006, RN-014, RN-015 |
| PUT | `/execucoes/{id}` | JWT: admin, qa | path:id | ExecutionUpdate | 200, 400, 401, 403, 404, 409, 413, 422, 429, 500 | RN-006, RN-014, RN-015 |
| DELETE | `/execucoes/{id}` | JWT: admin | path:id | — | 200, 400, 401, 403, 404, 413, 422, 429, 500 | RN-006, RN-014, RN-015 |
| POST | `/execucoes/{id}/restore` | JWT: admin | path:id | — | 200, 400, 401, 403, 404, 413, 422, 429, 500 | RN-006, RN-014, RN-015 |
| GET | `/execucoes/stats/summary` | JWT: admin, qa, reader | — | — | 200, 400, 401, 413, 429, 500 | RN-014 |
| GET | `/execucoes/{id}/results` | JWT: admin, qa, reader | path:id | — | 200, 400, 401, 413, 422, 429, 500 | RN-014 |
| PUT | `/execucoes/{id}/results/{projetoId}` | JWT: admin, qa | path:id, path:projetoId | ResultUpdate | 200, 400, 401, 403, 404, 413, 422, 429, 500 | RN-014 |
| POST | `/execucoes/{id}/finalize` | JWT: admin, qa | path:id | — | 200, 400, 401, 403, 404, 413, 422, 429, 500 | RN-013, RN-014 |
| GET | `/relatorios` | JWT: admin, qa, reader | query:page, query:limit | — | 200, 400, 401, 413, 422, 429, 500 | RN-015, RN-016, RN-017 |
| POST | `/relatorios/generate` | JWT: admin, qa | — | ReportFilters | 200, 400, 401, 403, 413, 429, 500 | RN-017 |
| POST | `/relatorios/export` | JWT: admin, qa | — | ReportFilters | 200, 400, 401, 403, 413, 429, 500 | RN-017 |
| POST | `/auth/register` | x-register-token | — | RegisterInput | 201, 400, 403, 409, 413, 422, 429, 500 | RN-001 |
| POST | `/auth/login` | Público | — | LoginInput | 200, 400, 401, 413, 422, 429, 500 | RN-002, RN-003 |
| POST | `/auth/logout` | JWT: admin, qa, reader | — | — | 200, 400, 401, 413, 429, 500 | RN-004 |
| POST | `/auth/forgot-password` | Público | — | ForgotInput | 200, 400, 413, 422, 429, 500 | RN-005 |
| POST | `/auth/reset-password` | Público | — | ResetInput | 200, 400, 413, 422, 429, 500 | RN-005 |
| GET | `/admin/usuarios` | JWT: admin | — | — | 200, 400, 401, 403, 413, 429, 500 | RN-006 |
| PATCH | `/admin/usuarios/{id}/role` | JWT: admin | path:id | RoleInput | 200, 400, 401, 403, 404, 413, 422, 429, 500 | RN-003, RN-006 |
| DELETE | `/admin/usuarios/{id}` | JWT: admin | path:id | — | 200, 400, 401, 403, 404, 413, 422, 429, 500 | RN-006, RN-015 |
| GET | `/admin/audit-log` | JWT: admin | query:entity_type, query:entity_id, query:user_id, query:action, query:from, query:to, query:page, query:limit | — | 200, 400, 401, 403, 413, 429, 500 | RN-016, RN-018 |
| GET | `/health` | Público | — | — | 200, 503 | — |

## Exportação e validação offline

Com dependências existentes e atualização documental autorizada, da raiz:

```bash
node - <<'JS'
const fs = require('node:fs');
const spec = require('./backend/src/swagger');
fs.writeFileSync('openapi.json', JSON.stringify(spec, null, 2) + '\n');
JS
```

Importar somente swagger.js: não importar app.js, config/env ou db, nem carregar .env. O exportador escreve apenas openapi.json. swagger-jsdoc usa failOnErrors. A validação desta entrega também usa @apidevtools/swagger-parser instalado, com resolução externa desativada, e compara referências, IDs, métodos/caminhos e igualdade do JSON gerado/estático.

Isso não executa os validators Zod, HTTP, SQL ou RBAC real, nem comprova schema aplicado ou deploy. Não executar exemplos destrutivos contra bancos preservados nas portas 5433–5436. Consultar [estado](backend/FEATURE-VALIDATION-STATUS.md) e [migrations](backend/MIGRATIONS.md). Nenhum exemplo autoriza acesso ou escrita em banco.
