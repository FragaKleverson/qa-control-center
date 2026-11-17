# Desenvolvimento e comandos existentes

[README](../README.md) · [Instalação](instalacao.md) · [Testes](testes.md)

## Fluxo e fontes de referência

Antes de editar: ler [AGENTS.md](../AGENTS.md), conferir branch/status e preservar
alterações locais. A branch documental atual foi autorizada explicitamente;
nenhuma troca de branch ou commit faz parte desta entrega. Código define o
comportamento; [roadmap](../roadmap.md) define planejamento e prioridades.

A skill local `.claude/skills/qa-control-center-dev/SKILL.md` é auxiliar e pode não
existir em checkout novo. Nesta auditoria, ela e referências antigas ainda citam
5434 como destino de integração, ausência de testes frontend e Node 20 em imagens.
Essas notas não autorizam execução: prevalecem proteção 5433–5436, código atual e
registros posteriores. Não instalar extensões/componentes para reproduzir o ambiente
corporativo descrito em AGENTS. Divergências foram registradas sem alterar esses arquivos.

[docs/README.md](README.md) preserva a primeira entrega documental. Notas sobre
Swagger/Postman então pendentes são históricas: contratos foram sincronizados em
entregas posteriores, conforme [README principal](../README.md). Isso não implica
homologação HTTP ou atualização automática do planejamento.

## Comandos dos manifests

Comandos são referências para futura execução autorizada; não foram executados
nesta revisão. Instalar pacotes ou iniciar processos não é uma verificação offline.

| CWD | Comando | Efeito real e cuidado |
|---|---|---|
| backend | npm start | node src/server.js; inicia API/configuração/pool |
| backend | npm run dev | Mesmo comando de start, sem watcher |
| backend | npm test | Jest legado --runInBand; setup DB 5434 e cobertura; NÃO usar indiscriminadamente |
| backend | npm run db:migrate | prisma migrate deploy; altera schema/metadados |
| backend | npm run db:migrate:dev | prisma migrate dev; banco/shadow database, pode propor reset |
| backend | npm run db:migrate:create | prisma migrate dev --create-only; pode acessar banco/shadow, não offline |
| backend | npm run db:migrate:status | prisma migrate status; consulta banco, exige destino autorizado |
| backend | npm run db:migrate:resolve | prisma migrate resolve; altera histórico, não desfaz dados |
| backend | npm run db:baseline | migrate resolve --applied 0_init; não aplica SQL, não usar como atalho |
| backend | npm run db:generate | prisma generate; escreve cliente gerado, pode exigir engine/rede |
| backend | npm run db:studio | prisma studio; abre ferramenta ligada ao banco |
| frontend | npm run dev | Vite dev; carrega configuração/ambiente |
| frontend | npm run build | Vite build; lê .env por padrão e escreve dist |
| frontend | npm run lint -- --max-warnings 0 --no-cache | ESLint com configuração atual, sem --fix; não comprova cobertura dos .cjs |
| frontend | npm run preview | Vite preview do build; não é servidor de produção |

Não há script `test` frontend nem script `build` backend. Não usar `npx` como
substituto silencioso para ferramenta ausente: pode baixar pacotes. Versões/bindings
Linux devem ser verificados, sem copiar dependências Windows para WSL.

## Organização e contratos

- Express compõe rotas/middlewares em app.js. Regras e SQL ficam nos serviços;
  não existe camada independente de repositórios. DOCX ainda é montado na rota.
- Queries da API usam pool pg; Prisma Migrate controla evolução do schema.
- Preservar `/projects` (catálogo) e `/projetos` (casos legados). Requirements não
  possui vínculo com Projects. Não inferir relações por igualdade de IDs.
- UI usa hooks, contextos e api.js centralizado; paginação opt-in não se estende
  automaticamente a seletores/relatórios gerados.
- [RFs](requisitos/funcionais.md), [RNFs](requisitos/nao-funcionais.md),
  [RNs](regras-de-negocio.md) e [matriz](rastreabilidade.md) mantêm IDs estáveis.

## Contratos HTTP e ferramentas

Fonte da especificação: [swagger.js](../backend/src/swagger.js) para componentes e
anotações dos [routers](../backend/src/routes/) para operações. Exportação
[openapi.json](../openapi.json) é derivada; não manter fontes divergentes.
O endpoint JSON gera o objeto e não lê o arquivo estático. [API.md](../API.md)
descreve exportação/validação offline: importar swagger, não app/env/db.

Inventário revisado: 62 operações explícitas. Não inclui HEAD implícito, preflight
ou assets HTML do Swagger como endpoints de negócio adicionais. Validação de
OpenAPI não executa validators Zod, SQL ou RBAC.

A [coleção Postman](../QA_Control_Center.postman_collection.json) está revisada
offline com 62 operações; sua execução real permanece não homologada. URLs, tokens,
IDs e autorizações dependem de variáveis; nenhum Runner deve encadear escritas sem
consentimento individual. GET /stats também é controlado por executar DDL.

Os runners em [backend/scripts](../backend/scripts/) são especializados. Ações
check/homologação podem abrir banco e portas mesmo sem executar testes. Não chamar
scripts para descobrir comportamento: ler primeiro e obter autorização. Harnesses
em /tmp são artefatos locais efêmeros e não parte obrigatória do checkout.

## Antes de submeter uma alteração futura

Revisar contrato/escopo, efeitos transacionais, autorização, testes e documentação;
selecionar validações proporcionais e destino seguro. Separar resultado atual de
histórico, e presença de teste de homologação. Não criar commits ou modificar status
do roadmap sem autorização; não incluir .metrics/, .vscode/, .env ou temporários.
