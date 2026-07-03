/**
 * Testes de integração: autenticação JWT
 * Cobre: registro, login, e verificação do middleware de auth.
 *
 * Nota: o middleware de auth é desativado em NODE_ENV=test para os outros
 * testes de integração. Aqui testamos o middleware diretamente montando
 * um mini-app Express separado.
 */

const request = require("supertest");
const express = require("express");
const app = require("../src/app");
const authMiddleware = require("../src/middleware/auth");
const { clearTables, clearUsers, closePool } = require("./helpers/db");
const { createTestUser, TEST_USER } = require("./helpers/auth");

// Mini-app isolado para testar o middleware diretamente
const securedApp = express();
securedApp.use(express.json());
securedApp.use(authMiddleware);
securedApp.get("/secured", (req, res) => res.json({ user: req.user }));

beforeEach(async () => {
  await clearUsers();
});

afterAll(async () => {
  await closePool();
});

// =====================================================
// POST /auth/register
// =====================================================
describe("POST /auth/register", () => {
  it("deve criar usuário com REGISTER_TOKEN válido", async () => {
    const res = await request(app)
      .post("/auth/register")
      .set("x-register-token", process.env.REGISTER_TOKEN)
      .send({ name: "João QA", email: "joao@qa.dev", password: "Senha@123" });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("email", "joao@qa.dev");
    expect(res.body).not.toHaveProperty("password_hash");
  });

  it("deve rejeitar sem x-register-token", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ name: "Hacker", email: "hack@evil.com", password: "Senha@123" });

    expect(res.statusCode).toBe(403);
  });

  it("deve rejeitar com REGISTER_TOKEN errado", async () => {
    const res = await request(app)
      .post("/auth/register")
      .set("x-register-token", "token-invalido")
      .send({ name: "Hacker", email: "hack@evil.com", password: "Senha@123" });

    expect(res.statusCode).toBe(403);
  });

  it("deve rejeitar campos obrigatórios ausentes", async () => {
    const res = await request(app)
      .post("/auth/register")
      .set("x-register-token", process.env.REGISTER_TOKEN)
      .send({ name: "Sem Email" });

    expect(res.statusCode).toBe(422);
  });

  it("deve rejeitar password com menos de 8 caracteres", async () => {
    const res = await request(app)
      .post("/auth/register")
      .set("x-register-token", process.env.REGISTER_TOKEN)
      .send({ name: "Curto", email: "curto@qa.dev", password: "abc" });

    expect(res.statusCode).toBe(422);
  });

  it("deve rejeitar email duplicado", async () => {
    await createTestUser();
    const res = await request(app)
      .post("/auth/register")
      .set("x-register-token", process.env.REGISTER_TOKEN)
      .send({ name: "Duplicado", email: TEST_USER.email, password: "Senha@123" });

    expect([409, 400]).toContain(res.statusCode);
  });
});

// =====================================================
// POST /auth/login
// =====================================================
describe("POST /auth/login", () => {
  beforeEach(async () => {
    await createTestUser();
  });

  it("deve retornar token JWT com credenciais válidas", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body).toHaveProperty("user");
    expect(res.body.user).toHaveProperty("email", TEST_USER.email);
    expect(res.body.user).not.toHaveProperty("password_hash");
  });

  it("deve rejeitar senha incorreta com 401", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: TEST_USER.email, password: "senhaErrada" });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe("Credenciais inválidas");
  });

  it("deve rejeitar email inexistente com 401 (mesma msg — sem enumeração)", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "nao@existe.com", password: "qualquer" });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe("Credenciais inválidas");
  });

  it("deve rejeitar campos ausentes com 422", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: TEST_USER.email });

    expect(res.statusCode).toBe(422);
  });
});

// =====================================================
// Middleware JWT — rota protegida
// =====================================================
describe("Auth middleware - rota protegida", () => {
  it("deve retornar 401 sem Authorization header", async () => {
    const res = await request(securedApp).get("/secured");
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("deve retornar 401 com token inválido", async () => {
    const res = await request(securedApp)
      .get("/secured")
      .set("Authorization", "Bearer token-invalido-qualquer");

    expect(res.statusCode).toBe(401);
  });

  it("deve autorizar com token JWT válido", async () => {
    await createTestUser();
    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    const { token } = loginRes.body;
    expect(token).toBeDefined();

    const res = await request(securedApp)
      .get("/secured")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.user).toHaveProperty("email", TEST_USER.email);
  });
});
