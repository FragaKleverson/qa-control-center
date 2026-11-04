# Test Plans: execução única e transição de legados

## Situação atual — consolidação de 04/11/2026

Ciclo de vida implementado e validado no escopo acordado. Prisma validate, build e lint aprovados anteriormente; 651 isolados em 27 suítes, 339 integrados anteriores e ensaio histórico sintético aprovados. As duas migrations novas foram aplicadas em ambientes descartáveis, não nos bancos protegidos. Homologação manual: fluxo principal 9/9, RBAC 6/6 e visual confirmados pelo usuário. Liberação administrativa de planos legados permanece fora do escopo.

Consultar [estado consolidado](FEATURE-VALIDATION-STATUS.md) para resultados, ambientes protegidos e limitações.

## Registro das etapas anteriores

As notas abaixo registram o estado em cada entrega, não o estado atual. Pendências
posteriormente resolvidas estão identificadas no resumo acima; números antigos não
substituem os últimos resultados. As instruções legadas de execução foram substituídas
quando poderiam alcançar bancos protegidos. Não repetir operações sem autorização.


Implementação preparada; migration NÃO aplicada e integração NÃO executada.
Não representa homologação nem conclusão de fase do roadmap.

## Persistência

Migration: `prisma/migrations/20261030000000_add_plan_execution_guard/migration.sql`.

- `test_plans.executed_at`: TIMESTAMPTZ nulo; referência temporal de execução.
- `test_plans.legacy_classification`: TEXT NOT NULL, CHECK em
  `eligible`, `review_required`, `executed`. Não é status do resultado dos testes.
- Registros existentes recebem `review_required` na adição da coluna, inclusive
  excluídos logicamente. O default é então alterado para `eligible` para novos registros.
  A API também declara explicitamente `eligible` no INSERT.
- `execucoes.plan_id`: INTEGER opcional, UNIQUE e FK para test_plans.id com
  ON DELETE RESTRICT. NULL preserva execuções independentes e históricas.
- UNIQUE não depende de deleted_at. Excluir uma execução não libera o plano.
- Nenhum ambiente é normalizado; nenhuma execução antiga é vinculada por inferência.
- Sem CHECK global de ambientes, pois isso rejeitaria dados históricos desconhecidos.
  Novas escritas e execução do plano são validadas pelos serviços e schemas Zod.

## Classificação conservadora

Não existe informação segura no modelo anterior para reconstruir execução do plano.
Todos os planos preexistentes ficam consultáveis e bloqueados para execução e mutação
de dados/vínculos até uma revisão explicitamente autorizada. Exclusão lógica e
restauração administrativa continuam disponíveis e preservam a classificação.

Procedimento futuro, NÃO automatizado nesta entrega:

1. Levantar planos, evidências históricas e ambientes distintos (incluindo excluídos),
   somente com acesso autorizado. Nunca usar só nome, suíte ou proximidade de datas
   para presumir origem de uma execução.
2. Registrar responsável, justificativa, evidência e aprovação da classificação.
3. Plano comprovadamente ainda não executado pode ser classificado como `eligible`
   em procedimento controlado, com ambiente previamente regularizado e autorização
   específica. Revisão não é uma ação disponível na API atual.
4. Plano comprovadamente já executado recebe `legacy_classification = 'executed'`.
   Se data exata e vínculo não forem comprovados, deixar executed_at/plan_id nulos.
   A tela mostra Executado sem inventar data ou execução.
5. Casos inconclusivos permanecem `review_required`. Não liberar em lote.

Não foi criado endpoint de desbloqueio. Sua autorização e auditoria precisam de
especificação separada. A classificação não pode ser enviada em POST/PUT públicos.

## Regras e concorrência

Criar plano exige título e ambiente canônico; suítes são opcionais.
Ambientes oficiais: staging, production, development, homologação.
Execuções independentes mantêm staging como default quando omitido.
O body de POST /test-plans/:id/execute não escolhe ambiente; campos antigos enviados
são descartados e o serviço usa exclusivamente o ambiente persistido.

