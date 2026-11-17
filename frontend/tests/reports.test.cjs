// Página real; hooks e dependências externas simulados, sem API ou DOM reais.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const React = require("../../backend/node_modules/react");
const babel = require("../../backend/node_modules/@babel/core");

let render, api, list, logError, urls, documentMock, anchor, events;
const filters = { startDate: "2026-11-01", endDate: "2026-11-13", suite_id: 7 };
const emptyReport = { summary: { total: 0, testCases: { total: 0 } }, executions: [] };
const fixedTime = "2026-11-13T12:00:00.000Z";
class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : [fixedTime])); }
  static now() { return new Date(fixedTime).getTime(); }
}

beforeEach(async () => {
  const state = [], effects = [];
  let queued = [];
  let cursor = 0;
  const hooks = {
    useState(initial) {
      const id = cursor++;
      if (!(id in state)) state[id] = typeof initial === "function" ? initial() : initial;
      return [state[id], value => { state[id] = typeof value === "function" ? value(state[id]) : value; }];
    },
    useRef(value) { const id = cursor++; return state[id] ||= { current: value }; },
    useCallback(fn) { cursor++; return fn; },
    useEffect(fn) { const id = cursor++; if (!(id in effects)) queued.push(() => { effects[id] = fn(); }); },
  };
  const unexpected = () => jest.fn().mockRejectedValue(new Error("Operação sintética não prevista"));
  api = { list: jest.fn(), generate: unexpected(), exportDocx: unexpected() };
  list = { data: [], page: 1, pageSize: 20, total: 0, isLoading: false, error: "", setPage: jest.fn(), setPageSize: jest.fn(), reload: jest.fn() };
  events = [];
  urls = {
    createObjectURL: jest.fn(() => { events.push("createURL"); return "blob:synthetic-report"; }),
    revokeObjectURL: jest.fn(() => events.push("revokeURL")),
  };
  anchor = { click: jest.fn(() => events.push("click")), remove: jest.fn(() => events.push("remove")) };
  documentMock = { createElement: jest.fn(() => anchor), body: { appendChild: jest.fn(() => events.push("append")) } };
  logError = jest.fn();
  const source = fs.readFileSync(path.join(__dirname, "../src/pages/Reports.jsx"), "utf8");
  const code = babel.transformSync(source, {
    configFile: false, babelrc: false, parserOpts: { plugins: ["jsx"] },
    plugins: [({ types: t }) => ({ visitor: {
      JSXElement: { exit(p) {
        const n = p.node, name = n.openingElement.name.name;
        const props = n.openingElement.attributes.map(a => t.objectProperty(t.stringLiteral(a.name.name),
          a.value === null ? t.booleanLiteral(true) : a.value.type === "JSXExpressionContainer" ? a.value.expression : a.value));
        const children = n.children.flatMap(c => c.type === "JSXText"
          ? (c.value.trim() ? [t.stringLiteral(c.value.replace(/\s+/g, " ").trim())] : [])
          : c.type === "JSXExpressionContainer" ? (c.expression.type === "JSXEmptyExpression" ? [] : [c.expression]) : [c]);
        p.replaceWith(t.callExpression(t.identifier("__jsx"), [
          /^[a-z]/.test(name) ? t.stringLiteral(name) : t.identifier(name), t.objectExpression(props), ...children,
        ]));
      } },
    } })],
  }).code;
  const imports = {
    react: hooks,
    "../contexts/AuthContext": { useAuth: () => ({ user: { role: "admin" } }) },
    "../services/api": { reportsAPI: api, executionsAPI: { getStats: jest.fn().mockResolvedValue({ total: 0, passed: 0, failed: 0, pending: 0 }) },
      testSuitesAPI: { list: jest.fn().mockResolvedValue([{ id: 7, nome: "Suite sintética" }]) }, parsePaginationResponse: value => ({ data: value }) },
    "../hooks/usePaginatedList": { default: () => list },
    "../hooks/useRecordDetails": { default: () => ({ open: jest.fn() }) },
    "../components/ActionButton": { default: "ActionButton" },
    "../components/RecordDetails": { default: "Details", ViewRecordButton: "View" },
    "../components/Modal": { default: "Modal" },
    "../components/ConfirmDialog": { default: "ConfirmDialog" },
    "../components/Pagination": { default: "Pagination" },
    "./Pages.css": {},
  };
  const context = vm.createContext({ __jsx: React.createElement, console: { error: logError }, AbortController, URL: urls, document: documentMock, Date: FixedDate, setTimeout: () => 1, clearTimeout() {} });
  const module = new vm.SourceTextModule(code, { context });
  await module.link(name => {
    if (!Object.hasOwn(imports, name)) throw new Error(`Import inesperado: ${name}`);
    const exports = imports[name];
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate();
  render = () => { cursor = 0; queued = []; const tree = module.namespace.default(); queued.forEach(run => run()); return tree; };
  render();
  await new Promise(resolve => setImmediate(resolve));
});

const nodes = e => !e || typeof e !== "object" ? [] : [e, ...React.Children.toArray(e.props?.children).flatMap(nodes)];
const text = e => React.Children.toArray(e?.props?.children).map(c => typeof c === "object" ? text(c) : c).join("");
const button = (label) => nodes(render()).find(n => n.type === "button" && text(n) === label);
const toast = () => nodes(render()).find(n => n.props?.className?.startsWith("toast "));
const form = () => nodes(render()).find(n => n.type === "form");
const generate = () => form().props.onSubmit({ preventDefault() {} });
const download = () => button("⬇ .docx").props.onClick({ preventDefault() {} });
const generatedCard = () => nodes(render()).find(n => n.props?.className === "card" && React.Children.toArray(n.props.children).some(child => text(child).includes("Resultado do Relatório")));
function fillFilters() {
  nodes(render()).filter(n => n.type === "input" && n.props.type === "date")[0].props.onChange({ target: { value: filters.startDate } });
  nodes(render()).filter(n => n.type === "input" && n.props.type === "date")[1].props.onChange({ target: { value: filters.endDate } });
  nodes(render()).find(n => n.type === "select").props.onChange({ target: { value: String(filters.suite_id) } });
}
function exportResponse() {
  const blob = new Blob(["DOCX sintético"], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  const response = { ok: true, blob: jest.fn().mockResolvedValue(blob) };
  api.exportDocx.mockResolvedValueOnce(response);
  return { blob, response };
}
function deferred() { let resolve; const promise = new Promise(ok => { resolve = ok; }); return { promise, resolve }; }

describe("Reports — geração e download isolados", () => {
  it("envia filtros completos, converte suite_id e apresenta os agregados e casos retornados", async () => {
    fillFilters();
    api.generate.mockResolvedValueOnce({ summary: { total: 2, testCases: { total: 10, passed: 4, failed: 3, blocked: 1, skipped: 1, pending: 1 } },
      executions: [{ id: 41, suite_id: 7, ambiente: "staging", status: "failed", created_at: fixedTime,
        testCases: [{ id: 91, projeto_id: 51, titulo: "Caso sintético do relatório", status: "failed", comentario: "Observação sintética" }] }] });
    await generate();
    expect(api.generate.mock.calls).toEqual([[filters]]);
    const card = generatedCard(); expect(card).toBeDefined();
    const cards = nodes(card).filter(n => React.Children.toArray(n.props?.children).length === 2)
      .map(n => React.Children.toArray(n.props.children).map(text));
    for (const pair of [["2", "Execuções"], ["4", "TC Passou"], ["3", "TC Falhou"], ["1", "TC Blocked"], ["1", "TC Skipped"], ["1", "TC Pending"], ["40.0%", "Taxa TC"]]) {
      expect(cards).toContainEqual(pair);
    }
    expect(text(card)).toContain("Suite sintética"); expect(text(card)).toContain("Caso sintético do relatório");
    expect(text(card)).toContain("Observação sintética"); expect(text(card)).toContain("#51");
    expect(button("Gerar").props.disabled).toBe(false); expect(api.exportDocx).not.toHaveBeenCalled();
  });

  it("sem filtros envia objeto vazio e apresenta resultado vazio com taxa zero", async () => {
    api.generate.mockResolvedValueOnce(emptyReport); await generate();
    expect(api.generate.mock.calls).toEqual([[{}]]);
    expect(text(generatedCard())).toContain("Nenhuma execução encontrada com esses filtros.");
    expect(text(generatedCard())).not.toMatch(/NaN|Infinity/);
    const cards = nodes(generatedCard()).map(n => React.Children.toArray(n.props?.children).map(text));
    expect(cards).toContainEqual(["0%", "Taxa TC"]);
  });

  it("loading de geração desabilita o botão sem apresentar resultado antes da resposta", async () => {
    const pending = deferred(); api.generate.mockReturnValueOnce(pending.promise);
    const operation = generate();
    try { expect(button("Gerando…").props.disabled).toBe(true); expect(generatedCard()).toBeUndefined(); }
    finally { pending.resolve(emptyReport); await operation; }
    expect(button("Gerar").props.disabled).toBe(false); expect(generatedCard()).toBeDefined();
  });

  it("nova geração que falha remove resultado anterior, mantém filtros e não anuncia sucesso", async () => {
    fillFilters(); api.generate.mockResolvedValueOnce(emptyReport); await generate();
    expect(generatedCard()).toBeDefined();
    api.generate.mockRejectedValueOnce(new Error("Falha sintética de geração")); await generate();
    expect(api.generate.mock.calls).toEqual([[filters], [filters]]);
    expect(generatedCard()).toBeUndefined(); expect(text(toast())).toBe("Erro ao gerar relatório");
    expect(toast().props.className).toBe("toast error"); expect(button("Gerar").props.disabled).toBe(false);
    expect(nodes(render()).filter(n => n.type === "input").map(n => n.props.value)).toEqual([filters.startDate, filters.endDate]);
    expect(urls.createObjectURL).not.toHaveBeenCalled();
  });

  it("exporta Blob com filtros, nome datado, clique e liberação da URL na ordem correta", async () => {
    fillFilters(); const { blob, response } = exportResponse(); await download();
    expect(api.exportDocx.mock.calls).toEqual([[filters]]); expect(response.blob).toHaveBeenCalledTimes(1);
    expect(urls.createObjectURL.mock.calls).toEqual([[blob]]);
    expect(documentMock.createElement.mock.calls).toEqual([["a"]]);
    expect(documentMock.body.appendChild).toHaveBeenCalledWith(anchor);
    expect(anchor.href).toBe("blob:synthetic-report"); expect(anchor.download).toBe("qa-report-2026-11-13.docx");
    expect(anchor.click).toHaveBeenCalledTimes(1); expect(anchor.remove).toHaveBeenCalledTimes(1);
    expect(urls.revokeObjectURL.mock.calls).toEqual([["blob:synthetic-report"]]);
    expect(events).toEqual(["createURL", "append", "click", "remove", "revokeURL"]);
    expect(text(toast())).toBe("Relatório exportado com sucesso!"); expect(toast().props.className).toBe("toast success");
    expect(button("⬇ .docx").props.disabled).toBe(false); expect(api.generate).not.toHaveBeenCalled();
  });

  it.each(["API rejeita", "resposta não ok", "leitura do Blob rejeita"])("falha antes de criar URL: %s não inicia download nem anuncia sucesso", async stage => {
    if (stage === "API rejeita") api.exportDocx.mockRejectedValueOnce(new Error("Falha sintética"));
    else api.exportDocx.mockResolvedValueOnce({ ok: stage !== "resposta não ok", blob: jest.fn().mockRejectedValue(new Error("Falha sintética no Blob")) });
    await download();
    expect(api.exportDocx.mock.calls).toEqual([[{}]]); expect(urls.createObjectURL).not.toHaveBeenCalled();
    expect(anchor.click).not.toHaveBeenCalled(); expect(urls.revokeObjectURL).not.toHaveBeenCalled();
    expect(text(toast())).toBe("Erro ao exportar .docx"); expect(toast().props.className).toBe("toast error");
    expect(button("⬇ .docx").props.disabled).toBe(false);
  });

  it("exceção no clique após criar URL deixa URL e link sem limpeza no comportamento atual", async () => {
    exportResponse(); anchor.click.mockImplementationOnce(() => { throw new Error("Falha sintética no clique"); });
    await download();
    expect(urls.createObjectURL).toHaveBeenCalledTimes(1); expect(documentMock.body.appendChild).toHaveBeenCalledWith(anchor);
    expect(anchor.click).toHaveBeenCalledTimes(1);
    expect(anchor.remove).not.toHaveBeenCalled(); expect(urls.revokeObjectURL).not.toHaveBeenCalled();
    expect(text(toast())).toBe("Erro ao exportar .docx"); expect(toast().props.className).toBe("toast error");
    expect(button("⬇ .docx").props.disabled).toBe(false);
    // Caracterização do vazamento atual; não afirma limpeza nem corrige produção.
  });

  it("loading de exportação desabilita o botão e adia os efeitos até receber a resposta", async () => {
    const pending = deferred(); api.exportDocx.mockReturnValueOnce(pending.promise);
    const operation = download();
    try { expect(button("Exportando…").props.disabled).toBe(true); expect(urls.createObjectURL).not.toHaveBeenCalled(); }
    finally { pending.resolve({ ok: true, blob: async () => new Blob(["Sintético"]) }); await operation; }
    expect(button("⬇ .docx").props.disabled).toBe(false); expect(urls.revokeObjectURL).toHaveBeenCalledTimes(1);
  });
});
