// Database Configuration
const pool = require("../db");

// Helper function para executar queries
const query = (sql, params) => pool.query(sql, params);

// ==================== PROJECTS SERVICE ====================
const projectsService = {
  listAll: async () => {
    const result = await query("SELECT * FROM projetos ORDER BY created_at DESC");
    return result.rows;
  },

  getById: async (id) => {
    const result = await query("SELECT * FROM projetos WHERE id = $1", [id]);
    return result.rows[0];
  },

  create: async (data) => {
    const { titulo, descricao, feature, cenarios = [] } = data;
    if (!titulo || !titulo.trim() || !descricao || !descricao.trim() || !feature || !feature.trim()) {
      throw new Error("Título, descrição e feature são obrigatórios");
    }
    const result = await query(
      "INSERT INTO projetos (titulo, descricao, feature, cenarios) VALUES ($1, $2, $3, $4) RETURNING *",
      [titulo, descricao, feature, JSON.stringify(cenarios)]
    );
    return result.rows[0];
  },

  update: async (id, data) => {
    const { titulo, descricao, feature } = data;
    const result = await query(
      "UPDATE projetos SET titulo = COALESCE($1, titulo), descricao = COALESCE($2, descricao), feature = COALESCE($3, feature), updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *",
      [titulo || null, descricao || null, feature || null, id]
    );
    if (result.rows.length === 0) throw new Error("Projeto não encontrado");
    return result.rows[0];
  },

  delete: async (id) => {
    const result = await query("DELETE FROM projetos WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) throw new Error("Projeto não encontrado");
    return result.rows[0];
  }
};

// ==================== TEST SUITES SERVICE ====================
const testSuitesService = {
  listAll: async () => {
    const result = await query("SELECT * FROM test_suites ORDER BY created_at DESC");
    return result.rows;
  },

  getById: async (id) => {
    const result = await query("SELECT * FROM test_suites WHERE id = $1", [id]);
    return result.rows[0];
  },

  create: async (data) => {
    const { nome, descricao = "", projeto_id = null } = data;
    if (!nome) throw new Error("Nome da suite é obrigatório");
    const result = await query(
      "INSERT INTO test_suites (nome, descricao, projeto_id) VALUES ($1, $2, $3) RETURNING *",
      [nome, descricao, projeto_id]
    );
    return result.rows[0];
  },

  update: async (id, data) => {
    const { nome, descricao, projeto_id } = data;
    const result = await query(
      "UPDATE test_suites SET nome = COALESCE($1, nome), descricao = COALESCE($2, descricao), projeto_id = COALESCE($3, projeto_id), updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *",
      [nome || null, descricao || null, projeto_id || null, id]
    );
    if (result.rows.length === 0) throw new Error("Suite não encontrada");
    return result.rows[0];
  },

  delete: async (id) => {
    const result = await query("DELETE FROM test_suites WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) throw new Error("Suite não encontrada");
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

// ==================== REQUIREMENTS SERVICE ====================
const requirementsService = {
  listAll: async () => {
    const result = await query("SELECT * FROM requirements ORDER BY created_at DESC");
    return result.rows;
  },

  getById: async (id) => {
    const result = await query("SELECT * FROM requirements WHERE id = $1", [id]);
    return result.rows[0];
  },

  create: async (data) => {
    const { titulo, descricao = "", status = "Open", prioridade = "Medium" } = data;
    if (!titulo || !titulo.trim()) throw new Error("Título é obrigatório");
    const result = await query(
      "INSERT INTO requirements (titulo, descricao, status, prioridade) VALUES ($1, $2, $3, $4) RETURNING *",
      [titulo, descricao, status, prioridade]
    );
    return result.rows[0];
  },

  update: async (id, data) => {
    const { titulo, descricao, status, prioridade } = data;
    const result = await query(
      "UPDATE requirements SET titulo = COALESCE($1, titulo), descricao = COALESCE($2, descricao), status = COALESCE($3, status), prioridade = COALESCE($4, prioridade), updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *",
      [titulo || null, descricao || null, status || null, prioridade || null, id]
    );
    if (result.rows.length === 0) throw new Error("Requirement não encontrado");
    return result.rows[0];
  },

  delete: async (id) => {
    const result = await query("DELETE FROM requirements WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) throw new Error("Requirement não encontrado");
    return result.rows[0];
  }
};

// ==================== TEST PLANS SERVICE ====================
const testPlansService = {
  listAll: async () => {
    const result = await query("SELECT * FROM test_plans ORDER BY created_at DESC");
    return result.rows;
  },

  getById: async (id) => {
    const result = await query("SELECT * FROM test_plans WHERE id = $1", [id]);
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
      "UPDATE test_plans SET titulo = COALESCE($1, titulo), descricao = COALESCE($2, descricao), escopo = COALESCE($3, escopo), objetivo = COALESCE($4, objetivo), ambiente = COALESCE($5, ambiente), updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *",
      [titulo || null, descricao || null, escopo || null, objetivo || null, ambiente || null, id]
    );
    if (result.rows.length === 0) throw new Error("Test Plan não encontrado");
    return result.rows[0];
  },

  delete: async (id) => {
    const result = await query("DELETE FROM test_plans WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) throw new Error("Test Plan não encontrado");
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
  execute: async (planId, ambiente = "staging") => {
    const plan = await query("SELECT * FROM test_plans WHERE id = $1", [planId]);
    if (plan.rows.length === 0) throw new Error("Test Plan não encontrado");

    // Buscar a primeira suite do plan para usar como suite_id na execução
    const suitesResult = await query(
      "SELECT suite_id FROM test_plan_suites WHERE plan_id = $1 ORDER BY created_at ASC LIMIT 1",
      [planId]
    );
    const suiteId = suitesResult.rows[0]?.suite_id || null;

    // Criar execução
    const execResult = await query(
      "INSERT INTO execucoes (suite_id, ambiente, status) VALUES ($1, $2, 'pending') RETURNING *",
      [suiteId, ambiente]
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

// ==================== EXECUTIONS SERVICE ====================
const executionsService = {
  listAll: async () => {
    const result = await query(
      `SELECT e.*,
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
       ORDER BY e.created_at DESC`
    );
    return result.rows;
  },

  getById: async (id) => {
    const result = await query("SELECT * FROM execucoes WHERE id = $1", [id]);
    return result.rows[0];
  },

  create: async (data) => {
    const { suite_id, ambiente = "staging", status = "pending", resultado = null } = data;
    if (!suite_id) throw new Error("suite_id é obrigatório");
    const result = await query(
      "INSERT INTO execucoes (suite_id, ambiente, status, resultado) VALUES ($1, $2, $3, $4) RETURNING *",
      [suite_id, ambiente, status, resultado]
    );
    return result.rows[0];
  },

  update: async (id, data) => {
    const { status, resultado } = data;
    const result = await query(
      "UPDATE execucoes SET status = COALESCE($1, status), resultado = COALESCE($2, resultado), updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *",
      [status || null, resultado || null, id]
    );
    if (result.rows.length === 0) throw new Error("Execução não encontrada");
    return result.rows[0];
  },

  delete: async (id) => {
    const result = await query("DELETE FROM execucoes WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) throw new Error("Execução não encontrada");
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
    if (execCheck.rows[0]?.finalized) throw new Error("Execução finalizada — não é possível editar os resultados.");

    const result = await query(
      `UPDATE execution_results
       SET status = $1, comentario = $2, updated_at = CURRENT_TIMESTAMP
       WHERE execucao_id = $3 AND projeto_id = $4
       RETURNING *`,
      [status, comentario || null, execucaoId, projetoId]
    );
    if (result.rows.length === 0) throw new Error("Resultado não encontrado");

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
    if (!execCheck.rows[0]) throw new Error("Execução não encontrada");
    if (execCheck.rows[0].finalized) throw new Error("Execução já foi finalizada.");

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

// ==================== REPORTS SERVICE ====================
const reportsService = {
  listAll: async () => {
    const executions = await query(
      "SELECT * FROM execucoes ORDER BY created_at DESC LIMIT 100"
    );

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
      executions: executions.rows,
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

// ==================== STATS SERVICE ====================
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

module.exports = {
  projectsService,
  testSuitesService,
  requirementsService,
  testPlansService,
  executionsService,
  reportsService,
  statsService
};
