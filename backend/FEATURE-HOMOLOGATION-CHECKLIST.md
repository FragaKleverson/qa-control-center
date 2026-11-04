# Fechamento da feature - checklist de homologação integrada

## Fechamento comprovado — consolidação de 04/11/2026

- [x] Última regressão isolada: **651/651**, em **27 suítes**.
- [x] Integração anterior: **339 aprovados**, em 19 suítes, por execuções separadas.
- [x] Prisma validate, build Vite e ESLint aprovados anteriormente.
- [x] Ensaio histórico sintético: **10 migrations**, **60 registros preservados** em 12 tabelas.
- [x] Fluxo principal no navegador: **9/9 cenários**, confirmado pelo usuário.
- [x] RBAC no navegador: **6/6 verificações**, confirmado pelo usuário.
- [x] Padronização visual homologada pelo usuário.
- [x] Nenhum banco protegido alterado durante o ensaio histórico.

Referências: [estado atual e limites](FEATURE-VALIDATION-STATUS.md),
[relatório histórico](HISTORICAL-MIGRATION-REHEARSAL.md) e
[roteiro manual](BROWSER-HOMOLOGATION.md). Os detalhes manuais são confirmação do
responsável; não foram executados por automação de navegador nesta consolidação.

## Histórico do checklist e das execuções

As caixas abertas e contagens nas seções seguintes foram preservadas como roteiro
original de cada etapa. O fechamento atual está acima; não interpretar aquelas
caixas como pendências gerais da feature nem como prova individual de aspectos
não cobertos pelos cenários confirmados. UI de restore de Projects, rollout em
banco original e testes em grande volume continuam fora do escopo aprovado.


## Correção RBAC de homologação — 04/11/2026

Regra definitiva e inventário em RBAC-PERMISSIONS.md: exclusão/restauração exclusivas
do Admin em todos os módulos aplicáveis, inclusive rotas DELETE de vínculos.
QA cria/edita/consulta; Reader consulta. Reports não tem DELETE/restore persistidos.
Corrigidas as rotas de exclusão de Suites, Executions e Requirements e as duas
desvinculações; todas as restaurações já eram Admin-only. UI desses módulos agora
respeita perfis; Reader não edita resultados nem finaliza execuções. Reports bloqueia
geração/exportação por Reader, conforme endpoints existentes.

HTTP real: 65 verificações registradas, 44 negações sem alterar registros/auditoria
ou vínculos correspondentes, somente sobre fixtures novas no banco descartável.
Admin exclui/restaura; QA/Reader recebem 403; Reader também não cria/edita.
Imutabilidade de plano executado preservada após excluir/restaurar. Nenhum teste
integrado destrutivo, migration ou limpeza executado. Registros RBAC- mantidos.
Regressão final: 613/613 testes isolados em 25 suítes; ESLint e build Vite aprovados.
Sintaxe de 15 arquivos conferida. Evidências locais em .env.rbac-http-results.local.

- [ ] Revalidar no Chrome Admin, QA e Reader após recarregar a interface.
- [ ] Confirmar ausência de excluir/remover/restaurar para QA/Reader em cada página.
- [ ] Confirmar Reader sem criar/editar/finalizar e resultados somente leitura.
- [ ] Verificar detalhes, filtros e paginação permanecem utilizáveis nos três perfis.

Código revisado em 04/11/2026. Este documento não representa homologação.
As 10 migrations foram aplicadas no banco descartável em 04/11/2026, com checksums
conferidos. Não usar os bancos preservados qadb ou qa_control_test para este ensaio.
O ambiente descartável foi identificado antes das execuções; sua disponibilidade
deve ser novamente verificada antes de cada execução futura.

## Pré-condições para o ensaio futuro

- [x] Autorizar separadamente provisionamento/estabilização, migrations e testes.
- [x] Confirmar cluster, credenciais, socket 127.0.0.1:5435, volume e rede exclusivos.
- [x] Registrar identidade do cluster e descartabilidade dos dados do ambiente novo.
- [x] Revisar hashes e ordem das migrations: histórico anterior, depois
  20261030000000_add_plan_execution_guard e
  20261030000001_create_projects_and_optional_case_link.
- [ ] Preparar fixtures legadas representativas antes das migrations alvo, em
  baseline separado. Banco novo vazio não comprova preservação de dados históricos.
- [ ] Comparar contagens, IDs, vínculos e JSON antes/depois; não inferir vínculos
  entre planos e execuções antigas nem converter registros de projetos em Projects.

