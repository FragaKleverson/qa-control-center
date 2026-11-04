# Projects independentes — Etapa 1: persistência e contratos futuros

## Situação atual — consolidação de 04/11/2026

Implementação e validações da separação Projects × Test Cases concluídas no escopo da feature. As 10 migrations foram aplicadas em banco descartável; o ensaio histórico preservou 60 registros sintéticos. Testes isolados: 651/651 em 27 suítes; integração anterior: 339 aprovados. Fluxo principal 9/9, RBAC 6/6 e visual homologados pelo usuário. Pendências antigas de API, frontend e persistência de cenarios foram resolvidas nas etapas posteriores. A migração dos bancos originais não foi executada nem autorizada por estes resultados.

Consultar [estado consolidado](FEATURE-VALIDATION-STATUS.md) para resultados, ambientes protegidos e limitações.

## Registro das etapas anteriores

As notas abaixo registram o estado em cada entrega, não o estado atual. Pendências
posteriormente resolvidas estão identificadas no resumo acima; números antigos não
substituem os últimos resultados. As instruções legadas de execução foram substituídas
quando poderiam alcançar bancos protegidos. Não repetir operações sem autorização.


Status: estrutura preparada, migration NAO executada; backend /projects implementado na Etapa 2, ainda nao homologado.
Não representa homologação, migração de históricos ou liberação de dados.

## Escopo e identidades

- `Project` / tabela `projects`: novo catálogo de Projects independentes.
- `Projeto` / tabela `projetos`: registros legados consumidos como Test Cases.
- Nome do novo Project: `nome`, obrigatório. Descrição: `descricao`, opcional.
- Não há `feature` ou `cenarios` no novo Project. Esses campos continuam nos casos.
- IDs têm sequências e namespaces independentes. Project 7 e caso 7 podem coexistir;
  números iguais não comprovam origem, associação ou autorreferência.
- Não há cópia, conversão, classificação, vínculo ou backfill automático de históricos.
- A tela Projects continuará no contrato anterior nesta etapa. Sua futura troca de
  fonte exigirá adaptar titulo para nome e separar catálogo de consulta legada somente
  leitura; isso não é implementado aqui. Não reapontar globalmente projectsAPI.

## Modelo e migration

Migration nova: `20261030000001_create_projects_and_optional_case_link`.
Ordem versionada: migrations anteriores → `20261030000000_add_plan_execution_guard`
→ `20261030000001_create_projects_and_optional_case_link`.
A ordem foi conferida nos arquivos, NÃO no banco. A migration de planos é pendente de
validação e não se presume aplicada. Não alterar migrations anteriores nem marcar
migrations como aplicadas para contornar ausência de schema.

`projects` contém:

| Coluna | Tipo/restrição |
|---|---|
| id | SERIAL / INTEGER, PK, sequência própria |
| nome | TEXT NOT NULL; CHECK exige caractere que não seja espaço POSIX |
| descricao | TEXT NULL |
| created_by | INTEGER NULL; FK users.id, ON DELETE SET NULL, ON UPDATE CASCADE |
| created_at | TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP |
| deleted_at | TIMESTAMPTZ(6) NULL |

`projetos.project_id`: INTEGER NULL, sem default e sem UNIQUE. FK para projects.id,
ON DELETE RESTRICT e ON UPDATE CASCADE. Muitos casos podem usar um Project; casos
sem Project continuam válidos. Relações inversas estão declaradas no Prisma.

Não há trigger de updated_at nem @updatedAt: o padrão vigente usa SQL com pg. Serviços
futuros deverão atualizar updated_at explicitamente, inclusive em soft delete/restore.

Índices:

- `idx_projects_deleted_created_id (deleted_at, created_at DESC, id DESC)`: atende
  listagem ativa ordenada e inclui excluídos, sem depender de índice parcial não
  representado no schema Prisma.
- `idx_projects_created_by (created_by)`: autoria e verificação da FK ao remover usuário.
- `idx_projetos_project_id (project_id)`: junção, busca de casos e verificação da FK;
  inclui casos excluídos, que também devem impedir exclusão física do pai.

Não há unicidade de nome aprovada. O CHECK de nome é representado no SQL, pois o
schema Prisma não expressa esse CHECK; a futura validação HTTP deve usar trim e
rejeitar nomes vazios. O banco não faz normalização automática de nomes.

