/**
 * Serviço de Test Suites — Fase 4, Item 13 (extraído de services/index.js).
 */

const pool = require("../db");
const AppError = require("../middleware/AppError");
const { paginate, isPaginationRequested } = require("./pagination");

const query = (sql, params) => pool.query(sql, params);

const BASE_SQL = "SELECT * FROM test_suites WHERE deleted_at IS NULL ORDER BY created_at DESC";
const COUNT_SQL = "SELECT COUNT(*) FROM test_suites WHERE deleted_at IS NULL";

const testSuitesService = {
  listAll: async ({ page, limit } = {}) => {
    if (!isPaginationRequested({ page, limit })) {
      const result = await query(BASE_SQL);
      return result.rows;
    }
    return paginate(query, { baseSql: BASE_SQL, countSql: COUNT_SQL, page, limit });
  },

  getById: async (id) => {
    const result = await query("SELECT * FROM test_suites WHERE id = $1 AND deleted_at IS NULL", [id]);
    return result.rows[0];
  },

  create: async (data, userId = null) => {
    const { nome, descricao = "", projeto_id = null } = data;
    if (!nome) throw new Error("Nome da suite é obrigatório");
    const result = await query(
      "INSERT INTO test_suites (nome, descricao, projeto_id, created_by) VALUES ($1, $2, $3, $4) RETURNING *",
      [nome, descricao, projeto_id, userId]
    );
    return result.rows[0];
  },

  update: async (id, data) => {
    const { nome, descricao, projeto_id } = data;
    const result = await query(
      "UPDATE test_suites SET nome = COALESCE($1, nome), descricao = COALESCE($2, descricao), projeto_id = COALESCE($3, projeto_id), updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND deleted_at IS NULL RETURNING *",
      [nome || null, descricao || null, projeto_id || null, id]
    );
    if (result.rows.length === 0) throw new AppError("Suite n\u00e3o encontrada", 404);
    return result.rows[0];
  },

  delete: async (id) => {
    const result = await query(
      "UPDATE test_suites SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *",
      [id]
    );
    if (result.rows.length === 0) throw new AppError("Suite n\u00e3o encontrada", 404);
    return result.rows[0];
  },

  restore: async (id) => {
    const result = await query(
      "UPDATE test_suites SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL RETURNING *",
      [id]
    );
    if (result.rows.length === 0) throw new AppError("Suite n\u00e3o encontrada ou n\u00e3o est\u00e1 deletada", 404);
    return result.rows[0];
  },

  // Retorna os test cases (projetos) vinculados a uma suite
  getCases: async (suiteId) => {
    const result = await query(
      `SELECT p.* FROM projetos p
       INNER JOIN test_suite_cases tsc ON tsc.projeto_id = p.id
       WHERE tsc.suite_id = $1
       ORDER BY tsc.created_at ASC`,
      [suiteId]
    );
    return result.rows;
  },

  // Vincula um test case a uma suite
  addCase: async (suiteId, projetoId) => {
    const result = await query(
      "INSERT INTO test_suite_cases (suite_id, projeto_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *",
      [suiteId, projetoId]
    );
    return result.rows[0] || { suite_id: suiteId, projeto_id: projetoId };
  },

  // Remove vínculo de test case de uma suite
  removeCase: async (suiteId, projetoId) => {
    await query(
      "DELETE FROM test_suite_cases WHERE suite_id = $1 AND projeto_id = $2",
      [suiteId, projetoId]
    );
    return { removed: true };
  }
};

module.exports = testSuitesService;
