# Testes, evidências e limites

[README](../README.md) · [Rastreabilidade](rastreabilidade.md) ·
[Roadmap oficial](../roadmap.md)

Nenhum teste, lint, build ou comando de cobertura foi executado nesta entrega.
A existência de suíte não implica aprovação atual. Os comandos abaixo são
referências para futura execução autorizada, após verificar ambiente e seleção.

## Camadas

| Camada | Local/configuração | O que não comprova |
|---|---|---|
| Unitário backend | backend/tests/unit, jest.isolated.config.js sem setup de integração | SQL/locks/driver ou autenticação HTTP completa |
| HTTP/integrado | backend/tests; configuração e helpers determinam banco ou mocks | NODE_ENV=test pode injetar identidade e desligar limiters |
| Interface/cliente isolado | frontend/tests/*.test.cjs e contrato frontend-api-pagination | React DOM/browser real, rede, E2E ou segurança integrada |
| Manual histórico | Relatórios de homologação específicos | Cobertura automatizada ou regressão atual |
| E2E real | Planejado em repositório separado | Não implementado/homologado nesta entrega |

Há 14 suítes frontend .test.cjs e um contrato de API em backend/tests/unit na
regressão frontend registrada. Helpers como actionButtonLoader.cjs não são suítes.
Testes avaliam módulos reais, JSX transformado em memória, VM, hooks e mocks;
alguns exercitam SSR/DOM simulado. Não generalizar esse executor como navegador.

## Reprodução isolada: pré-condições

Confirmar Ubuntu/CWD, Node compatível, Jest local e dependências Linux do lockfile.
As suítes frontend importam React e Babel de backend/node_modules; esses pacotes
constam no lockfile backend, mas são dependências transitivas, não contrato direto
do manifest. Ausência/incompatibilidade deve bloquear, sem instalação automática.
Binding unrs-resolver Linux é necessário ao resolvedor; não usar árvore Windows.

A configuração isolada não define setup de banco ou dotenv. Preservar isso e
inspecionar a seleção exata antes de rodar; não importar app/configuração real
sem mocks apropriados. Ausência de setup global não é sandbox contra código
arbitrário: a segurança também depende do conteúdo dos testes selecionados.

Referência da raiz para **todos os unitários backend elegíveis**, com dependências
locais já verificadas, sem cobertura:

```bash
node --experimental-vm-modules backend/node_modules/jest/bin/jest.js \
  --config backend/jest.isolated.config.js --runInBand --ci \
  --watch=false --no-cache --coverage=false
```

Referência da raiz para **14 suítes frontend + contrato de API**, com configuração
isolada existente e sem setup legado:

```bash
node --experimental-vm-modules backend/node_modules/jest/bin/jest.js \
  --config backend/jest.isolated.config.js --rootDir . \
  --testMatch '**/frontend/tests/*.test.cjs' '**/backend/tests/unit/frontend-api-pagination.test.js' \
  --runInBand --ci --watch=false --no-cache --coverage=false
