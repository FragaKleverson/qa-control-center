// Executar somente com a configuração isolada, sem jest.setup.js ou banco real.
jest.mock("../../src/db", () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock("../../src/config/env", () => ({
  bcryptRounds: 4,
  jwt: { secret: "unit-login-only-secret-not-for-production", expiresIn: "1h" },
}));
jest.mock("pg", () => { throw new Error("PostgreSQL real proibido nesta suíte"); });
jest.mock("dotenv", () => { throw new Error("Arquivos .env proibidos nesta suíte"); });

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../../src/db");
const config = require("../../src/config/env");
const authService = require("../../src/services/authService");

const EMAIL = "qa.login@example.invalid";
const PASSWORD = "SenhaSintetica@123";
const JWT_SECRET = config.jwt.secret;
const credentials = Object.freeze({ email: EMAIL, password: PASSWORD });
const persistedUser = Object.freeze({ id: 17, name: "QA Sintético", email: EMAIL, role: "qa" });
const invalidCredentials = { status: 401, message: "Credenciais inválidas" };
let passwordHash, compareSpy, signSpy;

beforeAll(async () => {
  passwordHash = await bcrypt.hash(PASSWORD, 4);
});

beforeEach(() => {
  config.jwt.secret = JWT_SECRET;
  pool.query.mockReset();
  pool.connect.mockReset();
  pool.query.mockResolvedValue({ rows: [{ ...persistedUser, password_hash: passwordHash }] });
  // Spies preservam as implementações reais, salvo a injeção explícita de falha.
  compareSpy = jest.spyOn(bcrypt, "compare");
  signSpy = jest.spyOn(jwt, "sign");
});

afterEach(() => {
  try {
    expect(pool.connect).not.toHaveBeenCalled();
    for (const [sql] of pool.query.mock.calls) expect(sql).toMatch(/^\s*SELECT\b/i);
  } finally {
    config.jwt.secret = JWT_SECRET;
    jest.restoreAllMocks();
  }
});

function verify(token) {
  return jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
}

function expectNoSensitiveData(value) {
  const serialized = JSON.stringify(value);
  for (const sensitive of [PASSWORD, passwordHash, JWT_SECRET]) {
    expect(serialized).not.toContain(sensitive);
  }
  for (const field of ["password", "password_hash", "secret"]) {
    expect(value).not.toHaveProperty(field);
  }
}

async function expectInvalidCredentials(input) {
  const error = await authService.login(input).then(
    () => { throw new Error("Login deveria rejeitar credenciais inválidas"); },
    failure => failure,
  );
  expect(error).toBeInstanceOf(Error);
  expect({ status: error.status, message: error.message }).toEqual(invalidCredentials);
  expectNoSensitiveData({ ...error, message: error.message });
  expect(JSON.stringify({ ...error, message: error.message })).not.toContain(input.password);
  expect(signSpy).not.toHaveBeenCalled();
}

describe("authService.login — contrato isolado", () => {
  it("retorna JWT verificável e somente os campos públicos do usuário", async () => {
    const result = await authService.login(credentials);
    expect(result).toEqual({ token: expect.any(String), user: persistedUser });
    const payload = verify(result.token);
    expect(payload).toMatchObject({
      sub: persistedUser.id, name: persistedUser.name, email: EMAIL, role: "qa",
      jti: expect.any(String), iat: expect.any(Number), exp: expect.any(Number),
    });
    expect(payload.jti).not.toBe("");
    expect(payload.exp - payload.iat).toBe(3600);
    expect(() => jwt.verify(result.token, "outro-segredo-sintetico", { algorithms: ["HS256"] }))
      .toThrow(jwt.JsonWebTokenError);
    expect(compareSpy).toHaveBeenCalledWith(PASSWORD, passwordHash);
    expect(signSpy).toHaveBeenCalledTimes(1);
    expectNoSensitiveData(result);
    expectNoSensitiveData(result.user);
    expectNoSensitiveData(payload);
  });

  it("normaliza o e-mail e o envia como parâmetro, separado do SQL", async () => {
    await authService.login({ email: " \tQA.LOGIN@EXAMPLE.INVALID\n ", password: PASSWORD });
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringMatching(/\bWHERE\s+email\s*=\s*\$1\b/), [EMAIL],
    );
    expect(pool.query.mock.calls[0][0]).not.toContain(EMAIL);
  });

  it("rejeita senha incorreta com a resposta genérica de credenciais inválidas", async () => {
    await expectInvalidCredentials({ email: EMAIL, password: "SenhaIncorretaSintetica@456" });
    expect(compareSpy).toHaveBeenCalledTimes(1);
    expect(compareSpy).toHaveBeenCalledWith("SenhaIncorretaSintetica@456", passwordHash);
  });

  it("rejeita usuário inexistente com a mesma resposta e executa bcrypt.compare", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await expectInvalidCredentials(credentials);
    expect(compareSpy).toHaveBeenCalledTimes(1);
    const [password, dummyHash] = compareSpy.mock.calls[0];
    expect(password).toBe(PASSWORD);
    expect(dummyHash).toEqual(expect.any(String));
    expect(dummyHash).not.toBe(passwordHash);
    // Invocação real não comprova equivalência temporal entre os dois caminhos.
  });

  it.each([
    ["ambos omitidos", {}],
    ["senha omitida", { email: EMAIL }],
    ["e-mail omitido", { password: PASSWORD }],
    ["e-mail vazio", { email: "", password: PASSWORD }],
    ["senha vazia", { email: EMAIL, password: "" }],
    ["e-mail nulo", { email: null, password: PASSWORD }],
    ["senha nula", { email: EMAIL, password: null }],
  ])("rejeita %s antes de consultar o banco", async (_label, input) => {
    await expect(authService.login(input)).rejects.toMatchObject({
      status: 400, message: "email e password são obrigatórios",
    });
    expect(pool.query).not.toHaveBeenCalled();
    expect(compareSpy).not.toHaveBeenCalled();
    expect(signSpy).not.toHaveBeenCalled();
  });

  it.each(["admin", "qa", "reader"])("obtém identidade e papel %s do usuário persistido", async role => {
    const user = { ...persistedUser, role };
    pool.query.mockResolvedValueOnce({ rows: [{ ...user, password_hash: passwordHash }] });
    const result = await authService.login({
      ...credentials, id: 999, sub: 999, name: "Identidade enviada pelo cliente",
      role: role === "admin" ? "reader" : "admin", jti: "jti-escolhido-pelo-cliente",
    });
    expect(result.user).toEqual(user);
    const payload = verify(result.token);
    expect(payload).toMatchObject({ sub: user.id, name: user.name, email: user.email, role });
    expect(payload.jti).not.toBe("jti-escolhido-pelo-cliente");
    expectNoSensitiveData(result.user);
    expectNoSensitiveData(payload);
  });

  it("emite JTIs distintos para dois logins independentes do mesmo usuário", async () => {
    const first = await authService.login(credentials);
    const second = await authService.login(credentials);
    const firstPayload = verify(first.token), secondPayload = verify(second.token);
    expect(firstPayload.jti).toEqual(expect.any(String));
    expect(firstPayload.jti).not.toBe("");
    expect(secondPayload.jti).toEqual(expect.any(String));
    expect(secondPayload.jti).not.toBe("");
    expect(firstPayload.jti).not.toBe(secondPayload.jti);
    expect(first.token).not.toBe(second.token);
    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(signSpy).toHaveBeenCalledTimes(2);
  });

  it("propaga falha de consulta sem comparar senha ou emitir JWT", async () => {
    const failure = new Error("Falha sintética de consulta");
    pool.query.mockRejectedValueOnce(failure);
    await expect(authService.login(credentials)).rejects.toBe(failure);
    expect(compareSpy).not.toHaveBeenCalled();
    expect(signSpy).not.toHaveBeenCalled();
  });

  it("propaga falha do bcrypt sem emitir JWT", async () => {
    const failure = new Error("Falha sintética de comparação");
    compareSpy.mockRejectedValueOnce(failure);
    await expect(authService.login(credentials)).rejects.toBe(failure);
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(compareSpy).toHaveBeenCalledTimes(1);
    expect(signSpy).not.toHaveBeenCalled();
  });

  it("rejeita o login quando a assinatura JWT real falha por segredo ausente", async () => {
    config.jwt.secret = "";
    await expect(authService.login(credentials)).rejects.toThrow();
    expect(compareSpy).toHaveBeenCalledWith(PASSWORD, passwordHash);
    expect(signSpy).toHaveBeenCalledTimes(1);
  });
});
