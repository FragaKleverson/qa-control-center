# Permissões definitivas — 04/11/2026

## Situação atual — 04/11/2026

Homologação manual RBAC **6/6 aprovada pelo usuário**, posterior às verificações
HTTP documentadas abaixo. Padronização visual também homologada. A referência
posterior resolve a pendência de revisão no Chrome descrita ao final deste histórico.
Última regressão isolada: **651/651 em 27 suítes**. Não houve nova execução HTTP,
limpeza ou teste integrado nesta consolidação. Ver [estado consolidado](FEATURE-VALIDATION-STATUS.md).


Admin consulta, cria/edita e exclui/restaura. QA consulta e cria/edita, sem excluir
ou restaurar. Reader consulta somente. Aplicam-se também as demais regras do domínio:
nenhum perfil edita ou reexecuta plano já executado; exclusão lógica não apaga histórico.

| Módulo | Admin | QA | Reader |
|---|---|---|---|
| Projects (/projects) | Consultar/criar/editar/excluir/restaurar | Consultar/criar/editar | Consultar |
| Test Cases (/projetos) | Consultar/criar/editar/excluir/restaurar | Consultar/criar/editar | Consultar |
| Test Suites (/test-suites) | Consultar/criar/editar/excluir/restaurar | Consultar/criar/editar | Consultar |
| Test Plans (/test-plans) | Consultar/criar/editar/executar/excluir/restaurar conforme estado | Consultar/criar/editar/executar conforme estado | Consultar |
| Executions (/execucoes) | Consultar/criar/editar/finalizar/excluir/restaurar conforme estado | Consultar/criar/editar/finalizar conforme estado | Consultar |
| Requirements (/requirements) | Consultar/criar/editar/excluir/restaurar | Consultar/criar/editar | Consultar |
| Reports (/relatorios) | Consultar/gerar/exportar | Consultar/gerar/exportar | Consultar |
| Dashboard (/stats) | Consultar | Consultar | Consultar |
| Gestão de usuários e auditoria administrativa | Acesso administrativo existente | Sem acesso administrativo | Sem acesso administrativo |

Reports não tem entidade persistida com DELETE/restore; gerar/exportar são POST
restritos a Admin/QA. Não foram inventadas ações de exclusão. Gestão administrativa
continua Admin-only, sem ampliar acesso a dados de usuários. Registro por convite,
login/logout e recuperação de senha permanecem fluxos próprios de autenticação;
não foram reinterpretados como operações administrativas de exclusão.

## Inventário de exclusão e restauração

Todos os endpoints abaixo passam por autenticação e exigem Admin antes de executar
serviço/SQL/auditoria. Sem token: 401. QA/Reader: 403, inclusive para IDs inexistentes.
Admin pode receber 404/409 quando estado ou existência impedirem a operação.

| Operação | Endpoint | Implementação |
|---|---|---|
| DELETE e POST restore | /projects/:id e /projects/:id/restore | routes/projects.js |
| DELETE e POST restore | /projetos/:id e /projetos/:id/restore | routes/projetos.js |
| DELETE e POST restore | /test-suites/:id e /test-suites/:id/restore | routes/testSuites.js |
| DELETE e POST restore | /test-plans/:id e /test-plans/:id/restore | routes/testPlans.js |
| DELETE e POST restore | /execucoes/:id e /execucoes/:id/restore | routes/execucoesDetalhado.js |
| DELETE e POST restore | /requirements/:id e /requirements/:id/restore | routes/requirements.js |
| DELETE de vínculo | /test-suites/:id/cases/:projetoId | routes/testSuites.js |
| DELETE de vínculo | /test-plans/:id/suites/:suiteId | routes/testPlans.js |
| DELETE administrativo | /admin/usuarios/:id | routes/admin.js, authorize(admin) no router |

São 9 rotas DELETE e 6 rotas POST de restauração. A regra definitiva também foi
aplicada às duas rotas DELETE de desvinculação: somente Admin remove esses vínculos.
QA continua podendo adicionar vínculos e editar os dados permitidos. O campo
project_id opcional do Test Case mantém sua semântica de edição via PUT.
Não existem outros POST de exclusão de entidades no inventário atual.

## Interface

Projects/Test Cases já restringiam exclusão a Admin. Requirements, Test Suites e
Executions receberam controle por perfil para criação, edição e exclusão, além de
guardas nos handlers. Reader vê observações/status de resultados como leitura,
sem campos editáveis/finalização. Test Plans também restringe remoção de suite a
Admin. Reports bloqueia gerar/exportar para Reader na interface e nos handlers,
mantendo leitura. Restauração não possui interface nas páginas atuais; backend
continua exigindo Admin. Ocultação visual não substitui as verificações HTTP.

## Evidências e cuidados

Validação por HTTP real realizada exclusivamente no banco qa_control_integration,
127.0.0.1:5435, cluster 7704309760569225254, com guardas aprovadas. Nenhuma conexão
de testes automatizados de integração estava presente. Não houve Jest integrado,
TRUNCATE, reset, migration ou limpeza durante a homologação.

65 verificações HTTP registradas; 44 negações com preservação dos registros/auditoria
ou vínculos correspondentes. Admin excluiu/restaurou registros novos dos seis
módulos e removeu vínculos novos. QA editou registros novos e recebeu 403 nas
exclusões/restaurações; Reader recebeu 403 também na criação/edição. Plano executado
permaneceu bloqueado a edição/reexecução após excluir/restaurar. Exclusão de usuário
foi comprovada apenas sobre conta descartável criada pela API para essa validação.

Relatório local ignorado: .env.rbac-http-results.local. Contém IDs e resultados,
sem JWTs ou senhas. Registros RBAC- foram mantidos, sem limpar dados manuais.
O script check-rbac-http.js exige autorização própria e recusa repetição se houver
relatório anterior; não executar novamente indiscriminadamente durante uso manual.

O processo dedicado de homologação foi reiniciado para carregar rotas corrigidas,
preservando URLs 127.0.0.1:3105 e 127.0.0.1:5175, credenciais e segredos. Nenhum
serviço protegido foi alterado. A revisão visual em Chrome ainda precisa confirmar
as ações de cada perfil; os testes de componentes usam renderizador isolado.

Validação final desta correção: 613 testes isolados aprovados em 25 suítes
(117 novos em relação aos 496 anteriores). ESLint sem erros/warnings, build Vite
aprovado e sintaxe de 15 arquivos JS/JSX/CJS conferida. Não foi executada a regressão
integrada com limpezas durante a sessão manual. A alteração de testes antigos se
limitou ao mock da dependência AuthContext em Reports e ao comentário RBAC obsoleto;
nenhuma asserção anterior foi removida ou reduzida.
