// Independent Project catalog. Never query the legacy projetos table here.
const pool = require("../db");
const AppError = require("../middleware/AppError");
const { paginate, isPaginationRequested } = require("./pagination");
const { projectIdSchema, createSchema, updateSchema, listQuerySchema } = require("../validators/projects");

const COLUMNS = "id, nome, descricao, created_by, created_at, updated_at, deleted_at";
const BASE_SQL = `SELECT ${COLUMNS} FROM projects WHERE deleted_at IS NULL ORDER BY created_at DESC, id DESC`;
const COUNT_SQL = "SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL";
function checked(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) throw new AppError("Dados de Project inválidos", 422);
  return result.data;
}

// Scoped audit writer: the global best-effort audit helper remains unchanged.
async function audit(client, actor, action, oldValues, newValues) {
  const project = newValues || oldValues;
  await client.query(
    `INSERT INTO audit_logs (user_id, entity_type, entity_id, action, old_values, new_values, ip_address)
     VALUES ($1, 'project', $2, $3, $4, $5, $6)`,
    [actor.userId, project.id, action, oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null, actor.ipAddress ?? null]
  );
}
async function transaction(actor, action) {
  if (!projectIdSchema.safeParse(actor?.userId).success) throw new AppError("Usuário autenticado necessário", 401);
  const client = await pool.connect();
  let releaseError;
  try {
    await client.query("BEGIN");
    const result = await action(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (rollbackError) { releaseError = rollbackError; }
    throw err;
  } finally { client.release(releaseError); }
}
async function lockedProject(client, id, deleted = false) {
  const { rows } = await client.query(`SELECT ${COLUMNS} FROM projects WHERE id = $1 FOR UPDATE`, [id]);
  if (!rows[0] || Boolean(rows[0].deleted_at) !== deleted) throw new AppError("Project não encontrado", 404);
  return rows[0];
}
const projectCatalogService = {
  listAll: async (options = {}) => {
    const { page, limit } = checked(listQuerySchema, options);
    const query = (sql, params) => pool.query(sql, params);
    if (!isPaginationRequested({ page, limit })) return (await query(BASE_SQL)).rows;
    return paginate(query, { baseSql: BASE_SQL, countSql: COUNT_SQL, page, limit });
  },
  getById: async (id) => {
    id = checked(projectIdSchema, id);
    const { rows } = await pool.query(`SELECT ${COLUMNS} FROM projects WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (!rows[0]) throw new AppError("Project não encontrado", 404);
    return rows[0];
  },
  create: async (data, actor) => {
    const { nome, descricao = null } = checked(createSchema, data);
    return transaction(actor, async (client) => {
      const { rows } = await client.query(
        `INSERT INTO projects (nome, descricao, created_by) VALUES ($1, $2, $3) RETURNING ${COLUMNS}`,
        [nome, descricao, actor.userId]
      );
      await audit(client, actor, "CREATE", null, rows[0]);
      return rows[0];
    });
  },
  update: async (id, data, actor) => {
    id = checked(projectIdSchema, id);
    const payload = checked(updateSchema, data);
    return transaction(actor, async (client) => {
      const old = await lockedProject(client, id);
      const { rows } = await client.query(
        `UPDATE projects SET nome = COALESCE($1, nome),
         descricao = CASE WHEN $2::boolean THEN $3::text ELSE descricao END,
         updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING ${COLUMNS}`,
        [payload.nome ?? null, payload.descricao !== undefined, payload.descricao ?? null, id]
      );
      await audit(client, actor, "UPDATE", old, rows[0]);
      return rows[0];
    });
  },
  delete: async (id, actor) => {
    id = checked(projectIdSchema, id);
    return transaction(actor, async (client) => {
      const old = await lockedProject(client, id);
      const { rows } = await client.query(
        `UPDATE projects SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING ${COLUMNS}`, [id]
      );
      await audit(client, actor, "DELETE", old, rows[0]);
      return rows[0];
    });
  },
  restore: async (id, actor) => {
    id = checked(projectIdSchema, id);
    return transaction(actor, async (client) => {
      const old = await lockedProject(client, id, true);
      const { rows } = await client.query(
        `UPDATE projects SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING ${COLUMNS}`, [id]
      );
      await audit(client, actor, "RESTORE", old, rows[0]);
      return rows[0];
    });
  },
};
module.exports = projectCatalogService;