## Fluxos e critérios de aprovação

- [ ] Admin/QA criam e editam Projects; nome vazio é recusado. Descrição pode ser
  limpa. Autoria vem da sessão. Reader consulta, sem ações de escrita.
- [ ] Somente Admin exclui/restaura via API. Repetições retornam 404 conforme contrato.
  Exclusão lógica preserva casos e vínculos; restauração mantém identidade.
  Interface administrativa de restauração ainda não está implementada.
- [ ] Catálogo Projects usa /projects; área legada usa /projetos somente para leitura.
  Abrir detalhes e alternar áreas preserva paginação e filtros independentes.
- [ ] Test Case pode ser criado sem Project. Edição distingue project_id omitido,
  null e ID ativo; rejeita ID inválido, inexistente ou excluído. Vínculo histórico
  excluído continua visível e não é removido em falha de catálogo.
- [ ] Cenários omitidos permanecem intactos. JSON explícito e [] são persistidos.
  Dados legados heterogêneos são consultáveis sem conversão ou gravação automática.
  PUT com descrição/feature vazias persiste a intenção explícita aceita pelo validator.
- [ ] Uma suite aceita casos de Projects diferentes e sem Project. IDs de casos
  continuam sendo projetos.id; nenhum filtro novo por Project restringe esses vínculos.
- [ ] Plano novo pode existir sem suites. Execução sem suite ativa, sem caso ativo
  ou com ambiente inválido é recusada, sem execução vazia ou resultado parcial.
- [ ] Ambiente da execução vem do plano persistido. Apenas staging, production,
  development e homologação são aceitos para novos registros.
- [ ] Execução bem-sucedida registra vínculo e executed_at, independentemente do
  resultado posterior dos testes. Todos os perfis ficam impedidos de reexecutar,
  editar o plano ou alterar suas suites. Suites/casos compartilhados seguem independentes.
- [ ] Planos review_required ficam consultáveis e bloqueados para edição/vínculo/execução.
  Não existe desbloqueio automático; revisão exige evidências e autorização auditável.
- [ ] Admin pode excluir/restaurar plano executado sem liberar edição/reexecução.
  Execution excluída não é restaurada automaticamente; plano informa indisponibilidade.
- [ ] Fechar A e abrir B durante cadastro, vínculo de suite ou consulta de execução
  não permite que resposta tardia de A altere B, inclusive erro 409 e loading.
- [ ] Repetir cliques não duplica requisições de criação/vínculo. Falha ao consultar
  suites bloqueia alterações até nova consulta, feita reabrindo o modal.
- [ ] GET sem page/limit mantém array; paginação opt-in retorna data/total/page/limit.
  Ordenação, filtros, páginas vazias e erros mantêm comportamento compatível.

## Provas obrigatórias com PostgreSQL

- [x] Conexões independentes: executar/executar, executar/editar, executar/vincular,
  executar/desvincular, executar/excluir e executar/restaurar; provar espera por lock.
- [x] Rollback em falha da execução, resultados e atualização do plano; nenhum parcial.
- [x] Concorrência entre vincular Project e excluir Project nos dois ordenamentos.
- [x] Permissões HTTP com autenticação real em /projects e /projetos, usando routers
  e middleware existentes em composição Express explícita. A composição de produção
  completa no navegador continua pendente; outras suítes ainda usam usuário injetado.
- [ ] Execuções independentes, resultados, Reports e Dashboard preservam referências
  históricas e significado. Atribuição de resultados a múltiplas suites segue limitada
  ao comportamento anterior; não considerar corrigida nesta entrega.

## Limites conhecidos

Auditoria legada de /projetos permanece best-effort e fora da transação; o catálogo
/projects audita na própria transação. Autenticação/JWT global não foi reformulada.
Filtro textual de Projects atua somente na página atual, explicitado na interface.
O formulário de casos edita somente o primeiro cenário e preserva os demais.
Testes isolados de componentes usam renderizador simulado; não substituem navegador,
teclado, leitor de tela ou testes reais de concorrência do PostgreSQL.

Registrar por item: responsável, data, fixture, resultado esperado/obtido e evidência.
Qualquer divergência impede a aprovação do fluxo afetado. Não marcar roadmap como
homologado com base somente em lint, build, validação Prisma ou testes com mocks.

## Registro de execução integrada — 04/11/2026

