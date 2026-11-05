const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
let createRecordViewer, components, api, fetchMock;
beforeAll(async () => {
  const controller = new vm.SourceTextModule(fs.readFileSync(path.join(__dirname, "../../../frontend/src/domain/recordDetails.js"), "utf8"), { context: vm.createContext({ AbortController }) });
  await controller.link(() => { throw new Error("Unexpected import"); }); await controller.evaluate();
  createRecordViewer = controller.namespace.createRecordViewer;
  // Real React SSR verifies data rendering; Modal DOM/focus is homologated separately.
  const react = new vm.SyntheticModule(["createElement"], function () { this.setExport("createElement", React.createElement); });
  const modal = new vm.SyntheticModule(["default"], function () { this.setExport("default", function Modal() { return null; }); });
  const css = new vm.SyntheticModule([], function () {});
  const component = new vm.SourceTextModule(fs.readFileSync(path.join(__dirname, "../../../frontend/src/components/RecordDetails.jsx"), "utf8"));
  await component.link((specifier) => specifier === "./ActionButton" ? require("../../../frontend/tests/actionButtonLoader.cjs").loadActionButton() : specifier === "react" ? react : specifier === "./Modal" ? modal : css);
  await component.evaluate(); components = component.namespace;
});
beforeEach(async () => {
  fetchMock = jest.fn();
  const module = new vm.SourceTextModule(fs.readFileSync(path.join(__dirname, "../../../frontend/src/services/api.js"), "utf8"), {
    context: vm.createContext({ URLSearchParams, fetch: fetchMock, localStorage: { getItem: () => "synthetic-token", removeItem: jest.fn() }, window: { location: {} } }),
    initializeImportMeta(meta) { meta.env = {}; },
  });
  await module.link(() => { throw new Error("Unexpected import"); }); await module.evaluate(); api = module.namespace;
});
const deferred = () => { let resolve, reject; const promise = new Promise((r, j) => { resolve = r; reject = j; }); return { promise, resolve, reject }; };
const body = (record, kind) => renderToStaticMarkup(React.createElement(components.RecordDetailsBody, { record, kind }));

