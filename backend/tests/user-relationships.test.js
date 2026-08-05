/**
 * Testes de integração: Relacionamentos de Usuários (Fase 3, Item 8)
 *
 * Verifica que created_by é gravado corretamente ao criar entidades via API.
 * Em NODE_ENV=test, app.js injeta req.user = { id: 1, role: 'admin', ... }.
 * Por isso:
 *   1. clearUsers() + createTestUser() garante que users.id=1 exista (FK válida).
 *   2. clearTables() limpa entidades mas preserva o usuário entre testes.
 *   3. Criações via POST devem retornar created_by = 1.
 */

const request = require("supertest");
const app = require("../src/app");
const { clearTables, clearUsers, closePool, createSuite } = require("./helpers/db");
const { createTestUser } = require("./helpers/auth");

// ── Setup: cria user id=1 uma vez; entidades são limpas entre testes ──────────
beforeAll(async () => {
  await clearUsers();
  await createTestUser({ email: "seed@qa.dev", role: "admin" });
});

beforeEach(async () => {
  await clearTables();
});

afterAll(async () => {
  await closePool();
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Relacionamentos de Usuários — created_by", () => {

  // ── Projetos ──────────────────────────────────────────────────────────────
  describe("POST /projetos", () => {
    it("deve salvar created_by com o id do usuário autenticado", async () => {
      const res = await request(app)
        .post("/projetos")
        .send({
          titulo: "Proj User-Rel",
          descricao: "Teste de rastreabilidade",
          feature: "Feature: UserRel",
          cenarios: [],
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("created_by", 1);
    });

    it("deve retornar created_by no GET do projeto criado", async () => {
      const create = await request(app)
        .post("/projetos")
        .send({
          titulo: "Proj Leitura",
          descricao: "Desc",
          feature: "Feature: Leitura",
          cenarios: [],
        });

      const get = await request(app).get(`/projetos/${create.body.id}`);
      expect(get.statusCode).toBe(200);
      expect(get.body).toHaveProperty("created_by", 1);
    });
  });

  // ── Test Suites ───────────────────────────────────────────────────────────
  describe("POST /test-suites", () => {
    it("deve salvar created_by na criação da suite", async () => {
      const res = await request(app)
        .post("/test-suites")
        .send({ nome: "Suite UserRel" });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("created_by", 1);
    });
  });

  // ── Requirements ──────────────────────────────────────────────────────────
  describe("POST /requirements", () => {
    it("deve salvar created_by na criação do requirement", async () => {
      const res = await request(app)
        .post("/requirements")
        .send({
          titulo: "Req UserRel",
          descricao: "Desc",
          status: "Open",
          prioridade: "High",
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("created_by", 1);
    });
  });

  // ── Execuções ─────────────────────────────────────────────────────────────
  describe("POST /execucoes", () => {
    it("deve salvar created_by na criação da execução", async () => {
      const suite = await createSuite();

      const res = await request(app)
        .post("/execucoes")
        .send({ suite_id: suite.id, ambiente: "staging" });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("created_by", 1);
    });
  });

  // ── Criação por role 'reader' deve ser bloqueada (integridade do RBAC) ────
  describe("reader não pode criar entidades", () => {
    const reader = { "x-test-role": "reader" };

    it("POST /projetos com reader → 403", async () => {
      const res = await request(app)
        .post("/projetos")
        .set(reader)
        .send({ titulo: "X", descricao: "X", feature: "Feature: X", cenarios: [] });
      expect(res.statusCode).toBe(403);
    });

    it("POST /test-suites com reader → 403", async () => {
      const res = await request(app)
        .post("/test-suites")
        .set(reader)
        .send({ nome: "Suite X" });
      expect(res.statusCode).toBe(403);
    });
  });
});