Execução, edição, vínculo/desvínculo, exclusão e restauração fazem BEGIN,
SELECT do plano FOR UPDATE, validação e COMMIT/ROLLBACK em um cliente dedicado.
O plano é sempre o primeiro bloqueio. A execução valida plano elegível, ambiente,
suítes ativas e casos ativos; deduplica os casos; cria execução e resultados; marca
executed_at na mesma transação. Falha reverte tudo e libera o cliente.
Execução única independe do resultado posterior dos testes.
A segunda requisição que aguardou o lock recebe 409 após o commit da primeira.
UNIQUE também protege contra inserções duplicadas fora desse fluxo.

GET retorna execution_id adicional sem mudar array/envelope de paginação.
GET de suítes preserva vínculos históricos, incluindo suítes soft-deletadas;
total_cases conta casos ativos e não significa uma fotografia histórica.
DELETE /test-plans/:id agora exige Admin; executados também podem ser excluídos
logicamente. Restaurar preserva todos os bloqueios.

Respostas: 201 criação; 403 perfil; 404 ausente/excluído; 409 estado, legado ou
suítes/casos insuficientes; 422 ambiente/payload. Cliente preserva error.status,
permitindo distinguir 409/422 de falhas 5xx.

## Frontend

Criação e execuções independentes usam as mesmas quatro opções dentro da camada.
A confirmação de execução consulta plano e suítes, falha fechada em erro, exige
suíte ativa com casos ativos e mostra ambiente somente leitura. O backend repete
as validações e é a autoridade final.
Executados mostram data, detalhes, suítes e consulta da execução/resultados.
Legados mostram revisão necessária. Escritas/execução ficam bloqueadas; somente
Admin vê exclusão. Um 409 recarrega a lista e fecha a ação desatualizada.
Nenhum valor histórico é convertido. Suítes/casos compartilhados não são congelados.

## Validações e execução futura

Isolados sem banco, usando dependências já existentes:
`node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest.isolated.config.js --runInBand`
A configuração separada não carrega jest.setup.js nem descobre integração.
Os testes de serviços/rotas substituem o módulo db antes de importar a aplicação.

Integração preparada: `tests/test-plans-lifecycle.integration.test.js`.
Opt-in `RUN_PLAN_DB_TESTS=authorized`, somente após autorização explícita, revisão
da migration e identidade de um destino descartável explicitamente aprovado.
O ensaio aprovado foi em 5435; esse banco está agora preservado. Não executar a
configuração Jest legada nem usar qa_control_test:5434.
A suíte verifica pool.options.database e SELECT current_database() antes de gravar.
Cria fixtures próprias; o teardown exclui apenas essas fixtures. Ainda é destrutivo
no banco isolado e NÃO deve ser executado por esta entrega.

A concorrência usa clientes diferentes, segura o primeiro após adquirir FOR UPDATE
e verifica pg_blocking_pids no PostgreSQL antes de liberar o vencedor. Cobre
execução dupla, edição, vínculos, exclusão/restauração e repetição após resposta perdida.
Falhas injetadas em execução, resultados e marcação comprovam rollback com dados reais
quando a suíte for autorizada. Os mocks isolados não substituem essa comprovação.
Rodar também as suítes existentes de planos, execuções, validação, RBAC, soft delete,
paginação e relatórios apenas por runner protegido e em destino descartável
com autorização específica; os resultados já obtidos estão no resumo atual.

## Procedimento seguro de aplicação (pendente)

1. Obter autorização para ambiente, serviços, banco e migration; verificar Ubuntu,
   ferramentas e caminho real do workspace conforme AGENTS.md, sem iniciar nada
   automaticamente. Confirmar destino do Prisma DATABASE_URL e do pool DB_*.
2. Fazer backup e validar recuperação segundo o procedimento operacional autorizado.
   Inspecionar schema real e histórico de migrations; não usar SQL legado como prova.
3. Ensaiar primeiro em instância descartável independente. O ensaio sintético
   em 5436 foi aprovado; qa_control_test:5434 permanece protegido. Rever o impacto
   dos locks de ALTER TABLE e o tempo de manutenção em cópia representativa autorizada.
4. Para implantação, suspender escritas/instâncias antigas durante migration e troca
   de aplicação. Código antigo não implementa os bloqueios e não pode coexistir
   escrevendo depois da transição. Não servir código novo antes do schema novo.
5. Aplicar o SQL versionado via fluxo Prisma aprovado. Não executar normalização
   histórica nem liberar legados junto dessa implantação.
