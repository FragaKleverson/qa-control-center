# Integração descartável — procedimento e histórico de validação

## Situação atual — consolidação de 04/11/2026

Infraestrutura provisionada e utilizada: 10 migrations aplicadas e 339 testes integrados/HTTP aprovados anteriormente. O banco 5435 contém homologação manual e está protegido contra novas migrations e testes destrutivos. O ensaio histórico foi executado separadamente em 5436. Este documento não autoriza repetir provisionamento, migrations ou limpeza.

Consultar [estado consolidado](FEATURE-VALIDATION-STATUS.md) para resultados, ambientes protegidos e limitações.

## Registro das etapas anteriores

As notas abaixo registram o estado em cada entrega, não o estado atual. Pendências
posteriormente resolvidas estão identificadas no resumo acima; números antigos não
substituem os últimos resultados. As instruções legadas de execução foram substituídas
quando poderiam alcançar bancos protegidos. Não repetir operações sem autorização.


Continuidade 04/11/2026: infraestrutura provisionada, 10 migrations aplicadas e
339 testes integrados/HTTP aprovados, somente no banco descartavel. Para navegacao
manual usar o modo separado descrito em BROWSER-HOMOLOGATION.md e o launcher
start-homologation.js: NODE_ENV=development, JWT real e identidade conferida em
cada conexao. Nao executar testes/limpezas enquanto a instancia manual estiver em uso.
As instrucoes abaixo descrevem o runner automatizado original.

Destino fixado pelo runner: 127.0.0.1:5435 / qa_control_integration; atualmente preservado.
A autorização anterior foi específica para o ensaio descartável. qa_control_test:5434 é protegido; o setup legado não foi alterado e não deve ser executado.
As homologações confirmadas estão no resumo atual; nenhuma delas equivale a backup ou nova permissão de escrita.

## Componentes

- docker-compose.integration.yml e independente dos Compose atuais, com perfil
  integration, projeto qa-control-integration e volume qa-control-integration_pgdata.
  Publica apenas 127.0.0.1:5435, nao monta init.sql e nao inclui backend/frontend.
- backend/.env.integration.example tem campos vazios para senha, URL e cluster ID.
  Criar futuramente uma copia .env.integration.local (ignorada pelo Git). Nao usar
  credenciais de desenvolvimento/testes. Senha na URL deve ter percent-encoding.
- jest.integration.config.js usa setup separado: NAO executa jest.setup.js legado,
  NAO troca o destino para 5434 e NAO carrega .env.test ou .env de desenvolvimento.
- run-disposable-integration.js aceita somente check/test/migrate e arquivo explicito.
  Testes exigem nomes de suites explicitos, sem caminhos arbitrarios. Nenhum script
  npm existente foi alterado. Nao invocar Prisma diretamente neste fluxo.
- prisma.integration.config.ts e separada da configuracao Prisma padrao e exige
  autorizacao de migration mais o marcador efemero produzido pelo executor.

## Guardas

Exigem NODE_ENV=test, QA_INTEGRATION_MODE=disposable e
QA_INTEGRATION_ALLOW_DESTRUCTIVE=authorized no processo. Consentimento nao pode
ficar salvo no arquivo de ambiente. Migration exige adicionalmente
QA_INTEGRATION_ALLOW_MIGRATIONS=authorized. Ciclo de vida de planos mantem o opt-in
RUN_PLAN_DB_TESTS=authorized. Sinais de autorizacao sao decisoes do operador, nao
prova criptografica nem fronteira contra alguem com capacidade de editar codigo/env.

Nao ha fallback: allowlist literal de host/porta/banco; DB_NAME e PG_* rejeitados;
DB_USER dedicado qa_integration_runner; senha, DATABASE_URL e cluster ID obrigatorios.
URL e pool precisam coincidir em destino e credenciais; parametros de URL so aceitam
schema=public, opcional. Campos duplicados ou conflito entre arquivo e ambiente
herdado falham, inclusive NODE_ENV. O carregamento nao sobrescreve silenciosamente.

Cada checkout do pool abre a conexao no destino aprovado, confere o socket efetivo
127.0.0.1:5435 e executa somente SELECT de current_database, current_user,
inet_server_addr/port e pg_control_system().system_identifier. Exige o banco e papel
previstos, porta interna PostgreSQL 5432 e cluster ID previamente registrado pelo
operador. Falha fecha/descarta a conexao; nenhuma query de helper/app e liberada.
O marcador identifica o cluster; nao comprova sozinho volumes ou infraestrutura.
O pool nao depende de um flag global de verificacao e verifica cada nova aquisicao.
Queries de clientes dedicados tambem revalidam autorizacao/configuracao da sessao.

