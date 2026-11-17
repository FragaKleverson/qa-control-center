// Página real; hooks e dependências externas simulados, sem API ou DOM reais.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const React = require("../../backend/node_modules/react");
const babel = require("../../backend/node_modules/@babel/core");

let render, api, list, logError;
const execution = { id: 41, suite_id: 7, nome_suite: "Suite sintética", ambiente: "staging", status: "running", finalized: false, created_at: "2026-11-01T12:00:00Z", total_cases: 0 };
const result = { id: 91, projeto_id: 51, titulo: "Caso sintético", status: "pending", comentario: "Observação inicial" };

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
  api = { list: jest.fn(), create: unexpected(), delete: unexpected(), getResults: jest.fn().mockResolvedValue([result]), updateResult: unexpected(), finalize: unexpected() };
  list = { data: [{ ...execution }], page: 2, pageSize: 20, total: 1, isLoading: false, error: "", mounted: { current: true },
    query: {}, setQuery: jest.fn(), setPage: jest.fn(), setPageSize: jest.fn(), reload: jest.fn() };
  logError = jest.fn();
  const source = fs.readFileSync(path.join(__dirname, "../src/pages/Executions.jsx"), "utf8");
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
    "../services/api": { executionsAPI: api, testSuitesAPI: { list: jest.fn().mockResolvedValue([{ id: 7, nome: "Suite sintética" }]) },
      projectsAPI: { list: jest.fn().mockResolvedValue([]) }, parsePaginationResponse: value => ({ data: value }) },
    "../domain/environments": { ENVIRONMENTS: ["staging", "production", "development", "homologação"] },
    "../components/GherkinDisplay": { default: "GherkinDisplay" },
    "../hooks/usePaginatedList": { default: () => list },
    "../hooks/useRecordDetails": { default: () => ({ open: jest.fn() }) },
    "../components/ActionButton": { default: "ActionButton" },
    "../components/RecordDetails": { default: "Details", ViewRecordButton: "View" },
    "../components/Modal": { default: "Modal" },
    "../components/ConfirmDialog": { default: "ConfirmDialog" },
    "../components/Pagination": { default: "Pagination" },
    "./Pages.css": {},
  };
  const context = vm.createContext({ __jsx: React.createElement, console: { error: logError }, AbortController, setTimeout: () => 1, clearTimeout() {} });
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

const nodes = e => !e || typeof e !== "object" || (e.type === "Modal" && !e.props.isOpen)
  ? [] : [e, ...React.Children.toArray(e.props?.children).flatMap(nodes)];
const text = e => React.Children.toArray(e?.props?.children).map(c => typeof c === "object" ? text(c) : c).join("");
const find = (tree, type) => nodes(tree).find(n => n.type === type);
const button = (tree, label) => nodes(tree).find(n => n.type === "button" && text(n) === label);
const toast = () => nodes(render()).find(n => n.props?.className?.startsWith("toast "));
const statusControl = () => nodes(render()).find(n => n.type === "select" && !n.props["aria-label"]);
const commentControl = () => nodes(render()).find(n => n.type === "input" && n.props.onBlur);
const expand = () => nodes(render()).find(n => n.type === "ActionButton" && n.props.action === "view").props.onClick();
function openForm(suite = "7") {
  button(render(), "Run Suite").props.onClick();
  find(find(render(), "form"), "select").props.onChange({ target: { value: suite } });
}
const submit = () => find(render(), "form").props.onSubmit({ preventDefault() {} });

