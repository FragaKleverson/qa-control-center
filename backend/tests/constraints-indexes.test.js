/**
 * Testes de integração — Fase 3, Item 11: Constraints e Índices
 *
 * Verifica que:
 *  - CHECK constraints rejeitam valores de domínio inválidos diretamente no banco.
 *  - UNIQUE constraints se mantêm íntegras.
 *  - Os índices de performance existem no catálogo do PostgreSQL.
 */

const pool      = require("../src/db");
const { clearTables, clearUsers, closePool } = require("./helpers/db");
const { createTestUser } = require("./helpers/auth");

beforeAll(async () => {
  await clearUsers();
  await createTestUser({ role: "admin" });
});

beforeEach(async () => {
  await clearTables();
});

afterAll(async () => {
  await closePool();
});

// =============================================================================
// CHECK CONSTRAINTS
// =============================================================================

describe("CHECK — users.role", () => {
  test("aceita roles válidas: admin, qa, reader", async () => {
    for (const role of ["admin", "qa", "reader"]) {
      const r = await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, 'hash', $3) RETURNING role`,
        [`User ${role}`, `${role}@chk.test`, role]
      );
      expect(r.rows[0].role).toBe(role);
    }
  });

  test("rejeita role inválida", async () => {
    await expect(
      pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ('Bad Role', 'bad@chk.test', 'hash', 'superadmin')`
      )
    ).rejects.toThrow(/chk_users_role/);
  });
});

describe("CHECK — execucoes.status", () => {
  let suiteId;
  beforeEach(async () => {
    const s = await pool.query(
      "INSERT INTO test_suites (nome) VALUES ('suite-chk') RETURNING id"
    );
    suiteId = s.rows[0].id;
  });

  test("aceita todos os status válidos", async () => {
    const validos = ["pending", "in_progress", "running", "passed", "failed", "blocked", "completed", "skipped"];
    for (const st of validos) {
      const r = await pool.query(
        "INSERT INTO execucoes (suite_id, ambiente, status) VALUES ($1, 'staging', $2) RETURNING status",
        [suiteId, st]
      );
      expect(r.rows[0].status).toBe(st);
    }
  });

  test("rejeita status inválido", async () => {
    await expect(
      pool.query(
        "INSERT INTO execucoes (suite_id, status) VALUES ($1, 'invalid_status')",
        [suiteId]
      )
    ).rejects.toThrow(/chk_execucoes_status/);
  });
});

describe("CHECK — execution_results.status", () => {
  let execucaoId, projetoId;
  beforeEach(async () => {
    const s = await pool.query("INSERT INTO test_suites (nome) VALUES ('er-suite') RETURNING id");
    const e = await pool.query(
      "INSERT INTO execucoes (suite_id) VALUES ($1) RETURNING id",
      [s.rows[0].id]
    );
    const p = await pool.query(
      "INSERT INTO projetos (titulo) VALUES ('er-proj') RETURNING id"
    );
    execucaoId = e.rows[0].id;
    projetoId  = p.rows[0].id;
  });

  test("aceita status válido em execution_results", async () => {
    const r = await pool.query(
      "INSERT INTO execution_results (execucao_id, projeto_id, status) VALUES ($1, $2, 'passed') RETURNING status",
      [execucaoId, projetoId]
    );
    expect(r.rows[0].status).toBe("passed");
  });

  test("rejeita status inválido em execution_results", async () => {
    await expect(
      pool.query(
        "INSERT INTO execution_results (execucao_id, projeto_id, status) VALUES ($1, $2, 'approved')",
        [execucaoId, projetoId]
      )
    ).rejects.toThrow(/chk_execution_results_status/);
  });
});

describe("CHECK — requirements.status e prioridade", () => {
  test("aceita status e prioridade válidos", async () => {
    const r = await pool.query(
      "INSERT INTO requirements (titulo, status, prioridade) VALUES ('Req', 'Open', 'High') RETURNING status, prioridade"
    );
    expect(r.rows[0].status).toBe("Open");
    expect(r.rows[0].prioridade).toBe("High");
  });

  test("rejeita status inválido", async () => {
    await expect(
      pool.query("INSERT INTO requirements (titulo, status) VALUES ('R', 'invalid')")
    ).rejects.toThrow(/chk_requirements_status/);
  });

  test("rejeita prioridade inválida", async () => {
    await expect(
      pool.query("INSERT INTO requirements (titulo, prioridade) VALUES ('R', 'Urgent')")
    ).rejects.toThrow(/chk_requirements_prioridade/);
  });
});