O runner verifica conexao antes de executar um processo filho, usa Node/CLI locais,
argv fixo, shell=false e ambiente validado. O filho Jest volta a carregar as guardas;
todos os helpers, fixtures, DELETEs e TRUNCATEs passam pelo pool protegido. O Prisma
usa sua propria conexao nativa: a verificacao e imediatamente anterior ao subprocesso,
nao intercepta os sockets internos do engine. Ainda existe janela entre verificacao
e conexao do engine; nao redirecionar portas/trocar containers durante o ensaio.
O marcador efemero nao substitui a verificacao real, nem protege invocacoes deliberadas
fora do fluxo. CLI/configuracao legados continuam disponiveis e nao recebem essas
protecoes; usalos contra desenvolvimento nunca esta autorizado por este documento.

## Histórico do plano de provisionamento — já executado; não repetir

1. Conferir Ubuntu ja em execucao, ferramentas e caminho Linux real do workspace.
   O processo de testes pode rodar no Windows com as dependencias Windows existentes.
2. Criar e preencher arquivo local exclusivo, sem salvar autorizacoes. Validar que
   qa_integration_runner/senha nao sao reutilizados em instancias preservadas.
3. Conferir porta 5435 livre (incluindo processos Windows e publicacoes Docker),
   nomes de projeto/volume e inexistencia de dados preexistentes nesses recursos.
   NAO adotar automaticamente volume preexistente com o mesmo nome.
4. Conferir imagem postgres:15 local e sua versao/digest. Exemplo de provisionamento
   NO UBUNTU e SOMENTE depois de autorizacao explicita para container/volume:

```sh
docker compose -f docker-compose.integration.yml --env-file backend/.env.integration.local --profile integration up -d --no-deps --pull never db-integration
```

Esse comando cria recursos. Nao foi executado. Se faltar imagem, interromper e pedir
avaliacao/autorizacao separada para download; nao executar pull automaticamente.

5. Inspecionar container, mounts, volume e rede reais, comparando com desenvolvimento
   e teste preservados sem conectar a seus bancos. Registrar identidade de cluster
   do container NOVO. Exemplo de leitura somente apos provisionamento autorizado:

```sh
docker compose -f docker-compose.integration.yml --env-file backend/.env.integration.local --profile integration exec -T db-integration sh -lc 'psql -U "$POSTGRES_USER" -d qa_control_integration -Atc "SELECT system_identifier FROM pg_control_system();"'
```

Registrar QA_INTEGRATION_CLUSTER_ID no arquivo local. Nao inferir do nome/porta.
O usuario criado pelo POSTGRES_USER da imagem e superusuario DENTRO da instancia
nova: nunca reutilizar suas credenciais; uma futura separacao de papeis exigiria
GRANTs cuidadosamente revisados, inclusive acesso a pg_control_system().

## Referência do runner Windows — escrita anterior concluída; leitura requer autorização

Da raiz do workspace, em PowerShell. Apenas exemplos, NAO executados:

```powershell
$env:QA_INTEGRATION_ALLOW_DESTRUCTIVE = "authorized"
node backend/scripts/run-disposable-integration.js check backend/.env.integration.local
```

Check consulta somente identidade, sem DDL/DML. Entretanto o modo pede aceite
explicito da destinacao descartavel. Antes de escrever, registrar que TODOS os dados
novos sao descartaveis e confirmar as migrations pendentes e seus hashes.

O histórico foi aplicado anteriormente pela ação `migrate` do runner protegido,
com autorização efêmera específica. O exemplo executável foi retirado: 5435 agora
contém dados a preservar; não reaplicar migrations neste ambiente.

Modifica schema e _prisma_migrations. Um cluster vazio aplica o historico COMPLETO,
nao apenas as duas ultimas migrations. Fazer ensaio com fixtures legadas representativas
exige plano separado para preparar baseline/snapshots antes das migrations alvo.

A ação `test` e RUN_PLAN_DB_TESTS foram usadas no ensaio anterior autorizado.
Não repetir aqui: as suítes podem limpar dados. Um próximo ensaio exige decisão
de ambiente e revisão das guardas, sem reaproveitar automaticamente 5435 ou 5436.

Depois selecionar explicitamente as suites de regressao autorizadas. Nunca iniciar
npm test indiscriminadamente: configuracao antiga continua direcionada a 5434.
A suite de ciclo de vida usa conexoes independentes e teardown de fixtures; demais
suites podem TRUNCATE CASCADE. clearUsers atinge projects por FK; clearTables nao
inclui projects diretamente. Nao ha preservacao dos dados do ambiente descartavel.
A configuracao nova nao afirma cobertura global ao rodar suites selecionadas.

## Limites e histórico da preparação inicial

Guardas nao sao firewall. Nao impedem software arbitrario de abrir 5433/5434 fora
deste pool/executor. Nao provam exclusividade da senha, backup ou ownership de volume.
Nao houve checagem da disponibilidade da porta, conexao, Docker, criacao de arquivos
.env reais, volume, container, banco, migration ou integracao nesta preparacao.
Mocks cobrem recusas e SELECTs simulados; prova de socket/locks/driver/Prisma no alvo
real permanece pendente. Nenhum teste isolado executa SQL destrutivo ou migrations.

O comportamento padrao sem QA_INTEGRATION_MODE permanece igual: dotenv e Jest legados
nao foram alterados. Preservar qadb e qa_control_test e requisito de toda etapa futura.
