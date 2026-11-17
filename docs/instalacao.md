# Instalação local e configuração

[README principal](../README.md) · [Desenvolvimento](desenvolvimento.md) ·
[Segurança](../SECURITY.md) · [Testes](testes.md)

Procedimento documental; nenhum comando foi executado nesta entrega. Destina-se
a uma instalação nova autorizada. No workspace existente, preservar dependências,
serviços, alterações locais e bancos; não aplicar automaticamente este roteiro.

## 1. Pré-condições e ambiente

Usar Ubuntu no WSL a partir do Windows (`wsl -d Ubuntu`). Confirmar o caminho real
do checkout: a pasta Windows é acessível sob `/mnt/c`, mas capitalização e diretório
precisam de confirmação. Verificações locais possíveis, sem iniciar serviços:

```bash
pwd
uname -s
cat /etc/os-release
node --version
npm --version
```

Linha operacional documentada: Node 22.13+ na linha 22 (histórico 22.17.1).
Vite/Prisma requerem ao menos 22.12 nessa linha e ESLint 10 requer 22.13. As
validações recentes frontend em Node 26.13.0 são evidências de escopo específico.
Usar versão compatível e lockfiles; não presumir suporte geral a qualquer Node.

Backend e frontend têm manifests/lockfiles próprios, sem script npm na raiz.
Se a instalação de dependências for autorizada em checkout novo, executar em cada
pasta, em sequência, sem reutilizar node_modules Windows no Linux:

```bash
cd backend
npm ci
cd ../frontend
npm ci
cd ..
```

`npm ci` instala e substitui a árvore local; pode executar scripts de pacotes e
usar rede. Não é etapa somente leitura nem foi autorizado/executado por este guia.
Não executar em árvore existente sem decisão específica. Bindings devem corresponder
a SO/CPU/libc: GNU/glibc do WSL e musl do Alpine não são intercambiáveis. Há histórico
de ausência de unrs-resolver, Rolldown e Lightning CSS Linux; se faltar binding,
interromper, sem instalar automaticamente ou alterar lockfiles para contornar.

## 2. Escolher o banco antes de configurar

PostgreSQL 15 é a versão das imagens Compose. Reservar **instância, usuário,
banco, armazenamento e porta novos**, sem adotar recursos preexistentes. Não usar
5433–5436, que identificam ambientes preservados. Não há comando genérico aprovado
neste guia para criar ou popular o banco do workspace atual.

Preparação exige plano de schema/identidade e autorização específica. O histórico
em [backend/prisma/migrations](../backend/prisma/migrations/) tem 10 migrations.
[Prisma Migrate](../backend/MIGRATIONS.md) gerencia schema; consultas usam `pg`.
SQL de [db/init.sql](../db/init.sql/) é legado e incompleto para o código atual.
Não combinar init SQL e migrate/baseline indiscriminadamente. Banco existente exige
análise de histórico e recuperação, não `reset`, `resolve` ou baseline automáticos.

`DATABASE_URL` e `DB_*` devem descrever o mesmo destino; URL exige percent-encoding
na credencial. Conexão efetiva deve ser comprovada somente na etapa autorizada.
O runner existente fixa 5435, hoje preservado; não é instalador genérico para
outra porta. Novo destino precisa de executor/guardas compatíveis aprovados antes
de qualquer migration. Não há promessa de instalação operacional completa só pela
instalação de pacotes ou existência do schema.

## 3. Configurar sem reutilizar segredos

Não há leitura nem reprodução de valores de `.env` nesta entrega. Templates podem
ser consultados como lista de campos, mas valores públicos historicamente
versionados não são segredos válidos. Preencher configuração própria, nunca
comitar valores reais nem substituir arquivos locais existentes.

