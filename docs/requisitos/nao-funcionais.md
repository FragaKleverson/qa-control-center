# Requisitos não funcionais

[Índice](../README.md) · [RFs](funcionais.md) · [Rastreabilidade](../rastreabilidade.md)

Requisitos propostos para revisão a partir do código. Evidência estática, teste
existente e execução histórica são categorias distintas; nenhuma validação dinâmica
foi executada nesta entrega. Metas sem aprovação estão **A DEFINIR**. Configuração
existente não estabelece automaticamente SLA, capacidade ou qualidade comprovada.

<a id="rnf-001"></a>
## RNF-001 — Autenticação no servidor

- **Categoria:** segurança/autenticação.
- **Descrição:** proteger recursos de negócio por identidade autenticada.
- **Critério verificável:** fora de NODE_ENV=test, ausência/JWT inválido/expirado/revogado não permite operação protegida; resposta 401 nos caminhos correspondentes.
- **Estratégia de validação:** unitário de middleware e HTTP com composição real, sem usuário injetado, em ambiente isolado autorizado.
- **Evidência existente:** [auth](../../backend/src/middleware/auth.js), [app](../../backend/src/app.js), [authMiddleware.test.js](../../backend/tests/unit/authMiddleware.test.js), [security.test.js](../../backend/tests/security.test.js).
- **Situação atual:** barreira implementada; unitários não comprovam configuração real de implantação. Exceções públicas estão na arquitetura.
- **Pendências:** claims completos/compatibilidade legada; validar composição integrada e impedir modo test em implantação. Relaciona RF-002/RF-003/RF-007 e RN-003/RN-004.

<a id="rnf-002"></a>
## RNF-002 — Autorização por operação

- **Categoria:** segurança/autorização.
- **Descrição:** aplicar permissões no backend, independentemente da UI.
- **Critério verificável:** matriz [RBAC](../../backend/RBAC-PERMISSIONS.md) cumprida em leitura/escrita/exclusão/restauração/vínculos; 403 sem mutação para perfil proibido.
- **Estratégia de validação:** unitários de rotas/handlers e HTTP com JWT real por perfil; comparar registros e auditoria antes/depois de negações.
- **Evidência existente:** [authorize](../../backend/src/middleware/authorize.js), [deleteRbac](../../backend/tests/unit/deleteRbac.test.js), [rbac HTTP](../../backend/tests/rbac.test.js), [visibilidade](../../frontend/tests/rbacVisibility.test.cjs).
- **Situação atual:** RBAC implementado; evidência manual histórica no contrato, não nova execução. Não há escopo geral por proprietário/equipe.
- **Pendências:** política de mudança de papel/token antigo; validação integrada atual. Relaciona RF-006/RF-007 e RN-003/RN-006.

<a id="rnf-003"></a>
## RNF-003 — Ciclo de sessão

- **Categoria:** segurança/sessão.
- **Descrição:** definir armazenamento, expiração e encerramento de sessão coerentes entre cliente e servidor.
- **Critério verificável:** contratos atuais de 401/logout local caracterizados; política futura de armazenamento/revogação e expiração **A DEFINIR** antes de homologação integrada.
- **Estratégia de validação:** unitários de cliente/provider, HTTP de revogação e navegador real para expiração/logout; não usar presença de token como prova de validade.
- **Evidência existente:** [provider](../../frontend/src/contexts/AuthProvider.jsx), [cliente](../../frontend/src/services/api.js), [suíte de sessão](../../frontend/tests/api-auth-session.test.cjs), SEC-01 a SEC-03 no [roadmap](../../roadmap.md).
- **Situação atual:** parcial; localStorage, logout local e JSON.parse sem tratamento; revogação disponível na API, não chamada pelo botão.
- **Pendências:** aprovação de política, conteúdo armazenado inválido, impacto de XSS e sessão em navegador/servidor reais. Relaciona RF-003/RF-004 e RN-003/RN-004.

<a id="rnf-004"></a>
## RNF-004 — Validação e consultas seguras

- **Categoria:** segurança/integridade de entrada.
- **Descrição:** validar entradas e separar valores de SQL; descartar campos não aceitos nos schemas aplicáveis.
- **Critério verificável:** validators retornam 422 estruturado para dados inválidos; valores de usuário não são interpolados como SQL; ordenação dinâmica usa allowlist. Não presumir validação onde não há schema.
- **Estratégia de validação:** inspeção de SQL/validators, casos negativos e HTTP com preservação de dados; distinguir rejeição do validator de erro do banco.
- **Evidência existente:** [validate](../../backend/src/middleware/validate.js), [validators](../../backend/src/validators/), [validacao](../../backend/tests/validacao.test.js), [security](../../backend/tests/security.test.js), [reports unitário](../../backend/tests/unit/reportsService.generateReport.test.js).
- **Situação atual:** parcial; relatórios e auditoria não possuem validação uniforme; alguns schemas de ID aceitam zero por regex, apesar do texto de inteiro positivo.
- **Pendências:** definir/validar filtros e IDs consistentemente sem mudar contratos nesta entrega. Relaciona RF-001/RF-010/RF-012/RF-021/RF-023 e RN-002/RN-008/RN-009/RN-010/RN-017.

