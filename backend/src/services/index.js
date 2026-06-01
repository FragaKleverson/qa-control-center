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
        (SELECT COUNT(*) FROM execution_results er WHERE er.execucao_id = e.id) AS total_cases,
        (SELECT COUNT(*) FROM execution_results er WHERE er.execucao_id = e.id AND er.status = 'passed') AS passed_cases,
        (SELECT COUNT(*) FROM execution_results er WHERE er.execucao_id = e.id AND er.status = 'failed') AS failed_cases
       FROM execucoes e
       LEFT JOIN test_suites ts ON ts.id = e.suite_id
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

  // Atualiza status de um test case específico dentro de uma execução
  updateResult: async (execucaoId, projetoId, status, comentario) => {
    const result = await query(
      `UPDATE execution_results
       SET status = $1, comentario = $2, updated_at = CURRENT_TIMESTAMP
       WHERE execucao_id = $3 AND projeto_id = $4
       RETURNING *`,
      [status, comentario || null, execucaoId, projetoId]
    );
    if (result.rows.length === 0) throw new Error("Resultado não encontrado");

    // Atualizar status geral da execução com base nos resultados
    await query(
      `UPDATE execucoes
       SET status = CASE
         WHEN (SELECT COUNT(*) FROM execution_results WHERE execucao_id = $1 AND status = 'pending') > 0 THEN 'running'
         WHEN (SELECT COUNT(*) FROM execution_results WHERE execucao_id = $1 AND status = 'failed') > 0 THEN 'failed'
         WHEN (SELECT COUNT(*) FROM execution_results WHERE execucao_id = $1 AND status != 'passed') = 0 THEN 'passed'
         ELSE 'running'
       END,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [execucaoId]
    );

    return result.rows[0];
  },

  getStats: async () => {
    const result = await query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM execucoes`
    );
    const row = result.rows[0];
    return {
      total: parseInt(row.total) || 0,
      passed: parseInt(row.passed) || 0,
      failed: parseInt(row.failed) || 0,
      pending: parseInt(row.pending) || 0
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
        suite_id,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM execucoes GROUP BY suite_id`
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
      queryStr += ` AND created_at >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      queryStr += ` AND created_at <= $${params.length + 1}`;
      params.push(endDate);
    }

    if (suite_id) {
      queryStr += ` AND suite_id = $${params.length + 1}`;
      params.push(suite_id);
    }

    queryStr += " ORDER BY created_at DESC";

    const result = await query(queryStr, params);
    const executions = result.rows;

    // Calcular summary
    const total = executions.length;
    const passed = executions.filter(e => e.status === "passed").length;
    const failed = executions.filter(e => e.status === "failed").length;
    const pending = executions.filter(e => e.status === "pending").length;
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    return {
      summary: {
        total,
        passed,
        failed,
        pending,
        successRate: parseFloat(successRate)
      },
      executions
    };
  }
};

// ==================== STATS SERVICE ====================
const statsService = {
  getDashboard: async () => {
    try {
      const totalProjects = await query("SELECT COUNT(*) as count FROM projetos");
      const totalTestCases = await query("SELECT COUNT(*) as count FROM projetos WHERE cenarios IS NOT NULL");
      const totalExecutions = await query("SELECT COUNT(*) as count FROM execucoes");
      const recentProjects = await query("SELECT * FROM projetos ORDER BY created_at DESC LIMIT 5");
      const recentExecutions = await query("SELECT * FROM execucoes ORDER BY created_at DESC LIMIT 5");

      return {
        stats: {
          totalProjects: parseInt(totalProjects.rows[0]?.count || 0),
          totalTestCases: parseInt(totalTestCases.rows[0]?.count || 0),
          totalExecutions: parseInt(totalExecutions.rows[0]?.count || 0)
        },
        recentProjects: recentProjects.rows,
        recentExecutions: recentExecutions.rows
      };
    } catch (err) {
      console.error(err);
      return {
        stats: { totalProjects: 0, totalTestCases: 0, totalExecutions: 0 },
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