6. Validar estados, preservação dos históricos, permissões e execução transacional;
   retomar tráfego apenas após verificações. Em falha, manter escrita suspensa e
   avaliar recuperação/migration compensatória, sem apagar colunas/histórico.

## Limitações preservadas

- Reports e filtros de projeto ainda atribuem uma execução multissuíte à primeira
  suíte. Não foram alterados silenciosamente; corrigir em revisão específica.
- Conteúdo de suítes/casos permanece compartilhado e mutável; não é snapshot histórico.
- Não corrigidos JWT/sessões dos itens 6 e 7. Papel continua vindo do JWT; rebaixamento
  de perfil pode não ter efeito até nova sessão. Pendência separada.
- Política geral de falhas da auditoria permanece existente; não há liberação
  administrativa de legados nesta entrega.
- Schema Prisma/SQL ainda precisa de validação em ambiente autorizado. Dependências
  frontend ausentes localmente impedem lint/build completos sem instalação autorizada.

## Resultado local desta entrega

- Node Windows v22.17.1, usado somente para testes totalmente isolados e sintaxe,
  conforme a autorizacao especifica desta tarefa; Ubuntu/WSL nao foi iniciado.
- 108 testes aprovados em 7 suites isoladas; sem acesso ao modulo real de banco.
- Parser Babel existente validou a sintaxe dos 18 arquivos JS/JSX envolvidos.
- Diff dos arquivos da entrega sem erros de whitespace considerando CRLF.
- ESLint frontend indisponivel nas dependencias locais; nenhum pacote instalado.
- 18 cenarios de integracao preparados, nao executados. Sem medida de cobertura
  global, validacao de schema no PostgreSQL, build ou homologacao no navegador.

## Ajustes finais: execução excluída e preflight offline

A consulta/listagem de planos agora retorna `execution_deleted_at` junto de
`execution_id`. O ID histórico permanece preservado. Quando a data está preenchida,
a tela informa que a execução foi excluída e não oferece "Ver execução".
Se a exclusão ocorrer depois da listagem, um 404 na consulta mostra indisponibilidade
e recarrega os planos. Nada é restaurado, e executed_at/classificação continuam
bloqueando alterações e reexecução. Endpoints e permissões de consulta não mudaram.

### A. Inspeção local SEM conexão (permitida; não aplica schema)

Foi preparado `scripts/check-test-db-target.js`. Ele lê somente o arquivo indicado,
compara as variáveis herdadas do processo e não importa pg, Prisma ou a aplicação.
Não modifica process.env, não resolve DNS e não estabelece conexão.

Exemplo de inspeção, executado do diretório backend, SOMENTE com o caminho e destino
previamente conferidos pelo operador (os valores abaixo são ilustrativos):

O utilitário `check-test-db-target.js` é legado e somente offline. Seu exemplo
para 5434 foi retirado para não sugerir autorização sobre esse banco protegido.
Para o alvo efetivo, consultar os runners separados e suas guardas nos documentos
[de integração](DISPOSABLE-INTEGRATION.md) e [do ensaio histórico](HISTORICAL-MIGRATION-REHEARSAL.md).

A saída contém apenas host, porta, nome do banco e códigos de diagnóstico; não
contém URL, usuário, senha ou exceção original. Exit code 0 significa apenas que
as configurações comparadas são explícitas, coincidentes e autorizadas nos argumentos.
Qualquer ausência, conflito entre arquivo/processo, definição duplicada, credencial
divergente, URL ambígua, variável PG_* de override ou destino diferente resulta em 1.
O comando requer porta explícita e aceita na URL apenas o parâmetro schema=public;
parâmetros adicionais são recusados conservadoramente. Não presume equivalência
entre localhost, 127.0.0.1 ou nomes DNS diferentes.

Os argumentos --authorize-* não constituem autorização humana nem comprovam que o
servidor é isolado. O utilitário legado só aceita qa_control_test, mas não estabelece conexão nem
autoriza testes nesse destino, atualmente protegido. Um banco com
esse nome em servidor errado ainda pode conter dados importantes: conferir a instância
é uma etapa operacional separada, que não pode ser comprovada offline.

### B. Inspeção do destino real (somente leitura, mas EXIGE autorização de acesso)

Etapas futuras; NÃO executadas nesta entrega:

