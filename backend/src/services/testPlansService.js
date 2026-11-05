const pool = require("../db");
const AppError = require("../middleware/AppError");
const { environmentSchema } = require("../domain/environments");
const { paginate, isPaginationRequested } = require("./pagination");

const SELECT_PLAN = `SELECT p.*,
  (SELECT e.id FROM execucoes e WHERE e.plan_id = p.id) AS execution_id,
  (SELECT e.deleted_at FROM execucoes e WHERE e.plan_id = p.id) AS execution_deleted_at
  FROM test_plans p`;
const BASE_SQL = `${SELECT_PLAN} WHERE p.deleted_at IS NULL ORDER BY p.created_at DESC, p.id DESC`;
const COUNT_SQL = "SELECT COUNT(*) FROM test_plans WHERE deleted_at IS NULL";
const isExecuted = (plan) => plan.executed_at || plan.legacy_classification === "executed";
function assertMutable(plan) {
  if (isExecuted(plan)) throw new AppError("Plano executado: somente consulta permitida.", 409);
  if (plan.legacy_classification !== "eligible") {
    throw new AppError("Plano legado requer revisão autorizada antes de alterações ou execução.", 409);
  }
}
function assertEnvironment(ambiente) {
  if (!environmentSchema.safeParse(ambiente).success) {
    throw new AppError("Ambiente inválido. Regularize o plano com um ambiente oficial antes de executar.", 422);
  }
}

// All plan mutations take the parent lock first, using the same dedicated client.
async function withPlan(id, action, { deleted = false, mutable = true } = {}) {
  const client = await pool.connect();
  let releaseError;
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT * FROM test_plans WHERE id = $1 FOR UPDATE", [id]);
    const plan = rows[0];
    if (!plan || Boolean(plan.deleted_at) !== deleted) throw new AppError("Test Plan não encontrado", 404);
    if (mutable) assertMutable(plan);
    const result = await action(client, plan);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (rollbackError) { releaseError = rollbackError; }
    throw err;
  } finally {
    client.release(releaseError);
  }
}

const testPlansService = {
  listAll: async ({ page, limit } = {}) => {
    const query = (sql, params) => pool.query(sql, params);
    if (!isPaginationRequested({ page, limit })) return (await query(BASE_SQL)).rows;
    return paginate(query, { baseSql: BASE_SQL, countSql: COUNT_SQL, page, limit });
  },
  getById: async (id) => (await pool.query(`${SELECT_PLAN} WHERE p.id = $1 AND p.deleted_at IS NULL`, [id])).rows[0],
  create: async (data) => {
    const { titulo, descricao = "", escopo = "", objetivo = "", ambiente } = data;
    assertEnvironment(ambiente);
    return (await pool.query(
      `INSERT INTO test_plans (titulo, descricao, escopo, objetivo, ambiente, legacy_classification)
       VALUES ($1, $2, $3, $4, $5, 'eligible') RETURNING *`,
      [titulo, descricao, escopo, objetivo, ambiente]
    )).rows[0];
  },
  update: (id, data) => withPlan(id, async (client) => {
    if (data.ambiente !== undefined) assertEnvironment(data.ambiente);
    return (await client.query(
      `UPDATE test_plans SET titulo = COALESCE($1, titulo), descricao = COALESCE($2, descricao),
       escopo = COALESCE($3, escopo), objetivo = COALESCE($4, objetivo), ambiente = COALESCE($5, ambiente),
       updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *`,
      [data.titulo ?? null, data.descricao ?? null, data.escopo ?? null, data.objetivo ?? null, data.ambiente ?? null, id]
    )).rows[0];
  }),
  delete: (id) => withPlan(id, async (client) => (await client.query(
    "UPDATE test_plans SET deleted_at = NOW() WHERE id = $1 RETURNING *", [id]
  )).rows[0], { mutable: false }),
  restore: (id) => withPlan(id, async (client) => (await client.query(
    "UPDATE test_plans SET deleted_at = NULL WHERE id = $1 RETURNING *", [id]
  )).rows[0], { deleted: true, mutable: false }),
  getSuites: async (planId) => {
    if (!await testPlansService.getById(planId)) throw new AppError("Test Plan não encontrado", 404);
    // Historical links are displayed even when a shared suite was soft-deleted.
    return (await pool.query(`SELECT ts.*,
      (SELECT COUNT(*) FROM test_suite_cases tsc JOIN projetos p ON p.id = tsc.projeto_id
       WHERE tsc.suite_id = ts.id AND p.deleted_at IS NULL) AS total_cases
      FROM test_suites ts JOIN test_plan_suites tps ON tps.suite_id = ts.id
      WHERE tps.plan_id = $1 ORDER BY tps.created_at, tps.id`, [planId])).rows;
  },
  addSuite: (planId, suiteId) => withPlan(planId, async (client) => {
    const suite = await client.query("SELECT id FROM test_suites WHERE id = $1 AND deleted_at IS NULL", [suiteId]);
    if (!suite.rows.length) throw new AppError("Suite ativa não encontrada", 404);
    return (await client.query(
      "INSERT INTO test_plan_suites (plan_id, suite_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *",
      [planId, suiteId]
    )).rows[0] || { plan_id: planId, suite_id: suiteId };
  }),
  removeSuite: (planId, suiteId) => withPlan(planId, async (client) => {
    await client.query("DELETE FROM test_plan_suites WHERE plan_id = $1 AND suite_id = $2", [planId, suiteId]);
    return { removed: true };
  }),
  execute: (planId, userId = null) => withPlan(planId, async (client, plan) => {
    assertEnvironment(plan.ambiente);
    const suites = await client.query(`SELECT ts.id FROM test_suites ts
      JOIN test_plan_suites tps ON tps.suite_id = ts.id
      WHERE tps.plan_id = $1 AND ts.deleted_at IS NULL ORDER BY tps.created_at, tps.id`, [planId]);
    if (!suites.rows.length) throw new AppError("Vincule pelo menos uma suite ativa antes de executar.", 409);
    const cases = await client.query(`SELECT DISTINCT p.id FROM projetos p
      JOIN test_suite_cases tsc ON tsc.projeto_id = p.id
      JOIN test_suites ts ON ts.id = tsc.suite_id
      JOIN test_plan_suites tps ON tps.suite_id = ts.id
      WHERE tps.plan_id = $1 AND ts.deleted_at IS NULL AND p.deleted_at IS NULL ORDER BY p.id`, [planId]);
    if (!cases.rows.length) throw new AppError("O plano precisa de pelo menos um caso de teste ativo.", 409);
    const execution = (await client.query(
      `INSERT INTO execucoes (plan_id, suite_id, ambiente, status, created_by)
       VALUES ($1, $2, $3, 'pending', $4) RETURNING *`,
      [planId, suites.rows[0].id, plan.ambiente, userId]
    )).rows[0];
    await client.query(`INSERT INTO execution_results (execucao_id, projeto_id, status)
      SELECT $1, id, 'pending' FROM unnest($2::integer[]) AS cases(id)`,
      [execution.id, cases.rows.map((row) => row.id)]);
    await client.query("UPDATE test_plans SET executed_at = NOW(), updated_at = NOW() WHERE id = $1", [planId]);
    return execution;
  }),
};
module.exports = testPlansService;
