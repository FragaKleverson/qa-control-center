/**
 * Serviço de Projetos (Test Cases) — Fase 4, Item 13 (extraído de services/index.js).
 */

const pool = require("../db");
const AppError = require("../middleware/AppError");
const { paginate, isPaginationRequested } = require("./pagination");

const { projectLinkSchema, cenariosSchema } = require("../validators/projetos");

const query = (sql, params) => pool.query(sql, params);

const CASE_SELECT = "SELECT p.*, pr.nome AS project_nome, pr.deleted_at AS project_deleted_at FROM projetos p LEFT JOIN projects pr ON pr.id = p.project_id";
const BASE_SQL = `${CASE_SELECT} WHERE p.deleted_at IS NULL`;

// FOR SHARE conflicts with the catalog UPDATE/soft delete while allowing concurrent links.
async function withProjectLink(projectId, write) {
  if (!projectLinkSchema.safeParse(projectId).success) throw new AppError("project_id invalido", 422);
  if (projectId === undefined || projectId === null) return write(query);
  const client = await pool.connect();
  let releaseError;
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT id FROM projects WHERE id = $1 AND deleted_at IS NULL FOR SHARE", [projectId]);
    if (!rows.length) throw new AppError("Project inexistente ou excluido", 422);
    const result = await write((sql, params) => client.query(sql, params));
    if (!result.rows.length) throw new AppError("Projeto nao encontrado", 404);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (rollbackError) { releaseError = rollbackError; }
    throw error;
  } finally { client.release(releaseError); }
}
const COUNT_SQL = "SELECT COUNT(*) FROM projetos WHERE deleted_at IS NULL";
const SORT_FIELDS = new Map([["id", "id"], ["created_at", "created_at"]]);
const SORT_DIRECTIONS = new Map([["asc", "ASC"], ["desc", "DESC"]]);

const projectsService = {
  listAll: async ({ page, limit, sort_by = "created_at", sort_dir = "desc" } = {}) => {
    if (!SORT_FIELDS.has(sort_by) || !SORT_DIRECTIONS.has(sort_dir)) {
      throw new AppError("Ordenação inválida", 422);
    }
    const field = SORT_FIELDS.get(sort_by);
    const direction = SORT_DIRECTIONS.get(sort_dir);
    const orderBy = field === "id" ? `id ${direction}` : `${field} ${direction}, id ${direction}`;
    const baseSql = `${BASE_SQL} ORDER BY ${orderBy}`;
    if (!isPaginationRequested({ page, limit })) {
      const result = await query(baseSql);
      return result.rows;
    }
    return paginate(query, { baseSql, countSql: COUNT_SQL, page, limit });
  },

  getById: async (id) => {
    const result = await query(`${CASE_SELECT} WHERE p.id = $1 AND p.deleted_at IS NULL`, [id]);
    return result.rows[0];
  },

  create: async (data, userId = null) => {
    const { titulo, descricao, feature, cenarios = [] } = data;
    if (!titulo || !titulo.trim() || !descricao || !descricao.trim() || !feature || !feature.trim()) {
      throw new Error("Título, descrição e feature são obrigatórios");
    }
    const hasLink = data.project_id !== undefined;
    const result = await withProjectLink(data.project_id, run => run(
      hasLink
        ? "INSERT INTO projetos (titulo, descricao, feature, cenarios, created_by, project_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *"
        : "INSERT INTO projetos (titulo, descricao, feature, cenarios, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [titulo, descricao, feature, JSON.stringify(cenarios), userId, ...(hasLink ? [data.project_id] : [])]
    ));
    return result.rows[0];
  },

  update: async (id, data) => {
    const { titulo, descricao, feature } = data;
    if (!cenariosSchema.safeParse(data.cenarios).success) throw new AppError("cenarios deve ser JSON valido", 422);
    const hasScenarios = data.cenarios !== undefined;
    const hasLink = data.project_id !== undefined;
    const result = await withProjectLink(data.project_id, run => run(
      `UPDATE projetos SET titulo = COALESCE($1, titulo), descricao = COALESCE($2, descricao), feature = COALESCE($3, feature), ${hasLink ? "project_id = $5, " : ""}${hasScenarios ? `cenarios = $${hasLink ? 6 : 5}::jsonb, ` : ""}updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND deleted_at IS NULL RETURNING *`,
      [titulo ?? null, descricao ?? null, feature ?? null, id, ...(hasLink ? [data.project_id] : []), ...(hasScenarios ? [JSON.stringify(data.cenarios)] : [])]
    ));
    if (result.rows.length === 0) throw new AppError("Projeto n\u00e3o encontrado", 404);
    return result.rows[0];
  },

  delete: async (id) => {
    const result = await query(
      "UPDATE projetos SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *",
      [id]
    );
    if (result.rows.length === 0) throw new AppError("Projeto n\u00e3o encontrado", 404);
    return result.rows[0];
  },

  restore: async (id) => {
    const result = await query(
      "UPDATE projetos SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL RETURNING *",
      [id]
    );
    if (result.rows.length === 0) throw new AppError("Projeto n\u00e3o encontrado ou n\u00e3o est\u00e1 deletado", 404);
    return result.rows[0];
  }
};

module.exports = projectsService;
