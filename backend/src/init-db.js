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
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ tabela projetos");

    // =========================
    // CENÁRIOS
    // =========================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cenarios (
        id SERIAL PRIMARY KEY,
        projeto_id INTEGER REFERENCES projetos(id) ON DELETE CASCADE,
        nome TEXT,
        tipo TEXT,
        passos JSONB,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ tabela cenarios");

    // =========================
    // TEST RUNS
    // =========================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_runs (
        id SERIAL PRIMARY KEY,
        projeto_id INTEGER REFERENCES projetos(id) ON DELETE CASCADE,
        nome TEXT,
        descricao TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ tabela test_runs");

    // =========================
    // EXECUÇÃO DOS TESTES
    // =========================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_executions (
        id SERIAL PRIMARY KEY,
        test_run_id INTEGER REFERENCES test_runs(id) ON DELETE CASCADE,
        cenario_id INTEGER REFERENCES cenarios(id) ON DELETE CASCADE,

        status TEXT CHECK (
          status IN ('PASSED', 'FAILED', 'BLOCKED', 'N/A')
        ),

        comentario TEXT,
        evidencias TEXT,

        executado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ tabela test_executions");

    console.log("🎉 BANCO PRONTO!");

  } catch (err) {
    console.error("❌ Erro ao criar tabelas:", err.message);
    throw err;
  }
}

module.exports = { init };