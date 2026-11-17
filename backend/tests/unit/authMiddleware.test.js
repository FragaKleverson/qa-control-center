// Usar somente a configuração Jest isolada, sem app.js, helpers de banco ou .env.
jest.mock("../../src/db", () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock("../../src/config/env", () => ({
  jwt: { secret: "unit-auth-middleware-only-secret-not-for-production" },
}));

const jwt = require("jsonwebtoken");
const pool = require("../../src/db");
const config = require("../../src/config/env");
const authenticate = require("../../src/middleware/auth");

const SECRET = config.jwt.secret;
const claims = Object.freeze({
  sub: 42, email: "middleware@example.invalid", name: "QA Sintético",
  role: "qa", jti: "jti-sintetico-42",
});

function sign(payload = claims, options = {}) {
  return jwt.sign(payload, SECRET, { algorithm: "HS256", expiresIn: "1h", ...options });
}

function context(authorization) {
  const req = { headers: authorization === undefined ? {} : { authorization } };
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return { req, res, next: jest.fn() };
}

function expectRejected(ctx, message) {
  expect(ctx.res.status).toHaveBeenCalledTimes(1);
  expect(ctx.res.status).toHaveBeenCalledWith(401);
  expect(ctx.res.json).toHaveBeenCalledTimes(1);
  expect(ctx.res.json).toHaveBeenCalledWith({ error: message });
  expect(ctx.req).not.toHaveProperty("user");
  expect(ctx.next).not.toHaveBeenCalled();
}

function expectAuthenticated(ctx, payload) {
  expect(ctx.req.user).toEqual({
    id: payload.sub, email: payload.email, name: payload.name,
    role: payload.role || "reader", jti: payload.jti, tokenExp: payload.exp,
  });
  expect(ctx.next).toHaveBeenCalledTimes(1);
  expect(ctx.next).toHaveBeenCalledWith();
  expect(ctx.res.status).not.toHaveBeenCalled();
  expect(ctx.res.json).not.toHaveBeenCalled();
}

function tamperedToken() {
  const [header, payload, signature] = sign().split(".");
  const altered = { ...JSON.parse(Buffer.from(payload, "base64url").toString("utf8")), role: "admin" };
  return `${header}.${Buffer.from(JSON.stringify(altered)).toString("base64url")}.${signature}`;
}

beforeEach(() => {
  config.jwt.secret = SECRET;
  pool.query.mockReset();
  pool.connect.mockReset();
  pool.query.mockResolvedValue({ rows: [] });
});

afterEach(() => {
  try {
    expect(pool.connect).not.toHaveBeenCalled();
    for (const [sql] of pool.query.mock.calls) expect(sql).toMatch(/^\s*SELECT\b/i);
  } finally {
    config.jwt.secret = SECRET;
  }
});

describe("authenticate — contrato JWT isolado", () => {
  it("rejeita ausência de Authorization sem consultar banco nem autenticar", async () => {
    const ctx = context();
    await authenticate(ctx.req, ctx.res, ctx.next);
    expectRejected(ctx, "Token de autenticação necessário");
    expect(pool.query).not.toHaveBeenCalled();
  });

  it.each([
    ["esquema diferente", "Basic credencial-sintetica"],
    ["prefixo sem espaço e token", "Bearer"],
  ])("rejeita header malformado: %s", async (_label, header) => {
    const ctx = context(header);
    await authenticate(ctx.req, ctx.res, ctx.next);
    expectRejected(ctx, "Token de autenticação necessário");
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("rejeita Bearer vazio como JWT inválido, sem consultar a blocklist", async () => {
    const ctx = context("Bearer ");
    await authenticate(ctx.req, ctx.res, ctx.next);
    expectRejected(ctx, "Token inválido ou expirado");
    expect(pool.query).not.toHaveBeenCalled();
  });

  it.each([
    ["JWT malformado", () => "nao-e-um-jwt"],
    ["assinatura com outro segredo", () => jwt.sign(claims, "outro-segredo-sintetico", { expiresIn: "1h" })],
    ["payload adulterado sem nova assinatura", tamperedToken],
  ])("rejeita %s antes de qualquer consulta", async (_label, token) => {
    const ctx = context(`Bearer ${token()}`);
    await authenticate(ctx.req, ctx.res, ctx.next);
    expectRejected(ctx, "Token inválido ou expirado");
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("rejeita JWT expirado sem consultar a blocklist ou continuar a requisição", async () => {
    const ctx = context(`Bearer ${sign(claims, { expiresIn: -1 })}`);
    await authenticate(ctx.req, ctx.res, ctx.next);
    expectRejected(ctx, "Token inválido ou expirado");
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("respeita notBefore do JWT real sem autenticar antes da validade", async () => {
    const ctx = context(`Bearer ${sign(claims, { notBefore: "10m" })}`);
    await authenticate(ctx.req, ctx.res, ctx.next);
    expectRejected(ctx, "Token inválido ou expirado");
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("consulta JTI parametrizado e projeta somente as claims previstas quando não revogado", async () => {
    const token = sign({ ...claims, extra: "claim-nao-projetada" });
    const ctx = context(`Bearer ${token}`);
    await authenticate(ctx.req, ctx.res, ctx.next);
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringMatching(/SELECT\s+1\s+FROM\s+revoked_tokens\s+WHERE\s+jti\s*=\s*\$1/i), [claims.jti],
    );
    expect(pool.query.mock.calls[0][0]).not.toContain(claims.jti);
    expectAuthenticated(ctx, jwt.verify(token, SECRET));
    expect(ctx.req.user).not.toHaveProperty("extra");
  });

  it("rejeita token revogado sem preencher req.user nem chamar next", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ exists: 1 }] });
    const ctx = context(`Bearer ${sign()}`);
    await authenticate(ctx.req, ctx.res, ctx.next);
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query.mock.calls[0][1]).toEqual([claims.jti]);
    expectRejected(ctx, "Token revogado. Faça login novamente.");
  });

  it.each([
    ["rejeição assíncrona", false],
    ["exceção síncrona", true],
  ])("encaminha %s da blocklist sem autenticar", async (_label, synchronous) => {
    const failure = new Error("Falha sintética da blocklist");
    if (synchronous) pool.query.mockImplementationOnce(() => { throw failure; });
    else pool.query.mockRejectedValueOnce(failure);
    const ctx = context(`Bearer ${sign()}`);
    await authenticate(ctx.req, ctx.res, ctx.next);
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(ctx.next).toHaveBeenCalledTimes(1);
    expect(ctx.next).toHaveBeenCalledWith(failure);
    expect(ctx.req).not.toHaveProperty("user");
    expect(ctx.res.status).not.toHaveBeenCalled();
    expect(ctx.res.json).not.toHaveBeenCalled();
    // O código atual encaminha o erro; não atribui o 503 citado no comentário.
  });

  it("aguarda a blocklist antes de preencher req.user ou continuar", async () => {
    let release;
    pool.query.mockReturnValueOnce(new Promise(resolve => { release = resolve; }));
    const token = sign();
    const ctx = context(`Bearer ${token}`);
    const pending = authenticate(ctx.req, ctx.res, ctx.next);
    try {
      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(ctx.req).not.toHaveProperty("user");
      expect(ctx.next).not.toHaveBeenCalled();
      expect(ctx.res.status).not.toHaveBeenCalled();
      expect(ctx.res.json).not.toHaveBeenCalled();
    } finally {
      release({ rows: [] });
      await pending;
    }
    expectAuthenticated(ctx, jwt.verify(token, SECRET));
  });

  it("preserva a compatibilidade atual com JWT legado sem JTI, sem consultar blocklist", async () => {
    const legacy = { ...claims };
    delete legacy.jti;
    const token = sign(legacy);
    const ctx = context(`Bearer ${token}`);
    await authenticate(ctx.req, ctx.res, ctx.next);
    expectAuthenticated(ctx, jwt.verify(token, SECRET));
    expect(pool.query).not.toHaveBeenCalled();
    // Caracterização de compatibilidade; não comprova revogação desses tokens.
  });

  it("usa reader como fallback para token sem claim role", async () => {
    const legacy = { ...claims };
    delete legacy.role;
    const ctx = context(`Bearer ${sign(legacy)}`);
    await authenticate(ctx.req, ctx.res, ctx.next);
    expect(ctx.req.user.role).toBe("reader");
    expect(ctx.next).toHaveBeenCalledTimes(1);
    expect(ctx.next).toHaveBeenCalledWith();
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(ctx.res.status).not.toHaveBeenCalled();
    expect(ctx.res.json).not.toHaveBeenCalled();
  });

  it("falha fechada quando o segredo configurado está ausente", async () => {
    const token = sign();
    config.jwt.secret = "";
    const ctx = context(`Bearer ${token}`);
    await authenticate(ctx.req, ctx.res, ctx.next);
    expectRejected(ctx, "Token inválido ou expirado");
    expect(pool.query).not.toHaveBeenCalled();
  });
});
