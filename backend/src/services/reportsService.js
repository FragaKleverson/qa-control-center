/**
 * Serviço de Relatórios — Fase 4, Item 13 (extraído de services/index.js).
 */

const pool = require("../db");
const { paginate, isPaginationRequested } = require("./pagination");

const query = (sql, params) => pool.query(sql, params);

const reportsService = {
  // Se page/limit forem informados, `executions` retorna paginado ({data, total, page, limit})
  // em vez do array simples — comportamento padrão (sem paginação) preservado para não quebrar consumidores existentes.
  listAll: async ({ page, limit } = {}) => {
    const paginationRequested = isPaginationRequested({ page, limit });

    const executions = paginationRequested
      ? await paginate(query, {
          baseSql: "SELECT * FROM execucoes ORDER BY created_at DESC",
          countSql: "SELECT COUNT(*) FROM execucoes",
          page,
          limit,
        })
      : (await query("SELECT * FROM execucoes ORDER BY created_at DESC LIMIT 100")).rows;

    const stats = await query(
      `SELECT status, COUNT(*) as count FROM execucoes GROUP BY status`
    );

    const suiteStats = await query(
      `SELECT
        ts.id                                                                AS suite_id,
        ts.nome,
        COUNT(er.id)                                                         AS total,
        SUM(CASE WHEN er.status = 'passed'  THEN 1 ELSE 0 END)              AS passed,
        SUM(CASE WHEN er.status = 'failed'  THEN 1 ELSE 0 END)              AS failed,
        SUM(CASE WHEN er.status = 'blocked' THEN 1 ELSE 0 END)              AS blocked,
        SUM(CASE WHEN er.status = 'skipped' THEN 1 ELSE 0 END)              AS skipped,
        SUM(CASE WHEN er.status = 'pending' THEN 1 ELSE 0 END)              AS pending
       FROM test_suites ts
       INNER JOIN execucoes e  ON e.suite_id  = ts.id
       INNER JOIN execution_results er ON er.execucao_id = e.id
       GROUP BY ts.id, ts.nome
       ORDER BY ts.id`
    );

    return {
      executions,
      stats: stats.rows,
      suiteStats: suiteStats.rows
    };
  },

  generateReport: async (filters) => {
    const { startDate, endDate, suite_id } = filters;
    let queryStr = "SELECT * FROM execucoes WHERE 1=1";
    const params = [];

    if (startDate) {
      queryStr += ` AND created_at >= $${params.length + 1}::date`;
      params.push(startDate);
    }

    if (endDate) {
      // Inclui o dia inteiro: < dia_seguinte
      queryStr += ` AND created_at < ($${params.length + 1}::date + INTERVAL '1 day')`;
      params.push(endDate);
    }

    if (suite_id) {
      queryStr += ` AND suite_id = $${params.length + 1}`;
      params.push(suite_id);
    }

    queryStr += " ORDER BY created_at DESC";

    const result = await query(queryStr, params);
    const executions = result.rows;

    // Busca os test cases de cada execução
    const executionsWithCases = await Promise.all(
      executions.map(async (ex) => {
        const casesResult = await query(
          `SELECT er.id, er.status, er.comentario, p.id AS projeto_id, p.titulo
           FROM execution_results er
           INNER JOIN projetos p ON p.id = er.projeto_id
           WHERE er.execucao_id = $1
           ORDER BY er.id ASC`,
          [ex.id]
        );
        return { ...ex, testCases: casesResult.rows };
      })
    );

    // Calcular summary ao nível de execução
    const total = executions.length;
    const passed = executions.filter(e => e.status === "passed").length;
    const failed = executions.filter(e => e.status === "failed").length;
    const pending = executions.filter(e => e.status === "pending").length;
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    // Calcular totais de test cases
    const allCases = executionsWithCases.flatMap(e => e.testCases);
    const casesPassed  = allCases.filter(c => c.status === "passed").length;
    const casesFailed  = allCases.filter(c => c.status === "failed").length;
    const casesPending = allCases.filter(c => c.status === "pending").length;
    const casesBlocked = allCases.filter(c => c.status === "blocked").length;
    const casesSkipped = allCases.filter(c => c.status === "skipped").length;

    return {
      summary: {
        total,
        passed,
        failed,
        pending,
        successRate: parseFloat(successRate),
        testCases: {
          total: allCases.length,
          passed: casesPassed,
          failed: casesFailed,
          pending: casesPending,
          blocked: casesBlocked,
          skipped: casesSkipped,
        }
      },
      executions: executionsWithCases
    };
  }
};

module.exports = reportsService;