Destino único: qa_control_integration, 127.0.0.1:5435, usuário qa_integration_runner,
cluster 7704309760569225254, volume qa-control-integration_pgdata. Guardas e identidade
real aprovadas antes da execução. Execução exclusivamente pelo runner protegido,
sem reaplicar migrations. Operações destrutivas limitadas ao banco descartável.

- Primeira execução do ciclo de vida: 18/18 aprovados (1 suíte), incluindo sessões
  independentes e observação de pg_blocking_pids para comprovar contenção real.
- Primeira regressão restante: 292 aprovados e 15 reprovados em 307 testes (17 suítes).
  As falhas ocorreram em projetos.test.js e execucoes.test.js: usuário injetado id=1
  ausente, com violações de FK na autoria e mensagens de auditoria. Fixtures de API
  corrigidas para criar seu próprio usuário antes da suíte, sem depender da ordem
  de execução. Nenhuma asserção foi reduzida; regras da aplicação não foram alteradas.
- Adicionada suíte projects-integration.test.js: autenticação JWT real com routers
  e middleware existentes (sem bypass de app.js), CRUD/permissões, auditoria,
  paginação, vínculo opcional/histórico, cenários JSON e suites entre Projects.
  Inclui duas ordens concorrentes de vínculo/exclusão com bloqueio observado no banco.
- Reexecução de projetos.test.js, execucoes.test.js e projects-integration.test.js:
  72/72 aprovados (3 suítes), incluindo os 14 novos testes integrados. As 15 falhas
  iniciais foram eliminadas pela correção de fixtures, sem alterações de produção.
- Regressão isolada após as alterações: 462/462 aprovados em 22 suítes. Sintaxe dos
  oito arquivos de teste conferida. Frontend, schema e migrations não foram alterados.
- Reexecução das outras cinco suítes com fixtures corrigidas (Requirements,
  Security, Test Suites, Test Plans e validação): 83/83 aprovados em 5 suítes.

Consolidado das últimas execuções por suíte: 339 testes integrados/HTTP distintos em
19 suítes, todos aprovados. São 18 do ciclo de vida, 307 da regressão existente e
14 novos de Projects. Este consolidado reúne execuções separadas pelo mesmo runner;
não representa uma única execução simultânea das 19 suítes. As 15 reprovações
iniciais permanecem registradas acima como histórico da investigação e correção.

Verificação posterior de integridade: 10 registros de migrations concluídos e com
checksums preservados, 14 tabelas, 26 constraints relevantes e 5 índices relevantes
idênticos à inspeção após migrate. Nenhuma referência órfã nas verificações de
casos/Projects, execuções/planos, resultados/casos/execuções e vínculos de suites.
Container running/healthy e mesmo cluster ao final. Dados de fixtures são descartáveis;
este resultado não declara banco vazio nem implica homologação funcional completa.

A suíte nova é opt-in: sem modo descartável, não importa serviços nem executa fixtures.
No runner autorizado, todos os seus 14 testes foram efetivamente executados, sem skips.

As caixas de fluxos funcionais acima permanecem pendentes de homologação no navegador;
aprovação automatizada de API não comprova experiência, foco, teclado ou acessibilidade.
Preservação de dados preexistentes através das migrations continua pendente de ensaio
com baseline legado representativo; não é comprovada por fixtures criadas após migrate.

## Preparação da homologação no navegador — 04/11/2026

Não executada: nenhuma ferramenta real de automação de navegador foi identificada
na sessão, e frontend/backend não possuem dependência local de Playwright,
Puppeteer, Selenium ou Cypress. Roteiro manual em BROWSER-HOMOLOGATION.md.
Nenhum cenário visual foi marcado como aprovado, nenhum bug visual foi confirmado
e nenhum código de produção foi alterado nesta preparação.

Pré-condição de ambiente resolvida em 04/11/2026: modo manual opt-in separado,
NODE_ENV=development com JWT real e guardas de destino/socket/cluster no próprio pool.
Launcher start-homologation.js valida identidade e portas antes de abrir HTTP.
Frontend http://127.0.0.1:5175 e backend http://127.0.0.1:3105, somente loopback.
Contas Admin/QA/Reader criadas via API; senhas em arquivo local ignorado pelo Git.
Login, negação sem token, permissões básicas e CORS aprovados por HTTP. Instruções
em BROWSER-HOMOLOGATION.md. Regressão isolada: 496/496 em 23 suítes.
Nenhum teste integrado destrutivo ou limpeza durante esse preparo. Homologação
visual continua pendente. O preflight separado não comprova outro processo API;
a própria instância manual usa pool protegido e confere identidade em cada aquisição.
