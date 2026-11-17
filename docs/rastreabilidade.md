# Rastreabilidade de requisitos e evidências

[Índice](README.md) · [RFs](requisitos/funcionais.md) · [RNFs](requisitos/nao-funcionais.md) · [Regras](regras-de-negocio.md)

## Convenções

Relação: **RF/RNF → RN → endpoint/tela → teste/cenário → execução/evidência**.
Uma linha pode apontar para várias suítes; isso não significa que cada suíte cobre
todos os critérios do requisito. Os testes listados são referências localizadas
por inspeção de seus cenários, não um inventário exaustivo de assertions.

| Código | Tipo de validação | Limite |
|---|---|---|
| U | Teste unitário/contrato isolado, incluindo rota com dependências simuladas | Não comprova SQL, locks ou rede reais |
| H | Teste HTTP/integrado do backend | Conferir setup: pode usar banco ou mocks; NODE_ENV=test pode injetar identidade |
| I | Teste de interface/cliente com mocks, VM ou DOM simulado | Não é navegador nem E2E; cliente HTTP real com fetch simulado continua isolado |
| M | Homologação manual histórica | Escopo específico e ambiente registrados, não automação E2E |
| E | E2E real com aplicação/navegador e dependências integradas | Não identificado como implementado neste repositório; futuro repositório separado |
| N | Sem execução comprovada para o cenário indicado | Pode haver teste existente ainda não executado ou ausência de teste; distinguir na linha |

**Nenhum teste foi executado nesta entrega documental.** “Existente” não significa
PASS ou homologação. “Pendente” refere-se à lacuna/evidência específica, não altera
o status oficial no roadmap. Referências a RN usam os IDs do [catálogo](regras-de-negocio.md).

## Registro de evidências

| ID | Fonte e natureza | Escopo e limitações |
|---|---|---|
| EV-EST | Leitura do código e dos testes no commit-base/working tree do [índice](README.md) | Evidência estática; não valida execução, schema aplicado ou implantação |
| EV-FE | [Roadmap, encerramento do item 17](../roadmap.md) | Regressão histórica: 15 suítes/220 testes; 14 frontend e contrato frontend-api-pagination. Não executada aqui; inclui caracterizações de defeitos |
| EV-BE | [Roadmap, medição unitária backend](../roadmap.md) | Histórico: 22 suítes/537 testes; cobertura 59,11/52,63/58,36/58,47; três pisos não atingidos. Não é aprovação automática de todo RF/RNF |
| EV-INT | [Estado consolidado](../backend/FEATURE-VALIDATION-STATUS.md) | 339 integrados em execuções anteriores, não nova regressão; não inclui automaticamente cenários adicionados depois |
| EV-MAN | [Estado](../backend/FEATURE-VALIDATION-STATUS.md), [RBAC](../backend/RBAC-PERMISSIONS.md), [homologação](../backend/BROWSER-HOMOLOGATION.md) | Resultados manuais históricos, com escopos distintos; não somar contagens nem converter em E2E |
| EV-TEC | [Roadmap, evidências técnicas frontend](../roadmap.md) | Lint 0 erros/avisos e build isolado aprovados anteriormente; segurança/performance estáticas, sem medição dinâmica em navegador |
| EV-PEND | [Roadmap, pendências e ressalvas](../roadmap.md) | BUG-001 a BUG-004, SEC/PERF, cenário posterior de relatórios, cobertura e E2E; não corrigidos por esta documentação |

Locais históricos declarados no roadmap: `/tmp/qa-frontend-regression.lgmn1x3q`,
`/tmp/qa-unit-coverage-final.ki8kats2`, `/tmp/qa-frontend-eslint.e_i8zofq` e
`/tmp/qa-frontend-build-execution.kf0lor3e`. São referências efêmeras, cuja presença
e integridade não foram revalidadas nesta entrega. Exportação durável/sanitizada
requer decisão própria; não versionar logs contendo segredos ou dados pessoais.
As 651 aprovações isoladas do resumo antigo são outro escopo/data, não incremento
das 537 backend ou das 220 frontend.

## Matriz funcional

Todos os links de testes são relativos ao repositório. Status refere-se à
implementação/evidência delimitada, sem certificar os critérios propostos.

