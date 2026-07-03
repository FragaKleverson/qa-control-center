/**
 * Testes de integração: validação de inputs (Zod)
 *
 * Cobre o comportamento do middleware validate.js em todas as rotas:
 * - Campos obrigatórios ausentes → 422
 * - Tipos inválidos → 422
 * - IDs não numéricos em params → 422
 * - Enums com valor inválido → 422
 * - Formato da resposta de erro → { error, detalhes: [{campo, mensagem}] }
 * - Dados válidos passam normalmente → 200/201
 */

const request = require("supertest");
const app = require("../src/app");
const { clearTables, closePool, createSuite } = require("./helpers/db");

beforeEach(async () => {
  await clearTables();
});

afterAll(async () => {
  await closePool();
});

// =====================================================
// FORMATO DE RESPOSTA DO ERRO
// =====================================================
describe("Formato da resposta de erro 422", () => {

  it("deve retornar { error, detalhes } com campo e mensagem", async () => {
    const res = await request(app)
      .post("/projetos")
      .send({ descricao: "sem titulo" });

    expect(res.statusCode).toBe(422);
    // Estrutura padrão de erro do Zod
    expect(res.body).toHaveProperty("error", "Dados inválidos");
    expect(res.body).toHaveProperty("detalhes");
    expect(Array.isArray(res.body.detalhes)).toBe(true);
    expect(res.body.detalhes.length).toBeGreaterThan(0);

    // Cada detalhe deve ter campo e mensagem
    const detalhe = res.body.detalhes[0];
    expect(detalhe).toHaveProperty("campo");
    expect(detalhe).toHaveProperty("mensagem");
  });

  it("deve listar todos os campos inválidos de uma vez", async () => {
    // Envia body completamente vazio para /projetos — 3 campos obrigatórios
    const res = await request(app).post("/projetos").send({});

    expect(res.statusCode).toBe(422);
    // titulo, descricao e feature são todos obrigatórios
    expect(res.body.detalhes.length).toBeGreaterThanOrEqual(3);
    const campos = res.body.detalhes.map((d) => d.campo);
    expect(campos).toContain("titulo");
    expect(campos).toContain("descricao");
    expect(campos).toContain("feature");
  });

});

// =====================================================
// PARAMS DE ROTA — ID NÃO NUMÉRICO
// =====================================================
describe("Validação de params :id", () => {

  it("GET /projetos/:id com ID não numérico → 422", async () => {
    const res = await request(app).get("/projetos/abc");
    expect(res.statusCode).toBe(422);
    expect(res.body).toHaveProperty("error", "Dados inválidos");
  });

  it("GET /requirements/:id com ID não numérico → 422", async () => {
    const res = await request(app).get("/requirements/nao-numero");
    expect(res.statusCode).toBe(422);
  });

  it("GET /test-suites/:id com ID não numérico → 422", async () => {
    const res = await request(app).get("/test-suites/!!!");
    expect(res.statusCode).toBe(422);
  });

  it("GET /test-plans/:id com ID não numérico → 422", async () => {
    const res = await request(app).get("/test-plans/xyz");
    expect(res.statusCode).toBe(422);
  });

  it("GET /execucoes/:id com ID não numérico → 422", async () => {
    const res = await request(app).get("/execucoes/xxxxxxx");
    expect(res.statusCode).toBe(422);
  });

  it("ID numérico válido ainda retorna 404 quando não existe", async () => {
    const res = await request(app).get("/projetos/999999");
    // Passa pela validação e chega ao service
    expect(res.statusCode).toBe(404);
  });

});

// =====================================================
// POST /projetos
// =====================================================
describe("Validação POST /projetos", () => {

  it("422 sem titulo", async () => {
    const res = await request(app)
      .post("/projetos")
      .send({ descricao: "ok", feature: "ok" });
    expect(res.statusCode).toBe(422);
    const campos = res.body.detalhes.map((d) => d.campo);
    expect(campos).toContain("titulo");
  });

  it("422 com titulo só de espaços", async () => {
    const res = await request(app)
      .post("/projetos")
      .send({ titulo: "   ", descricao: "ok", feature: "ok" });
    expect(res.statusCode).toBe(422);
  });

  it("422 sem descricao", async () => {
    const res = await request(app)
      .post("/projetos")
      .send({ titulo: "ok", feature: "ok" });
    expect(res.statusCode).toBe(422);
  });

  it("422 sem feature", async () => {
    const res = await request(app)
      .post("/projetos")
      .send({ titulo: "ok", descricao: "ok" });
    expect(res.statusCode).toBe(422);
  });

  it("201 com todos os campos obrigatórios", async () => {
    const res = await request(app)
      .post("/projetos")
      .send({ titulo: "ok", descricao: "ok", feature: "ok" });
    expect(res.statusCode).toBe(201);
  });

  it("titulo é trimado antes de chegar ao service", async () => {
    const res = await request(app)
      .post("/projetos")
      .send({ titulo: "  Projeto com espaços  ", descricao: "ok", feature: "ok" });
    expect(res.statusCode).toBe(201);
    // Zod faz trim — valor salvo não tem espaços nas bordas
    expect(res.body.titulo).toBe("Projeto com espaços");
  });

});

