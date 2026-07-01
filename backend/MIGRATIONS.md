# Migrations — QA Control Center

Gerenciamento de schema via **Prisma Migrate**. O banco de dados (`pg` pool) continua sendo usado diretamente pelas queries da API — o Prisma gerencia apenas o versionamento e evolução do schema.

## Arquivos relevantes

| Arquivo | Descrição |
|---------|-----------|
| `prisma/schema.prisma` | Fonte da verdade do schema (modelos → tabelas) |
| `prisma/migrations/` | Histórico de migrations SQL versionadas |
| `prisma.config.ts` | Configuração do Prisma (schema path, migrations path, DATABASE_URL) |
| `.env` | `DATABASE_URL` para o banco de desenvolvimento |
| `.env.test` | `DATABASE_URL` para o banco de testes |

## Variável de ambiente

Além das variáveis `DB_*` (usadas pelo pool `pg`), é necessária a `DATABASE_URL` para o Prisma:

```
DATABASE_URL=postgresql://USUARIO:SENHA@HOST:PORTA/BANCO
```

Exemplo desenvolvimento local: `postgresql://qa_user:qa_password@localhost:5433/qa_control`

---

## Setup inicial (banco já existente)

Se o banco já existe com as tabelas criadas via `db/init.sql/`:

```bash
# Marca a migration 0_init como já aplicada (sem rodar o SQL)
npm run db:baseline
```

## Setup inicial (banco vazio / novo ambiente)

```bash
# Cria as tabelas a partir do histórico de migrations
npm run db:migrate
```

---

## Fluxo de evolução do schema

### 1. Altere o `schema.prisma`

Edite os modelos conforme a necessidade: adicione campos, tabelas, índices, constraints.

### 2. Crie a migration

```bash
# Gera o SQL da migration SEM aplicar — revise antes de commitar
npm run db:migrate:create -- --name nome_descritivo

# Exemplo:
npm run db:migrate:create -- --name add_user_id_to_projetos
```

O arquivo `prisma/migrations/<timestamp>_nome_descritivo/migration.sql` será criado. Revise o SQL gerado.

### 3. Aplique em desenvolvimento

```bash
npm run db:migrate:dev
```

### 4. Aplique em produção / CI

```bash
npm run db:migrate
```

---

## Scripts disponíveis

| Script | Comando Prisma | Uso |
|--------|---------------|-----|
| `db:migrate` | `prisma migrate deploy` | Aplica migrations pendentes (produção/CI) |
| `db:migrate:dev` | `prisma migrate dev` | Aplica + cria nova migration (desenvolvimento) |
| `db:migrate:create` | `prisma migrate dev --create-only` | Gera SQL sem aplicar |
| `db:migrate:status` | `prisma migrate status` | Lista migrations e status de cada uma |
| `db:migrate:resolve` | `prisma migrate resolve` | Marca migration manualmente como applied/rolled back |
| `db:baseline` | `prisma migrate resolve --applied 0_init` | Baseia banco existente na migration inicial |
| `db:generate` | `prisma generate` | Regenera o Prisma Client |
| `db:studio` | `prisma studio` | Abre GUI de exploração do banco |

---

## Convenções de nomenclatura

- Use snake_case descritivo: `add_projeto_id_to_requirements`, `create_audit_log_table`
- Prefira nomes que descrevam **o que muda**, não **por quê** muda
- Migrations são **permanentes** — nunca edite uma migration já aplicada em produção
- Se precisar reverter, crie uma nova migration de rollback

---

## Adicionando o banco de testes ao versionamento

O banco de testes (`qa_control_test`) é gerenciado pelos containers Docker e recriado a cada `docker-compose up`. Para aplicar as migrations no banco de testes manualmente:

```bash
DATABASE_URL=postgresql://qauser:qapass@localhost:5434/qa_control_test npx prisma migrate deploy
```
