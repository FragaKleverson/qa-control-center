# Requisitos funcionais

[Índice](../README.md) · [Regras](../regras-de-negocio.md) · [Rastreabilidade](../rastreabilidade.md)

IDs preservados do diagnóstico; RF-026 é agrupador de capacidades futuras. Estado
**implementado** indica presença no código, não homologação ou implantação.
Os critérios abaixo são **propostos para revisão**, não aprovações desta entrega.
Bugs e políticas controversas ficam em limitações, sem transformá-los em aceite.
Pré-condição comum das APIs protegidas: autenticação real e schema compatível.
O modo NODE_ENV=test não comprova autenticação integrada. Contratos especializados
do [índice](../README.md) detalham semântica sem manutenção duplicada neste catálogo.

Perfis abreviados: **A = Admin; Q = QA; L = Reader**. Códigos HTTP descritos
pressupõem que as camadas anteriores não rejeitaram a requisição (por exemplo,
limiter, autenticação ou parser) e que não ocorreu falha operacional adicional.
RF-008/RF-009 separam manutenção do catálogo e exclusão/restauração; RF-013/RF-014
separam suíte e vínculos; RF-015/RF-016 separam plano e sua execução; RF-017 a
RF-020 separam criação direta, resultado, finalização e manutenção geral. Essas
relações não atribuem a um fluxo garantias implementadas somente em outro.

<a id="rf-001"></a>
## RF-001 — Cadastro controlado

