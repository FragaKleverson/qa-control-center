# Migrations — QA Control Center

## Situação atual e proteção de dados — 04/11/2026

Histórico completo: 10 migrations. Foi aplicado em banco descartável vazio e,
separadamente, ensaiado sobre baseline antigo sintético: oito migrations antigas,
60 registros inseridos e preservados após as duas novas. As migrations novas são
20261030000000_add_plan_execution_guard e
20261030000001_create_projects_and_optional_case_link, nessa ordem.
[Resultados e ambientes](FEATURE-VALIDATION-STATUS.md) e
[relatório do ensaio histórico](HISTORICAL-MIGRATION-REHEARSAL.md).

qadb:5433, qa_control_test:5434 e qa_control_integration:5435 são protegidos contra
novas migrations, resets e limpezas. O ensaio independente em 5436 está preservado.
Não reaplicar o histórico nesses destinos nem usar os scripts npm genéricos como
atalho. Aplicação em ambiente original exige autorização e plano operacional
separados; não decorre automaticamente da aprovação sintética.

Prisma 7.8.0 local gerencia schema; runtime da API continua usando pool pg. Usar
Node 22.13+ na linha 22, validada em 22.17.1. DATABASE_URL e DB_* devem concordar;
não carregar .env por fallback. Guardas verificam identidade antes do subprocesso
Prisma, mas não interceptam as conexoes internas do engine. Não trocar portas,
containers ou cluster durante uma execução autorizada.

### Procedimento aplicado no ensaio histórico

Foi utilizado scripts/run-history-rehearsal.js, com configuração Prisma separada
e cópias byte a byte do SQL original, ampliadas de 8 para 9 e depois 10 migrations.
Não houve baseline artificial via migrate resolve, reset, db push ou cópia de dados
reais. A identidade e o histórico esperado foram conferidos antes de cada etapa;
snapshots comprovaram preservação. Não repetir baseline/upgrade sobre esse ambiente.
O runner de integração em 5435 e o runner histórico em 5436 têm allowlists distintas;
não intercambiar seus arquivos locais nem flexibilizar as guardas.

### Limitações e rollout pendente

Dados sintéticos não comprovam todos os formatos reais, tempo de ALTER TABLE,
locks em grande volume ou performance. Antes de alterar um ambiente original:
backup recuperável, autorização específica, inspeção de schema/histórico, suspensão
de escritores antigos, coordenação código/schema e plano de recuperação preservador.
Não remover tabela/coluna com dados para reverter; avaliar migration compensatória.
Nenhuma dessas operações foi executada nesta consolidação.

## Referência histórica do gerenciamento de schema

As seções abaixo preservam conceitos e scripts do fluxo anterior. Não são um
roteiro executável contra os bancos protegidos. Exemplos diretos de escrita foram
retirados em favor dos runners guardados e dos relatórios acima.


Gerenciamento de schema via **Prisma Migrate**. O banco de dados (`pg` pool) continua sendo usado diretamente pelas queries da API — o Prisma gerencia apenas o versionamento e evolução do schema.

## Arquivos relevantes

| Arquivo | Descrição |
|---------|-----------|
| `prisma/schema.prisma` | Fonte da verdade do schema (modelos → tabelas) |
| `prisma/migrations/` | Histórico de migrations SQL versionadas |
| `prisma.config.ts` | Configuração do Prisma (schema path, migrations path, DATABASE_URL) |
| `.env` | `DATABASE_URL` para o banco de desenvolvimento |
| `.env.test` | Configuração legada; não usar para migrations ou testes destrutivos |

## Variável de ambiente

Além das variáveis `DB_*` (usadas pelo pool `pg`), é necessária a `DATABASE_URL` para o Prisma:

```
DATABASE_URL=postgresql://USUARIO:SENHA@HOST:PORTA/BANCO
```

O exemplo de URL usa somente placeholders. O banco real de desenvolvimento protegido é qadb:5433; não executar migrations nele por este guia.

---

## Setup inicial (banco já existente)

Se o banco já existe com as tabelas criadas via `db/init.sql/`:

O fluxo anterior previa `db:baseline` para instalações já existentes. Não usar
esse mecanismo para fingir aplicação de SQL no ensaio; as oito migrations antigas
foram realmente executadas no banco novo. Adoção de banco real exige análise separada.

## Setup inicial (banco vazio / novo ambiente)

Em banco novo autorizado, o runner protegido aplica o histórico real. O procedimento
executado está no relatório histórico; não reaplicar em um banco já preservado.

---

## Fluxo de evolução do schema

### 1. Altere o `schema.prisma`

Edite os modelos conforme a necessidade: adicione campos, tabelas, índices, constraints.

### 2. Crie a migration

O script legado `db:migrate:create` usa migrate dev --create-only. Apesar de não
aplicar a migration nova, pode consultar banco/shadow database e ter efeitos de
preparação; não é uma operação offline. Não executar sem autorização de ambiente.

O arquivo `prisma/migrations/<timestamp>_nome_descritivo/migration.sql` será criado. Revise o SQL gerado.

### 3. Aplique em desenvolvimento

Referência histórica: `db:migrate:dev`. Não executar neste fechamento; pode alterar schema ou solicitar reset.

### 4. Aplique em produção / CI

Referência histórica: `db:migrate`. Não invocar sem runner/configuração revisados e autorização específica.

---

## Scripts disponíveis

| Script | Comando Prisma | Uso |
|--------|---------------|-----|
| `db:migrate` | `prisma migrate deploy` | Aplica migrations pendentes (produção/CI) |
| `db:migrate:dev` | `prisma migrate dev` | Aplica + cria nova migration (desenvolvimento) |
| `db:migrate:create` | `prisma migrate dev --create-only` | Gera SQL; pode acessar banco/shadow database, não é offline |
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

## Orientação legada sobre o banco de testes — substituída

O guia anterior orientava aplicar migrations diretamente em qa_control_test:5434
e presumir recriação pelo Compose. Essa orientação foi retirada: o banco e seu
volume contém dados a preservar, e iniciar Compose não comprova que o banco seja
vazio ou descartável. Não executar migrations, Jest padrão ou limpeza nele.
A validação desta feature utilizou os ambientes independentes descritos acima.
