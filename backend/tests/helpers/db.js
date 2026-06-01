/**
 * Helpers de banco de dados para os testes de integração.
 * Todas as operações usam o pool do db.js (que lê .env.test via NODE_ENV=test).
 *
 * Padrão de uso:
 *   beforeAll(async () => { await clearTables(); });
 *   afterAll(async () => { await closePool(); });
 */

const pool = require("../../src/db");

/**
 * Remove todos os dados das tabelas relevantes e reinicia as sequences.
 * Usa um único TRUNCATE em cascata para evitar deadlocks entre sessões.
 * Deve ser chamado no beforeEach de cada suite de testes.
 */
async function clearTables() {
  await pool.query(
    `TRUNCATE TABLE execution_results, execucoes, test_plan_suites, test_suite_cases,
     test_plans, test_suites, requirements, projetos
     RESTART IDENTITY CASCADE`
  );
}

/**
 * Remove todos os usuários e reinicia a sequence.
 * Chamado apenas em auth.test.js para não interferir nos outros testes.
 */
async function clearUsers() {
  await pool.query(`TRUNCATE TABLE users RESTART IDENTITY`);
}

/**
 * Fecha o pool de conexões ao final da suite.
 * Deve ser chamado no afterAll para evitar que o Jest fique pendurado.
 */
async function closePool() {
  await pool.end();
}

/**
 * Insere um projeto de teste e retorna a linha criada.
 * @param {object} overrides - Campos para sobrescrever os valores padrão
 */
async function createProjeto(overrides = {}) {
  const defaults = {
    titulo: "Projeto Teste",
    descricao: "Descrição padrão",
    feature: "Feature: Teste",
    cenarios: JSON.stringify([{ nome: "Cenário 1", tipo: "Happy Path", passos: "Given x When y Then z" }]),
  };
  const data = { ...defaults, ...overrides };
  const result = await pool.query(
    "INSERT INTO projetos (titulo, descricao, feature, cenarios) VALUES ($1, $2, $3, $4) RETURNING *",
    [data.titulo, data.descricao, data.feature, data.cenarios]
  );
  return result.rows[0];
}

/**
 * Insere uma test suite e retorna a linha criada.
 * @param {object} overrides - Campos para sobrescrever os valores padrão
 */
async function createSuite(overrides = {}) {
  const defaults = { nome: "Suite Teste", descricao: "Descrição suite" };
  const data = { ...defaults, ...overrides };
  const result = await pool.query(
    "INSERT INTO test_suites (nome, descricao) VALUES ($1, $2) RETURNING *",
    [data.nome, data.descricao]
  );
  return result.rows[0];
}

/**
 * Insere um requirement e retorna a linha criada.
 * @param {object} overrides - Campos para sobrescrever os valores padrão
 */
async function createRequirement(overrides = {}) {
  const defaults = { titulo: "Req Teste", descricao: "Desc", status: "Open", prioridade: "Medium" };
  const data = { ...defaults, ...overrides };
  const result = await pool.query(
    "INSERT INTO requirements (titulo, descricao, status, prioridade) VALUES ($1, $2, $3, $4) RETURNING *",
    [data.titulo, data.descricao, data.status, data.prioridade]
  );
  return result.rows[0];
}

/**
 * Insere um test plan e retorna a linha criada.
 * @param {object} overrides - Campos para sobrescrever os valores padrão
 */
async function createPlan(overrides = {}) {
  const defaults = { titulo: "Plan Teste", descricao: "Desc", escopo: "", objetivo: "", ambiente: "staging" };
  const data = { ...defaults, ...overrides };
  const result = await pool.query(
    "INSERT INTO test_plans (titulo, descricao, escopo, objetivo, ambiente) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [data.titulo, data.descricao, data.escopo, data.objetivo, data.ambiente]
  );
  return result.rows[0];
}

module.exports = { clearTables, clearUsers, closePool, createProjeto, createSuite, createRequirement, createPlan };
