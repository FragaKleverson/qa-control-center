-- =============================================================================
-- Migration 0_init — baseline do schema QA Control Center
-- Esta migration reflete o estado inicial do banco criado via db/init.sql/.
-- Para bancos existentes, marque como já aplicada:
--   npx prisma migrate resolve --applied "0_init"
-- Para bancos novos, execute normalmente via:
--   npx prisma migrate deploy
-- =============================================================================

-- Usuários
CREATE TABLE "users" (
  "id"            SERIAL PRIMARY KEY,
  "name"          VARCHAR(255) NOT NULL,
  "email"         VARCHAR(255) UNIQUE NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "created_at"    TIMESTAMPTZ DEFAULT NOW()
);

-- Projetos (test cases)
CREATE TABLE "projetos" (
  "id"          SERIAL PRIMARY KEY,
  "titulo"      TEXT NOT NULL,
  "descricao"   TEXT,
  "feature"     TEXT,
  "cenarios"    JSONB,
  "created_at"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test Suites
CREATE TABLE "test_suites" (
  "id"          SERIAL PRIMARY KEY,
  "nome"        TEXT NOT NULL,
  "descricao"   TEXT DEFAULT '',
  "projeto_id"  INTEGER REFERENCES "projetos"("id") ON DELETE CASCADE,
  "created_at"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Requirements
CREATE TABLE "requirements" (
  "id"          SERIAL PRIMARY KEY,
  "titulo"      TEXT NOT NULL,
  "descricao"   TEXT DEFAULT '',
  "status"      VARCHAR(50) DEFAULT 'Open',
  "prioridade"  VARCHAR(50) DEFAULT 'Medium',
  "created_at"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test Plans
CREATE TABLE "test_plans" (
  "id"          SERIAL PRIMARY KEY,
  "titulo"      TEXT NOT NULL,
  "descricao"   TEXT DEFAULT '',
  "escopo"      TEXT DEFAULT '',
  "objetivo"    TEXT DEFAULT '',
  "ambiente"    TEXT DEFAULT '',
  "created_at"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Execuções
CREATE TABLE "execucoes" (
  "id"          SERIAL PRIMARY KEY,
  "suite_id"    INTEGER REFERENCES "test_suites"("id") ON DELETE CASCADE,
  "ambiente"    VARCHAR(255) DEFAULT 'staging',
  "status"      VARCHAR(50) DEFAULT 'pending',
  "resultado"   TEXT,
  "finalized"   BOOLEAN DEFAULT FALSE,
  "created_at"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Relacionamento: Test Cases (projetos) em Test Suites
CREATE TABLE "test_suite_cases" (
  "id"          SERIAL PRIMARY KEY,
  "suite_id"    INTEGER NOT NULL REFERENCES "test_suites"("id") ON DELETE CASCADE,
  "projeto_id"  INTEGER NOT NULL REFERENCES "projetos"("id") ON DELETE CASCADE,
  "created_at"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("suite_id", "projeto_id")
);

-- Relacionamento: Test Suites em Test Plans
CREATE TABLE "test_plan_suites" (
  "id"          SERIAL PRIMARY KEY,
  "plan_id"     INTEGER NOT NULL REFERENCES "test_plans"("id") ON DELETE CASCADE,
  "suite_id"    INTEGER NOT NULL REFERENCES "test_suites"("id") ON DELETE CASCADE,
  "created_at"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("plan_id", "suite_id")
);

-- Resultados individuais por test case dentro de uma execução
CREATE TABLE "execution_results" (
  "id"           SERIAL PRIMARY KEY,
  "execucao_id"  INTEGER NOT NULL REFERENCES "execucoes"("id") ON DELETE CASCADE,
  "projeto_id"   INTEGER NOT NULL REFERENCES "projetos"("id") ON DELETE CASCADE,
  "status"       VARCHAR(50) DEFAULT 'pending',
  "comentario"   TEXT,
  "created_at"   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("execucao_id", "projeto_id")
);

-- =============================================================================
-- Índices de performance
-- =============================================================================
CREATE INDEX "idx_projetos_created_at"      ON "projetos"("created_at" DESC);
CREATE INDEX "idx_test_suites_projeto_id"   ON "test_suites"("projeto_id");
CREATE INDEX "idx_test_suites_created_at"   ON "test_suites"("created_at" DESC);
CREATE INDEX "idx_requirements_status"      ON "requirements"("status");
CREATE INDEX "idx_requirements_prioridade"  ON "requirements"("prioridade");
CREATE INDEX "idx_test_plans_created_at"    ON "test_plans"("created_at" DESC);
CREATE INDEX "idx_execucoes_status"         ON "execucoes"("status");
CREATE INDEX "idx_execucoes_suite_id"       ON "execucoes"("suite_id");
CREATE INDEX "idx_execucoes_created_at"     ON "execucoes"("created_at" DESC);
CREATE INDEX "idx_suite_cases_suite_id"     ON "test_suite_cases"("suite_id");
CREATE INDEX "idx_suite_cases_projeto_id"   ON "test_suite_cases"("projeto_id");
CREATE INDEX "idx_plan_suites_plan_id"      ON "test_plan_suites"("plan_id");
CREATE INDEX "idx_plan_suites_suite_id"     ON "test_plan_suites"("suite_id");
CREATE INDEX "idx_exec_results_execucao_id" ON "execution_results"("execucao_id");
CREATE INDEX "idx_exec_results_status"      ON "execution_results"("status");
