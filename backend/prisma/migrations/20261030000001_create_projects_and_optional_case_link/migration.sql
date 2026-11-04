-- Additive schema only. Apply after 20261030000000_add_plan_execution_guard.
-- No historical classification, copying or backfill is performed here.
BEGIN;

CREATE TABLE projects (
  id         SERIAL PRIMARY KEY,
  nome       TEXT NOT NULL,
  descricao  TEXT,
  created_by INTEGER,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ(6),
  CONSTRAINT projects_nome_not_blank CHECK (nome ~ '[^[:space:]]'),
  CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

ALTER TABLE projetos ADD COLUMN project_id INTEGER;
ALTER TABLE projetos ADD CONSTRAINT projetos_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX idx_projects_deleted_created_id
  ON projects (deleted_at, created_at DESC, id DESC);
CREATE INDEX idx_projects_created_by ON projects (created_by);
CREATE INDEX idx_projetos_project_id ON projetos (project_id);

COMMIT;