## Contrato de /projects — backend implementado na Etapa 2

Rotas implementadas; seu uso depende da aplicacao futura e autorizada das migrations em ambiente validado.
Autenticação JWT atual permanece. created_by é autoria, não autorização por proprietário.
Todos os autenticados consultam; não existe escopo por equipe/tenant nesta entrega.

| Método e caminho | Perfis | Payload | Resposta de sucesso |
|---|---|---|---|
| POST /projects | Admin, QA | nome obrigatório; descricao opcional/null | 201, Project |
| PUT /projects/:id | Admin, QA | nome e/ou descricao opcionais | 200, Project atualizado |
| GET /projects | Admin, QA, Leitor | page/limit opcionais | 200, array ou envelope paginado |
| GET /projects/:id | Admin, QA, Leitor | ID | 200, Project ativo |
| DELETE /projects/:id | Admin | sem payload | 200, { message } |
| POST /projects/:id/restore | Admin | sem payload | 200, Project restaurado |

Objeto Project:

```json
{
  "id": 123,
  "nome": "Catálogo QA",
  "descricao": null,
  "created_by": 9,
  "created_at": "2026-10-30T12:00:00.000Z",
  "updated_at": "2026-10-30T12:00:00.000Z",
  "deleted_at": null
}
```

IDs/datas acima são exemplos de contrato, não registros existentes.

Regras futuras:

- Nome deve ser string, trim, não vazio. Descrição aceita texto, null ou omissão;
  omissão na criação resulta em NULL; omissão na edição preserva o valor anterior;
  null remove a descrição e string vazia é permitida.
- created_by vem exclusivamente do usuário autenticado, nunca do payload.
  ID, autoria, datas e deleted_at não são campos editáveis pelo cliente.
- Listar/consultar/editar retornam apenas ativos. Ausente ou excluído: 404.
- DELETE realiza apenas soft delete, mesmo com casos vinculados. Nunca excluir casos,
  limpar project_id ou modificar suites, planos, execuções e resultados.
- DELETE de ausente/já excluído: 404; restore de ausente/não excluído: 404,
  seguindo a convenção existente. Restore mantém vínculos e data de criação.
- ID de rota inválido: 422; não autenticado: 401; perfil sem permissão: 403;
  payload inválido: 422. Erros internos preservam tratamento 5xx sem expor SQL/segredos.
- IDs são inteiros positivos até 2147483647; rejeitar booleanos, zero, negativos,
  frações e strings inválidas, sem coerção permissiva silenciosa.

### Paginação

Preservar padrão existente: sem page/limit, array; com qualquer um, envelope
`{ data, total, page, limit }`. Defaults page=1, limit=20; limite máximo 100.
page/limit explicitamente inválidos: 422. total conta apenas Projects ativos.
Ordenação padrão: created_at DESC, id DESC, antes de LIMIT/OFFSET.

Exemplo:

```json
{ "data": [], "total": 0, "page": 1, "limit": 20 }
```

Nenhum filtro/ordenação novo de Executions, Reports ou Dashboard é definido aqui.

## Extensao de /projetos: project_id - backend implementado na Etapa 3

Os endpoints continuam representando Test Cases com seus IDs legados.
Validators e servico agora aceitam o vinculo opcional; uso real depende da
aplicacao futura e autorizada das migrations em ambiente isolado validado.

| Operação/valor | Semântica futura |
|---|---|
| POST sem project_id | Criar caso sem vínculo (NULL) |
| PUT sem project_id | Preservar vínculo existente, mesmo se o pai estiver excluído |
| project_id = null | Remover explicitamente o vínculo |
| project_id = ID válido de Project ativo | Vincular ou trocar |
| ID inválido/inexistente ou Project excluído | 422, sem alteração parcial |
| Caso ausente/excluído | 404 |
| Usuário sem permissão de escrita | 403 |

POST/PUT de casos continuam exigindo Admin ou QA. Não alterar autenticação/autorização
global. Updates devem alterar somente campos presentes; project_id não pode usar
COALESCE para representar remoção. Não regravar cenários ou outros dados por causa de
uma mudança de vínculo. O defeito anterior em update de cenarios não é corrigido aqui.

