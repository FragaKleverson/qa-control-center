/**
 * Serviço de Test Plans — Fase 4, Item 13 (extraído de services/index.js).
 */

const pool = require("../db");
const AppError = require("../middleware/AppError");
const { paginate, isPaginationRequested } = require("./pagination");

const query = (sql, params) => pool.query(sql, params);

const BASE_SQL = "SELECT * FROM test_plans WHERE deleted_at IS NULL ORDER BY created_at DESC";
const COUNT_SQL = "SELECT COUNT(*) FROM test_plans WHERE deleted_at IS NULL";

const testPlansService = {
  listAll: async ({ page, limit } = {}) => {
    if (!isPaginationRequested({ page, limit })) {
      const result = await query(BASE_SQL);
      return result.rows;
    }
    return paginate(query, { baseSql: BASE_SQL, countSql: COUNT_SQL, page, limit });
  },

  getById: async (id) => {
    const result = await query("SELECT * FROM test_plans WHERE id = $1 AND deleted_at IS NULL", [id]);
    return result.rows[0];
  },

  create: async (data) => {
    const { titulo, descricao = "", escopo = "", objetivo = "", ambiente = "" } = data;
    if (!titulo) throw new Error("Título é obrigatório");
    const result = await query(
      "INSERT INTO test_plans (titulo, descricao, escopo, objetivo, ambiente) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [titulo, descricao, escopo, objetivo, ambiente]
    );
    return result.rows[0];
  },

  update: async (id, data) => {
    const { titulo, descricao, escopo, objetivo, ambiente } = data;
    const result = await query(
      "UPDATE test_plans SET titulo = COALESCE($1, titulo), descricao = COALESCE($2, descricao), escopo = COALESCE($3, escopo), objetivo = COALESCE($4, objetivo), ambiente = COALESCE($5, ambiente), updated_at = CURRENT_TIMESTAMP WHERE id = $6 AND deleted_at IS NULL RETURNING *",
      [titulo || null, descricao || null, escopo || null, objetivo || null, ambiente || null, id]
    );
    if (result.rows.length === 0) throw new AppError("Test Plan n\u00e3o encontrado", 404);
    return result.rows[0];
  },

  delete: async (id) => {
    const result = await query(
      "UPDATE test_plans SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *",
      [id]
    );
    if (result.rows.length === 0) throw new AppError("Test Plan n\u00e3o encontrado", 404);
    return result.rows[0];
  },

  restore: async (id) => {
    const result = await query(
      "UPDATE test_plans SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL RETURNING *",
      [id]
    );
    if (result.rows.length === 0) throw new AppError("Test Plan n\u00e3o encontrado ou n\u00e3o est\u00e1 deletado", 404);
    return result.rows[0];
  },

  // Retorna as suites vinculadas a um plan (com contagem de test cases)
  getSuites: async (planId) => {
    const result = await query(
      `SELECT ts.*,
        (SELECT COUNT(*) FROM test_suite_cases tsc WHERE tsc.suite_id = ts.id) AS total_cases
       FROM test_suites ts
       INNER JOIN test_plan_suites tps ON tps.suite_id = ts.id
       WHERE tps.plan_id = $1
       ORDER BY tps.created_at ASC`,
      [planId]
    );
    return result.rows;
  },

  // Vincula uma suite a um plan
  addSuite: async (planId, suiteId) => {
    const result = await query(
      "INSERT INTO test_plan_suites (plan_id, suite_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *",
      [planId, suiteId]
    );
    return result.rows[0] || { plan_id: planId, suite_id: suiteId };
  },

  // Remove vínculo de suite de um plan
  removeSuite: async (planId, suiteId) => {
    await query(
      "DELETE FROM test_plan_suites WHERE plan_id = $1 AND suite_id = $2",
      [planId, suiteId]
    );
    return { removed: true };
  },

  // Cria execução a partir de um plan (popula execution_results com todos os test cases)
  execute: async (planId, ambiente = "staging", userId = null) => {
    const plan = await query("SELECT * FROM test_plans WHERE id = $1 AND deleted_at IS NULL", [planId]);
    if (plan.rows.length === 0) throw new AppError("Test Plan não encontrado", 404);

    // Buscar a primeira suite do plan para usar como suite_id na execução
    const suitesResult = await query(
      "SELECT suite_id FROM test_plan_suites WHERE plan_id = $1 ORDER BY created_at ASC LIMIT 1",
      [planId]
    );
    const suiteId = suitesResult.rows[0]?.suite_id || null;

    // Criar execução registrando quem disparou
    const execResult = await query(
      "INSERT INTO execucoes (suite_id, ambiente, status, created_by) VALUES ($1, $2, 'pending', $3) RETURNING *",
      [suiteId, ambiente, userId]
    );
    const execucao = execResult.rows[0];

    // Buscar todos os test cases de todas as suites do plan
    const casesResult = await query(
      `SELECT DISTINCT tsc.projeto_id
       FROM test_suite_cases tsc
       INNER JOIN test_plan_suites tps ON tps.suite_id = tsc.suite_id
       WHERE tps.plan_id = $1`,
      [planId]
    );

    // Criar execution_results para cada test case
    for (const row of casesResult.rows) {
      await query(
        "INSERT INTO execution_results (execucao_id, projeto_id, status) VALUES ($1, $2, 'pending') ON CONFLICT DO NOTHING",
        [execucao.id, row.projeto_id]
      );
    }

    return execucao;
  }
};

module.exports = testPlansService;
