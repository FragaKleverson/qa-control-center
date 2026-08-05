/**
 * Testes de integração — Fase 3, Item 9: Audit Log
 *
 * Verifica que as operações CREATE / UPDATE / DELETE registram
 * entradas na tabela audit_logs com os dados corretos.
 */

const request  = require("supertest");
const app      = require("../src/app");
const pool     = require("../src/db");
const { clearTables, clearUsers, closePool } = require("./helpers/db");
const { createTestUser } = require("./helpers/auth");

async function getLastAuditLog(entityType) {
  const result = await pool.query(
    "SELECT * FROM audit_logs WHERE entity_type = $1 ORDER BY created_at DESC LIMIT 1",
    [entityType]
  );
  return result.rows[0];
}

async function countAuditLogs(entityType, action) {
  const result = await pool.query(
    "SELECT COUNT(*) FROM audit_logs WHERE entity_type = $1 AND action = $2",
    [entityType, action]
  );
  return parseInt(result.rows[0].count);
}

const projetoPayload = {
  titulo:    "Projeto Audit Test",
  descricao: "Teste de audit log",
  feature:   "Feature: Audit",
  cenarios:  [{ nome: "Cenário 1", tipo: "Happy Path", passos: "Given x When y Then z" }],
};

beforeAll(async () => {
  await clearUsers();
  await createTestUser();
});

beforeEach(async () => {
  await clearTables();
});

afterAll(async () => {
  await closePool();
});

// ─── Projetos ────────────────────────────────────────────────────────────────

describe("Audit Log — Projetos", () => {
  test("POST /projetos cria entrada audit_log com action=CREATE", async () => {
    const res = await request(app)
      .post("/projetos")
      .set("x-test-role", "admin")
      .send(projetoPayload);

    expect(res.status).toBe(201);

    const log = await getLastAuditLog("projeto");
    expect(log).toBeDefined();
    expect(log.action).toBe("CREATE");
    expect(log.entity_id).toBe(res.body.id);
    expect(log.new_values).toBeTruthy();
    expect(log.old_values).toBeNull();
  });

  test("PUT /projetos/:id cria entrada audit_log com action=UPDATE e old/new values", async () => {
    const create = await request(app)
      .post("/projetos")
      .set("x-test-role", "admin")
      .send(projetoPayload);
    expect(create.status).toBe(201);

    // Limpa só os logs anteriores para isolar
    await pool.query("DELETE FROM audit_logs");

    const res = await request(app)
      .put(`/projetos/${create.body.id}`)
      .set("x-test-role", "admin")
      .send({ titulo: "Titulo Atualizado" });

    expect(res.status).toBe(200);

    const log = await getLastAuditLog("projeto");
    expect(log).toBeDefined();
    expect(log.action).toBe("UPDATE");
    expect(log.entity_id).toBe(create.body.id);
    expect(log.old_values).toBeTruthy();
    expect(log.new_values).toBeTruthy();
  });

  test("DELETE /projetos/:id cria entrada audit_log com action=DELETE e old_values", async () => {
    const create = await request(app)
      .post("/projetos")
      .set("x-test-role", "admin")
      .send(projetoPayload);
    expect(create.status).toBe(201);

    await pool.query("DELETE FROM audit_logs");

    const res = await request(app)
      .delete(`/projetos/${create.body.id}`)
      .set("x-test-role", "admin");

    expect(res.status).toBe(200);

    const log = await getLastAuditLog("projeto");
    expect(log).toBeDefined();
    expect(log.action).toBe("DELETE");
    expect(log.entity_id).toBe(create.body.id);
    expect(log.old_values).toBeTruthy();
    expect(log.new_values).toBeNull();
  });
});

// ─── Test Suites ─────────────────────────────────────────────────────────────

describe("Audit Log — Test Suites", () => {
  test("POST /test-suites cria entrada audit_log com action=CREATE", async () => {
    const res = await request(app)
      .post("/test-suites")
      .set("x-test-role", "admin")
      .send({ nome: "Suite Audit", descricao: "desc" });

    expect(res.status).toBe(201);

    const log = await getLastAuditLog("test_suite");
    expect(log).toBeDefined();
    expect(log.action).toBe("CREATE");
    expect(log.entity_id).toBe(res.body.id);
  });
});

// ─── Requirements ────────────────────────────────────────────────────────────

describe("Audit Log — Requirements", () => {
  test("POST /requirements cria entrada audit_log com action=CREATE", async () => {
    const res = await request(app)
      .post("/requirements")
      .set("x-test-role", "admin")
      .send({ titulo: "Req Audit", descricao: "desc", status: "Open", prioridade: "High" });

    expect(res.status).toBe(201);

    const log = await getLastAuditLog("requirement");
    expect(log).toBeDefined();
    expect(log.action).toBe("CREATE");
    expect(log.entity_id).toBe(res.body.id);
  });
});

// ─── Admin — GET /admin/audit-log ────────────────────────────────────────────

describe("Admin — GET /admin/audit-log", () => {
  test("admin pode listar audit logs", async () => {
    // Cria uma entrada
    await request(app)
      .post("/projetos")
      .set("x-test-role", "admin")
      .send(projetoPayload);

    const res = await request(app)
      .get("/admin/audit-log")
      .set("x-test-role", "admin");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body).toHaveProperty("total");
    expect(res.body).toHaveProperty("page");
    expect(res.body).toHaveProperty("limit");
  });

  test("reader não pode acessar audit log — 403", async () => {
    const res = await request(app)
      .get("/admin/audit-log")
      .set("x-test-role", "reader");

    expect(res.status).toBe(403);
  });

  test("filtro por entity_type retorna apenas os logs do tipo solicitado", async () => {
    await request(app)
      .post("/projetos")
      .set("x-test-role", "admin")
      .send(projetoPayload);

    await request(app)
      .post("/test-suites")
      .set("x-test-role", "admin")
      .send({ nome: "Suite Filtro", descricao: "desc" });

    const res = await request(app)
      .get("/admin/audit-log?entity_type=projeto")
      .set("x-test-role", "admin");

    expect(res.status).toBe(200);
    expect(res.body.data.every((l) => l.entity_type === "projeto")).toBe(true);
  });

  test("filtro por action=CREATE retorna apenas CREATEs", async () => {
    const create = await request(app)
      .post("/projetos")
      .set("x-test-role", "admin")
      .send(projetoPayload);

    await request(app)
      .put(`/projetos/${create.body.id}`)
      .set("x-test-role", "admin")
      .send({ titulo: "Editado" });

    const res = await request(app)
      .get("/admin/audit-log?action=CREATE")
      .set("x-test-role", "admin");

    expect(res.status).toBe(200);
    expect(res.body.data.every((l) => l.action === "CREATE")).toBe(true);
  });
});
