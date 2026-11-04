# Testes isolados da tela Projects

## Estado atual e reprodução

Última regressão conjunta: **651 testes isolados em 27 suítes**, incluindo os testes
frontend. Build Vite e ESLint aprovados anteriormente. Fluxo principal 9/9, RBAC 6/6
e visual homologados pelo usuário; integração anterior com 339 aprovações e ensaio
histórico sintético aprovado. Nenhuma validação foi reexecutada nesta consolidação.
Usar Node 22.13+ na linha 22; a versão já validada foi 22.17.1.

Ver [estado consolidado](../../backend/FEATURE-VALIDATION-STATUS.md). As notas de
etapas e os checklists abaixo são histórico, não pendências atuais indiscriminadas.
As notas sobre PUT de cenarios foram resolvidas pela seção de correções posterior.
Não executar o Jest padrão ou npm test contra qa_control_test:5434; usar somente a
configuração isolada abaixo, ou procedimento integrado específico autorizado.
A documentação é compreensível sem skills ou outros arquivos locais ignorados.


Executar da raiz, usando somente dependencias existentes:

```powershell
node --experimental-vm-modules backend/node_modules/jest/bin/jest.js --config backend/jest.isolated.config.js --rootDir . --testMatch '**/backend/tests/unit/**/*.test.js' '**/frontend/tests/*.test.cjs' --runInBand
```

Nao inicia a aplicacao nem consulta APIs reais. Fetch, clientes de API e contextos
sao substituidos por mocks. Modulos ESM reais sao avaliados via vm.SourceTextModule.
A tela usa um executor de hooks isolado; detalhes usam React SSR. O hook real de
paginacao e o controlador de detalhes verificam descarte de respostas atrasadas.
Isso nao substitui React DOM/browser: foco, Escape, Tab, layout responsivo e fluxo
completo exigem homologacao manual posterior no ambiente isolado autorizado.
Nenhum pacote foi instalado para esta entrega. Build/lint Vite nao foram executados.

A tela Projects possui catalogo /projects e legado /projetos somente leitura.
Ambos ficam montados para preservar pagina/filtro ao alternar. O filtro textual
atua somente nos registros da pagina atual; nao altera contratos backend.
O cliente projectsAPI permanece legado e projectCatalogAPI usa /projects.
Nao ha UI de restore: a API lista apenas ativos, e nao existe nesta tela um fluxo
administrativo de consulta de excluidos. Nenhum endpoint foi ampliado para isso.

Antes da homologacao com API real, validar satisfatoriamente as migrations em
instância descartável independente e obter as autorizacoes necessárias; 5434 é protegido. Não aplicar
migrations em desenvolvimento antes desse ensaio isolado satisfatorio.

Checklist manual futuro:
- Admin cria/edita/exclui; QA cria/edita; Leitor apenas consulta.
- Nome obrigatorio, descricao opcional, erros de consulta/escrita e duplo clique.
- Detalhes de catalogo exibem nome/descricao; legado mostra seus campos originais.
- Legado nao oferece escrita, conversao ou classificacao automatica.
- Pagina/filtro independentes e preservados na alternancia, abertura/fechamento.
- Confirmacao antes da exclusao e preservacao de vinculos pelo contrato backend.
- Navegacao por teclado, foco/retorno, Escape e tabelas em viewport estreito.
- Regressao manual de Test Cases e demais consumidores do cliente legado.

A funcionalidade e as migrations permanecem nao homologadas.

## Test Case - Project opcional (Etapa 5)

A suite testCaseProject.test.cjs executa o hook real, os componentes de campo e
visualizacao e a pagina TestCases com mocks. O JSX da pagina e transformado apenas
em memoria usando ferramentas Babel ja existentes. Nenhum arquivo gerado e salvo.
Nao ha chamada a API real, banco ou outros servicos.

POST sem escolha omite project_id. Escolha ativa envia ID numerico; remocao explicita
envia null. PUT sem mudanca omite o campo, inclusive com Project excluido ou falha
do catalogo. O dropdown busca a lista completa opt-in (sem parametros de pagina),
valida a resposta e nao aceita uma lista parcial silenciosamente. Dados excluidos
sao filtrados das novas opcoes, preservando o valor historico exibido no formulario.
Nome ausente com ID existente usa Project #ID como fallback, sem apagar o vinculo.

Checklist adicional para homologacao futura autorizada:
- Criar sem vinculo/com Project ativo; nao selecionar primeiro item automaticamente.
- Editar mantendo, removendo ou trocando; conferir payload pela rede.
- Project excluido mostra nome e Excluido; nao pode ser escolhido como novo vinculo.
- Catalogo vazio/erro/lento nao apaga campos ou vinculo; respostas antigas ignoradas.
- Falha ao salvar preserva formulario e selecao para nova tentativa.
- Visualizacao usa project_id/project_nome/project_deleted_at do caso sem novo GET.
- Admin/QA editam; Leitor consulta. Pagina e ordenacao continuam preservadas.
- Conferir select com teclado, label e layout em viewport estreito.

Limitacoes preservadas: persistencia de cenarios no PUT depende da correcao backend
separada ja documentada; nao foi corrigida nesta etapa. Exclusao de Project entre
carregamento e salvamento pode produzir 422 do backend; o formulario permanece aberto.
Mocks e executor de hooks nao substituem navegador, build ou integracao real.

## Correcoes pre-homologacao de Test Cases

As limitacoes anteriores sobre PUT de cenarios foram corrigidas nesta entrega:
cenarios omitido e preservado; JSON informado e persistido, incluindo [] e null.
O formulario omite cenarios na edicao quando nao alterado e preserva cenarios
adicionais e propriedades extras ao editar o primeiro. A auditoria legada continua
fora da transacao, conforme o contrato backend atualizado.

A suite cobre A -> salvar pendente -> fechar -> abrir B -> resposta antiga,
com sucesso/erro e cadastro/edicao, loading independente e tres operacoes seguidas.
O teste real do componente Modal verifica semantica de dialogo, Tab, Escape e
retorno de foco com DOM simulado, sem substituir homologacao em navegador.
Nao houve alteracao global de Modal nem acesso a banco ou migration.
