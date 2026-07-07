/**
 * Testes de integração: Rate Limiting (Fase 2, Item 5)
 *
 * Usa instâncias Express isoladas com `createLimiter(overrides)` para verificar:
 *   - Bloqueio (429) ao ultrapassar o limite
 *   - Headers RateLimit-* corretos
 *   - skipSuccessfulRequests no limiter de login (brute-force)
 *   - Isolamento por user ID no per-user limiter
 *
 * Os limiters de produção têm `skip: () => config.isTest`, portanto
 * esta suite cria instâncias dedicadas com `skip: () => false`.
 */

const request = require("supertest");
const express = require("express");
const bodyParser = require("body-parser");
const { createLimiter } = require("../src/middleware/rateLimiters");
const { closePool } = require("./helpers/db");

afterAll(async () => {
  await closePool();
});

// ── Helper: cria app mínimo com um limiter aplicado globalmente ───────────────
function buildApp(limiter) {
  const app = express();
  app.use(bodyParser.json());
  app.use(limiter);
  app.get("/recurso", (req, res) => res.json({ ok: true }));
  app.post("/recurso", (req, res) => res.json({ ok: true }));
  return app;
}

// ── Helper: cria app com limiter aplicado por rota de login ──────────────────
function buildLoginApp(max, windowMs = 60_000) {
  const limiter = createLimiter({ max, windowMs, skipSuccessfulRequests: true });
  const app = express();
  app.use(bodyParser.json());
  app.post("/auth/login", limiter, (req, res) => {
    // body.fail = true → simula credenciais inválidas (401)
    if (req.body?.fail) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }
    return res.json({ token: "fake-jwt", user: { id: 1 } });
  });
  return app;
}

// ── Helper: cria app com per-user limiter ────────────────────────────────────
function buildUserApp(max, windowMs = 60_000) {
  const limiter = createLimiter({
    max,
    windowMs,
    keyGenerator: (req) => (req.user ? `user:${req.user.id}` : req.ip),
  });
  const app = express();
  app.use(bodyParser.json());
  // Simula auth middleware: extrai user ID do header x-user-id
  app.use((req, res, next) => {
    const userId = req.headers["x-user-id"];
    if (userId) req.user = { id: userId };
    next();
  });
  app.use(limiter);
  app.get("/recurso", (req, res) => res.json({ ok: true }));
  return app;
}

// ─────────────────────────────────────────────────────────────────────────────
describe("Rate Limiting — Global IP limiter", () => {
  it("deve retornar 200 dentro do limite", async () => {
    const app = buildApp(createLimiter({ max: 5 }));
    const res = await request(app).get("/recurso");
    expect(res.statusCode).toBe(200);
  });

  it("deve bloquear com 429 ao ultrapassar o limite", async () => {
    const MAX = 3;
    const app = buildApp(createLimiter({ max: MAX }));

    for (let i = 0; i < MAX; i++) {
      const res = await request(app).get("/recurso");
      expect(res.statusCode).toBe(200);
    }

    const blocked = await request(app).get("/recurso");
    expect(blocked.statusCode).toBe(429);
    expect(blocked.body).toHaveProperty("error");
  });

  it("deve incluir headers RateLimit-Limit e RateLimit-Remaining", async () => {
    const app = buildApp(createLimiter({ max: 10 }));
    const res = await request(app).get("/recurso");
    expect(res.statusCode).toBe(200);
    expect(res.headers).toHaveProperty("ratelimit-limit");
    expect(res.headers).toHaveProperty("ratelimit-remaining");
  });

  it("deve decrementar RateLimit-Remaining a cada requisição", async () => {
    const MAX = 5;
    const app = buildApp(createLimiter({ max: MAX }));

    const first = await request(app).get("/recurso");
    const second = await request(app).get("/recurso");

    const remainingFirst = Number(first.headers["ratelimit-remaining"]);
    const remainingSecond = Number(second.headers["ratelimit-remaining"]);
    expect(remainingSecond).toBe(remainingFirst - 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Rate Limiting — Login brute-force (skipSuccessfulRequests)", () => {
  it("deve bloquear após N tentativas de login falhadas", async () => {
    const MAX = 3;
    const app = buildLoginApp(MAX);

    for (let i = 0; i < MAX; i++) {
      const res = await request(app).post("/auth/login").send({ fail: true });
      expect(res.statusCode).toBe(401);
    }

    const blocked = await request(app).post("/auth/login").send({ fail: true });
    expect(blocked.statusCode).toBe(429);
    expect(blocked.body.error).toMatch(/tentativa|login|limite/i);
  });

  it("logins bem-sucedidos não devem esgotar o limite", async () => {
    const MAX = 3;
    const app = buildLoginApp(MAX);

    // MAX + 2 logins bem-sucedidos — nenhum deve ser bloqueado
    for (let i = 0; i < MAX + 2; i++) {
      const res = await request(app).post("/auth/login").send({});
      expect(res.statusCode).toBe(200);
    }
  });

  it("falha + sucesso: janela não reseta por causa do sucesso", async () => {
    const MAX = 3;
    const app = buildLoginApp(MAX);

    // 2 falhas — ainda dentro do limite
    for (let i = 0; i < 2; i++) {
      await request(app).post("/auth/login").send({ fail: true });
    }

    // 1 sucesso — não conta, não reseta
    await request(app).post("/auth/login").send({});

    // 1 falha extra (3ª falha total) — ainda passa
    const third = await request(app).post("/auth/login").send({ fail: true });
    expect(third.statusCode).toBe(401);

    // 4ª falha — bloqueia
    const blocked = await request(app).post("/auth/login").send({ fail: true });
    expect(blocked.statusCode).toBe(429);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Rate Limiting — Per-user limiter", () => {
  it("deve bloquear usuário específico ao exceder limite", async () => {
    const MAX = 3;
    const app = buildUserApp(MAX);

    for (let i = 0; i < MAX; i++) {
      const res = await request(app).get("/recurso").set("x-user-id", "42");
      expect(res.statusCode).toBe(200);
    }

    const blocked = await request(app).get("/recurso").set("x-user-id", "42");
    expect(blocked.statusCode).toBe(429);
  });

  it("limite de usuário A não afeta usuário B com o mesmo IP", async () => {
    const MAX = 3;
    const app = buildUserApp(MAX);

    // Esgota limite do usuário 42
    for (let i = 0; i < MAX; i++) {
      await request(app).get("/recurso").set("x-user-id", "42");
    }
    const userABlocked = await request(app).get("/recurso").set("x-user-id", "42");
    expect(userABlocked.statusCode).toBe(429);

    // Usuário 99 (mesmo IP de supertest) ainda tem cota disponível
    const userBAllowed = await request(app).get("/recurso").set("x-user-id", "99");
    expect(userBAllowed.statusCode).toBe(200);
  });

  it("sem autenticação, fallback para IP como chave", async () => {
    const MAX = 3;
    const app = buildUserApp(MAX);

    for (let i = 0; i < MAX; i++) {
      await request(app).get("/recurso"); // sem x-user-id
    }

    const blocked = await request(app).get("/recurso");
    expect(blocked.statusCode).toBe(429);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Rate Limiting — factory createLimiter()", () => {
  it("deve aplicar os overrides corretamente", async () => {
    const limiter = createLimiter({ max: 2 });
    const app = buildApp(limiter);

    await request(app).get("/recurso"); // 1
    await request(app).get("/recurso"); // 2

    const blocked = await request(app).get("/recurso"); // 3 — deve bloquear
    expect(blocked.statusCode).toBe(429);
  });
});