| Camada/origem | Variáveis e semântica |
|---|---|
| Backend, config/env.js | Obrigatórias fora de test: JWT_SECRET, REGISTER_TOKEN, DB_HOST, DB_DATABASE, DB_USER, DB_PASSWORD |
| Conexão pg | DB_PORT deve ser explícita para destino novo; fallback legado 5433 é protegido |
| HTTP backend | PORT; padrão 3001, escuta 0.0.0.0; controlar alcance de rede |
| Sessão | JWT_EXPIRES_IN, padrão 8h; BCRYPT_ROUNDS, padrão 12; PASSWORD_RESET_EXPIRES_MS, padrão 1 hora |
| CORS | ALLOWED_ORIGINS, lista separada por vírgula; padrão http://localhost:5173 |
| Limite global | RATE_LIMIT_WINDOW_MS e RATE_LIMIT_MAX |
| Limite de login | RATE_LIMIT_AUTH_WINDOW_MS e RATE_LIMIT_AUTH_MAX |
| Limite de cadastro | RATE_LIMIT_REGISTER_WINDOW_MS e RATE_LIMIT_REGISTER_MAX |
| Limite por usuário | RATE_LIMIT_USER_WINDOW_MS e RATE_LIMIT_USER_MAX |
| Recuperação | RATE_LIMIT_PWD_RESET_WINDOW_MS e RATE_LIMIT_PWD_RESET_MAX, lidos no middleware |
| Prisma | DATABASE_URL, lida em prisma.config.ts; essa configuração importa dotenv/config |
| Frontend | VITE_API_BASE_URL, endereço público sem credenciais; fallback http://localhost:3001 |
| Compose | POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, DB_*, JWT_SECRET, REGISTER_TOKEN e portas da configuração selecionada; os nomes completos estão no YAML |

Fora dos modos guardados, backend carrega `backend/.env`; `NODE_ENV=test` seleciona
`backend/.env.test`. O `.env` da raiz é interpolação do Compose e não substitui
esse comportamento na execução Node local. Prisma padrão usa dotenv/config com
resolução dependente do contexto; conferir CWD/variáveis sem imprimir conteúdo.
Configurar `NODE_ENV=development` para uso local normal; nunca servir usuários em test.

Frontend Vite carrega arquivos de ambiente conforme modo por padrão. URL da API
é incorporada no build; mudar variável ao iniciar Nginx não reescreve o bundle.
O build de validação sem .env foi feito por executor temporário; `npm run build`
não desabilita .env automaticamente. Ver [produção](preparacao-producao.md).

## 4. Iniciar somente após banco/schema/configuração aprovados

Em dois terminais Ubuntu, nos diretórios correspondentes:

```bash
# Terminal backend, CWD backend/
npm run dev
```

```bash
# Terminal frontend, CWD frontend/
npm run dev
```

Backend `dev` e `start` executam `node src/server.js`; não há hot reload do backend.
Frontend usa Vite; URLs padrão 5173/3001, sujeitas a portas/configuração real.
Cadastro inicial é API, com `name`, `email`, `password` e `x-register-token`;
organizar o bootstrap em banco novo sem concorrência. Não expor REGISTER_TOKEN
em bundle frontend. Login da interface usa a conta cadastrada.

Verificar schema, API, browser e logs em etapa operacional autorizada, sem registrar
segredos. `/health` consulta banco e pode devolver detalhe do driver ao falhar;
sua mera resposta não comprova todo o sistema nem autoriza migrações.

## Docker: infraestrutura disponível, sem inicialização automática

Docker Desktop não está instalado nesta máquina. Uso de Docker exige verificar
Engine/Compose dentro do Ubuntu e autorização de criação/execução; a documentação
não depende de suposta integração do Windows.

- [Compose local](../docker-compose.yml): db, db-test, backend e frontend dev;
  nomes/volumes fixos e init SQL legado. `up` sem seleção pode iniciar o banco legado
  em 5434. Não usá-lo como comando de instalação do workspace preservado.
- [Compose produção](../docker-compose.prod.yml): sem db-test, DB sem porta host,
  frontend Nginx; é referência de infraestrutura, não deploy homologado.
- [Compose integração](../docker-compose.integration.yml): fixa 5435 e volume
  próprio já preservado; não recriar nem reutilizar para testes destrutivos.

Remover só DB_PORT_EXPOSED do ambiente não remove a declaração de `ports` do YAML
local. O Compose produção é separado. Container runtime backend omite devDependencies;
Prisma CLI está em devDependencies e migrations exigem ferramenta externa adequada.
