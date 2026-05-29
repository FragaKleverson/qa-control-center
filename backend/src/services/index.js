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
    if (!titulo || !descricao || !feature) {
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
    if (!titulo) throw new Error("Título é obrigatório");
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
  }
};

// ==================== EXECUTIONS SERVICE ====================
const executionsService = {
  listAll: async () => {
    const result = await query("SELECT * FROM execucoes ORDER BY created_at DESC");
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