it.each(["requirementsAPI", "projectsAPI"])("accessible view action opens read-only GET details using %s", async (name) => {
  const record = Object.freeze({ id: 42, titulo: "Cadastro" });
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => record });
  const changes = jest.fn(); const viewer = createRecordViewer(api[name].getById, changes);
  const view = components.ViewRecordButton({ record, onView: viewer.open });
  const button = view.type(view.props);
  expect(button.type).toBe("button"); expect(button.props.type).toBe("button");
  expect(button.props["aria-label"]).toBe("Visualizar Cadastro");
  await button.props.onClick();
  expect(changes.mock.calls[0][0].loading).toBe(true);
  expect(changes.mock.calls.at(-1)[0]).toMatchObject({ record, loading: false, error: "" });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe(`http://localhost:3001/${name === "projectsAPI" ? "projetos" : "requirements"}/42`);
  expect(options.method || "GET").toBe("GET"); expect(options.body).toBeUndefined();
  expect(options.headers.Authorization).toBe("Bearer synthetic-token"); expect(options.signal).toBeDefined();
});
it("renders actual requirement fields and author id without invented relationships", () => {
  const html = body({ id: 7, titulo: "Login", descricao: "Linha 1\nLinha 2", status: "Open", prioridade: "High", created_by: 3 }, "requirement");
  for (const text of ["Login", "Linha 1", "Linha 2", "Open", "High", "ID do autor", ">3<"]) expect(html).toContain(text);
  expect(html).not.toContain("Feature"); expect(html).not.toContain("<input"); expect(html).not.toContain("<form");
});
it("renders project feature and every persisted scenario field as escaped text", () => {
  const html = body({ id: 8, titulo: "Projeto", descricao: "Descricao", feature: "Feature: Login", cenarios: [{ nome: "Cenario", passos: "Given login", extra: "preserved" }] }, "project");
  for (const text of ["Projeto", "Feature: Login", "Cenario", "Given login", "preserved"]) expect(html).toContain(text);
  expect(html).not.toContain("Prioridade");
});
it.each(["requirement", "project"])("handles missing optional fields and invalid dates: %s", (kind) => {
  expect(body({ id: 1, titulo: "Minimo", created_at: "invalid-date" }, kind)).toContain("Não informado");
  expect(body({ id: 1, titulo: "Minimo", created_at: "invalid-date" }, kind)).toContain("invalid-date");
});
it("escapes HTML payloads rather than injecting markup", () => {
  const html = body({ id: 1, titulo: "<script>alert(1)</script>" }, "project");
  expect(html).not.toContain("<script>"); expect(html).toContain("&lt;script&gt;");
});
it("wrapper uses record title and close callback, with no editing controls", () => {
  const close = jest.fn(); const modal = components.default({ viewer: { selected: { id: 1, titulo: "Titulo da lista" }, record: { id: 1, titulo: "Titulo atual" }, close }, kind: "project" });
  expect(modal.props.title).toBe("Titulo atual"); expect(modal.props.dialogLabel).toBeTruthy();
  modal.props.onClose(); expect(close).toHaveBeenCalledTimes(1);
  const content = modal.props.children;
  const closeButton = content.props.children.at(-1);
  expect(closeButton.props.children).toBe("Fechar"); closeButton.props.onClick();
  expect(close).toHaveBeenCalledTimes(2);
});
it("close cancels pending lookup and ignores late response", async () => {
  const request = deferred(); const changes = jest.fn(); const get = jest.fn(() => request.promise);
  const viewer = createRecordViewer(get, changes); const pending = viewer.open({ id: 1 });
  viewer.close(); expect(get.mock.calls[0][1].signal.aborted).toBe(true);
  request.resolve({ id: 1 }); await pending;
  expect(changes.mock.calls.at(-1)[0]).toEqual({ selected: null, record: null, loading: false, error: "" });
});
it("new selection wins over stale response", async () => {
  const first = deferred(), second = deferred(); const changes = jest.fn();
  const viewer = createRecordViewer(jest.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise), changes);
  const a = viewer.open({ id: 1 }); const b = viewer.open({ id: 2 });
  second.resolve({ id: 2, titulo: "Segundo" }); await b;
  first.resolve({ id: 1, titulo: "Primeiro" }); await a;
  expect(changes.mock.calls.at(-1)[0].record.id).toBe(2);
});
it.each(["projectsAPI", "requirementsAPI"])("view and close keep paginated response and cause no extra list request: %s", async (name) => {
  const row = Object.freeze({ id: 42, titulo: "Registro" });
  const page = Object.freeze({ page: 3, limit: 50, total: 101, data: Object.freeze([row]) });
  fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => page })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => row });
  const result = await api[name].list({ page: 3, limit: 50, sort_by: "id", sort_dir: "asc" });
  const viewer = createRecordViewer(api[name].getById, jest.fn()); await viewer.open(result.data[0]); viewer.close();
  expect(result).toBe(page);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[0][0]).toContain("?page=3&limit=50&sort_by=id&sort_dir=asc");
  expect(fetchMock.mock.calls[1][0]).toMatch(/\/42$/);
});
it.each([403, 404, 503])("lookup error %i remains read-only and displays useful message", async (status) => {
  fetchMock.mockResolvedValue({ ok: false, status, json: async () => ({ error: "Falha de consulta" }) });
  const changes = jest.fn(); const viewer = createRecordViewer(api.projectsAPI.getById, changes);
  await viewer.open({ id: 1 }); const state = changes.mock.calls.at(-1)[0];
  expect(state.record).toBeNull(); expect(state.loading).toBe(false);
  expect(state.error).toContain(status === 403 ? "permissão" : status === 404 ? "excluído" : "Falha de consulta");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("soft deleted payload is not displayed even if server erroneously returns 200", async () => {
  const changes = jest.fn(); const viewer = createRecordViewer(async () => ({ id: 1, deleted_at: "2026-10-30" }), changes);
  await viewer.open({ id: 1 }); expect(changes.mock.calls.at(-1)[0]).toMatchObject({ record: null, error: "Registro não encontrado ou excluído." });
});
it("rejects mismatched record payload", async () => {
  const changes = jest.fn(); const viewer = createRecordViewer(async () => ({ id: 2 }), changes);
  await viewer.open({ id: 1 }); expect(changes.mock.calls.at(-1)[0].record).toBeNull();
});
it("retry only repeats GET for selected record", async () => {
  const get = jest.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ id: 1 }); const changes = jest.fn();
  const viewer = createRecordViewer(get, changes); await viewer.open({ id: 1 }); await viewer.retry();
  expect(get).toHaveBeenCalledTimes(2); expect(changes.mock.calls.at(-1)[0].record.id).toBe(1);
});
it("unmount cancellation suppresses late state updates", async () => {
  const request = deferred(); const changes = jest.fn(); const viewer = createRecordViewer(() => request.promise, changes);
  const pending = viewer.open({ id: 1 }); viewer.cancel(); request.reject(new Error("cancelled")); await pending;
  expect(changes).toHaveBeenCalledTimes(1);
});