// =====================================================
// POST /requirements
// =====================================================
describe("Validação POST /requirements", () => {

  it("422 sem titulo", async () => {
    const res = await request(app)
      .post("/requirements")
      .send({ status: "Open" });
    expect(res.statusCode).toBe(422);
  });

  it("422 com status inválido", async () => {
    const res = await request(app)
      .post("/requirements")
      .send({ titulo: "ok", status: "INVALIDO" });
    expect(res.statusCode).toBe(422);
    const campos = res.body.detalhes.map((d) => d.campo);
    expect(campos).toContain("status");
  });

  it("422 com prioridade inválida", async () => {
    const res = await request(app)
      .post("/requirements")
      .send({ titulo: "ok", prioridade: "ULTRAURGENTE" });
    expect(res.statusCode).toBe(422);
  });

  it("201 com defaults aplicados (sem status e prioridade)", async () => {
    const res = await request(app)
      .post("/requirements")
      .send({ titulo: "Req mínimo" });
    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe("Open");
    expect(res.body.prioridade).toBe("Medium");
  });

});

// =====================================================
// POST /test-suites
// =====================================================
describe("Validação POST /test-suites", () => {

  it("422 sem nome", async () => {
    const res = await request(app)
      .post("/test-suites")
      .send({ descricao: "sem nome" });
    expect(res.statusCode).toBe(422);
    const campos = res.body.detalhes.map((d) => d.campo);
    expect(campos).toContain("nome");
  });

  it("422 ao vincular test case sem projeto_id", async () => {
    const suite = await createSuite();
    const res = await request(app)
      .post(`/test-suites/${suite.id}/cases`)
      .send({});
    expect(res.statusCode).toBe(422);
  });

});

// =====================================================
// POST /test-plans
// =====================================================
describe("Validação POST /test-plans", () => {

  it("422 sem titulo", async () => {
    const res = await request(app)
      .post("/test-plans")
      .send({ descricao: "sem titulo" });
    expect(res.statusCode).toBe(422);
  });

  it("201 com apenas titulo (demais campos têm default)", async () => {
    const res = await request(app)
      .post("/test-plans")
      .send({ titulo: "Plan mínimo" });
    expect(res.statusCode).toBe(201);
    expect(res.body.escopo).toBe("");
    expect(res.body.objetivo).toBe("");
  });

});

// =====================================================
// POST /execucoes
// =====================================================
describe("Validação POST /execucoes", () => {

  it("422 sem suite_id", async () => {
    const res = await request(app)
      .post("/execucoes")
      .send({ ambiente: "staging" });
    expect(res.statusCode).toBe(422);
    const campos = res.body.detalhes.map((d) => d.campo);
    expect(campos).toContain("suite_id");
  });

  it("422 com status de execução inválido", async () => {
    const suite = await createSuite();
    const res = await request(app)
      .post("/execucoes")
      .send({ suite_id: suite.id, status: "STATUS_INVALIDO" });
    expect(res.statusCode).toBe(422);
  });

  it("201 com defaults aplicados", async () => {
    const suite = await createSuite();
    const res = await request(app)
      .post("/execucoes")
      .send({ suite_id: suite.id });
    expect(res.statusCode).toBe(201);
    expect(res.body.ambiente).toBe("staging");
    expect(res.body.status).toBe("pending");
  });

});

// =====================================================
// AUTH — validação de registro e login
// =====================================================
describe("Validação POST /auth/register e /auth/login", () => {

  it("register: 422 sem email (com token válido)", async () => {
    const res = await request(app)
      .post("/auth/register")
      .set("x-register-token", process.env.REGISTER_TOKEN)
      .send({ name: "Sem email", password: "Senha@1234" });
    expect(res.statusCode).toBe(422);
    const campos = res.body.detalhes.map((d) => d.campo);
    expect(campos).toContain("email");
  });

  it("register: 422 com email inválido", async () => {
    const res = await request(app)
      .post("/auth/register")
      .set("x-register-token", process.env.REGISTER_TOKEN)
      .send({ name: "Ok", email: "nao-e-email", password: "Senha@1234" });
    expect(res.statusCode).toBe(422);
  });

  it("register: 403 sem token (body válido não importa)", async () => {
    // Token check vem antes da validação — deve retornar 403, não 422
    const res = await request(app)
      .post("/auth/register")
      .send({ name: "Ok", email: "ok@test.com", password: "Senha@1234" });
    expect(res.statusCode).toBe(403);
  });

  it("login: 422 sem password", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "ok@test.com" });
    expect(res.statusCode).toBe(422);
  });

  it("login: 422 com email inválido", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "nao-email", password: "qualquer" });
    expect(res.statusCode).toBe(422);
  });

});
