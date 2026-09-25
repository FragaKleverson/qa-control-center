/**
 * Serviço de Requirements — Fase 4, Item 13 (extraído de services/index.js).
 */

const pool = require("../db");
const AppError = require("../middleware/AppError");
const { paginate, isPaginationRequested } = require("./pagination");

const query = (sql, params) => pool.query(sql, params);

const BASE_SQL = "SELECT * FROM requirements WHERE deleted_at IS NULL ORDER BY created_at DESC";
const COUNT_SQL = "SELECT COUNT(*) FROM requirements WHERE deleted_at IS NULL";

const requirementsService = {
  listAll: async ({ page, limit } = {}) => {
    if (!isPaginationRequested({ page, limit })) {
      const result = await query(BASE_SQL);
      return result.rows;
    }
    return paginate(query, { baseSql: BASE_SQL, countSql: COUNT_SQL, page, limit });
  },

  getById: async (id) => {
    const result = await query("SELECT * FROM requirements WHERE id = $1 AND deleted_at IS NULL", [id]);
    return result.rows[0];
  },

  create: async (data, userId = null) => {
    const { titulo, descricao = "", status = "Open", prioridade = "Medium" } = data;
    if (!titulo || !titulo.trim()) throw new Error("Título é obrigatório");
    const result = await query(
      "INSERT INTO requirements (titulo, descricao, status, prioridade, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [titulo, descricao, status, prioridade, userId]
    );
    return result.rows[0];
  },

  update: async (id, data) => {
    const { titulo, descricao, status, prioridade } = data;
    const result = await query(
      "UPDATE requirements SET titulo = COALESCE($1, titulo), descricao = COALESCE($2, descricao), status = COALESCE($3, status), prioridade = COALESCE($4, prioridade), updated_at = CURRENT_TIMESTAMP WHERE id = $5 AND deleted_at IS NULL RETURNING *",
      [titulo || null, descricao || null, status || null, prioridade || null, id]
    );
    if (result.rows.length === 0) throw new AppError("Requirement n\u00e3o encontrado", 404);
    return result.rows[0];
  },

  delete: async (id) => {
    const result = await query(
      "UPDATE requirements SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *",
      [id]
    );
    if (result.rows.length === 0) throw new AppError("Requirement n\u00e3o encontrado", 404);
    return result.rows[0];
  },

  restore: async (id) => {
    const result = await query(
      "UPDATE requirements SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL RETURNING *",
      [id]
    );
    if (result.rows.length === 0) throw new AppError("Requirement n\u00e3o encontrado ou n\u00e3o est\u00e1 deletado", 404);
    return result.rows[0];
  }
};

module.exports = requirementsService;