Detalhes relevantes dos executores: rbac.test.js usa x-test-role no app em modo
test; security.test.js verifica JWT em mini-app protegido, enquanto outros casos
usam app com identidade injetada. health.test.js consulta o pool real nos cenários
saudáveis e substitui pool.query no cenário de falha. rate-limit.test.js usa
mini-apps e limiters próprios com bypass desabilitado, não a composição completa.
frontend-api-pagination.test.js reside no backend, mas testa cliente frontend
com fetch simulado (I). recordDetails.test.js usa SSR e Modal simulado; o cenário
de foco/teclado do Modal real está em testCaseProject.test.cjs com DOM simulado.

| RF | RN | Endpoint/tela | Teste existente / tipo | Evidência | Status e lacuna |
|---|---|---|---|---|---|
| [RF-001](requisitos/funcionais.md#rf-001) | RN-001 | POST /auth/register | H: [auth](../backend/tests/auth.test.js) | EV-EST/EV-INT | API implementada; nova execução e bootstrap concorrente não comprovados aqui |
| [RF-002](requisitos/funcionais.md#rf-002) | RN-002, RN-003 | POST /auth/login; Login | U: [login service](../backend/tests/unit/authService.login.test.js); H: [auth](../backend/tests/auth.test.js); I: [Login](../frontend/tests/login.test.cjs) | EV-EST/EV-BE/EV-FE; EV-INT histórico | Contratos existentes; não equivalem a fluxo E2E real |
| [RF-003](requisitos/funcionais.md#rf-003) | RN-003, RN-004 | ProtectedRoute/provider; HTTP 401/403 | I: [sessão](../frontend/tests/api-auth-session.test.cjs), [proteção](../frontend/tests/protectedRoute.test.cjs), [provider](../frontend/tests/lintRegression.test.cjs) | EV-EST/EV-FE/EV-PEND | Implementado com SEC-01/SEC-03; validação integrada pendente |
| [RF-004](requisitos/funcionais.md#rf-004) | RN-004 | POST /auth/logout; Sidebar | U: [middleware](../backend/tests/unit/authMiddleware.test.js); H: [auth](../backend/tests/auth.test.js); I: [Sidebar](../frontend/tests/sidebar.test.cjs) | EV-EST/EV-FE/EV-BE | Parcial; botão não chama revogação; nenhum E do fluxo identificado |
| [RF-005](requisitos/funcionais.md#rf-005) | RN-005 | Forgot/reset | H: [auth](../backend/tests/auth.test.js) | EV-EST/EV-INT | API parcial; entrega de e-mail ausente; concorrência/consumo sem prova atual |
| [RF-006](requisitos/funcionais.md#rf-006) | RN-003, RN-006 | /admin/usuarios | H com identidade injetada: [RBAC](../backend/tests/rbac.test.js), cenários administrativos de consulta, validação e proteção da própria conta | EV-EST/EV-INT/EV-MAN | API existente; testes listados não comprovam todo o CRUD administrativo nem invalidação imediata de papel; sem UI |
| [RF-007](requisitos/funcionais.md#rf-007) | RN-003, RN-006 | Recursos protegidos/ações | U: [deleteRbac](../backend/tests/unit/deleteRbac.test.js); H: [RBAC](../backend/tests/rbac.test.js); I: [visibilidade](../frontend/tests/rbacVisibility.test.cjs) | EV-EST/EV-MAN/EV-FE | Sem homologação global por testes com identidade injetada |
| [RF-008](requisitos/funcionais.md#rf-008) | RN-006, RN-007, RN-018 | /projects; Projects | U: [catálogo](../backend/tests/unit/projectCatalogService.test.js), [rotas](../backend/tests/unit/projectCatalogRoutes.test.js); H: [projects](../backend/tests/projects-integration.test.js); I: [Projects](../frontend/tests/projects.test.cjs) | EV-EST/EV-INT/EV-MAN/EV-FE | Implementado; schema/ambiente real não consultados |
| [RF-009](requisitos/funcionais.md#rf-009) | RN-006, RN-008, RN-015, RN-018 | /projects/:id e restore | U: [catálogo](../backend/tests/unit/projectCatalogService.test.js); H: [projects](../backend/tests/projects-integration.test.js); I: [Projects](../frontend/tests/projects.test.cjs) | EV-EST/EV-MAN/EV-FE | API existente; restore sem UI; rollback real exige evidência específica |
| [RF-010](requisitos/funcionais.md#rf-010) | RN-006, RN-007, RN-009, RN-015, RN-019 | /projetos; TestCases | U: [cenários](../backend/tests/unit/testCaseScenarios.test.js); H: [casos](../backend/tests/projetos.test.js); I: [TestCases](../frontend/tests/testCaseProject.test.cjs) | EV-EST/EV-INT/EV-MAN/EV-FE | Implementado; formatos históricos e concorrência têm limites |
| [RF-011](requisitos/funcionais.md#rf-011) | RN-006, RN-007, RN-008 | project_id; TestCases | U: [vínculo](../backend/tests/unit/testCaseProjectLink.test.js), [concorrência simulada](../backend/tests/unit/testCaseProjectLinkConcurrency.test.js); H: [projects](../backend/tests/projects-integration.test.js); I: [campo](../frontend/tests/testCaseProject.test.cjs) | EV-EST/EV-INT/EV-MAN/EV-FE | Locks simulados não são prova de PostgreSQL real |
| [RF-012](requisitos/funcionais.md#rf-012) | RN-006, RN-007, RN-010, RN-015 | /requirements; Requirements | H: [requirements](../backend/tests/requirements.test.js); I: [Requirements](../frontend/tests/requirements.test.cjs) | EV-EST/EV-INT/EV-FE/EV-PEND | BUG-003 caracterizado; nenhum vínculo com Project especificado |
| [RF-013](requisitos/funcionais.md#rf-013) | RN-006, RN-007, RN-015 | /test-suites; TestSuites | H: [suites](../backend/tests/test-suites.test.js); I: [TestSuites](../frontend/tests/testSuites.test.cjs) | EV-EST/EV-INT/EV-FE | API implementada; UI parcial para manutenção |
| [RF-014](requisitos/funcionais.md#rf-014) | RN-006, RN-007, RN-015 | /test-suites/:id/cases | H: [suites](../backend/tests/test-suites.test.js); I: [vínculos](../frontend/tests/testSuites.test.cjs) | EV-EST/EV-FE/EV-PEND | N: reprodução específica A→B de BUG-001 ainda pendente; teste após desmontagem não a substitui |
| [RF-015](requisitos/funcionais.md#rf-015) | RN-006, RN-011, RN-012, RN-015 | /test-plans e suítes; TestPlan | U: [planos](../backend/tests/unit/testPlansService.test.js); H: [plans](../backend/tests/test-plans.test.js); I: [sessões](../frontend/tests/testPlanSessions.test.cjs) | EV-EST/EV-INT/EV-MAN/EV-FE | Implementado; sem liberação de legado/restore na UI |
| [RF-016](requisitos/funcionais.md#rf-016) | RN-006, RN-011, RN-012 | /test-plans/:id/execute | U: [serviço](../backend/tests/unit/testPlansService.test.js); H: [ciclo concorrente](../backend/tests/test-plans-lifecycle.integration.test.js); I: [TestPlan](../frontend/tests/testPlanSessions.test.cjs) | EV-EST/EV-INT/EV-MAN/EV-FE | Execução única implementada; nova execução real não realizada |
| [RF-017](requisitos/funcionais.md#rf-017) | RN-006 | POST /execucoes; Run Suite | H: [execuções](../backend/tests/execucoes.test.js); I: [Executions](../frontend/tests/executions.test.cjs) | EV-EST/EV-INT/EV-FE | Parcial: teste de criação não comprova geração de resultados inexistente nesse serviço |
| [RF-018](requisitos/funcionais.md#rf-018) | RN-006, RN-014 | PUT results; Executions | U: [bloqueio](../backend/tests/unit/executionsService.finalize.test.js); H: [execuções](../backend/tests/execucoes.test.js); I: [callbacks](../frontend/tests/executions.test.cjs) | EV-EST/EV-BE/EV-FE/EV-PEND | BUG-002 caracterizado; atomicidade real pendente |
| [RF-019](requisitos/funcionais.md#rf-019) | RN-006, RN-013, RN-014 | POST finalize; Executions | U: [finalização](../backend/tests/unit/executionsService.finalize.test.js); H: [execuções](../backend/tests/execucoes.test.js); I: [finalização UI](../frontend/tests/executions.test.cjs) | EV-EST/EV-BE/EV-FE | Sem E; política de pendentes/zero e corridas não aprovadas implicitamente |
| [RF-020](requisitos/funcionais.md#rf-020) | RN-006, RN-007, RN-014, RN-015, RN-016 | /execucoes, summary/results | H: [execuções](../backend/tests/execucoes.test.js), [filtro global](../backend/tests/pagination-global.test.js), [soft delete](../backend/tests/soft-delete.test.js); I: [Executions](../frontend/tests/executions.test.cjs) | EV-EST/EV-INT/EV-FE | PUT geral e summary têm limites; sem garantia universal de imutabilidade |
| [RF-021](requisitos/funcionais.md#rf-021) | RN-006, RN-015, RN-016, RN-017 | /relatorios; Reports | U: [geração](../backend/tests/unit/reportsService.generateReport.test.js), [histórico](../backend/tests/unit/reports-history.test.js); H: [relatórios](../backend/tests/relatorios-stats.test.js); I: [DOCX](../frontend/tests/reports.test.cjs) | EV-EST/EV-BE/EV-FE/EV-PEND | BUG-004 caracterizado; N: cenário posterior de desempate/agregados existente, sem execução comprovada no roadmap |
| [RF-022](requisitos/funcionais.md#rf-022) | RN-007 | /stats; Dashboard | H: [stats](../backend/tests/relatorios-stats.test.js); I: [Dashboard](../frontend/tests/lintRegression.test.cjs) | EV-EST/EV-FE | Parcial; testes não aprovam DDL/zeros em falha nem semântica de Project |
| [RF-023](requisitos/funcionais.md#rf-023) | RN-006, RN-016, RN-018 | /admin/audit-log | H: [audit log](../backend/tests/audit-log.test.js); U: [auditoria catálogo](../backend/tests/unit/projectCatalogService.test.js) | EV-EST/EV-INT/EV-MAN | Cobertura/atomicidade parciais; sem prova de toda mutação auditada |
| [RF-024](requisitos/funcionais.md#rf-024) | RN-016 | Sete listagens e Pagination | U: [helper](../backend/tests/unit/pagination.test.js); I: [contrato cliente](../backend/tests/unit/frontend-api-pagination.test.js), [hook/listas](../frontend/tests/projects.test.cjs); H: [global](../backend/tests/pagination-global.test.js) | EV-EST/EV-FE/EV-INT | Implementado no escopo; sem paginação de toda coleção auxiliar |
| [RF-025](requisitos/funcionais.md#rf-025) | — | GET /health | H com pool real no sucesso e falha simulada: [health](../backend/tests/health.test.js) | EV-EST/EV-INT como contexto histórico | Endpoint existe; exposição de erro/SLA não homologados |
| [RF-026](requisitos/funcionais.md#rf-026) | — | A DEFINIR | N: sem teste de capacidade futura identificado; E futuro separado | EV-PEND | Planejado; não há fluxo único executável |

## Matriz não funcional

Critérios/metas e pendências completos no catálogo RNF. Onde há teste relacionado,
ele não cobre necessariamente a propriedade sistêmica inteira. Não há resultado
de carga, recursos, disponibilidade ou E2E sendo criado por esta matriz.

| RNF | RN | Endpoint/tela | Teste existente / tipo | Evidência | Status e lacuna |
|---|---|---|---|---|---|
| [RNF-001](requisitos/nao-funcionais.md#rnf-001) | RN-003, RN-004 | JWT/recursos protegidos | U: [auth middleware](../backend/tests/unit/authMiddleware.test.js); H: [security](../backend/tests/security.test.js) | EV-EST/EV-BE | Composição integrada atual não executada; modo test não basta |
| [RNF-002](requisitos/nao-funcionais.md#rnf-002) | RN-003, RN-006 | RBAC/ações | U: [deleteRbac](../backend/tests/unit/deleteRbac.test.js); H: [rbac](../backend/tests/rbac.test.js); I: [visibilidade](../frontend/tests/rbacVisibility.test.cjs) | EV-EST/EV-MAN/EV-FE | Parcial para política de sessão e escopo de dados |
| [RNF-003](requisitos/nao-funcionais.md#rnf-003) | RN-003, RN-004 | Sessão/logout | I: [api-auth-session](../frontend/tests/api-auth-session.test.cjs), [provider](../frontend/tests/lintRegression.test.cjs) | EV-FE/EV-PEND | SEC-01/02/03; N: validação integrada de sessão pendente |
| [RNF-004](requisitos/nao-funcionais.md#rnf-004) | RN-002, RN-008, RN-009, RN-010, RN-017 | Payloads/filtros | H: [validacao](../backend/tests/validacao.test.js), [security](../backend/tests/security.test.js); U: [reports](../backend/tests/unit/reportsService.generateReport.test.js) | EV-EST/EV-INT/EV-BE | Filtros/IDs não uniformes; segurança global não certificada |
| [RNF-005](requisitos/nao-funcionais.md#rnf-005) | RN-001, RN-002, RN-005, RN-006 | HTTP/limiters | H isolado: [rate-limit](../backend/tests/rate-limit.test.js); H: [security](../backend/tests/security.test.js) | EV-EST/EV-INT | Ordem/proxy/exposição e composição real pendentes |
| [RNF-006](requisitos/nao-funcionais.md#rnf-006) | RN-001, RN-002, RN-005 | Auth/admin/health/erros | U: [login](../backend/tests/unit/authService.login.test.js); H: [security](../backend/tests/security.test.js), [health](../backend/tests/health.test.js) | EV-EST/EV-BE/EV-PEND | Health/logs/segredos não homologados globalmente |
| [RNF-007](requisitos/nao-funcionais.md#rnf-007) | RN-016, RN-017 | Listas/Reports/Dashboard | U: [paginação](../backend/tests/unit/pagination.test.js); I: [Reports](../frontend/tests/reports.test.cjs); N: sem benchmark dinâmico aceito identificado | EV-EST/EV-TEC/EV-PEND | Metas A DEFINIR; auditoria estática não mede interface |
| [RNF-008](requisitos/nao-funcionais.md#rnf-008) | RN-008, RN-012, RN-014, RN-016 | Pool/planos/execuções | H: [concorrência de planos](../backend/tests/test-plans-lifecycle.integration.test.js); N: sem teste de escala identificado | EV-EST/EV-INT | Capacidade/metas A DEFINIR; concorrência funcional não é carga |
| [RNF-009](requisitos/nao-funcionais.md#rnf-009) | — | /health/infra | H: [health](../backend/tests/health.test.js); N: sem ensaio de disponibilidade/recuperação comprovado nesta entrega | EV-EST | SLA/RTO/RPO A DEFINIR; sem consulta à implantação |
| [RNF-010](requisitos/nao-funcionais.md#rnf-010) | RN-006, RN-009, RN-016, RN-019 | Formulários/Modal/listas | I: [ActionButton](../frontend/tests/actionButton.test.cjs), [TestCases/Modal](../frontend/tests/testCaseProject.test.cjs); U: [detalhes](../backend/tests/unit/recordDetails.test.js); M histórico | EV-FE/EV-MAN | Navegador/tecnologia assistiva e conformidade A DEFINIR; sem E |
| [RNF-011](requisitos/nao-funcionais.md#rnf-011) | — | Estrutura/executor | U/I: suítes apontadas nesta matriz; não há teste único da propriedade | EV-BE/EV-FE/EV-TEC | Evidências históricas; três pisos backend pendentes; sem execução atual |
| [RNF-012](requisitos/nao-funcionais.md#rnf-012) | RN-018 | Logs/audit/health | H: [audit-log](../backend/tests/audit-log.test.js); N: sem ensaio de alertas/tracing identificado | EV-EST/EV-INT | Retenção/correlação A DEFINIR; observabilidade centralizada futura |
| [RNF-013](requisitos/nao-funcionais.md#rnf-013) | RN-017 | DOCX/Blob/pool | I: [exceção Reports](../frontend/tests/reports.test.cjs); N: sem medição de pico/memória comprovada | EV-FE/EV-PEND | BUG-004 permanece; orçamento A DEFINIR |
| [RNF-014](requisitos/nao-funcionais.md#rnf-014) | RN-007, RN-009, RN-016, RN-019 | Runtimes/clientes | I: [contrato cliente](../backend/tests/unit/frontend-api-pagination.test.js) e testes frontend; N: matriz browsers/SO não executada | EV-TEC/EV-FE | Resultados de runtimes específicos não são matriz de suporte |
| [RNF-015](requisitos/nao-funcionais.md#rnf-015) | RN-005, RN-008, RN-011, RN-012, RN-014, RN-015, RN-018 | Transações/locks/FKs | U: [catálogo](../backend/tests/unit/projectCatalogService.test.js), [planos](../backend/tests/unit/testPlansService.test.js); H: [ciclo](../backend/tests/test-plans-lifecycle.integration.test.js), [constraints](../backend/tests/constraints-indexes.test.js) | EV-EST/EV-INT/EV-MAN | Parcial por fluxo; nenhuma conexão/migration atual; sem garantia global |

## Registro de futuras execuções

Para cada validação autorizada, registrar ID de execução, data, commit completo,
working tree relevante, versão das ferramentas, seleção exata de testes/cenários,
comando, configuração, ambiente/destino verificado, código de saída, contagens,
falhas, limitações e caminho durável de evidência sanitizada. Relacionar resultado
ao critério específico, sem substituir o status oficial do roadmap automaticamente.

Não reutilizar os bancos preservados nas portas 5433–5436 para completar esta matriz.
E2E Playwright real permanece planejado para repositório separado; não há evidência
de sua execução nesta entrega. Novas execuções exigem autorização própria.
