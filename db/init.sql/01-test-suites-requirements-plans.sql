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

-- Executions (depende de test_suites)
CREATE TABLE IF NOT EXISTS execucoes (
  id SERIAL PRIMARY KEY,
  suite_id INTEGER REFERENCES test_suites(id) ON DELETE CASCADE,
  ambiente VARCHAR(255) DEFAULT 'staging',
  status VARCHAR(50) DEFAULT 'pending',
  resultado TEXT,
  finalized BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_test_suites_projeto_id ON test_suites(projeto_id);
CREATE INDEX IF NOT EXISTS idx_test_suites_created_at ON test_suites(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status);
CREATE INDEX IF NOT EXISTS idx_requirements_prioridade ON requirements(prioridade);
CREATE INDEX IF NOT EXISTS idx_test_plans_created_at ON test_plans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execucoes_status ON execucoes(status);
CREATE INDEX IF NOT EXISTS idx_execucoes_suite_id ON execucoes(suite_id);
CREATE INDEX IF NOT EXISTS idx_execucoes_created_at ON execucoes(created_at DESC);

-- Relacionamento: Test Cases (projetos) ligados a Test Suites
CREATE TABLE IF NOT EXISTS test_suite_cases (
  id SERIAL PRIMARY KEY,
  suite_id INTEGER NOT NULL REFERENCES test_suites(id) ON DELETE CASCADE,
  projeto_id INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(suite_id, projeto_id)
);

-- Relacionamento: Test Suites ligadas a Test Plans
CREATE TABLE IF NOT EXISTS test_plan_suites (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES test_plans(id) ON DELETE CASCADE,
  suite_id INTEGER NOT NULL REFERENCES test_suites(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(plan_id, suite_id)
);

-- Resultados individuais por test case dentro de uma execução
CREATE TABLE IF NOT EXISTS execution_results (
  id SERIAL PRIMARY KEY,
  execucao_id INTEGER NOT NULL REFERENCES execucoes(id) ON DELETE CASCADE,
  projeto_id INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  comentario TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(execucao_id, projeto_id)
);

-- Índices das novas tabelas
CREATE INDEX IF NOT EXISTS idx_suite_cases_suite_id ON test_suite_cases(suite_id);
CREATE INDEX IF NOT EXISTS idx_suite_cases_projeto_id ON test_suite_cases(projeto_id);
CREATE INDEX IF NOT EXISTS idx_plan_suites_plan_id ON test_plan_suites(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_suites_suite_id ON test_plan_suites(suite_id);
CREATE INDEX IF NOT EXISTS idx_exec_results_execucao_id ON execution_results(execucao_id);
CREATE INDEX IF NOT EXISTS idx_exec_results_status ON execution_results(status);