Futuros serviços devem validar Project ativo na mesma transação da associação,
coordenando bloqueios com soft delete/restore de Projects. A FK prova existência,
mas NÃO prova que deleted_at é NULL. Isso exige validação transacional na aplicação.

### Histórico do vínculo

Consulta do caso preserva project_id, mesmo se o Project for excluído logicamente.
A futura resposta pode acrescentar resumo `project: { id, nome, deleted_at }`, ou null
quando não vinculado. Campos já existentes e envelope de paginação permanecem.
Caso sem vínculo: interface mostra "Sem projeto vinculado".
Project excluído: mostrar nome e indicação de exclusão; não esconder o caso, remover
vínculo, escolher outro pai ou restaurar automaticamente.

GET /projects/:id continua retornando 404 para excluído; o resumo histórico na consulta
do caso é o caminho documentado para exibir o vínculo aos autenticados autorizados.
Não introduzir JOIN que filtre o caso pelo deleted_at do pai no WHERE.

Suites podem conter casos de vários Projects. Não impor equivalência com o campo
legado test_suites.projeto_id nem criar Project para Suite/Plan implicitamente.
Alterar o Project do caso NÃO reatribui histórico de execuções ou relatórios.

## Auditoria futura

- Novo catálogo: entity_type='project', entity_id=projects.id.
- Casos/rotas legados: manter entity_type='projeto', entity_id=projetos.id.
- Preservar eventos antigos e seus JSONs. Nunca reinterpretar IDs iguais entre tipos.
- Mudança de vínculo do caso: evento UPDATE de 'projeto' com project_id anterior e
  posterior. Catálogo usa CREATE/UPDATE/DELETE/RESTORE, já existentes no domínio.
- Capturar ator autenticado, instante, entidade, antes/depois e contexto HTTP seguro.
- Projetar escrita de negócio e auditoria do novo recurso na mesma transação; o helper
  atual captura falhas sem rollback, portanto não basta para comprovar auditoria
  atômica. Essa implementação fica para a próxima etapa, sem mudar o helper aqui.
- Não criar mecanismo administrativo de classificação ou conversão de legados.

## Compatibilidade e preservação

Nenhuma FK antiga é alterada:

- test_suites.projeto_id → projetos.id (legado ambíguo, preservado).
- test_suite_cases.projeto_id → projetos.id (casos das suites).
- execution_results.projeto_id → projetos.id (casos executados).
- Autoria, IDs, sequências e relações de planos/execuções permanecem intactos.

A tabela projects nasce vazia; todos os project_id anteriores são NULL. Isso não
classifica o conteúdo legado nem presume que um registro nunca foi um Project na UI.
Não há default de associação nem dedução por cenarios.

Serviços usam SELECT *: após aplicação futura, /projetos poderá expor project_id:null
como campo adicional, mesmo antes da implementação do vínculo. Nenhum campo antigo
é removido. Consumidores externos com validação estrita precisam ser conferidos no
ensaio; não afirmar compatibilidade com consumidores ainda não inventariados.

Frontend, services, rotas, validators, Reports, filtros de Executions, estatísticas e
relações de Suites não foram alterados. A API antiga não passa a identificar o novo
catálogo por causa desta migration. Requirements e suas visualizações são preservados.

## Validação realizada e pendências de aplicação

Verificações nesta etapa são estáticas/offline e regressões unitárias isoladas.
Não executar Prisma Migrate, db push, db pull, reset, integração, WSL/Docker ou qualquer
conexão para validar este documento. Não carregar nem alterar arquivos .env.

Ensaio futuro, com autorização separada:

1. Confirmar instância nova descartável aprovada, host/porta, backup recuperável ou
   descartabilidade. Preflight offline não comprova isolamento nem disponibilidade.
2. Verificar histórico real de migrations e schema; não presumir aplicada a migration
   pendente de planos. Prisma deploy aplica todas as pendentes, não apenas esta.
3. Capturar manifesto e snapshots de dados/IDs/vínculos e sequências antes da aplicação.
4. Ensaiar a ordem versionada em banco isolado. Conferir projects vazia, project_id
   nulo e igualdade de TODOS os campos antigos/relacionamentos/sequências de projetos.
5. Considerar separadamente as alterações esperadas da migration de planos. Quando
   comparada a ela, esta migration não deve alterar nenhum dado de planos/execuções.
