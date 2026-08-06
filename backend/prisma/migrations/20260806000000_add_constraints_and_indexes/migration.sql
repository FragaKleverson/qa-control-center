-- Migration: add_constraints_and_indexes
-- Fase 3, Item 11 — Constraints e Índices.
-- Adiciona CHECK constraints para integridade de domínio e índices compostos/parciais
-- para os padrões de consulta mais frequentes.

-- =============================================================================
-- CHECK CONSTRAINTS — integridade de domínio
-- Garantem que valores inválidos nunca entrem no banco, independente da camada
-- de aplicação. Complementam a validação Zod já existente.
-- =============================================================================

ALTER TABLE users
  ADD CONSTRAINT chk_users_role
    CHECK (role IN ('admin', 'qa', 'reader'));

-- Status de execuções/resultados — sincronizado com STATUS_EXECUCAO em validators/execucoes.js
ALTER TABLE execucoes
  ADD CONSTRAINT chk_execucoes_status
    CHECK (status IN ('pending', 'in_progress', 'running', 'passed', 'failed', 'blocked', 'completed', 'skipped'));

ALTER TABLE execution_results
  ADD CONSTRAINT chk_execution_results_status
    CHECK (status IN ('pending', 'in_progress', 'running', 'passed', 'failed', 'blocked', 'completed', 'skipped'));

ALTER TABLE requirements
  ADD CONSTRAINT chk_requirements_status
    CHECK (status IN ('Open', 'In Progress', 'Closed', 'Blocked')),
  ADD CONSTRAINT chk_requirements_prioridade
    CHECK (prioridade IN ('Low', 'Medium', 'High', 'Critical'));

ALTER TABLE audit_logs
  ADD CONSTRAINT chk_audit_logs_action
    CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'RESTORE'));

-- =============================================================================
-- ÍNDICES DE PERFORMANCE — padrões de consulta frequentes
-- Parciais (WHERE deleted_at IS NULL) reduzem o tamanho do índice e aceleram
-- as listagens normais, que sempre filtram registros ativos.
-- =============================================================================

-- Projetos: busca por criador
CREATE INDEX idx_projetos_created_by
  ON projetos(created_by)
  WHERE created_by IS NOT NULL;

-- Test Suites: listagem por projeto (mais comum) e por criador
CREATE INDEX idx_test_suites_projeto_deleted
  ON test_suites(projeto_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_test_suites_created_by
  ON test_suites(created_by)
  WHERE created_by IS NOT NULL;

-- Execuções: filtro por suite + status (consultas de dashboard)
CREATE INDEX idx_execucoes_suite_deleted
  ON execucoes(suite_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_execucoes_status_deleted
  ON execucoes(status)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_execucoes_created_by
  ON execucoes(created_by)
  WHERE created_by IS NOT NULL;

-- Requirements: filtro por status e prioridade
CREATE INDEX idx_requirements_status_deleted
  ON requirements(status)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_requirements_prioridade_deleted
  ON requirements(prioridade)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_requirements_created_by
  ON requirements(created_by)
  WHERE created_by IS NOT NULL;

-- Execution Results: lookup por execução (a UNIQUE em (execucao_id, projeto_id) já cobre
-- buscas com ambas as colunas; este índice simples acelera queries só por execucao_id)
CREATE INDEX idx_execution_results_execucao_id
  ON execution_results(execucao_id);

CREATE INDEX idx_execution_results_status
  ON execution_results(status);

-- Password Reset Tokens: lookup por hash (único uso crítico) e limpeza por expiração
CREATE INDEX idx_password_reset_tokens_token_hash
  ON password_reset_tokens(token_hash);

CREATE INDEX idx_password_reset_tokens_user_id
  ON password_reset_tokens(user_id);

CREATE INDEX idx_password_reset_tokens_expires_at
  ON password_reset_tokens(expires_at);