1. Registrar autorização, responsável, data, caminho Linux real do workspace,
   instância/host/porta de teste e finalidade. Verificar ferramentas no Ubuntu conforme
   AGENTS.md. Não iniciar serviços ou instalar dependências sem autorização própria.
2. Selecionar um arquivo de configuração exclusivo do ensaio, fora do versionamento.
   Rodar o preflight offline. Conferir que tanto Prisma como pool e ferramentas de
   inspeção usarão exatamente esses valores, sem fallback a .env de desenvolvimento.
3. Somente após aprovação, abrir conexão à instância isolada e executar inspeção:

```sql
SELECT current_database(), inet_server_addr(), inet_server_port();
SELECT migration_name, finished_at, rolled_back_at
FROM _prisma_migrations ORDER BY started_at;
```

4. Confirmar instância nova descartável autorizada, porta e histórico esperado;
   excluir os destinos protegidos 5433, 5434 e 5435. Divergência interrompe
   o ensaio. Não usar apenas o nome do banco ou do arquivo como evidência de isolamento.
5. Confirmar evidência de backup recuperável da cópia de teste OU aceite explícito de
   que TODOS os dados dessa instância de teste são descartáveis. Registrar localização,
   data, responsável e teste de recuperação, sem incluir credenciais nos artefatos.

Prisma lê DATABASE_URL, pool usa DB_*. O preflight não exporta valores para comandos
posteriores. O operador deve carregar o MESMO conjunto completo nos processos seguintes.
Node 22 permite `node --env-file=/caminho/isolado/test.env ...`; valores já herdados
podem prevalecer, por isso repetir a conferência no mesmo contexto imediatamente
antes das operações. Não imprimir env, URL ou linha de comando contendo credenciais.

### C. Ensaio estrutural (MODIFICA schema/dados; EXIGE autorização específica)

1. Em instância nova descartável independente, preparar schema imediatamente ANTERIOR à migration
   alvo usando cópia/backup autorizado ou provisionamento revisado. Nunca restaurar
   uma cópia sobre banco original. Nunca executar migrate reset como atalho.
2. Criar somente nessa cópia fixtures representativas ANTES da migration: planos sem
   suítes; com múltiplas suítes; excluídos logicamente; ambientes vazios/nulos/não
   canônicos; suítes/casos compartilhados; execuções independentes e excluídas com
   resultados. Para história sem origem comprovada, não inventar associação de plano.
3. Registrar manifesto dos IDs, cardinalidades e conteúdo completo das fixtures em
   artefatos locais protegidos. Capturar também relações e sequências relevantes.
   Backup/provisionamento/inserção são escritas e precisam de autorização; não fazem
   parte do preflight offline.
4. Capturar a fotografia ANTES. Exemplo de SELECT somente leitura, a executar apenas
   no destino já autorizado; exportar o resultado para arquivo local:

```sql
SELECT 'test_plans' AS entity, id, to_jsonb(t) AS record
FROM test_plans t
UNION ALL
SELECT 'execucoes', id, to_jsonb(e) FROM execucoes e
UNION ALL
SELECT 'test_plan_suites', id, to_jsonb(ps) FROM test_plan_suites ps
UNION ALL
SELECT 'test_suite_cases', id, to_jsonb(sc) FROM test_suite_cases sc
UNION ALL
SELECT 'execution_results', id, to_jsonb(er) FROM execution_results er
UNION ALL
SELECT 'test_suites', id, to_jsonb(s) FROM test_suites s
UNION ALL
SELECT 'projetos', id, to_jsonb(p) FROM projetos p
ORDER BY entity, id;
```

5. Revisar lista de migrations pendentes: `migrate deploy` aplica TODAS as pendentes,
   não apenas a migration alvo. Interromper diante de pendências inesperadas.
6. Após autorização explícita do ensaio e aprovação do snapshot, aplicar pelo fluxo
   Prisma no destino isolado. Exemplo de comando que MODIFICA schema:

O exemplo direto de CLI foi retirado. O ensaio executado usou exclusivamente
`run-history-rehearsal.js`, com cópias byte a byte das migrations, identidade
conferida antes de cada etapa e configuração Prisma separada. Ver relatório do ensaio.
Não repetir baseline/upgrade sobre o ambiente preservado.

