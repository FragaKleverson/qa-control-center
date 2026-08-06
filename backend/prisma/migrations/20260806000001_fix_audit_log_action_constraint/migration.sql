-- Migration: fix_audit_log_action_constraint
-- Corrige a constraint chk_audit_logs_action adicionada em 20260806000000
-- para incluir RESTORE, que já é usado nas rotas de soft-delete.

ALTER TABLE audit_logs
  DROP CONSTRAINT chk_audit_logs_action;

ALTER TABLE audit_logs
  ADD CONSTRAINT chk_audit_logs_action
    CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'RESTORE'));