```

Esses comandos usam as árvores locais, não reproduzem automaticamente a montagem
Linux temporária usada nas evidências históricas. Se houver apenas executor em
/tmp, ele não resolve imports explícitos para backend/node_modules sozinho;
revisar resolução e isolamento antes de executar. Não reinstalar/copiar árvores
ou ajustar configurações do projeto só para fazê-los funcionar. Novas suítes
mudam a seleção/contagem; não prometer 537 ou 220 em execução futura.

## Integração e cobertura

`npm test` backend seleciona Jest legado, collectCoverage=true, saída coverage e
jest.setup.js com destino 5434. Helpers têm DELETE/TRUNCATE CASCADE. Não usar para
medição indiscriminada, nem presumir proteção por NODE_ENV=test.

O runner [descartável](../backend/DISPOSABLE-INTEGRATION.md) fixa 5435, atualmente
preservado. Testes/migrations futuros precisam de instância nova e guardas aprovadas,
seleção explícita, identidade real do destino e consentimento destrutivo. Não
retomar harnesses ou contornar guards por este guia. Prisma/engines nativos são
pré-condição a verificar, não garantida por terem sido usados anteriormente.

Pisos oficiais em [jest.config.js](../backend/jest.config.js): **70% statements,
50% branches, 65% functions, 70% lines**. Última medição registrada: 22 suítes,
537 testes, 46 arquivos elegíveis; 59,11/52,63/58,36/58,47%. Só branches atingiu
seu piso. O marcador histórico de conclusão do item 16 não substitui essa medição.

Medição futura precisa preservar inventário/exclusões/thresholds, registrar
configuração efetiva e gravar relatórios em destino aprovado. Separar falha de
teste, cobertura insuficiente e falha operacional/suíte que não inicializou.
Cobertura combinada exige unir mapas Istanbul compatíveis por arquivo/posição,
sem somar percentuais ou duplicar linhas. Não há comando integrado autorizado aqui.
O cenário posterior de desempate/agregados em relatorios-stats.test.js continua
pendente. Carga/performance backend permanece adiada.

## Evidências históricas aceitas

| Escopo | Registro | Evidência declarada |
|---|---|---|
| Backend unitário | 22 suítes / 537 PASS; cobertura abaixo de três pisos | /tmp/qa-unit-coverage-final.ki8kats2/ |
| Frontend conjunto | 15 suítes / 220 PASS; Node 26.13.0/Jest 30.4.2, código 0 | /tmp/qa-frontend-regression.lgmn1x3q/ |
| ESLint frontend | 53 arquivos, 0 erros/avisos; código 0 | /tmp/qa-frontend-eslint.e_i8zofq/ |
| Build isolado | Vite 8.0.10, 63 módulos, cinco artefatos; código 0 | /tmp/qa-frontend-build-execution.kf0lor3e/; artefatos /tmp/qa-frontend-build-deps.1d4v0z1u/dist/ |
| Auditorias frontend | Segurança e performance estáticas; aceite com ressalvas | Seção de encerramento do item 17 no roadmap |
| Integração/manual mais antigos | 339 integrados; 9/9 fluxo, 6/6 RBAC, visual; 10 migrations e 60 registros sintéticos preservados | FEATURE-VALIDATION-STATUS e relatórios vinculados |

O registro de 651 isolados/27 suítes em 04/11 tem seleção diferente das medições
posteriores; não somar, subtrair ou substituir contagens sem inventário compatível.
Fonte histórica: [estado consolidado](../backend/FEATURE-VALIDATION-STATUS.md).
Não foi verificada a existência atual dos artefatos de /tmp; retenção durável e
sanitizada exige decisão. Caminho temporário não é evidência eternamente disponível.

ESLint configura `**/*.js` e `**/*.jsx`, não garantia de lint dos testes .cjs.
`npm run lint -- --max-warnings 0 --no-cache` em frontend usa configuração existente
sem --fix. Build padrão lê .env e escreve frontend/dist; não confundir com o build
isolado sem .env do histórico. Para novos ensaios com saída/cache em /tmp, revisar
executor/resolução/env antes de autorizar, conforme [desenvolvimento](desenvolvimento.md).

## Ressalvas e próximos critérios

Item 17 concluído com ressalvas por aceite explícito: regressão, lint, build e
análises estáticas. BUG-001 a BUG-004 são caracterizações/lacunas, não defeitos
corrigidos. SEC/PERF permanecem no roadmap. Não há medição de renderização,
interação, memória ou rede em navegador; tempo de build/Jest não mede o produto.
Metas de performance, matriz de browsers e validação integrada de sessão/RBAC
seguem pendentes/A DEFINIR nos RNFs. Nenhum resultado equivale a conformidade.

Playwright E2E será planejado por último em repositório separado, provisoriamente
qa-control-center-e2e; não instalar ou criar E2E neste repositório. Novas execuções
exigem autorização. Rastrear requisito/regra/cenário/commit/configuração/resultado,
sem concluir fases automaticamente por contagem de PASS.