Esse comando é documentação, NÃO foi executado. O preflight offline não o dispara.
Não reutilizar comando/env contra desenvolvimento antes do sucesso completo do ensaio.

### D. Comparação posterior (leitura com conexão; EXIGE acesso autorizado)

Antes de rodar testes que limpam dados:

- Repetir fotografia e comparar por tabela/ID todos os campos originais. Na comparação,
  remover SOMENTE executed_at/legacy_classification de test_plans e plan_id de execucoes
  da fotografia posterior; os documentos JSON restantes devem ser idênticos aos anteriores.
- Comparar quantidades, vínculos, IDs, resultados, ambientes e deleted_at, além das
  sequências. Nenhum registro anterior pode desaparecer ou ser associado por inferência.
- Para TODOS os IDs de planos do manifesto anterior: exigir review_required e
  executed_at NULL, inclusive excluídos. Para execuções anteriores: exigir plan_id NULL.
- Conferir FK RESTRICT, UNIQUE e CHECK no catálogo. Validar que novas inserções têm
  default eligible; fazer isso somente na etapa de testes/escrita autorizada.
- Não liberar legados nem normalizar ambientes para fazer o ensaio passar. Diferença
  inesperada é falha a investigar, preservando os artefatos anteriores/posteriores.

### E. Testes e concorrência (MODIFICAM dados; EXIGEM autorização específica)

Somente depois das comparações estruturais satisfatórias e com snapshots preservados:

1. Conferir novamente preflight e destino efetivo. Não executar o Jest padrão.
   A configuração legada de jest.setup.js
   fixa host/porta/banco e credenciais para as suítes de integração existentes: verificar
   compatibilidade com o ensaio. Se diferente, interromper; não presumir que --env-file
   vencerá essas atribuições nem alterar a configuração para contornar o problema.
2. Executar a suíte de ciclo de vida, com RUN_PLAN_DB_TESTS=authorized explícito no
   ambiente do processo. Exemplo de ESCRITA, ainda pendente de autorização:

O exemplo com `jest.config.js` foi retirado: ele carrega o setup legado de 5434.
O ensaio integrado aprovado utilizou `run-disposable-integration.js` e
`jest.integration.config.js`. Não repetir testes destrutivos no banco 5435 agora
preservado; uma nova execução exige autorização e um destino/guarda compatíveis.

3. Verificar execução dupla com sessões independentes e pg_blocking_pids, rollback,
   execução concorrente com editar/vincular/remover/excluir/restaurar e repetição após
   resposta perdida. Timeout/deadlock é falha, não aprovação parcial.
4. Executar regressões existentes de planos, execuções, paginação, RBAC, soft delete e
   Reports, selecionadas explicitamente. Helpers antigos podem TRUNCATE tabelas: usar
   apenas instância integralmente descartável autorizada, após preservar o ensaio.
5. Homologar a interface com dados de teste: estados eligible/review_required/executed,
   execução excluída sem botão de consulta, exclusão durante consulta, restauração,
   paginação/filtros e criação independente com os quatro ambientes oficiais.
6. Verificar que excluir execução/plano não remove resultados, não altera históricos
   antigos e não libera reexecução. Não restaurar automaticamente a execução.

### F. Evidências e aprovação

Registrar commit/base e diff local usado, hash da migration, versões das ferramentas,
destino sem credenciais, autorização, fixture manifest, backup/descartabilidade,
snapshots e diferenças, comandos revisados, saída/código de retorno dos testes,
resultados manuais e incidentes. Sanitizar logs antes de compartilhá-los.

Falhas mantêm o ensaio reprovado; nenhuma liberação de legado ou aplicação em banco
original deve decorrer automaticamente. Só considerar desenvolvimento após validação
isolada satisfatória, revisão das evidências e autorização separada. A migration
era NÃO homologada naquela etapa. Situação posterior: ensaio sintético aprovado
conforme resumo atual, sem autorização para aplicar em bancos originais.

Validação local dos ajustes finais: 139 testes isolados aprovados em 9 suítes
(incluindo 31 cenários adicionais), sintaxe de 7 arquivos JS/JSX conferida e diff dos
arquivos rastreados desta etapa sem erros de whitespace considerando CRLF.
O preflight foi exercitado somente com configurações sintéticas em testes isolados;
não houve inspeção de destino real, conexão, migration, WSL/Docker ou integração.
