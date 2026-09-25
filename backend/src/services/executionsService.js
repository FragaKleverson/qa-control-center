/**
 * Serviço de Execuções — Fase 4, Item 13 (extraído de services/index.js).
 */

const pool = require("../db");
const AppError = require("../middleware/AppError");
const { paginate, isPaginationRequested } = require("./pagination");

const query = (sql, params) => pool.query(sql, params);

const BASE_SQL = `SELECT e.*,
    ts.nome AS nome_suite,
    ts.projeto_id,
    p.titulo AS nome_projeto,
    (SELECT COUNT(*) FROM execution_results er WHERE er.execucao_id = e.id) AS total_cases,
    (SELECT COUNT(*) FROM execution_results er WHERE er.execucao_id = e.id AND er.status = 'passed')  AS passed_cases,
    (SELECT COUNT(*) FROM execution_results er WHERE er.execucao_id = e.id AND er.status = 'failed')  AS failed_cases,
    (SELECT COUNT(*) FROM execution_results er WHERE er.execucao_id = e.id AND er.status = 'blocked') AS blocked_cases,
    (SELECT COUNT(*) FROM execution_results er WHERE er.execucao_id = e.id AND er.status = 'skipped') AS skipped_cases,
    (SELECT COUNT(*) FROM execution_results er WHERE er.execucao_id = e.id AND er.status = 'pending') AS pending_cases
   FROM execucoes e
   LEFT JOIN test_suites ts ON ts.id = e.suite_id
   LEFT JOIN projetos p ON p.id = ts.projeto_id
   WHERE e.deleted_at IS NULL
   ORDER BY e.created_at DESC`;
const COUNT_SQL = "SELECT COUNT(*) FROM execucoes e WHERE e.deleted_at IS NULL";

