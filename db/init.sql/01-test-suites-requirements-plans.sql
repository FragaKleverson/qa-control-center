-- Criar tabelas para Test Suites, Requirements e Test Plans

-- Test Suites
CREATE TABLE IF NOT EXISTS test_suites (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  projeto_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Requirements
CREATE TABLE IF NOT EXISTS requirements (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  status VARCHAR(50) DEFAULT 'Open',
  prioridade VARCHAR(50) DEFAULT 'Medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test Plans
CREATE TABLE IF NOT EXISTS test_plans (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  escopo TEXT,
  objetivo TEXT,
  ambiente VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_test_suites_projeto_id ON test_suites(projeto_id);
CREATE INDEX IF NOT EXISTS idx_test_suites_created_at ON test_suites(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status);
CREATE INDEX IF NOT EXISTS idx_requirements_prioridade ON requirements(prioridade);
CREATE INDEX IF NOT EXISTS idx_test_plans_created_at ON test_plans(created_at DESC);