<a id="rnf-005"></a>
## RNF-005 — Proteção HTTP

- **Categoria:** segurança/controle de abuso.
- **Descrição:** aplicar headers, CORS, limite de body e limitadores por escopo.
- **Critério verificável:** configuração atual usa body JSON de 500 kb, origens permitidas e limitadores global/login/cadastro/usuário/reset; excesso retorna 429. Valores operacionais devem refletir configuração efetiva, não virar promessa de capacidade.
- **Estratégia de validação:** inspecionar ordem dos middlewares; testes isolados de limiters e HTTP de headers/CORS/body com modo real, sem bypass de teste.
- **Evidência existente:** [app](../../backend/src/app.js), [limiters](../../backend/src/middleware/rateLimiters.js), [configuração](../../backend/src/config/env.js), [rate-limit.test.js](../../backend/tests/rate-limit.test.js).
- **Situação atual:** mecanismos implementados; health/docs/OpenAPI precedem essas camadas; limiters são desativados por padrão no modo test.
- **Pendências:** composição real, proxy/IP e política de exposição; não comprova defesa completa contra DoS. Relaciona RF-001/RF-002/RF-005/RF-007; RN-001/RN-002/RN-005/RN-006.

<a id="rnf-006"></a>
## RNF-006 — Confidencialidade e erros

- **Categoria:** segurança/confidencialidade.
- **Descrição:** não expor senhas, hashes, tokens indevidos ou detalhes internos nos canais públicos.
- **Critério verificável:** respostas públicas de usuário sem password_hash; 5xx em produção mascarados pelo handler; produção sem _dev_token. Critério de não expor detalhes internos em health ainda precisa correção/validação; não está atendido por simples mascaramento global.
- **Estratégia de validação:** revisão de respostas/logs/artefatos e testes com falhas sintéticas; varredura sem registrar valores sensíveis.
- **Evidência existente:** [errorHandler](../../backend/src/middleware/errorHandler.js), [healthService](../../backend/src/services/healthService.js), [auth](../../backend/src/routes/auth.js), [security.test.js](../../backend/tests/security.test.js).
- **Situação atual:** parcial; health devolve err.message, logs podem conter detalhes; arquivos de ambiente historicamente versionados exigem tratamento próprio. Valores públicos de exemplo não podem ser reutilizados em produção.
- **Pendências:** política de redação/retenção de logs e segredos de implantação; revisar health e endpoints públicos. Relaciona RF-001/RF-002/RF-005/RF-006/RF-025 e RN-001/RN-002/RN-005.

<a id="rnf-007"></a>
## RNF-007 — Desempenho de consultas e interface

- **Categoria:** desempenho.
- **Descrição:** manter listagens e operações críticas utilizáveis com massas representativas.
- **Critério verificável:** paginação atual conforme RN-016; metas de latência, renderização, interação e tamanho máximo aceitável de relatório **A DEFINIR** por cenário/massa/ambiente.
- **Estratégia de validação:** medir consultas/HTTP e navegador com repetições, estado de cache e dados definidos; separar percentis, primeira carga e interação. Não usar tempo de Jest/build como métrica da interface.
- **Evidência existente:** [paginação](../../backend/src/services/pagination.js), [hook](../../frontend/src/hooks/usePaginatedList.js), [reports](../../backend/src/services/reportsService.js), auditoria estática aceita no [roadmap](../../roadmap.md).
- **Situação atual:** parcial; seletores completos, N+1/relatórios integrais, páginas importadas antecipadamente; performance dinâmica não validada por esta documentação.
- **Pendências:** aprovar cenários/metas; respeitar adiamento de carga backend; PERF-01/PERF-02 e BUG-004 permanecem. Relaciona RF-021/RF-022/RF-024 e RN-016/RN-017.

<a id="rnf-008"></a>
## RNF-008 — Escalabilidade

