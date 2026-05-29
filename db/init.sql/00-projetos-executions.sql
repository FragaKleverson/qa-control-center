-- Criar tabelas principais para QA Control Center

-- Projetos
CREATE TABLE IF NOT EXISTS projetos (
  id SERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  feature TEXT,
  cenarios JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Executions (Execuções)
CREATE TABLE IF NOT EXISTS execucoes (
  id SERIAL PRIMARY KEY,
  suite_id INTEGER REFERENCES test_suites(id) ON DELETE CASCADE,
  ambiente VARCHAR(255) DEFAULT 'staging',
  status VARCHAR(50) DEFAULT 'pending',
  resultado TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_projetos_created_at ON projetos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execucoes_status ON execucoes(status);
CREATE INDEX IF NOT EXISTS idx_execucoes_suite_id ON execucoes(suite_id);
CREATE INDEX IF NOT EXISTS idx_execucoes_created_at ON execucoes(created_at DESC);