describe("Executions — fluxos funcionais isolados", () => {
  it("cria com payload do formulário, anuncia sucesso, fecha e solicita recarga", async () => {
    api.create.mockResolvedValueOnce({ id: 42 }); openForm();
    nodes(find(render(), "form")).filter(n => n.type === "select")[1].props.onChange({ target: { value: "production" } });
    await submit();
    expect(api.create.mock.calls).toEqual([[{ suite_id: "7", ambiente: "production", status: "pending" }]]);
    expect(text(toast())).toBe("Execução iniciada com sucesso!"); expect(toast().props.className).toBe("toast success");
    expect(find(render(), "form")).toBeUndefined(); expect(list.reload).toHaveBeenCalledTimes(1);
    button(render(), "Run Suite").props.onClick();
    expect(nodes(find(render(), "form")).filter(n => n.type === "select").map(n => n.props.value)).toEqual(["", "staging"]);
  });

  it("sem suíte selecionada não cria, avisa e permite nova tentativa", async () => {
    openForm(""); await submit();
    expect(api.create).not.toHaveBeenCalled(); expect(list.reload).not.toHaveBeenCalled();
    expect(text(toast())).toBe("Selecione uma test suite"); expect(toast().props.className).toBe("toast warning");
    expect(button(render(), "Run").props.disabled).toBe(false);
  });

  it("falha de criação mantém o formulário sem sucesso ou recarga", async () => {
    api.create.mockRejectedValueOnce(new Error("Falha sintética")); openForm(); await submit();
    expect(api.create).toHaveBeenCalledTimes(1); expect(find(render(), "form")).toBeDefined();
    expect(find(find(render(), "form"), "select").props.value).toBe("7");
    expect(text(toast())).toBe("Erro ao executar test suite"); expect(toast().props.className).toBe("toast error");
    expect(list.reload).not.toHaveBeenCalled(); expect(button(render(), "Run").props.disabled).toBe(false);
  });

  it("altera status pelos IDs e atualiza o resultado local após sucesso", async () => {
    await expand(); api.updateResult.mockResolvedValueOnce({ status: "passed" });
    await statusControl().props.onChange({ target: { value: "passed" } });
    expect(api.getResults.mock.calls).toEqual([[41]]);
    expect(api.updateResult.mock.calls).toEqual([[41, 51, { status: "passed" }]]);
    expect(statusControl().props.value).toBe("passed");
    expect(text(toast())).toBe("Status atualizado!"); expect(list.reload).not.toHaveBeenCalled();
  });

  it("salva comentário no blur preservando o status e atualiza o dado somente leitura", async () => {
    await expand(); api.updateResult.mockResolvedValueOnce({});
    commentControl().props.onChange({ target: { value: "Observação sintética atualizada" } });
    await commentControl().props.onBlur({ target: { value: "Observação sintética atualizada" } });
    expect(api.updateResult.mock.calls).toEqual([[41, 51, { status: "pending", comentario: "Observação sintética atualizada" }]]);
    expect(commentControl().props.value).toBe("Observação sintética atualizada");
    // A visualização somente leitura usa resultsMap, não o rascunho obsMap.
    list.data = [{ ...execution, finalized: true }];
    expect(text(render())).toContain("Observação sintética atualizada");
    expect(commentControl()).toBeUndefined();
  });

  it("finaliza, solicita recarga e reflete o estado finalizado recebido pelo hook", async () => {
    await expand(); api.finalize.mockResolvedValueOnce({ id: 41, finalized: true, status: "passed" });
    await button(render(), "✔ Finalizar").props.onClick();
    expect(api.finalize.mock.calls).toEqual([[41]]); expect(list.reload).toHaveBeenCalledTimes(1);
    expect(toast().props.className).toBe("toast success"); expect(text(toast())).toContain("Execução finalizada e salva!");
    // Sem atualização otimista: o estado da lista chega pelo hook simulado.
    list.data = [{ ...execution, finalized: true, status: "passed" }];
    expect(text(render())).toContain("🔒 Finalizada"); expect(button(render(), "✔ Finalizar")).toBeUndefined();
    expect(statusControl()).toBeUndefined(); expect(commentControl()).toBeUndefined();
  });

  it.each(["rejeição", "resposta com error"])("falha de finalização por %s não anuncia sucesso nem recarrega", async kind => {
    if (kind === "rejeição") api.finalize.mockRejectedValueOnce(new Error("Finalização sintética recusada"));
    else api.finalize.mockResolvedValueOnce({ error: "Finalização sintética recusada" });
    await button(render(), "✔ Finalizar").props.onClick();
    expect(api.finalize.mock.calls).toEqual([[41]]); expect(list.reload).not.toHaveBeenCalled();
    expect(text(toast())).toBe("Finalização sintética recusada"); expect(toast().props.className).toBe("toast error");
    expect(button(render(), "✔ Finalizar")).toBeDefined(); expect(list.data[0].finalized).toBe(false);
  });

  it("execução já finalizada mostra dados somente leitura para administrador", async () => {
    list.data = [{ ...execution, finalized: true }]; await expand();
    expect(button(render(), "✔ Finalizar")).toBeUndefined(); expect(statusControl()).toBeUndefined();
    expect(commentControl()).toBeUndefined(); expect(text(render())).toContain("Observação inicial");
    expect(api.updateResult).not.toHaveBeenCalled(); expect(api.finalize).not.toHaveBeenCalled();
  });

  it.each(["status", "comentário"])("callback antigo de %s ainda consulta API após finalização; rejeição vira erro", async kind => {
    await expand();
    const callback = kind === "status" ? statusControl().props.onChange : commentControl().props.onBlur;
    list.data = [{ ...execution, finalized: true }]; render();
    expect(statusControl()).toBeUndefined(); expect(commentControl()).toBeUndefined();
    api.updateResult.mockRejectedValueOnce(Object.assign(new Error("Execução finalizada — edição recusada"), { status: 422 }));
    await callback({ target: { value: kind === "status" ? "failed" : "Alteração tardia" } });
    expect(api.updateResult.mock.calls).toEqual([[41, 51, kind === "status" ? { status: "failed" } : { status: "pending", comentario: "Alteração tardia" }]]);
    expect(toast().props.className).toBe("toast error"); expect(text(toast())).toContain("edição recusada");
    expect(list.reload).not.toHaveBeenCalled();
    // Caracterização da ausência de guarda local; não valida o bloqueio backend real.
  });
});