- **Categoria:** escalabilidade/capacidade.
- **Descrição:** definir evolução para volume e concorrência sem presumir múltiplas instâncias prontas.
- **Critério verificável:** volume, usuários concorrentes, throughput e número de instâncias **A DEFINIR**; verificar pool, índices, locks e estado dos limiters antes de declarar capacidade.
- **Estratégia de validação:** análise de consultas/índices e ensaio de concorrência em destino descartável autorizado; futura carga depende de autorização separada.
- **Evidência existente:** [pool](../../backend/src/db.js), [migrations](../../backend/prisma/migrations/), [serviço de planos](../../backend/src/services/testPlansService.js), [limiters](../../backend/src/middleware/rateLimiters.js).
- **Situação atual:** mecanismos locais existem; escala horizontal e carga não comprovadas; não há store distribuído explícito nos limiters inspecionados.
- **Pendências:** dimensionamento, estratégia compartilhada de limitação e comportamento concorrente real. Relaciona RF-016/RF-018/RF-019/RF-024 e RN-008/RN-012/RN-014/RN-016.

<a id="rnf-009"></a>
## RNF-009 — Disponibilidade e recuperação

- **Categoria:** disponibilidade/resiliência.
- **Descrição:** detectar degradação e definir recuperação de serviço/dados.
- **Critério verificável:** health retorna 200/503 conforme dependência; metas de disponibilidade, janela de recuperação, RTO/RPO e restauração **A DEFINIR**.
- **Estratégia de validação:** teste isolado de health; posteriormente falha/recuperação e restauração de backup em ambiente aprovado, sem tocar bancos protegidos.
- **Evidência existente:** [health](../../backend/src/services/healthService.js), [teste](../../backend/tests/health.test.js), Dockerfiles/Compose descritos na [arquitetura](../arquitetura.md).
- **Situação atual:** health checks disponíveis no código; não comprovam monitoramento ativo, failover, backup recuperável ou implantação.
- **Pendências:** separar liveness/readiness conforme necessidade; definir metas e evidência operacional. Relaciona RF-025; sem RN específica no catálogo.

<a id="rnf-010"></a>
## RNF-010 — Usabilidade e acessibilidade

- **Categoria:** usabilidade/acessibilidade.
- **Descrição:** oferecer feedback e interação consistente em formulários/listagens.
- **Critério verificável:** fluxos identificados exibem loading, erro/vazio/retry quando previstos; no Modal com dialogLabel, verificar nome, foco, Tab/Escape e retorno de foco. Não estender esse comportamento opt-in a todos os diálogos. Nível de conformidade, browsers e viewports **A DEFINIR**.
- **Estratégia de validação:** testes de componentes e handlers; auditoria e navegação reais com teclado, foco e tecnologias assistivas antes de declarar acessibilidade completa.
- **Evidência existente:** [Modal](../../frontend/src/components/Modal.jsx), [Pagination](../../frontend/src/components/Pagination.jsx), [ActionButton](../../frontend/src/components/ActionButton.jsx), [recordDetails.test.js](../../backend/tests/unit/recordDetails.test.js) para renderização SSR com Modal simulado, e [testCaseProject.test.cjs](../../frontend/tests/testCaseProject.test.cjs) para Modal real com DOM simulado, foco e teclado opt-in.
- **Situação atual:** parcial; testes com DOM simulado/mocks e homologação manual histórica têm escopo limitado.
- **Pendências:** corrigir/triagem de bugs no roadmap; matriz de acessibilidade e interação em navegador. Relaciona RF-003/RF-008/RF-010/RF-012/RF-015/RF-024 e RN-006/RN-009/RN-016/RN-019.

<a id="rnf-011"></a>
## RNF-011 — Manutenibilidade e regressão

- **Categoria:** manutenibilidade/testabilidade.
- **Descrição:** manter responsabilidades e regressão reproduzíveis sem depender de ambientes pessoais.
- **Critério verificável:** lógica em serviços/validators; execução isolada separada de integração; documentação aponta escopo/commit/evidência. Limites oficiais de cobertura backend permanecem 70/50/65/70, sem exclusões artificiais.
- **Estratégia de validação:** revisão estrutural, links e IDs; regressão/lint/build/medição apenas em etapas autorizadas.
- **Evidência existente:** [services](../../backend/src/services/), [Jest isolado](../../backend/jest.isolated.config.js), [Jest](../../backend/jest.config.js), [testes frontend](../../frontend/tests/README.md), [roadmap](../../roadmap.md).
- **Situação atual:** parcial; frontend sem script test próprio no manifest; executor usa dependências backend; cobertura unitária histórica ainda abaixo de três pisos.
- **Pendências:** reprodução Linux, retenção durável de evidências e contratos HTTP consistentes. Relaciona RF-001 a RF-025; sem RN exclusiva.

<a id="rnf-012"></a>
## RNF-012 — Observabilidade e auditoria operacional

