# Homologação funcional no navegador - roteiro manual

## Situação atual — confirmação do responsável

Homologação manual concluída pelo usuário: **9/9 cenários do fluxo principal**,
**6/6 verificações RBAC** e **padronização visual aprovada**. Os registros abaixo
sobre ausência de ferramenta de navegador e roteiro pendente descrevem a etapa
anterior à execução manual; essa pendência foi resolvida pelo responsável.
Não foram produzidas evidências fictícias de automação ou screenshots.

Última regressão isolada: 651 testes em 27 suítes. Integração anterior: 339 aprovados.
Consultar [estado consolidado](FEATURE-VALIDATION-STATUS.md). O roteiro abaixo
permanece útil para futuras regressões, mediante autorização; não implica que as
instâncias locais ainda estejam ativas. Preservar 5433, 5434, dados de homologação
em 5435 e evidências do ensaio em 5436. Não executar limpeza durante navegação.


Atualização RBAC: consultar RBAC-PERMISSIONS.md. DELETE e restauração são exclusivos
do Admin em todos os módulos, inclusive desvincular caso de suite ou suite de plano.
QA mantém criação/edição e adição de vínculos; Reader permanece somente leitura.
Após a correção, recarregar a interface e repetir os três perfis. Validação por HTTP
real foi feita sobre novos registros RBAC-, sem limpar dados de homologação.

Status: ambiente funcional iniciado em 04/11/2026; roteiro visual NÃO executado.
Login e permissões básicas foram aprovados por HTTP com autenticação real;
isso não representa aprovação visual dos cenários no navegador.
Não há ferramenta de navegador exposta à sessão nem dependências locais de
Playwright, Puppeteer, Selenium ou Cypress em frontend/backend. Os testes anteriores
(339 integrados/HTTP e 462 isolados) não substituem este roteiro.

## Antes de começar — condição de bloqueio

1. Confirmar uma instância da aplicação com backend exclusivamente em
   qa_control_integration / 127.0.0.1:5435, usuário qa_integration_runner, cluster
   7704309760569225254 e volume qa-control-integration_pgdata. Executar a ação
   **check**, nunca **test** ou **migrate**, do runner documentado em
   DISPOSABLE-INTEGRATION.md. Exigir code=0 e identityVerified=true.
2. Confirmar também o destino efetivo do processo backend que atenderá o navegador.
   O check valida o seu próprio pool, não comprova a configuração de outro servidor.
   Não usar instâncias ligadas a qadb:5433 ou qa_control_test:5434. Não presumir que
   as URLs já abertas de desenvolvimento são adequadas para este ensaio.
3. Usar autenticação real: NÃO subir a aplicação em NODE_ENV=test para esta
   homologação. app.js injeta usuário nesse modo, invalidando testes de login/RBAC.
   O novo modo QA_HOMOLOGATION_MODE=manual exige NODE_ENV=development, autorização
   própria e as mesmas verificações de socket/banco/papel/cluster em cada conexão.
   Flags de testes/migrations são recusadas. Não desativar guardas nem reaproveitar
   a configuração de desenvolvimento.
4. Registrar URL do backend e da interface. Configurar VITE_API_BASE_URL para esse
   backend antes de iniciar/buildar o frontend. Conferir no Network do navegador o
   destino real das requisições e o CORS. O fallback atual da UI é localhost:3001;
   não utilizá-lo sem comprovar o destino desse processo. Não trocar ou parar
   serviços preexistentes para liberar portas; usar portas próprias disponíveis.
5. Disponibilizar contas conhecidas Admin, QA e Reader no banco descartável, com
   senhas privadas. Não presumir que fixtures dos testes são contas de homologação.
   Fechar sessões antigas e usar janela/perfil de navegador exclusivo.
6. Suspender execuções de Jest e limpezas durante a sessão manual. Não reaplicar
   migrations, não usar testes como seed e não executar TRUNCATE para preparar a UI.

Se qualquer condição falhar, parar antes de gravar dados. A instância e as contas
preparadas estão descritas abaixo. Conferir novamente em cada nova sessão.

## Instância funcional preparada — 04/11/2026