6. Validar FKs, índices, CHECK e leitura/CRUD legados; preservar artefatos antes de
   testes que usam limpeza. Só então avaliar integração e homologação posteriores.
7. Não aplicar em desenvolvimento antes de validação isolada satisfatória e aprovação.

Riscos: ALTER TABLE e índices podem bloquear escrita; tamanho/schema real ainda não
foi consultado. Atualizações de timestamp e regra de Project ativo dependem de serviços
futuros. CHECKs SQL não são comprovados por validação do schema Prisma. Não usar
IF NOT EXISTS para esconder colisões inesperadas de tabela/coluna; interromper o ensaio.
Reversão não deve remover tabela/coluna com dados: suspender futuras escritas do recurso
e avaliar migration compensatória preservadora, com autorização específica.

Próxima entrega: implementar /projects e auditoria com testes isolados, sem trocar
consumidores legados globalmente; em seguida, implementar o vínculo opcional e a
transição frontend em etapas próprias autorizadas.

### Resultado das verificações desta etapa

- 168 testes unitários isolados aprovados em 11 suítes, sem módulo real de banco.
- Revisão estática dos oito comandos da migration: apenas BEGIN/COMMIT, criação de
  tabela/índices e adição de coluna/FK; sem DML de backfill ou alteração de FK legada.
- Ordem de diretórios de migrations conferida; nenhuma migration foi executada.
- Schema anterior reconstruído removendo somente as novas declarações: SHA-256
  idêntico ao estado local anterior. As alterações pendentes de Test Plans permanecem.
- Entre os 40 arquivos locais preexistentes inspecionados por hash, só schema.prisma
  foi alterado nesta etapa. Demais 39 arquivos preservados.
- Diff do schema sem erros de whitespace considerando CRLF.
- Tentativa de Prisma validate com URL sintética e bloqueios de rede, subprocessos
  e escrita não concluiu: uma operação foi bloqueada pelas guardas. Não considerar
  validação formal do Prisma aprovada. Revisão estática não substitui validação do
  schema/SQL em ambiente apropriado e aplicação isolada posteriormente autorizada.
- Nenhum acesso a banco, migration, integração, WSL/Docker, instalação, mudança de
  branch, commit ou alteração de .env foi realizado.


## Etapa 2 - Backend implementado, sem aplicar migrations

Arquivos: routes/projects.js, services/projectCatalogService.js e validators/projects.js.
app.js monta /projects depois da camada de controle de acesso existente.
As notas anteriores sobre contratos futuros e services descrevem a Etapa 1.
Agora o CRUD de /projects controla updated_at; /projetos e frontend seguem intactos.
O campo project_id em /projetos continua fora desta entrega.

- PUT parcial preserva campos omitidos; descricao:null limpa o texto. Body sem
  nome/descricao retorna 422. Nome usa trim e exige string com pelo menos um
  caractere. Descricao aceita string ou null. Campos de controle enviados pelo
  cliente sao descartados; created_by vem exclusivamente de req.user.id.
- IDs: inteiros positivos no intervalo de INTEGER. Helper de pagina existente:
  padrao 20, maximo 100; sem page/limit retorna array. Ordem: created_at DESC,
  id DESC. GET lista/consulta somente registros ativos.
- GET/PUT/DELETE de registro inexistente ou excluido: 404. Restore de ativo:
  404. Repetir DELETE ou restore nao grava evento redundante.
- DELETE apenas preenche deleted_at/updated_at; restore limpa deleted_at e
  atualiza updated_at. ID, autoria, demais dados e vinculos sao preservados.
- Admin executa todas as operacoes. QA cria/edita. Leitor consulta. Sem escopo
  por autoria/equipe. JWT e suas limitacoes globais permanecem inalterados.
- Escritas usam cliente dedicado, BEGIN/COMMIT/ROLLBACK. UPDATE, DELETE e restore
  usam SELECT FOR UPDATE antes de validar o estado do Project.
- Auditoria: entity_type='project', ID, usuario, IP, snapshots antes/depois.
  CREATE usa old_values nulo. Falha da escrita ou da auditoria causa rollback.
  Falha no rollback descarta o cliente ao liberar o pool.

