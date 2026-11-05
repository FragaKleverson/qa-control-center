BEGIN;

ALTER TABLE test_plans
  ADD COLUMN executed_at TIMESTAMPTZ NULL,
  ADD COLUMN legacy_classification TEXT NOT NULL DEFAULT 'review_required';

-- Existing rows stay blocked. New rows use this default only after migration.
ALTER TABLE test_plans ALTER COLUMN legacy_classification SET DEFAULT 'eligible';
ALTER TABLE test_plans ADD CONSTRAINT test_plans_legacy_classification_check
  CHECK (legacy_classification IN ('eligible', 'review_required', 'executed'));

ALTER TABLE execucoes ADD COLUMN plan_id INTEGER NULL;
ALTER TABLE execucoes ADD CONSTRAINT execucoes_plan_id_fkey
  FOREIGN KEY (plan_id) REFERENCES test_plans(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE execucoes ADD CONSTRAINT execucoes_plan_id_key UNIQUE (plan_id);

COMMIT;