- **Categoria:** observabilidade.
- **Descrição:** tornar falhas e eventos relevantes investigáveis.
- **Critério verificável:** logs de acesso/erros e auditoria nos pontos instrumentados; centralização, correlação, retenção e alertas **A DEFINIR**. Não declarar trilha completa.
- **Estratégia de validação:** inspecionar eventos e falhas, validar filtros e comportamento em erro; testar coleta/alertas somente quando especificados.
- **Evidência existente:** [app/Morgan](../../backend/src/app.js), [errorHandler](../../backend/src/middleware/errorHandler.js), [auditService](../../backend/src/services/auditService.js), [audit-log.test.js](../../backend/tests/audit-log.test.js).
- **Situação atual:** parcial; console/Morgan/audit log disponíveis; dashboard mascara falhas com zeros; observabilidade centralizada permanece futura.
- **Pendências:** cobertura de eventos, redação de logs e diagnóstico sem falsos dados de sucesso. Relaciona RF-022/RF-023/RF-025 e RN-018.

<a id="rnf-013"></a>
## RNF-013 — Consumo de recursos

- **Categoria:** eficiência de recursos.
- **Descrição:** controlar memória, conexões e temporários em operações volumosas.
- **Critério verificável:** limites de memória/CPU/pool/tamanho de exportação **A DEFINIR**; limpeza de link/URL Blob deve ser validada também em exceção, hoje não atendida no caminho BUG-004.
- **Estratégia de validação:** inspeção de lifecycle; futura medição de pico/concorrência e memória no navegador/servidor com massa e orçamento aprovados.
- **Evidência existente:** [Reports](../../frontend/src/pages/Reports.jsx), [teste de exceção](../../frontend/tests/reports.test.cjs), [geração](../../backend/src/services/reportsService.js), [exportação](../../backend/src/routes/relatorios.js), [pool](../../backend/src/db.js).
- **Situação atual:** parcial; geração e buffer DOCX integrais, Promise.all por execução e limpeza incompleta no erro de clique.
- **Pendências:** orçamento, limites e teste dinâmico; BUG-004 continua pendente, não aprovado pela caracterização. Relaciona RF-021/RF-024 e RN-017.

<a id="rnf-014"></a>
## RNF-014 — Compatibilidade

- **Categoria:** compatibilidade/portabilidade.
- **Descrição:** reproduzir operação nos runtimes e clientes declarados.
- **Critério verificável:** respeitar lockfiles e bindings da plataforma; linha Node 22 documentada e evidências recentes Node 26 têm escopos distintos; matriz de browsers/SO/versões suportadas **A DEFINIR**.
- **Estratégia de validação:** conferir manifests/lockfiles/engines e executar regressão/build em matriz aprovada; não corrigir ambiente alterando dependências sem autorização.
- **Evidência existente:** [backend manifest](../../backend/package.json), [frontend manifest](../../frontend/package.json), [estado](../../backend/FEATURE-VALIDATION-STATUS.md), [roadmap](../../roadmap.md), [Dockerfiles na arquitetura](../arquitetura.md).
- **Situação atual:** parcial; imagens Node 22 Alpine e execução Linux recente Node 26; isso não comprova suporte geral a versões/browsers.
- **Pendências:** matriz e procedimento reproduzível de dependências Linux; compatibilidade com schema/contratos legados por consumidor. Relaciona RF-010/RF-011/RF-024 e RN-007/RN-009/RN-016/RN-019.

<a id="rnf-015"></a>
## RNF-015 — Integridade e consistência transacional

- **Categoria:** integridade/confiabilidade de dados.
- **Descrição:** preservar identidade/vínculos e impedir sucesso parcial onde o contrato é transacional.
- **Critério verificável:** Projects audita atomicamente; execução do plano cria uma execução/resultados/marca na transação; atribuição não nula de project_id valida pai ativo na transação do vínculo. Omissão/remoção não precisa validar esse pai. Não estender essas garantias a finalização/reset/auditoria legada.
- **Estratégia de validação:** unitários verificam ordem/rollback simulado; HTTP/SQL com conexões independentes verifica locks, FKs e concorrência em banco descartável autorizado.
- **Evidência existente:** [catálogo](../../backend/src/services/projectCatalogService.js), [planos](../../backend/src/services/testPlansService.js), [vínculo](../../backend/src/services/projectsService.js), [schema](../../backend/prisma/schema.prisma), [teste concorrente](../../backend/tests/test-plans-lifecycle.integration.test.js).
- **Situação atual:** parcial no sistema; garantias locais implementadas, algumas historicamente ensaiadas; não houve validação real nesta entrega.
- **Pendências:** correção/decisão para fluxos compostos sem transação, atualização geral de finalizado e auditoria; aplicação efetiva de migrations por ambiente. Relaciona RF-005/RF-009/RF-011/RF-016/RF-018/RF-019/RF-023 e RN-005/RN-008/RN-011/RN-012/RN-014/RN-015/RN-018.
