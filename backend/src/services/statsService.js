/**
 * Serviço de Estatísticas do Dashboard — Fase 4, Item 13 (extraído de services/index.js).
 */

const pool = require("../db");

const query = (sql, params) => pool.query(sql, params);

const statsService = {
  getDashboard: async () => {
    try {
      // Garante que a coluna finalized existe (migration segura para DBs já criados)
      await query(`ALTER TABLE execucoes ADD COLUMN IF NOT EXISTS finalized BOOLEAN DEFAULT FALSE`);

      const totalProjects    = await query("SELECT COUNT(*) as count FROM projetos");
      const totalExecutions  = await query("SELECT COUNT(*) as count FROM execucoes");
      const recentProjects   = await query("SELECT * FROM projetos ORDER BY created_at DESC LIMIT 5");
      const recentExecutions = await query(
        `SELECT e.*, ts.nome AS nome_suite
         FROM execucoes e
         LEFT JOIN test_suites ts ON ts.id = e.suite_id
         ORDER BY e.created_at DESC LIMIT 5`
      );

      // Stats de test cases (não de execuções)
      const caseStats = await query(
        `SELECT
          COUNT(*)                                                    AS total,
          SUM(CASE WHEN status = 'passed'  THEN 1 ELSE 0 END)        AS passed,
          SUM(CASE WHEN status = 'failed'  THEN 1 ELSE 0 END)        AS failed,
          SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END)        AS blocked,
          SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END)        AS skipped,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)        AS pending
         FROM execution_results`
      );
      const cs = caseStats.rows[0];

      return {
        stats: {
          totalProjects:   parseInt(totalProjects.rows[0]?.count   || 0),
          totalExecutions: parseInt(totalExecutions.rows[0]?.count || 0),
          testCases: {
            total:   parseInt(cs.total)   || 0,
            passed:  parseInt(cs.passed)  || 0,
            failed:  parseInt(cs.failed)  || 0,
            blocked: parseInt(cs.blocked) || 0,
            skipped: parseInt(cs.skipped) || 0,
            pending: parseInt(cs.pending) || 0,
          }
        },
        recentProjects:   recentProjects.rows,
        recentExecutions: recentExecutions.rows
      };
    } catch (err) {
      console.error(err);
      return {
        stats: {
          totalProjects: 0, totalExecutions: 0,
          testCases: { total: 0, passed: 0, failed: 0, blocked: 0, skipped: 0, pending: 0 }
        },
        recentProjects: [],
        recentExecutions: []
      };
    }
  }
};

module.exports = statsService;