describe("CHECK — audit_logs.action", () => {
  test("aceita ações válidas: CREATE, UPDATE, DELETE, RESTORE", async () => {
    for (const action of ["CREATE", "UPDATE", "DELETE", "RESTORE"]) {
      const r = await pool.query(
        "INSERT INTO audit_logs (entity_type, action) VALUES ('projetos', $1) RETURNING action",
        [action]
      );
      expect(r.rows[0].action).toBe(action);
    }
  });

  test("rejeita action inválida", async () => {
    await expect(
      pool.query("INSERT INTO audit_logs (entity_type, action) VALUES ('projetos', 'READ')")
    ).rejects.toThrow(/chk_audit_logs_action/);
  });
});

// =============================================================================
// UNIQUE CONSTRAINTS (integridade estrutural)
// =============================================================================

describe("UNIQUE — test_suite_cases (suite_id, projeto_id)", () => {
  test("rejeita duplicata no mesmo par suite/projeto", async () => {
    const s = await pool.query("INSERT INTO test_suites (nome) VALUES ('s-uniq') RETURNING id");
    const p = await pool.query("INSERT INTO projetos (titulo) VALUES ('p-uniq') RETURNING id");
    const suiteId   = s.rows[0].id;
    const projetoId = p.rows[0].id;

    await pool.query(
      "INSERT INTO test_suite_cases (suite_id, projeto_id) VALUES ($1, $2)",
      [suiteId, projetoId]
    );
    await expect(
      pool.query(
        "INSERT INTO test_suite_cases (suite_id, projeto_id) VALUES ($1, $2)",
        [suiteId, projetoId]
      )
    ).rejects.toThrow(/unique/i);
  });
});

describe("UNIQUE — execution_results (execucao_id, projeto_id)", () => {
  test("rejeita duplicata no mesmo par execucao/projeto", async () => {
    const s = await pool.query("INSERT INTO test_suites (nome) VALUES ('s-er-uniq') RETURNING id");
    const e = await pool.query("INSERT INTO execucoes (suite_id) VALUES ($1) RETURNING id", [s.rows[0].id]);
    const p = await pool.query("INSERT INTO projetos (titulo) VALUES ('p-er-uniq') RETURNING id");

    await pool.query(
      "INSERT INTO execution_results (execucao_id, projeto_id) VALUES ($1, $2)",
      [e.rows[0].id, p.rows[0].id]
    );
    await expect(
      pool.query(
        "INSERT INTO execution_results (execucao_id, projeto_id) VALUES ($1, $2)",
        [e.rows[0].id, p.rows[0].id]
      )
    ).rejects.toThrow(/unique/i);
  });
});

// =============================================================================
// ÍNDICES — verifica existência no catálogo pg_indexes
// =============================================================================

describe("Índices de performance", () => {
  async function indexExists(indexName) {
    const r = await pool.query(
      "SELECT 1 FROM pg_indexes WHERE indexname = $1",
      [indexName]
    );
    return r.rowCount > 0;
  }

  const expectedIndexes = [
    // Soft delete (Fase 3, Item 10)
    "idx_projetos_deleted_at",
    "idx_test_suites_deleted_at",
    "idx_requirements_deleted_at",
    "idx_test_plans_deleted_at",
    "idx_execucoes_deleted_at",
    // Item 11 — novos índices de performance
    "idx_projetos_created_by",
    "idx_test_suites_projeto_deleted",
    "idx_test_suites_created_by",
    "idx_execucoes_suite_deleted",
    "idx_execucoes_status_deleted",
    "idx_execucoes_created_by",
    "idx_requirements_status_deleted",
    "idx_requirements_prioridade_deleted",
    "idx_requirements_created_by",
    "idx_execution_results_execucao_id",
    "idx_execution_results_status",
    "idx_password_reset_tokens_token_hash",
    "idx_password_reset_tokens_user_id",
    "idx_password_reset_tokens_expires_at",
    // Audit log (Fase 3, Item 9)
    "idx_audit_entity",
    "idx_audit_user",
    "idx_audit_time",
  ];

  test.each(expectedIndexes)("índice %s existe", async (indexName) => {
    expect(await indexExists(indexName)).toBe(true);
  });
});