const executionsService = {
  listAll: async ({ page, limit } = {}) => {
    if (!isPaginationRequested({ page, limit })) {
      const result = await query(BASE_SQL);
      return result.rows;
    }
    return paginate(query, { baseSql: BASE_SQL, countSql: COUNT_SQL, page, limit });
  },

  getById: async (id) => {
    const result = await query("SELECT * FROM execucoes WHERE id = $1 AND deleted_at IS NULL", [id]);
    return result.rows[0];
  },

  create: async (data, userId = null) => {
    const { suite_id, ambiente = "staging", status = "pending", resultado = null } = data;
    if (!suite_id) throw new Error("suite_id é obrigatório");
    const result = await query(
      "INSERT INTO execucoes (suite_id, ambiente, status, resultado, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [suite_id, ambiente, status, resultado, userId]
    );
    return result.rows[0];
  },

  update: async (id, data) => {
    const { status, resultado } = data;
    const result = await query(
      "UPDATE execucoes SET status = COALESCE($1, status), resultado = COALESCE($2, resultado), updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND deleted_at IS NULL RETURNING *",
      [status || null, resultado || null, id]
    );
    if (result.rows.length === 0) throw new AppError("Execu\u00e7\u00e3o n\u00e3o encontrada", 404);
    return result.rows[0];
  },

  delete: async (id) => {
    const result = await query(
      "UPDATE execucoes SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *",
      [id]
    );
    if (result.rows.length === 0) throw new AppError("Execu\u00e7\u00e3o n\u00e3o encontrada", 404);
    return result.rows[0];
  },

  restore: async (id) => {
    const result = await query(
      "UPDATE execucoes SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL RETURNING *",
      [id]
    );
    if (result.rows.length === 0) throw new AppError("Execu\u00e7\u00e3o n\u00e3o encontrada ou n\u00e3o est\u00e1 deletada", 404);
    return result.rows[0];
  },

  // Retorna todos os resultados de test cases de uma execução
  getResults: async (execucaoId) => {
    const result = await query(
      `SELECT er.*, p.titulo, p.descricao, p.feature, p.cenarios
       FROM execution_results er
       INNER JOIN projetos p ON p.id = er.projeto_id
       WHERE er.execucao_id = $1
       ORDER BY er.created_at ASC`,
      [execucaoId]
    );
    return result.rows;
  },

  // Atualiza status de um test case específico dentro de uma execução (não altera o status geral)
  updateResult: async (execucaoId, projetoId, status, comentario) => {
    // Bloqueia edição se a execução já foi finalizada
    const execCheck = await query("SELECT finalized FROM execucoes WHERE id = $1", [execucaoId]);
    if (execCheck.rows[0]?.finalized) throw new AppError("Execução finalizada — não é possível editar os resultados.", 422);

    const result = await query(
      `UPDATE execution_results
       SET status = $1, comentario = $2, updated_at = CURRENT_TIMESTAMP
       WHERE execucao_id = $3 AND projeto_id = $4
       RETURNING *`,
      [status, comentario || null, execucaoId, projetoId]
    );
    if (result.rows.length === 0) throw new AppError("Resultado não encontrado", 404);

    // Marca execução como 'running' enquanto há casos pendentes
    await query(
      `UPDATE execucoes SET status = 'running', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [execucaoId]
    );

    return result.rows[0];
  },

  // Finaliza a execução: calcula o status final com base nos resultados e bloqueia edição
  finalize: async (execucaoId) => {
    const execCheck = await query("SELECT finalized FROM execucoes WHERE id = $1", [execucaoId]);
    if (!execCheck.rows[0]) throw new AppError("Execução não encontrada", 404);
    if (execCheck.rows[0].finalized) throw new AppError("Execução já foi finalizada.", 422);

    // Calcular status final: se algum falhou → 'failed'; se todos passaram → 'passed'; caso contrário → 'completed'
    const counts = await query(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'passed'  THEN 1 ELSE 0 END) AS passed,
        SUM(CASE WHEN status = 'failed'  THEN 1 ELSE 0 END) AS failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending
       FROM execution_results WHERE execucao_id = $1`,
      [execucaoId]
    );
    const c = counts.rows[0];
    const total   = parseInt(c.total)   || 0;
    const passed  = parseInt(c.passed)  || 0;
    const failed  = parseInt(c.failed)  || 0;
    const pending = parseInt(c.pending) || 0;

    let finalStatus = 'completed';
    if (failed > 0)                  finalStatus = 'failed';
    else if (passed === total && total > 0) finalStatus = 'passed';
    else if (pending > 0)            finalStatus = 'completed'; // alguns skipped/blocked mas sem failed

    const result = await query(
      `UPDATE execucoes SET status = $1, finalized = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [finalStatus, execucaoId]
    );
    return result.rows[0];
  },

  getStats: async () => {
    // Conta ao nível de test cases (execution_results), não de execuções
    const result = await query(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN er.status = 'passed'  THEN 1 ELSE 0 END) AS passed,
        SUM(CASE WHEN er.status = 'failed'  THEN 1 ELSE 0 END) AS failed,
        SUM(CASE WHEN er.status = 'blocked' THEN 1 ELSE 0 END) AS blocked,
        SUM(CASE WHEN er.status = 'skipped' THEN 1 ELSE 0 END) AS skipped,
        SUM(CASE WHEN er.status = 'pending' THEN 1 ELSE 0 END) AS pending
       FROM execution_results er`
    );
    const row = result.rows[0];

    // Conta execuções finalizadas vs em andamento
    const execResult = await query(
      `SELECT
        COUNT(*) AS total_exec,
        SUM(CASE WHEN finalized = TRUE THEN 1 ELSE 0 END) AS finalized_exec
       FROM execucoes`
    );
    const erow = execResult.rows[0];

    return {
      total:    parseInt(row.total)   || 0,
      passed:   parseInt(row.passed)  || 0,
      failed:   parseInt(row.failed)  || 0,
      blocked:  parseInt(row.blocked) || 0,
      skipped:  parseInt(row.skipped) || 0,
      pending:  parseInt(row.pending) || 0,
      totalExecutions:     parseInt(erow.total_exec)     || 0,
      finalizedExecutions: parseInt(erow.finalized_exec) || 0,
    };
  }
};

module.exports = executionsService;