- Frontend: http://127.0.0.1:5175; backend: http://127.0.0.1:3105.
- Um processo dedicado, somente loopback, sem alterar serviços existentes.
  PID e logs temporários em .env.homologation-runtime.local, ignorado pelo Git.
- Configuração em .env.homologation.local: banco descartável, JWT e token de
  registro próprios. Autorização de escrita fica somente no processo.
- Contas: admin.hml@qa-control.local, qa.hml@qa-control.local e
  reader.hml@qa-control.local. Senhas distintas e IDs em
  .env.homologation-users.local, ignorado pelo Git. Abrir localmente no editor;
  não compartilhar seu conteúdo, tokens, cookies ou cabeçalhos de autenticação.
- Usuários criados via /auth/register; perfis atribuídos por administrador
  autenticado em /admin/usuarios/:id/role. Nenhuma promoção via SQL ou bypass.
- /health=200 com database up; /projects sem token (mesmo com x-test-role=admin)
  retorna 401. Login dos três perfis=200; leitura=200 para todos. Gestão de usuários
  permitida só ao Admin; escrita Reader e exclusão QA/Reader retornam 403.
  Verificações usaram payload inválido/ID inexistente: nenhum Project foi criado
  ou excluído. Frontend e módulo de API=200, com VITE_API_BASE_URL em 3105 e
  preflight CORS aceitando a origem exata http://127.0.0.1:5175.
- Validação: 496 testes isolados aprovados em 23 suítes, incluindo 34 novos testes
  das guardas. Sintaxe aprovada. Nenhum teste integrado destrutivo nesta preparação.

Para iniciar novamente, apenas após encerrar a instância dedicada anterior,
confirmar PostgreSQL ativo e ambas as portas livres, da raiz no PowerShell:

```powershell
$env:QA_HOMOLOGATION_ALLOW_WRITES = "authorized"
node backend/scripts/start-homologation.js backend/.env.homologation.local
```

O argumento final opcional `check` valida portas livres e identidade real sem abrir
HTTP. O launcher não carrega .env de desenvolvimento/testes e recusa conflitos,
bancos protegidos, cluster diferente, portas ocupadas e qualquer fallback de porta.
Para encerrar o processo iniciado em segundo plano, conferir PID/linha de comando
no descritor antes de parar somente esse processo. Não executar Jest integrado ou
limpezas durante a homologação. Usar a URL 127.0.0.1 acima, não outra origem/porta.

## Roteiro curto — executar nesta ordem

Usar nomes com prefixo HML-<data>-<responsável>. Registrar os IDs retornados.
Para cada linha: anotar perfil, passos, esperado/obtido, aprovado/reprovado e evidência.

