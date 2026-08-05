/**
 * Testes de integração — Fase 3, Item 10: Soft Delete
 *
 * Verifica que DELETE faz soft-delete (deleted_at), que registros
 * deletados não aparecem em listagens/getById, e que RESTORE recupera.
 */

const request = require("supertest");
const app     = require("../src/app");
const { clearTables, clearUsers, closePool } = require("./helpers/db");
const { createTestUser } = require("./helpers/auth");
// Importa pool para queries diretas de verificação
const pool    = require("../src/db");

const projetoPayload = {
  titulo:    "Projeto Soft Delete",
  descricao: "Teste de soft delete",
  feature:   "Feature: SoftDelete",
  cenarios:  [{ nome: "Cenário 1", tipo: "Happy Path", passos: "Given x When y Then z" }],
};

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

// ─── Projetos ────────────────────────────────────────────────────────────────

describe("Soft Delete — Projetos", () => {
  test("DELETE /projetos/:id seta deleted_at (não remove fisicamente)", async () => {
    const create = await request(app).post("/projetos").set("x-test-role", "admin").send(projetoPayload);
    expect(create.status).toBe(201);

    const del = await request(app).delete(`/projetos/${create.body.id}`).set("x-test-role", "admin");
    expect(del.status).toBe(200);

    // Registro ainda existe no banco mas com deleted_at preenchido
    const row = await pool.query("SELECT * FROM projetos WHERE id = $1", [create.body.id]);
    expect(row.rows[0]).toBeDefined();
    expect(row.rows[0].deleted_at).not.toBeNull();
  });

  test("GET /projetos não lista registro soft-deletado", async () => {
    const create = await request(app).post("/projetos").set("x-test-role", "admin").send(projetoPayload);
    await request(app).delete(`/projetos/${create.body.id}`).set("x-test-role", "admin");

    const list = await request(app).get("/projetos").set("x-test-role", "admin");
    expect(list.status).toBe(200);
    expect(list.body.find((p) => p.id === create.body.id)).toBeUndefined();
  });

  test("GET /projetos/:id retorna 404 para registro soft-deletado", async () => {
    const create = await request(app).post("/projetos").set("x-test-role", "admin").send(projetoPayload);
    await request(app).delete(`/projetos/${create.body.id}`).set("x-test-role", "admin");

    const get = await request(app).get(`/projetos/${create.body.id}`).set("x-test-role", "admin");
    expect(get.status).toBe(404);
  });

  test("POST /projetos/:id/restore recupera o registro", async () => {
    const create = await request(app).post("/projetos").set("x-test-role", "admin").send(projetoPayload);
    await request(app).delete(`/projetos/${create.body.id}`).set("x-test-role", "admin");

    const restore = await request(app).post(`/projetos/${create.body.id}/restore`).set("x-test-role", "admin");
    expect(restore.status).toBe(200);
    expect(restore.body.deleted_at).toBeNull();

    const get = await request(app).get(`/projetos/${create.body.id}`).set("x-test-role", "admin");
    expect(get.status).toBe(200);
  });

  test("POST /projetos/:id/restore em registro não deletado retorna 404", async () => {
    const create = await request(app).post("/projetos").set("x-test-role", "admin").send(projetoPayload);
    const res = await request(app).post(`/projetos/${create.body.id}/restore`).set("x-test-role", "admin");
    expect(res.status).toBe(404);
  });

  test("reader não pode restaurar projeto — 403", async () => {
    const create = await request(app).post("/projetos").set("x-test-role", "admin").send(projetoPayload);
    await request(app).delete(`/projetos/${create.body.id}`).set("x-test-role", "admin");

    const res = await request(app).post(`/projetos/${create.body.id}/restore`).set("x-test-role", "reader");
    expect(res.status).toBe(403);
  });
});

// ─── Test Suites ─────────────────────────────────────────────────────────────

describe("Soft Delete — Test Suites", () => {
  test("DELETE /test-suites/:id seta deleted_at e não aparece na listagem", async () => {
    const create = await request(app).post("/test-suites").set("x-test-role", "admin").send({ nome: "Suite SD", descricao: "desc" });
    expect(create.status).toBe(201);

    await request(app).delete(`/test-suites/${create.body.id}`).set("x-test-role", "admin");

    const list = await request(app).get("/test-suites").set("x-test-role", "admin");
    expect(list.body.find((s) => s.id === create.body.id)).toBeUndefined();

    const row = await pool.query("SELECT deleted_at FROM test_suites WHERE id = $1", [create.body.id]);
    expect(row.rows[0].deleted_at).not.toBeNull();
  });

  test("POST /test-suites/:id/restore recupera a suite", async () => {
    const create = await request(app).post("/test-suites").set("x-test-role", "admin").send({ nome: "Suite Restore", descricao: "desc" });
    await request(app).delete(`/test-suites/${create.body.id}`).set("x-test-role", "admin");

    const restore = await request(app).post(`/test-suites/${create.body.id}/restore`).set("x-test-role", "admin");
    expect(restore.status).toBe(200);
    expect(restore.body.deleted_at).toBeNull();
  });
});

// ─── Requirements ────────────────────────────────────────────────────────────

describe("Soft Delete — Requirements", () => {
  test("DELETE /requirements/:id seta deleted_at e não aparece na listagem", async () => {
    const create = await request(app).post("/requirements").set("x-test-role", "admin").send({ titulo: "Req SD", descricao: "d", status: "Open", prioridade: "High" });
    expect(create.status).toBe(201);

    await request(app).delete(`/requirements/${create.body.id}`).set("x-test-role", "admin");

    const list = await request(app).get("/requirements").set("x-test-role", "admin");
    expect(list.body.find((r) => r.id === create.body.id)).toBeUndefined();
  });

  test("POST /requirements/:id/restore recupera o requirement", async () => {
    const create = await request(app).post("/requirements").set("x-test-role", "admin").send({ titulo: "Req Restore", descricao: "d", status: "Open", prioridade: "Low" });
    await request(app).delete(`/requirements/${create.body.id}`).set("x-test-role", "admin");

    const restore = await request(app).post(`/requirements/${create.body.id}/restore`).set("x-test-role", "admin");
    expect(restore.status).toBe(200);
    expect(restore.body.deleted_at).toBeNull();
  });
});

// ─── Audit Log após restore ───────────────────────────────────────────────────

describe("Soft Delete — Audit Log", () => {
  test("RESTORE gera entrada no audit_log com action=RESTORE", async () => {
    const create = await request(app).post("/projetos").set("x-test-role", "admin").send(projetoPayload);
    await request(app).delete(`/projetos/${create.body.id}`).set("x-test-role", "admin");
    await pool.query("DELETE FROM audit_logs");

    await request(app).post(`/projetos/${create.body.id}/restore`).set("x-test-role", "admin");

    const log = await pool.query("SELECT * FROM audit_logs WHERE action = 'RESTORE' ORDER BY created_at DESC LIMIT 1");
    expect(log.rows[0]).toBeDefined();
    expect(log.rows[0].entity_type).toBe("projeto");
    expect(log.rows[0].entity_id).toBe(create.body.id);
  });
});