O helper global de auditoria captura erros sem reverter a escrita (best-effort).
Ele permanece intacto. Este recurso grava audit_logs com SQL parametrizado no
mesmo cliente/transacao para garantir atomicidade. Snapshots contem somente
colunas de Project, sem dados cadastrais de usuarios. Nao foi criado historico de
consultas nem corrigido o sistema global de auditoria ou de controle de acesso.
Mocks comprovam contratos e chamadas, nao locks/constraints/rollback reais.

Checklist futuro, mediante acesso autorizado ao banco isolado:
1. Validar satisfatoriamente as migrations pendentes antes de usar o recurso.
2. Conferir CRUD por perfil e respostas 401/403/404/422/500.
3. Conferir autoria nao forjavel, trim, campos omitidos e descricao:null.
4. Conferir array/envelope, ordem e paginas vazias.
5. Excluir/restaurar repetidamente, verificando identidade e vinculos preservados.
6. Conferir eventos project e rollback real em falha de auditoria.
7. Conferir regressoes legadas antes de alterar consumidores.

Nao aplicar em desenvolvimento antes do ensaio isolado satisfatorio e da
aprovacao especifica. Nenhuma migration ou integracao foi executada nesta etapa.


## Etapa 3 - Detalhes do vinculo opcional, ainda nao homologado

Contrato POST/PUT /projetos:
- project_id omitido: POST cria sem vinculo; PUT preserva o vinculo atual, inclusive
  com Project excluido. Nenhum Project e validado ou bloqueado nesse caso.
- null: aceita caso sem vinculo ou remove explicitamente o vinculo atual.
- Numero inteiro positivo ate 2147483647: valida exclusivamente projects.id ativo.
  Strings numericas, booleanos, fracionarios, zero e negativos retornam 422.
- Project inexistente/excluido: 422, sem escrita parcial do caso ou auditoria.
  Um ID que existe somente em projetos nao comprova Project. IDs numericamente
  iguais nos dois namespaces sao permitidos, mas a validacao consulta so projects.
- Outros campos e a identidade do caso permanecem conforme o contrato anterior.
  project_id usa atribuicao explicita, nunca COALESCE. O defeito preexistente de
  PUT ignorar cenarios permanece; nao se deve considerar essa persistencia corrigida.

GET /projetos e GET /projetos/:id retornam os campos originais, project_id e:
- project_nome: nome atual do Project ou null quando nao ha correspondencia.
- project_deleted_at: data de soft delete do Project ou null.
Exemplo sem vinculo: { "project_id": null, "project_nome": null,
"project_deleted_at": null }. Com pai excluido, preservam ID/nome/data de exclusao.
O LEFT JOIN nao filtra deleted_at do pai. O total paginado conta os casos ativos,
independentemente do estado do Project. Array/envelope, ordem e limites continuam.
Campos enriquecidos sao de consulta; POST/PUT retornam a linha gravada do caso.
Nao existe snapshot do nome historico: o nome consultado e o atual do catalogo.

Concorrencia: somente atribuicao de ID nao nulo abre transacao com cliente dedicado.
SELECT id FROM projects ... deleted_at IS NULL FOR SHARE precede INSERT/UPDATE
no caso e permanece bloqueado ate COMMIT/ROLLBACK. FOR SHARE conflita com UPDATE
normal e com FOR UPDATE usados na exclusao/restauracao do catalogo. Se a exclusao
vence, a leitura aguardando reavalia o pai e rejeita o vinculo; se o vinculo vence,
a exclusao aguarda o commit e pode depois excluir o pai, mantendo o vinculo historico.
Bloqueio segue ordem Project antes do caso. Vinculos simultaneos ao mesmo Project
podem compartilhar o lock; remocao/omissao nao exigem lock do pai.
Operacoes fora desses servicos ou SQL externo nao recebem essa garantia de negocio.
Mocks verificam ordem e espera simulada, nao comprovam locks do servidor.

Auditoria permanece nas rotas, entity_type='projeto', com valores anteriores e
posteriores contendo project_id. Nao confundir com eventos 'project' do catalogo.
Limites preservados: leitura do valor anterior ocorre antes da transacao e pode
ficar desatualizada em edicoes concorrentes; audit_logs e gravado depois do commit
pelo helper best-effort. Uma falha de auditoria nao reverte a alteracao do caso.
Garantia estrita exigiria uma entrega especifica para refatorar a auditoria legada.