| # | Ação no navegador | Critério de aprovação |
|---|---|---|
| 1 | Sem sessão, tentar página protegida; testar senha incorreta; entrar como Admin. Repetir login/logout com QA e Reader. | Sem acesso indevido; erro legível; perfil corresponde à conta. Logout impede navegação protegida. Não há usuário injetado. |
| 2 | Admin cria Projects A/B, tenta nome vazio, edita nome/descrição e limpa descrição. Abrir Visualizar e fechar por botão, Escape e teclado. | Validação clara; dados persistem após recarregar; visualização não grava nem edita; foco e fechamento adequados. |
| 3 | QA cria/edita um Project; Reader consulta detalhes. | QA não dispõe de excluir/restaurar; Reader não dispõe de criar/editar/excluir. Tentativas HTTP de escrita sem permissão retornam 403. |
| 4 | Alternar Projects/Registros legados, filtrar, mudar página e visualizar um legado. | Fontes separadas; legado somente leitura, sem conversão; nenhuma ação de criar/editar/excluir/restaurar nessa área. Filtros/páginas de cada área preservados. |
| 5 | Criar C1 sem Project, C2 com A e C3 com B. Editar C1 para A, trocar para B e remover; editar só título de C2. | Campo opcional sem seleção automática; vínculo adiciona/troca/remove; campo inalterado preserva vínculo; demais campos e cenários persistem. |
| 6 | Admin exclui logicamente A, mantendo C2 vinculado. Consultar C2 e abrir sua edição. | Nome A com indicação Excluído; caso continua listado; edição sem mudar o dropdown preserva vínculo; A não é oferecido como novo vínculo. Catálogo B permanece independente. |
| 7 | Criar suite S com C1 sem Project, C2 com A excluído e C3 com B. Consultar vínculos. | Os três casos são vinculáveis independentemente do Project; seus IDs legados não são reinterpretados como IDs de Projects. |
| 8 | Criar plano P sem suites; tentar executar. Criar suite vazia e vinculá-la; tentar executar novamente. | Plano pode ser salvo sem suite; execução é bloqueada sem suite/casos ativos; nenhuma Execution vazia é criada. |
| 9 | Vincular S a P, escolher ambiente oficial e executar. Clicar repetidamente em confirmar; acessar execução originada. | Ambiente exibido é herdado do plano; uma única Execution, resultados dos casos ativos, plano Executado com data. Catálogo oferece apenas os quatro ambientes oficiais. |
| 10 | Reabrir P como Admin e QA; procurar editar, executar e adicionar/remover suites. | Somente consulta; nenhum perfil consegue mutação/reexecução. Mudar resultados para Failed/Blocked não libera o plano. |
| 11 | Admin exclui logicamente a Execution associada, se essa ação estiver disponível, e consulta P; depois exclui o plano. | Histórico não é apagado; P informa execução indisponível e continua bloqueado. Só Admin exclui P. Restauração de Project/plano permanece pendente via API quando não houver interface. |
| 12 | Em listagens com várias páginas, abrir/fechar detalhes, alternar áreas e ordenar/filtrar. | Página, filtros e ordem preservados; totais coerentes; filtro textual de Projects atua só na página atual, como indicado. Nenhuma gravação ao visualizar. |
| 13 | Em DevTools/Network, usar Slow 3G; salvar formulário A, fechar, abrir B e preencher outro valor antes da resposta de A. Repetir sucesso/erro em Test Cases e Test Plans; alternar planos durante alteração de suites/consulta de execução. | B permanece aberto e intacto; resposta de A não apaga mensagens/seleção/loading de B; cliques repetidos não duplicam operações. Confirmar no Network os IDs envolvidos. |
| 14 | Bloquear temporariamente só a requisição /projects no navegador e cadastrar caso sem vínculo; tentar salvar outro caso com seleção indisponível. Bloquear consulta de suites do plano; restaurar rede e reabrir modal. | Falha de catálogo não impede caso sem vínculo nem apaga vínculo existente; seleção inválida é recusada. Falha de suites não habilita execução/mutação. Dados do formulário não são perdidos. |
| 15 | Criar Execution independente, atualizar resultados e consultar Executions, Reports e Dashboard com os registros HML. | Execução independente permanece funcional; resultados, filtros e contagens coerentes; nenhuma mudança silenciosa do significado histórico. Não exigir atribuição nova de resultados a múltiplas suites, limitação já documentada. |

Ações destrutivas de homologação limitam-se aos registros HML no banco descartável.
Não excluir ou restaurar registros de fixture desconhecidos para tentar cobrir um item.
Estados legados review_required e planos históricos sem vínculo devem ser testados
com fixtures explicitamente preparadas, sem classificar ou desbloquear históricos
por inferência. Se não houver essas fixtures, registrar o cenário como pendente.

## Evidências e encerramento

Para cada item, registrar: data, navegador/versão, perfil, URL da UI/API, IDs dos
registros, resultado esperado/obtido, screenshot ou vídeo e HTTP/status relevante.
Sanitizar tokens, cookies, cabeçalhos Authorization e senhas; não compartilhar HAR bruto.
Usar teclado em pelo menos um fluxo completo e repetir modais em viewport estreita.

Nenhum bug foi confirmado por navegador nesta etapa e nenhuma correção foi feita.
Para encerrar: executar todos os itens aplicáveis, corrigir reprovações com regressões e registrar
aprovação do responsável. Cenários sem fixture/interface continuam pendentes.
A preservação de dados legados durante migrations exige ainda ensaio próprio;
não é comprovada por este roteiro nem pelos testes pós-migration já executados.
