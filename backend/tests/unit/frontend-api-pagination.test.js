// Executa o módulo real de API sem Vite, browser ou banco.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

let api, fetchMock;
beforeEach(async () => {
  fetchMock = jest.fn();
  const context = vm.createContext({
    URLSearchParams, fetch: fetchMock,
    localStorage: { getItem: () => "token", removeItem: jest.fn() },
    window: { location: { href: "" } },
  });
  const module = new vm.SourceTextModule(fs.readFileSync(
    path.join(__dirname, "../../../frontend/src/services/api.js"), "utf8"), {
    context, initializeImportMeta(meta) { meta.env = {}; },
  });
  await module.link(() => { throw new Error("Import inesperado"); });
  await module.evaluate();
  api = module.namespace;
});

function respond(body) {
  fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => body });
}

it("Projects mantém seletores legados sem paginação", async () => {
  const rows = [{ id: 1 }]; respond(rows);
  expect(await api.projectsAPI.list()).toBe(rows);
  expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:3001/projetos");
});

it.each([20, 50, 100])("Projects encaminha página e limite %i sem alterar o envelope", async (limit) => {
  const body = { data: [{ id: 21 }], total: 101, page: 2, limit }; respond(body);
  expect(await api.projectsAPI.list({ page: 2, limit })).toBe(body);
  expect(fetchMock.mock.calls[0][0]).toBe(`http://localhost:3001/projetos?page=2&limit=${limit}`);
});

it.each([false, true])("Reports preserva contrato aninhado (paginado=%s)", async (paginated) => {
  const body = { executions: paginated ? { data: [], total: 0, page: 1, limit: 20 } : [], stats: [], suiteStats: [] };
  respond(body);
  expect(await api.reportsAPI.list(paginated ? { page: 1, limit: 20 } : undefined)).toBe(body);
  expect(api.parsePaginationResponse(body.executions)).toEqual({ data: [], total: 0 });
});

it("preserva AbortSignal e autenticação no histórico", async () => {
  const signal = new AbortController().signal; respond({ executions: [] });
  await api.reportsAPI.list({ page: 2, limit: 20 }, { signal });
  expect(fetchMock.mock.calls[0][1]).toMatchObject({ signal, headers: { Authorization: "Bearer token" } });
});

it("exclusão usa o ID persistido e propaga erro de permissão", async () => {
  fetchMock.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ error: "Acesso negado" }) });
  await expect(api.projectsAPI.delete(42)).rejects.toMatchObject({ status: 403, message: "Acesso negado" });
  expect(fetchMock.mock.calls[0]).toEqual(["http://localhost:3001/projetos/42", expect.objectContaining({ method: "DELETE" })]);
});

it("geração e exportação não recebem paginação do histórico", async () => {
  const filters = { suite_id: 4, startDate: "2026-01-01" };
  respond({ executions: [] }); await api.reportsAPI.generate(filters);
  respond({}); await api.reportsAPI.exportDocx(filters);
  for (const [url, options] of fetchMock.mock.calls) {
    expect(url).not.toContain("?");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual(filters);
  }
});
