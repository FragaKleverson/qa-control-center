// Módulo ESM real, sem Vite, browser, API externa ou arquivos .env.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const originalSession = {
  qa_token: "token-sintetico-anterior",
  qa_user: JSON.stringify({ id: 17, name: "QA Sintético", role: "qa" }),
  preference: "preservar",
};
let api, fetchMock, storage, values, navigate;

beforeEach(async () => {
  values = new Map(Object.entries(originalSession));
  storage = {
    getItem: jest.fn(key => values.get(key) ?? null),
    setItem: jest.fn((key, value) => values.set(key, String(value))),
    removeItem: jest.fn(key => values.delete(key)),
    clear: jest.fn(() => values.clear()),
  };
  navigate = jest.fn();
  const location = {};
  Object.defineProperty(location, "href", { set: navigate });
  fetchMock = jest.fn().mockRejectedValue(new Error("Fetch sintético não previsto"));
  const context = vm.createContext({
    URLSearchParams, fetch: fetchMock, localStorage: storage, window: { location },
  });
  const module = new vm.SourceTextModule(fs.readFileSync(
    path.join(__dirname, "../src/services/api.js"), "utf8"), {
    context,
    initializeImportMeta(meta) { meta.env = { VITE_API_BASE_URL: "https://api.example.invalid" }; },
  });
  await module.link(() => { throw new Error("Import inesperado"); });
  await module.evaluate();
  api = module.namespace;
});

function response(status, body) {
  const result = { ok: status >= 200 && status < 300, status, json: jest.fn().mockResolvedValue(body) };
  fetchMock.mockResolvedValueOnce(result);
  return result;
}

function expectSessionPreserved(expected = originalSession) {
  expect(Object.fromEntries(values)).toEqual(expected);
  expect(storage.setItem).not.toHaveBeenCalled();
  expect(storage.removeItem).not.toHaveBeenCalled();
  expect(storage.clear).not.toHaveBeenCalled();
  expect(navigate).not.toHaveBeenCalled();
}

describe("API real — autenticação e sessão", () => {
  it("login envia credenciais e retorna dados sem persistir sessão ou enviar Bearer anterior", async () => {
    const data = { token: "token-sintetico-novo", user: { id: 23, role: "reader" } };
    response(200, data);

    expect(await api.authAPI.login("qa@example.invalid", "SenhaSintetica@123")).toBe(data);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("https://api.example.invalid/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "qa@example.invalid", password: "SenhaSintetica@123" }),
    });
    // Persistência pertence ao AuthProvider, já testado em lintRegression.test.cjs.
    expectSessionPreserved();
  });

  it("401 de credenciais inválidas propaga mensagem/status sem encerrar a sessão existente", async () => {
    response(401, { error: "Credenciais inválidas" });

    await expect(api.authAPI.login("qa@example.invalid", "incorreta")).rejects.toMatchObject({
      message: "Credenciais inválidas", status: 401,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expectSessionPreserved();
  });

  it.each(["login", "recurso protegido"])("falha de rede em %s preserva sessão e propaga o erro original", async kind => {
    const failure = new TypeError("Falha sintética de rede");
    fetchMock.mockRejectedValueOnce(failure);
    const request = kind === "login"
      ? api.authAPI.login("qa@example.invalid", "SenhaSintetica@123")
      : api.projectsAPI.getById(42);

    await expect(request).rejects.toBe(failure);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expectSessionPreserved();
  });

  it("401 protegido remove somente token/usuário e redireciona sem consumir payload de sucesso", async () => {
    const res = response(401, { token: "nao-aceitar", user: { id: 99 } });

    await expect(api.projectsAPI.getById(42)).rejects.toThrow("Sessão expirada. Faça login novamente.");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(storage.removeItem.mock.calls).toEqual([["qa_token"], ["qa_user"]]);
    expect(Object.fromEntries(values)).toEqual({ preference: "preservar" });
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.clear).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/login");
    expect(res.json).not.toHaveBeenCalled();
  });

  it("401 protegido também rejeita e redireciona quando não há sessão armazenada", async () => {
    values.delete("qa_token"); values.delete("qa_user");
    response(401, {});

    await expect(api.projectsAPI.getById(42)).rejects.toThrow("Sessão expirada");

    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty("Authorization");
    expect(storage.removeItem.mock.calls).toEqual([["qa_token"], ["qa_user"]]);
    expect(Object.fromEntries(values)).toEqual({ preference: "preservar" });
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.clear).not.toHaveBeenCalled();
    expect(navigate.mock.calls).toEqual([["/login"]]);
  });

  it.each([403, 422, 503])("HTTP %i protegido rejeita sem limpar sessão, redirecionar ou aceitar dados do erro", async status => {
    response(status, { error: "Falha sintética", token: "nao-persistir", user: { id: 99 } });

    await expect(api.projectsAPI.getById(42)).rejects.toMatchObject({ status, message: "Falha sintética" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expectSessionPreserved();
  });

  it("requisição bem-sucedida sem token não fabrica Authorization ou sessão", async () => {
    values.delete("qa_token"); values.delete("qa_user");
    const data = { id: 42 }; response(200, data);

    expect(await api.projectsAPI.getById(42)).toBe(data);

    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty("Authorization");
    expectSessionPreserved({ preference: "preservar" });
  });

  it("consulta o token atual a cada chamada sem sobrescrever armazenamento ou navegar", async () => {
    response(200, { id: 42 });
    await api.projectsAPI.getById(42);
    values.set("qa_token", "token-sintetico-atualizado");
    response(200, { id: 43 });
    await api.projectsAPI.getById(43);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map(([, options]) => options.headers.Authorization)).toEqual([
      "Bearer token-sintetico-anterior", "Bearer token-sintetico-atualizado",
    ]);
    expectSessionPreserved({ ...originalSession, qa_token: "token-sintetico-atualizado" });
  });

  it("erro HTTP com corpo não JSON mantém sessão e usa mensagem HTTP de fallback", async () => {
    const res = response(502, null);
    res.json.mockRejectedValueOnce(new SyntaxError("JSON sintético inválido"));

    await expect(api.projectsAPI.getById(42)).rejects.toMatchObject({ status: 502, message: "Erro HTTP 502" });

    expect(res.json).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expectSessionPreserved();
  });
});