- **Objetivo / módulo:** criar usuários; Autenticação.
- **Ator e permissões:** portador de x-register-token; endpoint sem JWT obrigatório.
- **Pré-condições:** token de cadastro configurado; banco preparado.
- **Fluxo principal:** enviar name/email/password → validar header/body → gerar hash → persistir usuário.
- **Regras:** [RN-001](../regras-de-negocio.md#rn-001).
- **Endpoints/telas:** POST /auth/register; sem tela própria em AppRoutes.
- **Evidência:** [rota](../../backend/src/routes/auth.js), [validator](../../backend/src/validators/auth.js), [serviço](../../backend/src/services/authService.js).
- **Estado:** implementado na API.
- **Limitações:** contagem para primeiro Admin não é serializada; exemplos antigos usam nome, mas contrato exige name.

**Critérios propostos:** header ausente/incorreto retorna 403; body inválido, 422;
sucesso, 201 sem password_hash; e-mail duplicado, 409. Perfil segue RN-001, sem
aceitar perfil escolhido pelo solicitante. Concorrência de bootstrap é pendência.

<a id="rf-002"></a>
## RF-002 — Login

- **Objetivo / módulo:** obter identidade e JWT; Autenticação.
- **Ator e permissões:** usuário cadastrado; endpoint público.
- **Pré-condições:** e-mail e senha informados; dependências disponíveis.
- **Fluxo principal:** validar body → consultar e-mail normalizado → bcrypt → assinar JWT.
- **Regras:** [RN-002](../regras-de-negocio.md#rn-002), [RN-003](../regras-de-negocio.md#rn-003).
- **Endpoints/telas:** POST /auth/login; /login.
- **Evidência:** [serviço](../../backend/src/services/authService.js), [validator](../../backend/src/validators/auth.js), [Login](../../frontend/src/pages/Login.jsx).
- **Estado:** implementado.
- **Limitações:** validator precede normalização; teste direto do serviço não comprova aceitar espaços via HTTP. Login navega à raiz, não consome state.from.

**Critérios propostos:** válido retorna 200 com JWT verificável e user
id/name/email/role sem hash; usuário inexistente e senha incorreta retornam o mesmo erro 401;
campos ausentes/vazios ou e-mail malformado são rejeitados pelo validator HTTP com 422;
falha de consulta/assinatura não autentica; UI não navega em falha.

<a id="rf-003"></a>
## RF-003 — Sessão e rotas protegidas

- **Objetivo / módulo:** manter sessão visual e tratar perda de autenticação; frontend.
- **Ator e permissões:** Admin, QA e Reader autenticados.
- **Pré-condições:** armazenamento do navegador disponível; provider montado.
- **Fluxo principal:** login → persistir token/usuário → proteger layout → enviar Bearer → tratar respostas.
- **Regras:** [RN-003](../regras-de-negocio.md#rn-003), [RN-004](../regras-de-negocio.md#rn-004).
- **Endpoints/telas:** telas protegidas em AppRoutes e chamadas de api.js.
- **Evidência:** [provider](../../frontend/src/contexts/AuthProvider.jsx), [ProtectedRoute](../../frontend/src/routes/ProtectedRoute.jsx), [rotas](../../frontend/src/routes/AppRoutes.jsx), [cliente](../../frontend/src/services/api.js).
- **Estado:** implementado com ressalvas.
- **Limitações:** SEC-01/SEC-03; presença de token não verifica identidade/expiração; JSON inválido pode interromper inicialização. Não há timer de expiração identificado.

**Critérios propostos:** sem autenticação, retornar Navigate /login com replace e
origem; autenticado, devolver conteúdo; 401 protegido limpa somente sessão e
redireciona; 403 e falha de rede preservam sessão. Validação real de sessão permanece pendente.

<a id="rf-004"></a>
## RF-004 — Logout local e revogação

- **Objetivo / módulo:** encerrar sessão visual e oferecer revogação backend; Autenticação.
- **Ator e permissões:** Admin/QA/Reader; API de logout exige JWT válido.
- **Pré-condições:** sessão local ou token com JTI para revogação.
- **Fluxo principal:** Sidebar aciona provider; separadamente, POST backend registra JTI na blocklist.
- **Regras:** [RN-004](../regras-de-negocio.md#rn-004).
- **Endpoints/telas:** POST /auth/logout; botão Sair.
- **Evidência:** [Sidebar](../../frontend/src/components/Sidebar.jsx), [provider](../../frontend/src/contexts/AuthProvider.jsx), [serviço](../../backend/src/services/authService.js), [middleware](../../backend/src/middleware/auth.js).
- **Estado:** parcial: fluxos existem, mas botão não chama API de revogação.
- **Limitações:** SEC-02; token legado sem JTI não tem revogação individual; segurança integrada não comprovada pelo logout visual.

**Critérios propostos:** logout local limpa estado/armazenamento; logout API válido
responde 200 e registra JTI quando presente; middleware rejeita token revogado.
Não apresentar esses critérios separados como integração concluída.

<a id="rf-005"></a>
## RF-005 — Redefinição de senha

- **Objetivo / módulo:** preparar token temporário e trocar senha; Autenticação.
- **Ator e permissões:** solicitante sem sessão; portador de token de redefinição.
- **Pré-condições:** e-mail válido; para concluir, token válido, não usado e não expirado.
- **Fluxo principal:** forgot cria hash/validade → reset verifica token → grava novo hash de senha e uso.
- **Regras:** [RN-005](../regras-de-negocio.md#rn-005).
- **Endpoints/telas:** POST /auth/forgot-password e /auth/reset-password; sem telas específicas identificadas.
- **Evidência:** [rotas](../../backend/src/routes/auth.js), [serviço](../../backend/src/services/authService.js), [validators](../../backend/src/validators/auth.js).
- **Estado:** parcial: API implementada; envio de e-mail não implementado.
- **Limitações:** sem SMTP; _dev_token diferencia existência fora de produção; consumo não transacional; não há revogação geral de JWTs anteriores nesse fluxo.

**Critérios propostos:** produção não expõe _dev_token; mensagem de forgot é
genérica; reset rejeita token não encontrado no banco/usado/expirado com 400;
token omitido/vazio no body retorna 422 pelo validator HTTP; senha de 8–128
caracteres é validada; sucesso não devolve senha/hash. Entrega do link é pendente.

<a id="rf-006"></a>
## RF-006 — Administração de usuários

- **Objetivo / módulo:** consultar contas e gerir papel/exclusão; Administração.
- **Ator e permissões:** somente Admin.
- **Pré-condições:** autenticação; usuário-alvo quando aplicável.
- **Fluxo principal:** listar → selecionar outro usuário → alterar papel permitido ou excluir.
- **Regras:** [RN-003](../regras-de-negocio.md#rn-003), [RN-006](../regras-de-negocio.md#rn-006).
- **Endpoints/telas:** GET /admin/usuarios; PATCH /admin/usuarios/:id/role; DELETE /admin/usuarios/:id; sem UI administrativa identificada.
- **Evidência:** [router](../../backend/src/routes/admin.js), [serviço](../../backend/src/services/authService.js).
- **Estado:** implementado na API.
- **Limitações:** exclusão física sujeita a FKs; mudança de papel não invalida imediatamente JWT anterior; sem garantia adicional de último Admin além da própria conta.

**Critérios propostos:** listagem sem hash; QA/Reader recebem 403; alvo ausente,
404; próprio papel e própria exclusão, 403; apenas admin/qa/reader são aceitos.

<a id="rf-007"></a>
## RF-007 — Autorização por perfil

- **Objetivo / módulo:** impedir operações sem permissão; segurança transversal.
- **Ator e permissões:** Admin, QA e Reader conforme matriz especializada.
- **Pré-condições:** autenticação real, fora do bypass NODE_ENV=test.
- **Fluxo principal:** autenticar → autorizar operação → validar estado/payload → executar ou rejeitar.
- **Regras:** [RN-003](../regras-de-negocio.md#rn-003), [RN-006](../regras-de-negocio.md#rn-006).
- **Endpoints/telas:** recursos protegidos em app.js e ações das páginas.
- **Evidência:** [app](../../backend/src/app.js), [auth](../../backend/src/middleware/auth.js), [authorize](../../backend/src/middleware/authorize.js), [contrato RBAC](../../backend/RBAC-PERMISSIONS.md).
- **Estado:** implementado com limites de sessão.
- **Limitações:** sem segregação geral por autoria/equipe; perfil local é apenas visual; tokens podem carregar papel antigo.

**Critérios propostos:** sem autenticação, 401; papel insuficiente, 403 antes da
mutação; A/Q escrevem, A exclui/restaura/remove vínculos, L consulta. Estados ainda
restringem Admin. Não deduzir esse aceite de testes com usuário injetado.

<a id="rf-008"></a>
## RF-008 — Catálogo independente de Projects

- **Objetivo / módulo:** manter projetos sem reinterpretar casos legados; Projects.
- **Ator e permissões:** A/Q criam/editam; L consulta.
- **Pré-condições:** schema projects disponível; ator autenticado.
- **Fluxo principal:** listar/consultar → preencher nome/descrição → criar/editar → atualizar catálogo.
- **Regras:** [RN-006](../regras-de-negocio.md#rn-006), [RN-007](../regras-de-negocio.md#rn-007), [RN-018](../regras-de-negocio.md#rn-018).
- **Endpoints/telas:** GET/POST /projects; GET/PUT /projects/:id; tela /projects.
- **Evidência:** [serviço](../../backend/src/services/projectCatalogService.js), [validator](../../backend/src/validators/projects.js), [UI](../../frontend/src/pages/Projects.jsx).
- **Estado:** implementado.
- **Limitações:** filtro textual apenas na página; área legada somente leitura; schema aplicado por ambiente não é presumido.

**Critérios propostos:** nome trim obrigatório; criação 201 e autoria do servidor;
PUT omitido preserva, descricao:null limpa; body sem campos editáveis retorna 422;
GET/PUT ausente/excluído retorna 404. Ver [contrato](../../backend/PROJECTS-PERSISTENCE-CONTRACT.md).

<a id="rf-009"></a>
## RF-009 — Excluir e restaurar Project

- **Objetivo / módulo:** preservar identidade/vínculos ao excluir/restaurar; Projects.
- **Ator e permissões:** somente Admin.
- **Pré-condições:** ativo para excluir; excluído para restaurar.
- **Fluxo principal:** confirmar exclusão ou chamar restore → alterar marca → auditar na transação.
- **Regras:** [RN-006](../regras-de-negocio.md#rn-006), [RN-008](../regras-de-negocio.md#rn-008), [RN-015](../regras-de-negocio.md#rn-015), [RN-018](../regras-de-negocio.md#rn-018).
- **Endpoints/telas:** DELETE /projects/:id; POST /projects/:id/restore; exclusão na tela Projects.
- **Evidência:** [serviço](../../backend/src/services/projectCatalogService.js), [rota](../../backend/src/routes/projects.js), [UI](../../frontend/src/pages/Projects.jsx).
- **Estado:** API implementada; restore sem UI.
- **Limitações:** sem listagem administrativa de excluídos na tela; mocks não provam locks/rollback reais.

**Critérios propostos:** excluir não apaga casos nem limpa vínculos; restore
mantém identidade; repetição de delete e restore de ativo retornam 404; falha da
auditoria impede commit no serviço de catálogo. Não generalizar a outros serviços.

<a id="rf-010"></a>
## RF-010 — Casos de teste

- **Objetivo / módulo:** manter casos e cenários preservando legado; Test Cases.
- **Ator e permissões:** A/Q criam/editam; A exclui/restaura; L consulta.
- **Pré-condições:** caso ativo para editar; schema compatível.
- **Fluxo principal:** listar/detalhar → formulário → criar/editar → confirmar exclusão autorizada.
- **Regras:** [RN-006](../regras-de-negocio.md#rn-006), [RN-007](../regras-de-negocio.md#rn-007), [RN-009](../regras-de-negocio.md#rn-009), [RN-015](../regras-de-negocio.md#rn-015), [RN-019](../regras-de-negocio.md#rn-019).
- **Endpoints/telas:** GET/POST /projetos; GET/PUT/DELETE /projetos/:id; POST /projetos/:id/restore; /test-cases.
- **Evidência:** [serviço](../../backend/src/services/projectsService.js), [validator](../../backend/src/validators/projetos.js), [UI](../../frontend/src/pages/TestCases.jsx).
- **Estado:** implementado.
- **Limitações:** formulário não é editor geral de todo JSON; auditoria best-effort; sem versionamento concorrente geral ou UI de restore.

**Critérios propostos:** POST exige titulo/descricao/feature e retorna 201; PUT
preserva cenarios omitido e grava JSON informado, inclusive []/null; GET excluído
retorna 404; ID visual não muda chave numérica. Contrato detalhado em
[persistência](../../backend/PROJECTS-PERSISTENCE-CONTRACT.md).

<a id="rf-011"></a>
## RF-011 — Project opcional no caso

- **Objetivo / módulo:** manter associação opcional com semântica explícita; Test Cases/Projects.
- **Ator e permissões:** A/Q alteram; L consulta.
- **Pré-condições:** caso editável; Project ativo para novo vínculo.
- **Fluxo principal:** manter/escolher/trocar/remover seleção → validar pai → persistir.
- **Regras:** [RN-006](../regras-de-negocio.md#rn-006), [RN-007](../regras-de-negocio.md#rn-007), [RN-008](../regras-de-negocio.md#rn-008).
- **Endpoints/telas:** POST/PUT /projetos; GET /projetos e /projetos/:id; campo Project em TestCases.
- **Evidência:** [serviço](../../backend/src/services/projectsService.js), [hook](../../frontend/src/hooks/useProjectLink.js), [campo](../../frontend/src/components/TestCaseProject.jsx).
- **Estado:** implementado.
- **Limitações:** nome atual, não snapshot; auditoria fora da transação; locks reais exigem integração.

**Critérios propostos:** POST omitido não vincula; PUT omitido preserva; null
remove; ID numérico de pai ativo vincula; inválido/inexistente/excluído retorna 422
sem escrita parcial nessa associação; pai excluído continua identificável na leitura.

<a id="rf-012"></a>
## RF-012 — Requirements

- **Objetivo / módulo:** registrar requisitos com classificação própria; Requirements.
- **Ator e permissões:** A/Q criam/editam; A exclui/restaura; L consulta.
- **Pré-condições:** título válido e domínios aceitos.
- **Fluxo principal:** listar/consultar → criar → editar via API ou excluir na UI.
- **Regras:** [RN-006](../regras-de-negocio.md#rn-006), [RN-007](../regras-de-negocio.md#rn-007), [RN-010](../regras-de-negocio.md#rn-010), [RN-015](../regras-de-negocio.md#rn-015).
- **Endpoints/telas:** GET/POST /requirements; GET/PUT/DELETE /requirements/:id; POST /requirements/:id/restore; /requirements.
- **Evidência:** [validator](../../backend/src/validators/requirements.js), [serviço](../../backend/src/services/requirementsService.js), [UI](../../frontend/src/pages/Requirements.jsx).
- **Estado:** API implementada; UI cobre consulta/criação/exclusão.
- **Limitações:** sem vínculo com Projects/casos; sem fluxo equivalente de edição/restore na UI. BUG-003: JSON sem id chama res.text incompatível; não é aceite aprovado.

**Critérios propostos:** criação válida 201, defaults Open/Medium; título vazio
e domínio inválido, 422; permissões de exclusão/restore aplicadas; falha de criação
mantém formulário e não apresenta sucesso indevido. Não prometer limpeza por string vazia no PUT.

<a id="rf-013"></a>
## RF-013 — Test Suites

- **Objetivo / módulo:** cadastrar agrupadores reutilizáveis; Test Suites.
- **Ator e permissões:** A/Q criam/editam; A exclui/restaura; L consulta.
- **Pré-condições:** nome válido; referências compatíveis quando informadas.
- **Fluxo principal:** listar/consultar → criar → editar via API → excluir/restaurar.
- **Regras:** [RN-006](../regras-de-negocio.md#rn-006), [RN-007](../regras-de-negocio.md#rn-007), [RN-015](../regras-de-negocio.md#rn-015).
- **Endpoints/telas:** GET/POST /test-suites; GET/PUT/DELETE /test-suites/:id; POST /test-suites/:id/restore; /test-suites.
- **Evidência:** [serviço](../../backend/src/services/testSuitesService.js), [validator](../../backend/src/validators/testSuites.js), [UI](../../frontend/src/pages/TestSuites.jsx).
- **Estado:** API implementada; UI oferece subconjunto.
- **Limitações:** projeto_id legado não é projects.id; update usa COALESCE/valores falsy e limita limpeza; restore sem UI.

**Critérios propostos:** nome trim não vazio; POST 201; GET/PUT ausente/excluído
404; DELETE lógico; restore Admin-only; erro não apresenta criação bem-sucedida.

<a id="rf-014"></a>
## RF-014 — Casos das suítes

- **Objetivo / módulo:** associar/desassociar sem excluir o caso; Test Suites.
- **Ator e permissões:** A/Q adicionam; A remove; L consulta.
- **Pré-condições:** IDs compatíveis com referências persistidas.
- **Fluxo principal:** abrir casos → consultar vinculados/disponíveis → mutar vínculo → recarregar.
- **Regras:** [RN-006](../regras-de-negocio.md#rn-006), [RN-007](../regras-de-negocio.md#rn-007), [RN-015](../regras-de-negocio.md#rn-015).
- **Endpoints/telas:** GET/POST /test-suites/:id/cases; DELETE /test-suites/:id/cases/:projetoId; modal TestSuites.
- **Evidência:** [serviço](../../backend/src/services/testSuitesService.js), [rotas](../../backend/src/routes/testSuites.js), [UI](../../frontend/src/pages/TestSuites.jsx).
- **Estado:** implementado com ressalvas.
- **Limitações:** BUG-001, resposta antiga pode substituir seleção atual; reprodução específica pendente. Não presumir validação de ativo equivalente à de planos.

**Critérios propostos:** POST usa projeto_id, retorna 201 e não duplica associação;
DELETE remove só vínculo e exige Admin; falha de mutação não anuncia sucesso.
Isolamento entre seleções precisa regressão específica antes de novo aceite.

<a id="rf-015"></a>
## RF-015 — Planos e vínculos de suítes

- **Objetivo / módulo:** organizar escopo/objetivo/ambiente/suítes; Test Plans.
- **Ator e permissões:** A/Q criam/editam/adicionam; A exclui/restaura/remove; L consulta.
- **Pré-condições:** ambiente canônico; eligible para editar/vincular.
- **Fluxo principal:** criar → consultar → alterar dados/vínculos → preservar estado na administração.
- **Regras:** [RN-006](../regras-de-negocio.md#rn-006), [RN-011](../regras-de-negocio.md#rn-011), [RN-012](../regras-de-negocio.md#rn-012), [RN-015](../regras-de-negocio.md#rn-015).
- **Endpoints/telas:** CRUD /test-plans; POST /test-plans/:id/restore; GET/POST /test-plans/:id/suites; DELETE /test-plans/:id/suites/:suiteId; /test-plans.
- **Evidência:** [serviço](../../backend/src/services/testPlansService.js), [validator](../../backend/src/validators/testPlans.js), [UI](../../frontend/src/pages/TestPlan.jsx).
- **Estado:** implementado.
- **Limitações:** sem endpoint de liberação de legados; total_cases é contagem atual, não snapshot; restore sem UI.

**Critérios propostos:** titulo/ambiente válidos geram 201/eligible; executado ou
review_required rejeita edição/vínculos com 409; adição exige suíte ativa;
delete/restore preservam bloqueios. Ver [contrato](../../backend/TEST-PLAN-LIFECYCLE.md).

<a id="rf-016"></a>
## RF-016 — Execução única do plano

- **Objetivo / módulo:** materializar execução e resultados coordenadamente; Test Plans/Executions.
- **Ator e permissões:** Admin/QA.
- **Pré-condições:** plano ativo eligible, ambiente válido, suíte ativa e caso ativo.
- **Fluxo principal:** bloquear plano → validar → unir casos distintos → criar execução/resultados → marcar executed_at → commit.
- **Regras:** [RN-006](../regras-de-negocio.md#rn-006), [RN-011](../regras-de-negocio.md#rn-011), [RN-012](../regras-de-negocio.md#rn-012).
- **Endpoints/telas:** POST /test-plans/:id/execute; confirmação de TestPlan.
- **Evidência:** [serviço](../../backend/src/services/testPlansService.js), [schema](../../backend/prisma/schema.prisma), [migration](../../backend/prisma/migrations/20261030000000_add_plan_execution_guard/migration.sql), [UI](../../frontend/src/pages/TestPlan.jsx).
- **Estado:** implementado.
- **Limitações:** não executa runner externo; suite_id principal não representa todas as suítes; validação sintética anterior não comprova todo ambiente.

**Critérios propostos:** 201 com plan_id/ambiente do plano e casos distintos pending;
reexecução ou ausência de suíte/caso ativo retorna 409 sem criação parcial; falha
provoca rollback no serviço. Concorrência real exige integração isolada específica.

<a id="rf-017"></a>
## RF-017 — Registro direto de execução

- **Objetivo / módulo:** criar execução independente; Executions.
- **Ator e permissões:** Admin/QA.
- **Pré-condições:** suite_id válido no payload; ambiente canônico quando informado.
- **Fluxo principal:** Run Suite → informar suíte/ambiente → POST → feedback e recarga.
- **Regras:** [RN-006](../regras-de-negocio.md#rn-006).
- **Endpoints/telas:** POST /execucoes; Run Suite em /executions.
- **Evidência:** [serviço](../../backend/src/services/executionsService.js), [validator](../../backend/src/validators/execucoes.js), [UI](../../frontend/src/pages/Executions.jsx).
- **Estado:** parcial no fluxo completo; criação do registro implementada.
- **Limitações:** create não popula execution_results nem executa scripts. Não atribuir materialização de casos do plano a esse endpoint.

**Critérios propostos:** POST válido retorna 201 com autoria do servidor e defaults
staging/pending quando omitidos; validator rejeita payload inválido; falha mantém
formulário sem sucesso. Não exigir resultados que esse fluxo não cria.

<a id="rf-018"></a>
## RF-018 — Resultado e comentário

- **Objetivo / módulo:** registrar resultado de caso na execução; Executions.
- **Ator e permissões:** A/Q editam; L consulta.
- **Pré-condições:** resultado existente; execução não finalizada na verificação.
- **Fluxo principal:** expandir → alterar estado/comentário → atualizar resultado → marcar execução running.
- **Regras:** [RN-006](../regras-de-negocio.md#rn-006), [RN-014](../regras-de-negocio.md#rn-014).
- **Endpoints/telas:** GET /execucoes/:id/results; PUT /execucoes/:id/results/:projetoId; controles de Executions.
- **Evidência:** [serviço](../../backend/src/services/executionsService.js), [validator](../../backend/src/validators/execucoes.js), [UI](../../frontend/src/pages/Executions.jsx).
- **Estado:** implementado com ressalvas.
- **Limitações:** BUG-002; sem transação abrangente, erro posterior pode deixar gravação parcial; não há garantia atômica contra finalizar/editar nem guarda geral de excluído.

**Critérios propostos:** IDs corretos, status válido obrigatório, comentário até
2000 caracteres; finalized observado retorna 422 antes do UPDATE; resultado ausente,
404; dependência falha sem resposta falsa de sucesso. Não inferir rollback.

<a id="rf-019"></a>
## RF-019 — Finalização de execução

- **Objetivo / módulo:** persistir resultado agregado e marca finalizada; Executions.
- **Ator e permissões:** Admin/QA.
- **Pré-condições:** execução existente e ainda não finalizada.
- **Fluxo principal:** consultar marca → agregar resultados → calcular → atualizar finalized.
- **Regras:** [RN-006](../regras-de-negocio.md#rn-006), [RN-013](../regras-de-negocio.md#rn-013), [RN-014](../regras-de-negocio.md#rn-014).
- **Endpoints/telas:** POST /execucoes/:id/finalize; Finalizar em Executions.
- **Evidência:** [serviço](../../backend/src/services/executionsService.js), [rota](../../backend/src/routes/execucoesDetalhado.js), [UI](../../frontend/src/pages/Executions.jsx).
- **Estado:** implementado com ressalvas.
- **Limitações:** RN-013 caracteriza pending/zero resultados, sem aprovar essa política como evolução desejada; sem transação/lock abrangente; PUT geral não é bloqueado por essa guarda. As consultas de finalize não filtram deleted_at; não presumir rejeição de execução excluída por esse serviço.

**Critérios propostos:** inexistente retorna 404, repetição 422; massa de resultados
agrega conforme RN-013 e sucesso marca finalized=true; falha rejeita sem resposta
falsa de sucesso. UI reflete lista após reload; concorrência/rollback reais pendentes.

<a id="rf-020"></a>
## RF-020 — Consulta e manutenção de execuções

- **Objetivo / módulo:** disponibilizar histórico/detalhes e manutenção; Executions.
- **Ator e permissões:** A/Q atualizam; A exclui/restaura; L consulta.
- **Pré-condições:** ativo para GET/PUT/DELETE; excluído para restore.
- **Fluxo principal:** listar/filtrar → detalhar → atualizar registro ou excluir/restaurar.
- **Regras:** [RN-006](../regras-de-negocio.md#rn-006), [RN-007](../regras-de-negocio.md#rn-007), [RN-014](../regras-de-negocio.md#rn-014), [RN-015](../regras-de-negocio.md#rn-015), [RN-016](../regras-de-negocio.md#rn-016).
- **Endpoints/telas:** GET /execucoes; GET/PUT/DELETE /execucoes/:id; GET /execucoes/:id/results; GET /execucoes/stats/summary; POST /execucoes/:id/restore; /executions.
- **Evidência:** [serviço](../../backend/src/services/executionsService.js), [rota](../../backend/src/routes/execucoesDetalhado.js), [UI](../../frontend/src/pages/Executions.jsx).
- **Estado:** implementado com garantias parciais.
- **Limitações:** filtro projeto_id usa ts.projeto_id legado, não catálogo; PUT geral aceita status/resultado sem guarda finalized; summary não filtra uniformemente soft delete; restore sem UI.

**Critérios propostos:** filtro antecede paginação e total é coerente; ausente/excluído
no GET/PUT retorna 404; exclusão lógica e restore respeitam perfil/estado. Não declarar
imutabilidade universal a partir do teste de updateResult.

<a id="rf-021"></a>
## RF-021 — Relatórios e DOCX

- **Objetivo / módulo:** consultar histórico, gerar agregados e baixar DOCX; Reports.
- **Ator e permissões:** A/Q geram/exportam; L consulta histórico.
- **Pré-condições:** execuções/resultados disponíveis; filtros suportados quando usados.
- **Fluxo principal:** histórico → filtros → JSON → resultados ou conversão/download DOCX.
- **Regras:** [RN-006](../regras-de-negocio.md#rn-006), [RN-015](../regras-de-negocio.md#rn-015), [RN-016](../regras-de-negocio.md#rn-016), [RN-017](../regras-de-negocio.md#rn-017).
- **Endpoints/telas:** GET /relatorios; POST /relatorios/generate e /relatorios/export; /reports.
- **Evidência:** [serviço](../../backend/src/services/reportsService.js), [rota](../../backend/src/routes/relatorios.js), [UI](../../frontend/src/pages/Reports.jsx).
- **Estado:** implementado com ressalvas.
- **Limitações:** BUG-004 deixa link/URL em exceção; N+1 e geração integral; filtros sem validator específico; multi-suíte e dados históricos limitados; excluídos não são filtrados uniformemente.

**Critérios propostos:** filtros parametrizados e fim de dia inclusivo; totais de
casos/execuções separados; vazio sem taxa inválida; export com MIME DOCX e nome
datado; falha sem sucesso indevido. Limpeza em exceção requer correção futura, não está aprovada.

<a id="rf-022"></a>
## RF-022 — Dashboard

- **Objetivo / módulo:** apresentar indicadores/recentes; Dashboard.
- **Ator e permissões:** Admin, QA e Reader.
- **Pré-condições:** sessão; endpoint disponível.
- **Fluxo principal:** GET /stats → mapear totais/recentes → cards e listas.
- **Regras:** [RN-007](../regras-de-negocio.md#rn-007).
- **Endpoints/telas:** GET /stats; tela /.
- **Evidência:** [serviço](../../backend/src/services/statsService.js), [rota](../../backend/src/routes/stats.js), [UI](../../frontend/src/pages/Dashboard.jsx).
- **Estado:** parcial quanto à confiabilidade/semântica dos indicadores.
- **Limitações:** totalProjects conta projetos legados; DDL durante consulta; catch retorna zeros com resposta normal; sem garantia de somente ativos ou tempo real.

**Critérios propostos:** em consulta bem-sucedida, retornar stats/recentProjects/
recentExecutions; UI mapeia campos e trata rejeição HTTP. Não aprovar zeros como
substituto de dados quando banco falha; confiabilidade exige entrega específica.

<a id="rf-023"></a>
## RF-023 — Auditoria

- **Objetivo / módulo:** rastrear mutações instrumentadas; Auditoria.
- **Ator e permissões:** sistema registra; somente Admin consulta.
- **Pré-condições:** contexto de ator e tabela preparados.
- **Fluxo principal:** mutação gera evento quando instrumentada → Admin filtra/pagina.
- **Regras:** [RN-006](../regras-de-negocio.md#rn-006), [RN-016](../regras-de-negocio.md#rn-016), [RN-018](../regras-de-negocio.md#rn-018).
- **Endpoints/telas:** GET /admin/audit-log; chamadas de auditoria; sem UI específica identificada.
- **Evidência:** [auditService](../../backend/src/services/auditService.js), [catálogo](../../backend/src/services/projectCatalogService.js), [admin](../../backend/src/routes/admin.js).
- **Estado:** parcial: cobertura e atomicidade não uniformes.
- **Limitações:** helper legado absorve falhas; nem toda mutação tem evento; paginação sem limite comum; não prometer retenção/inviolabilidade/trilha completa. create de plano não recebe created_by como outros recursos.

**Critérios propostos:** Projects grava evento project na transação; rotas
instrumentadas usam ator/entidade/ação/snapshots; consulta aplica filtros
parametrizados e retorna envelope. Falha legada não equivale a rollback.

<a id="rf-024"></a>
## RF-024 — Paginação e navegação

- **Objetivo / módulo:** controlar leitura de listagens mantendo compatibilidade; transversal.
- **Ator e permissões:** Admin/QA/Reader conforme recurso.
- **Pré-condições:** endpoint elegível; page/limit válidos quando informados.
- **Fluxo principal:** solicitar → validar envelope → renderizar → mudar página/tamanho ou retry.
- **Regras:** [RN-016](../regras-de-negocio.md#rn-016).
- **Endpoints/telas:** listagens /projects, /projetos, /requirements, /test-suites, /test-plans, /execucoes, /relatorios; Pagination/usePaginatedList.
- **Evidência:** [helper](../../backend/src/services/pagination.js), [validators](../../backend/src/validators/common.js), [hook](../../frontend/src/hooks/usePaginatedList.js), [cliente](../../frontend/src/services/api.js).
- **Estado:** implementado nos escopos indicados.
- **Limitações:** auditoria distinta; seletores e relatório gerado podem carregar tudo; ordenação estável não é universal.

**Critérios propostos:** opt-in com envelope, padrão 20/máximo 100; forma legada
preservada; Reports aninha executions sem paginar agregados; UI oferece 20/50/100,
loading/erro/retry, descarta resposta abortada e ajusta página fora do intervalo.

<a id="rf-025"></a>
## RF-025 — Saúde da aplicação

- **Objetivo / módulo:** informar conectividade e sinais básicos; Operação.
- **Ator e permissões:** monitoramento/cliente público, sem sessão.
- **Pré-condições:** backend disponível e pool configurado.
- **Fluxo principal:** GET → SELECT 1 → compor conectividade/uptime/timestamp/tempo.
- **Regras:** sem RN específica entre RN-001 e RN-019; ver RNFs de disponibilidade/confidencialidade.
- **Endpoints/telas:** GET /health; sem tela específica.
- **Evidência:** [serviço](../../backend/src/services/healthService.js), [rota](../../backend/src/routes/health.js), [app](../../backend/src/app.js).
- **Estado:** implementado; resposta exige revisão de segurança.
- **Limitações:** inclui err.message do banco; mistura saúde de aplicação/dependência; não comprova SLA nem monitoramento ativo.

**Critérios propostos:** banco acessível retorna 200/healthy=true/status=ok;
falha retorna 503/healthy=false/status=degraded; sinais de runtime presentes.
Exposição de mensagem interna não é critério aprovado.

<a id="rf-026"></a>
## RF-026 — Capacidades futuras

- **Objetivo / módulo:** separar evolução planejada; Planejamento.
- **Ator e permissões:** A DEFINIR por capacidade futura.
- **Pré-condições:** aprovação de escopo/dependências do roadmap.
- **Fluxo principal:** não há fluxo implementado único; detalhar em entregas futuras.
- **Regras:** sem RN implementada específica; regras futuras exigem revisão própria.
- **Endpoints/telas:** A DEFINIR; não confundir DOCX com importação/exportação tabular.
- **Evidência:** [roadmap](../../roadmap.md), itens 24–26 e evolução posterior.
- **Estado:** planejado; agrupador do diagnóstico, não funcionalidade pronta.
- **Limitações:** versionamento de casos e importação/exportação CSV/XLSX/JSON não são comprovados; E2E é validação futura separada, não capacidade funcional implementada.

**Critérios propostos para futura especificação:** desdobrar capacidades em novos
IDs com atores, fluxos e aceite aprovados antes de implementar; manter RF-026 como
referência histórica. Esta entrada não estabelece aceite executável do produto.