Sem alteracoes no frontend, /projects, schema/migrations, Suites, Plans, Executions,
Results, Reports ou Dashboard. Nenhum vinculo antigo foi convertido ou removido.
Os clientes antigos recebem campos adicionais em GET; consumidores estritos precisam
ser conferidos na homologacao. A aplicacao nova exige schema novo: nao disponibilizar
estas consultas antes da aplicacao autorizada das migrations pendentes.

Roteiro registrado na Etapa 3 (destino legado substituído; usar somente instância nova descartável aprovada):
1. Validar migrations e preservacao de dados antes de usar a API, sem assumir que
   a migration anterior de Test Plans esteja aplicada. Nao testar em desenvolvimento
   antes do ensaio isolado satisfatorio.
2. Conferir criacao sem campo/null/com pai ativo; rejeicoes sem gravacoes parciais.
3. Conferir adicionar/trocar/remover e omissao preservando todos os demais campos.
4. Conferir GET com pai ativo/excluido/sem vinculo e paginas/ordenacao/total.
5. Usar conexoes independentes para provar espera por locks nos dois ordenamentos
   entre vincular e excluir, rollback e ausencia de deadlocks.
6. Conferir autoria/perfis, auditoria projeto e identidade de todos os IDs legados.
7. Executar regressoes de Suites, Plans, Executions e Reports sem redefinir seus IDs.

Nenhum banco, migration ou teste de integracao foi executado nesta etapa.

Validacao local da Etapa 3: 293 testes isolados aprovados em 16 suites, incluindo
48 cenarios adicionais; seis arquivos JavaScript verificados com node --check.
Comparacao SHA-256 dos 186 arquivos preexistentes: somente este documento,
projectsService.js, validators/projetos.js e o teste recordDetailsRoutes.test.js
foram modificados nesta etapa. Tres arquivos de testes isolados foram criados.
Esses resultados nao representam integracao, validacao de SQL real ou homologacao.

## Correcao pre-homologacao - Test Cases

Esta secao substitui as notas anteriores que descreviam PUT de cenarios como
pendente. O campo PostgreSQL e JSONB; o contrato anterior aceitava qualquer JSON,
nao apenas arrays com nome/tipo/passos. Mantida essa compatibilidade: arrays,
objetos historicos, strings, numeros finitos, booleanos e null continuam validos.
A validacao Zod agora exige JSON valido, sem impor shape novo a registros antigos.
Nao ha normalizacao ou backfill. Campo omitido no PUT preserva o conteudo atual;
array vazio grava []; null grava JSON null (nao SQL NULL). Campo informado substitui
somente cenarios, por parametro serializado e cast ::jsonb no UPDATE. Omitir
project_id continua preservando o vinculo, inclusive com Project excluido.
Nenhum schema ou migration foi modificado.

O formulario continua editando o primeiro cenario, sem excluir os demais ou
propriedades extras do objeto. Em edicao, cenarios so e enviado quando alterado;
isso evita regravar dados historicos ao mudar titulo/feature/Project. Em cadastro,
o documento atual de cenarios e enviado normalmente. A UI continua exigindo seus
campos textuais, sem impor esse shape globalmente ao contrato JSON existente.

Cada abertura do formulario possui uma sessao propria com controle de salvamento
pendente. Fechar invalida a sessao, mas nao cancela a gravacao legitima no backend.
Respostas de sessoes anteriores nao fecham, limpam ou alteram formulario, Project,
loading ou mensagens da sessao atual. Outra abertura inicia uma sessao valida e
pode salvar imediatamente. Resultado antigo nao dispara reload/toast na sessao nova;
a listagem refletira a gravacao no proximo carregamento normal.

Auditoria permanece entity_type=projeto nas rotas, com snapshots antes/depois.
Continua fora da transacao e best-effort; o snapshot anterior pode ficar desatualizado
em concorrencia. Esta entrega nao corrige essa limitacao nem implementa controle
de versao para edicoes simultaneas do mesmo registro em usuarios diferentes.

O formulario passou a fornecer dialogLabel ao Modal existente; nenhum componente
Modal global foi alterado. Foco e teclado possuem testes isolados, mas ainda exigem
homologacao em navegador. SQL, JSONB e rollback reais continuam pendentes de ensaio
em banco isolado autorizado, apos validacao das migrations. Nao houve acesso a banco.
