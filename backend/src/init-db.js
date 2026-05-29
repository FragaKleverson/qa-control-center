const pool = require("./db");

async function init() {
  try {
    console.log("🚀 Criando tabelas...");

    // =========================
    // PROJETOS
    // =========================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projetos (
        id SERIAL PRIMARY KEY,
        titulo TEXT NOT NULL,
        descricao TEXT,
        feature TEXT,
        cenarios JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ tabela projetos");

    // =========================
    // TEST SUITES
    // =========================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_suites (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        descricao TEXT DEFAULT '',
        projeto_id INTEGER REFERENCES projetos(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ tabela test_suites");

    // =========================
    // REQUIREMENTS
    // =========================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS requirements (
        id SERIAL PRIMARY KEY,
        titulo TEXT NOT NULL,
        descricao TEXT DEFAULT '',
        status VARCHAR(50) DEFAULT 'Open',
        prioridade VARCHAR(50) DEFAULT 'Medium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ tabela requirements");

    // =========================
    // TEST PLANS
    // =========================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_plans (
        id SERIAL PRIMARY KEY,
        titulo TEXT NOT NULL,
        descricao TEXT DEFAULT '',
        escopo TEXT DEFAULT '',
        objetivo TEXT DEFAULT '',
        ambiente TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ tabela test_plans");

    // =========================
    // EXECUTIONS
    // =========================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS execucoes (
        id SERIAL PRIMARY KEY,
        suite_id INTEGER REFERENCES test_suites(id) ON DELETE CASCADE,
        ambiente VARCHAR(255) DEFAULT 'staging',
        status VARCHAR(50) DEFAULT 'pending',
        resultado TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ tabela execucoes");

    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_execucoes_status ON execucoes(status);
      CREATE INDEX IF NOT EXISTS idx_execucoes_suite_id ON execucoes(suite_id);
      CREATE INDEX IF NOT EXISTS idx_projetos_created_at ON projetos(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_test_suites_created_at ON test_suites(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_execucoes_created_at ON execucoes(created_at DESC);
    `);

    console.log("✅ índices criados");

    console.log("🎉 BANCO PRONTO!");

  } catch (err) {
    console.error("❌ Erro ao criar tabelas:", err.message);
    throw err;
  }
}

module.exports = { init };