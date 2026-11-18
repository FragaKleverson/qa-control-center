# Regras de negócio

[Índice](README.md) · [RFs](requisitos/funcionais.md) · [Rastreabilidade](rastreabilidade.md)

IDs estáveis derivados do levantamento. Regras descrevem o código; limitações não
são decisões aprovadas de produto. Revisão estática não comprova execução real.
Os vínculos RF abaixo apontam para o catálogo, sem duplicar contratos completos.

<a id="rn-001"></a>
## RN-001 — Cadastro controlado e perfil inicial

Exigir x-register-token válido; validar name, email e password. A contagem de users
define Admin para o primeiro usuário e QA para os seguintes. Nome passa por trim,
senha tem 8–128 caracteres no validator e e-mail é normalizado no serviço.
Duplicidade de e-mail retorna 409. Não há transação que serialize o bootstrap do
primeiro Admin; não prometer unicidade de primeiro administrador sob concorrência.
Relaciona [RF-001](requisitos/funcionais.md#rf-001).
Fonte: [rota](../backend/src/routes/auth.js), [validator](../backend/src/validators/auth.js),
[serviço](../backend/src/services/authService.js). A nota histórica de sincronização
pendente foi superada: [Swagger/OpenAPI](../openapi.json) documenta 62 operações HTTP,
com exportação sincronizada com a fonte Swagger, e [Postman](../QA_Control_Center.postman_collection.json)
contém 62 requisições correspondentes e teve validação manual confirmada pelo
usuário. A homologação funcional e a prontidão para produção dependem de
validações próprias.

<a id="rn-002"></a>
## RN-002 — Credenciais e normalização no login

O serviço aplica lowercase/trim ao e-mail e executa bcrypt.compare mesmo sem usuário,
usando hash fictício. Usuário ausente e senha incorreta geram a mesma resposta 401.
A rota valida formato do e-mail antes do serviço; não prometer aceitar todo e-mail
com espaços só porque o serviço normaliza. Comparação executada não prova tempo equivalente.
Campos omitidos/vazios e formato inválido retornam 422 no validator HTTP; não
confundir usuário não encontrado com ausência dos campos obrigatórios.
Relaciona [RF-002](requisitos/funcionais.md#rf-002).
Fonte: [authService.login](../backend/src/services/authService.js), [validator](../backend/src/validators/auth.js).

<a id="rn-003"></a>
## RN-003 — Identidade e papel do JWT

Login assina sub, email, name, role e JTI único a partir do usuário persistido,
com expiração configurada. Não aceita papel enviado no login. A autenticação
projeta claims; sem role usa reader. Alteração de papel no banco não reemite nem
revoga automaticamente todos os tokens anteriores. Claims não têm schema completo no middleware.
Relaciona [RF-002](requisitos/funcionais.md#rf-002), [RF-003](requisitos/funcionais.md#rf-003),
[RF-006](requisitos/funcionais.md#rf-006), [RF-007](requisitos/funcionais.md#rf-007).
Fonte: [serviço](../backend/src/services/authService.js), [middleware](../backend/src/middleware/auth.js).

<a id="rn-004"></a>
## RN-004 — Revogação por JTI

Logout backend registra JTI/expiração na blocklist e remove entradas expiradas.
Middleware rejeita JTI revogado; falha da consulta é encaminhada sem autenticar.
Tokens legados sem JTI não são consultados na blocklist. O botão frontend limpa
somente sessão local. Não confundir os dois contratos nem afirmar 503 garantido:
o middleware passa o erro ao handler, que define a resposta.
Relaciona [RF-003](requisitos/funcionais.md#rf-003), [RF-004](requisitos/funcionais.md#rf-004).
Fonte: [authService](../backend/src/services/authService.js), [auth](../backend/src/middleware/auth.js),
[AuthProvider](../frontend/src/contexts/AuthProvider.jsx).

<a id="rn-005"></a>
## RN-005 — Token de redefinição

Forgot normaliza e-mail, invalida tokens anteriores não utilizados e persiste hash
SHA-256 de token aleatório com expiração. Reset rejeita token ausente no banco,
usado ou expirado; altera hash da senha e marca uso. A mensagem de forgot é genérica,
mas fora de produção há _dev_token somente quando existe usuário. Não há envio de
e-mail nem transação abrangente de consumo; concorrência e invalidação de JWTs
anteriores não estão garantidas por esse fluxo.
Token omitido/vazio é rejeitado pelo validator HTTP com 422; os erros 400 do
serviço referem-se a token fornecido, porém não encontrado, expirado ou já usado.
Relaciona [RF-005](requisitos/funcionais.md#rf-005).
Fonte: [authService](../backend/src/services/authService.js), [rotas](../backend/src/routes/auth.js).

<a id="rn-006"></a>
## RN-006 — Permissões por operação

Admin e QA criam/editam recursos e adicionam vínculos; somente Admin exclui,
restaura e remove vínculos de suites/planos. Reader consulta. Reports gera/exporta
para Admin/QA. Administração exige Admin; ele não altera o próprio papel nem
exclui a própria conta. Alterar project_id via PUT é edição de caso, não a rota
DELETE de vínculo. Não há escopo geral por autoria/equipe. Restrições de estado
continuam válidas para Admin. Ver [contrato RBAC](../backend/RBAC-PERMISSIONS.md).
Relaciona [RF-006](requisitos/funcionais.md#rf-006), [RF-007](requisitos/funcionais.md#rf-007)
e RF-008 a RF-023 nas operações protegidas.
Fonte: [authorize](../backend/src/middleware/authorize.js), [routers](../backend/src/routes/),
[authService](../backend/src/services/authService.js).

<a id="rn-007"></a>
## RN-007 — Namespaces independentes

/projects usa projects; /projetos usa casos legados em projetos. Igualdade numérica
de IDs não implica identidade. test_suites.projeto_id e vínculos legados continuam
apontando para projetos, não projects. Requirements não tem vínculo implementado
com essas entidades. Ver [contrato de persistência](../backend/PROJECTS-PERSISTENCE-CONTRACT.md).
Relaciona [RF-008](requisitos/funcionais.md#rf-008), [RF-010](requisitos/funcionais.md#rf-010),
[RF-011](requisitos/funcionais.md#rf-011), [RF-012](requisitos/funcionais.md#rf-012),
[RF-013](requisitos/funcionais.md#rf-013), [RF-020](requisitos/funcionais.md#rf-020),
[RF-022](requisitos/funcionais.md#rf-022).
Fonte: [schema](../backend/prisma/schema.prisma), [catálogo](../backend/src/services/projectCatalogService.js),
[casos](../backend/src/services/projectsService.js).

<a id="rn-008"></a>
## RN-008 — Vínculo opcional do caso

POST omitido cria sem vínculo; PUT omitido preserva; null remove; ID numérico
positivo até 2147483647 vincula/troca somente Project ativo. Strings numéricas não
são aceitas nesse campo. Atribuição não nula bloqueia pai ativo com FOR SHARE na
transação da escrita. GET preserva project_id e informa nome/data de exclusão do
pai atual; não é snapshot do nome. Ver [contrato](../backend/PROJECTS-PERSISTENCE-CONTRACT.md).
Relaciona [RF-009](requisitos/funcionais.md#rf-009), [RF-011](requisitos/funcionais.md#rf-011).
Fonte: [serviço](../backend/src/services/projectsService.js), [validator](../backend/src/validators/projetos.js).

<a id="rn-009"></a>
## RN-009 — Cenários JSON e atualização parcial

cenarios aceita JSON, sem impor shape Gherkin a todo o legado. Omissão no PUT
preserva; informado substitui, inclusive [] e JSON null. UI edita o primeiro
cenário, preserva adicionais/propriedades extras e omite cenarios não alterado.
Na criação exige título/descrição/feature; UI também valida seus campos de cenário.
Ver correção posterior no [contrato](../backend/PROJECTS-PERSISTENCE-CONTRACT.md).
Relaciona [RF-010](requisitos/funcionais.md#rf-010).
Fonte: [validator](../backend/src/validators/projetos.js), [serviço](../backend/src/services/projectsService.js),
[TestCases](../frontend/src/pages/TestCases.jsx).

<a id="rn-010"></a>
## RN-010 — Domínios de Requirements

Status: Open, In Progress, Closed, Blocked. Prioridade: Low, Medium, High,
Critical. Defaults de criação: Open/Medium; título trim não vazio. Não há máquina
de transição entre estados identificada. Serviço de update usa COALESCE com
valores falsy; limpeza por string vazia não tem a semântica de /projects.
Relaciona [RF-012](requisitos/funcionais.md#rf-012).
Fonte: [validator](../backend/src/validators/requirements.js), [serviço](../backend/src/services/requirementsService.js).

<a id="rn-011"></a>
## RN-011 — Elegibilidade e imutabilidade do plano

Novos planos são criados como eligible pelo serviço. A migration prevê classificar
os planos preexistentes como review_required quando aplicada; não foi consultado
o estado de cada banco nesta revisão. executed é outra classificação possível.
executed_at ou classificação executed bloqueia mutação/reexecução com 409;
classificação diferente de eligible também bloqueia. Delete/restore administrativos
preservam esse estado e não são desbloqueio. Não há endpoint de liberação de legado.
Relaciona [RF-015](requisitos/funcionais.md#rf-015), [RF-016](requisitos/funcionais.md#rf-016).
Fonte: [serviço](../backend/src/services/testPlansService.js).
Contrato: [ciclo de planos](../backend/TEST-PLAN-LIFECYCLE.md).

<a id="rn-012"></a>
## RN-012 — Execução única do plano

Exigir ambiente canônico, suíte ativa e caso ativo. Bloquear plano primeiro;
deduplicar casos; criar execução pending/resultados pending e executed_at na mesma
transação. Ambiente vem do plano; body de execute não o escolhe. UNIQUE de plan_id
impede duplicidade mesmo após soft delete da execução. suite_id guarda a primeira
suíte ativa na ordenação do vínculo; não representa todas as suítes do plano.
Ambientes: staging, production, development, homologação.
Relaciona [RF-015](requisitos/funcionais.md#rf-015), [RF-016](requisitos/funcionais.md#rf-016).
Fonte: [serviço](../backend/src/services/testPlansService.js), [validator](../backend/src/validators/testPlans.js),
[schema](../backend/prisma/schema.prisma). Contrato: [ciclo de planos](../backend/TEST-PLAN-LIFECYCLE.md).

<a id="rn-013"></a>
## RN-013 — Agregação de finalização

Algum failed define failed; todos passed com total positivo define passed;
demais combinações definem completed. Finaliza mesmo com pending ou sem resultados.
Repetição retorna 422; execução inexistente, 404. Isso caracteriza a política atual,
não aprova como requisito futuro a aceitação de pendências. Serviço não tem
transação abrangente/lock equivalente ao de execução de planos.
As consultas de finalize não filtram deleted_at, portanto a regra não comprova
bloqueio de finalização de execução excluída logicamente.
Relaciona [RF-019](requisitos/funcionais.md#rf-019).
Fonte: [executionsService.finalize](../backend/src/services/executionsService.js).

<a id="rn-014"></a>
## RN-014 — Edição de resultados e limites do bloqueio

updateResult consulta finalized e rejeita edição finalizada com 422; resultado
ausente retorna 404. Atualiza status/comentário e depois marca execução running,
sem depender de contagem de pendentes. Estados aceitos no validator: pending,
in_progress, running, passed, failed, blocked, completed, skipped.
O update geral da execução não possui essa guarda. UI oculta controles, mas callbacks
antigos podem chamar API (BUG-002). Não há garantia atômica contra corrida finalizar/editar.
Relaciona [RF-018](requisitos/funcionais.md#rf-018), [RF-019](requisitos/funcionais.md#rf-019),
[RF-020](requisitos/funcionais.md#rf-020).
Fonte: [serviço](../backend/src/services/executionsService.js), [validator](../backend/src/validators/execucoes.js),
[UI](../frontend/src/pages/Executions.jsx).

<a id="rn-015"></a>
## RN-015 — Exclusão lógica e exceções

Projects, casos, Requirements, Suites, Plans e Executions usam deleted_at e restore.
Listagens principais desses recursos ocultam excluídos, mas agregações/históricos
não adotam filtro uniforme. Usuários e associações usam DELETE físico. Restaurar
plano não libera reexecução. Excluir Project não exclui casos nem limpa seu vínculo.
Relaciona [RF-009](requisitos/funcionais.md#rf-009), [RF-010](requisitos/funcionais.md#rf-010),
RF-012 a RF-015, [RF-020](requisitos/funcionais.md#rf-020), [RF-021](requisitos/funcionais.md#rf-021).
Fonte: [serviços](../backend/src/services/). Contratos: [RBAC](../backend/RBAC-PERMISSIONS.md),
[Projects](../backend/PROJECTS-PERSISTENCE-CONTRACT.md), [planos](../backend/TEST-PLAN-LIFECYCLE.md).

<a id="rn-016"></a>
## RN-016 — Paginação compatível

Sem page/limit, recursos principais preservam array; com qualquer um, envelope
data/total/page/limit. Helper: padrão 20, máximo 100, página inicial 1. Relatórios
aninha o envelope em executions e mantém stats/suiteStats globais; sem paginação
seu histórico limita 100. Auditoria usa implementação própria, sem o mesmo limite
máximo verificado. Ordenação estável existe em recursos específicos, não em todos.
Relaciona [RF-020](requisitos/funcionais.md#rf-020), [RF-021](requisitos/funcionais.md#rf-021),
[RF-023](requisitos/funcionais.md#rf-023), [RF-024](requisitos/funcionais.md#rf-024).
Fonte: [helper](../backend/src/services/pagination.js), [reports](../backend/src/services/reportsService.js),
[auditoria](../backend/src/services/auditService.js). Contrato de paginação no [roadmap](../roadmap.md).

<a id="rn-017"></a>
## RN-017 — Filtros e agregados de relatório

Filtros suportados: startDate, endDate e suite_id. SQL parametrizado; data final
usa limite exclusivo do dia seguinte. Totais de execuções e casos são separados;
taxa de execução é passed/total, uma casa decimal, zero quando vazio. Geração usa
uma consulta de casos por execução e retorna conjunto completo; não há schema Zod
específico dos filtros. DOCX deriva desse relatório; joins usam dados atuais.
Relaciona [RF-021](requisitos/funcionais.md#rf-021).
Fonte: [serviço](../backend/src/services/reportsService.js), [rota](../backend/src/routes/relatorios.js).

<a id="rn-018"></a>
## RN-018 — Autoria e auditoria com garantias distintas

Recursos que recebem created_by devem obtê-lo do usuário autenticado, não do body.
Projects grava auditoria project na mesma transação. Rotas legadas usam helper
best-effort, com entidade projeto para casos; falha de auditoria não reverte negócio.
Não há evento em toda mutação: vínculos/resultados/finalização exigem análise
específica. Não prometer trilha completa, imutabilidade ou retenção não implementadas.
Relaciona [RF-008](requisitos/funcionais.md#rf-008), [RF-009](requisitos/funcionais.md#rf-009),
[RF-010](requisitos/funcionais.md#rf-010), [RF-023](requisitos/funcionais.md#rf-023).
Fonte: [auditService](../backend/src/services/auditService.js), [catálogo](../backend/src/services/projectCatalogService.js),
[rotas](../backend/src/routes/). Contrato: [Projects/Test Cases](../backend/PROJECTS-PERSISTENCE-CONTRACT.md).

<a id="rn-019"></a>
## RN-019 — Identificador visual de caso

TC seguido do ID numérico preenchido com zeros até quatro posições é apresentação
da UI; não é chave independente ou limite de quatro dígitos no banco. Endpoints e
relacionamentos continuam usando ID numérico.
Relaciona [RF-010](requisitos/funcionais.md#rf-010).
Fonte: [formatTCId](../frontend/src/pages/TestCases.jsx).
