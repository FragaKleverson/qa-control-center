/**
 * Testes de integração: RBAC (Fase 2, Item 7)
 *
 * Estratégia de teste:
 *   Em NODE_ENV=test, app.js injeta req.user com role controlável via header
 *   "x-test-role". O default é "admin" (garante que os testes existentes passam).
 *
 *   Aqui usamos x-test-role para testar as restrições de cada perfil:
 *     x-test-role: reader  → somente GET
 *     x-test-role: qa      → GET + POST/PUT + DELETE em execuções/suites/plans/requirements
 *     x-test-role: admin   → acesso total
 *
 *   Os testes de /admin/usuarios usam req.user.id = 1 (injetado pelo mock),
 *   então testamos com IDs diferentes do atual para evitar o bloqueio self-delete.
 */

const request = require("supertest");
const app = require("../src/app");
const { clearTables, clearUsers, closePool, createProjeto } = require("./helpers/db");
const { createTestUser } = require("./helpers/auth");

beforeEach(async () => {
  await clearTables();
  await clearUsers();
});

afterAll(async () => {
  await closePool();
});

// ── Helper: cria um projeto no banco para testes de leitura/escrita ───────────
async function seedProjeto() {
  return createProjeto({ titulo: "Projeto RBAC Test" });
}

// ─────────────────────────────────────────────────────────────────────────────
describe("RBAC — Leitor (reader)", () => {
  const reader = { "x-test-role": "reader" };

  it("GET /projetos → 200 (leitura permitida)", async () => {
    const res = await request(app).get("/projetos").set(reader);
    expect(res.statusCode).toBe(200);
  });

  it("POST /projetos → 403 (escrita negada)", async () => {
    const res = await request(app).post("/projetos").set(reader).send({
      titulo: "Novo Projeto",
      descricao: "Desc",
      feature: "Feature: x",
      cenarios: [],
    });
    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("error");
  });

  it("PUT /projetos/:id → 403", async () => {
    const projeto = await seedProjeto();
    const res = await request(app)
      .put(`/projetos/${projeto.id}`)
      .set(reader)
      .send({ titulo: "Atualizado" });
    expect(res.statusCode).toBe(403);
  });

  it("DELETE /projetos/:id → 403", async () => {
    const projeto = await seedProjeto();
    const res = await request(app).delete(`/projetos/${projeto.id}`).set(reader);
    expect(res.statusCode).toBe(403);
  });

  it("GET /test-suites → 200", async () => {
    const res = await request(app).get("/test-suites").set(reader);
    expect(res.statusCode).toBe(200);
  });

  it("POST /test-suites → 403", async () => {
    const res = await request(app).post("/test-suites").set(reader).send({ nome: "Suite X" });
    expect(res.statusCode).toBe(403);
  });

  it("GET /requirements → 200", async () => {
    const res = await request(app).get("/requirements").set(reader);
    expect(res.statusCode).toBe(200);
  });

  it("POST /requirements → 403", async () => {
    const res = await request(app).post("/requirements").set(reader).send({ titulo: "Req X", descricao: "..." });
    expect(res.statusCode).toBe(403);
  });

  it("GET /execucoes → 200", async () => {
    const res = await request(app).get("/execucoes").set(reader);
    expect(res.statusCode).toBe(200);
  });

  it("POST /execucoes → 403", async () => {
    const res = await request(app).post("/execucoes").set(reader).send({ suite_id: 1, ambiente: "staging" });
    expect(res.statusCode).toBe(403);
  });

  it("GET /admin/usuarios → 403 (admin only)", async () => {
    const res = await request(app).get("/admin/usuarios").set(reader);
    expect(res.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("RBAC — QA", () => {
  const qa = { "x-test-role": "qa" };

  it("GET /projetos → 200", async () => {
    const res = await request(app).get("/projetos").set(qa);
    expect(res.statusCode).toBe(200);
  });

  it("POST /projetos → 201 (QA pode criar projetos)", async () => {
    const res = await request(app).post("/projetos").set(qa).send({
      titulo: "Projeto QA",
      descricao: "Descrição",
      feature: "Feature: QA",
      cenarios: [],
    });
    expect(res.statusCode).toBe(201);
  });

  it("DELETE /projetos/:id → 403 (QA não pode deletar projetos)", async () => {
    const projeto = await seedProjeto();
    const res = await request(app).delete(`/projetos/${projeto.id}`).set(qa);
    expect(res.statusCode).toBe(403);
  });

  it("POST /test-suites → 201 (QA gerencia test suites)", async () => {
    const res = await request(app)
      .post("/test-suites")
      .set(qa)
      .send({ nome: "Suite QA", descricao: "..." });
    expect(res.statusCode).toBe(201);
  });

  it("GET /admin/usuarios → 403 (admin only)", async () => {
    const res = await request(app).get("/admin/usuarios").set(qa);
    expect(res.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("RBAC — Administrador", () => {
  const admin = { "x-test-role": "admin" };

  it("GET /projetos → 200", async () => {
    const res = await request(app).get("/projetos").set(admin);
    expect(res.statusCode).toBe(200);
  });

  it("DELETE /projetos/:id → 200 (admin pode deletar projetos)", async () => {
    const projeto = await seedProjeto();
    const res = await request(app).delete(`/projetos/${projeto.id}`).set(admin);
    expect(res.statusCode).toBe(200);
  });

  it("GET /admin/usuarios → 200 (admin gerencia usuários)", async () => {
    const res = await request(app).get("/admin/usuarios").set(admin);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("PATCH /admin/usuarios/:id/role → 404 para ID inexistente", async () => {
    const res = await request(app)
      .patch("/admin/usuarios/999999/role")
      .set(admin)
      .send({ role: "reader" });
    expect(res.statusCode).toBe(404);
  });

  it("PATCH /admin/usuarios/:id/role → 403 ao tentar alterar o próprio role", async () => {
    // req.user.id = 1 no mock de test mode
    const res = await request(app)
      .patch("/admin/usuarios/1/role")
      .set(admin)
      .send({ role: "reader" });
    expect(res.statusCode).toBe(403);
  });

  it("PATCH /admin/usuarios/:id/role com role inválido → 422", async () => {
    const res = await request(app)
      .patch("/admin/usuarios/2/role")
      .set(admin)
      .send({ role: "superusuario" });
    expect(res.statusCode).toBe(422);
  });

  it("DELETE /admin/usuarios/1 → 403 (não pode deletar a si mesmo)", async () => {
    const res = await request(app).delete("/admin/usuarios/1").set(admin);
    expect(res.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("RBAC — authorize middleware isolado", () => {
  const { authorize } = require("../src/middleware/authorize");

  it("deve chamar next() quando role está na lista", () => {
    const middleware = authorize("admin", "qa");
    const req = { user: { role: "qa" } };
    const res = {};
    const next = jest.fn();
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("deve retornar 403 quando role não está na lista", () => {
    const middleware = authorize("admin");
    const req = { user: { role: "reader" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("deve retornar 401 quando req.user está ausente", () => {
    const middleware = authorize("admin");
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("deve chamar next() quando lista de roles é vazia (qualquer autenticado)", () => {
    const middleware = authorize();
    const req = { user: { role: "reader" } };
    const res = {};
    const next = jest.fn();
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("RBAC — primeiro usuário registrado vira admin", () => {
  it("deve retornar role=admin para o primeiro usuário registrado", async () => {
    const res = await request(app)
      .post("/auth/register")
      .set("x-register-token", process.env.REGISTER_TOKEN)
      .send({ name: "Primeiro", email: "primeiro@qa.dev", password: "Senha@1234" });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("role", "admin");
  });

  it("deve retornar role=qa para usuários subsequentes", async () => {
    // Cria primeiro (admin)
    await request(app)
      .post("/auth/register")
      .set("x-register-token", process.env.REGISTER_TOKEN)
      .send({ name: "Admin", email: "admin@qa.dev", password: "Senha@1234" });

    // Segundo usuário
    const res = await request(app)
      .post("/auth/register")
      .set("x-register-token", process.env.REGISTER_TOKEN)
      .send({ name: "QA User", email: "qa@qa.dev", password: "Senha@1234" });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("role", "qa");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("RBAC — role incluído no JWT", () => {
  it("token deve conter claim role", async () => {
    await createTestUser({ email: "jwt@qa.dev", role: "qa" });

    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email: "jwt@qa.dev", password: "Test@1234" });

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body).toHaveProperty("token");
    expect(loginRes.body.user).toHaveProperty("role", "qa");

    // Decodifica o JWT sem verificar assinatura para checar claims
    const [, payloadB64] = loginRes.body.token.split(".");
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    expect(payload).toHaveProperty("role", "qa");
  });
});
