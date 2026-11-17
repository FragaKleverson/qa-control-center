// Página real; hooks e dependências externas simulados, sem API ou DOM reais.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const React = require("../../backend/node_modules/react");
const babel = require("../../backend/node_modules/@babel/core");

let render, api, list, logError, catalog;
const caseA = { id: 51, titulo: "Caso sintético A", cenarios: [] };
const caseB = { id: 52, titulo: "Caso sintético B", cenarios: [] };

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
  api = { list: jest.fn(), create: unexpected(), delete: unexpected(), getCases: jest.fn().mockResolvedValue([]), addCase: unexpected(), removeCase: unexpected() };
  catalog = jest.fn().mockResolvedValue([caseA, caseB]);
  list = { data: [{ id: 41, nome: "Suite sintética A" }, { id: 42, nome: "Suite sintética B" }], page: 2, pageSize: 20, total: 2,
    isLoading: false, error: "", mounted: { current: true }, setPage: jest.fn(), setPageSize: jest.fn(), reload: jest.fn() };
  logError = jest.fn();
  const source = fs.readFileSync(path.join(__dirname, "../src/pages/TestSuites.jsx"), "utf8");
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
    "../services/api": { testSuitesAPI: api, projectsAPI: { list: catalog }, parsePaginationResponse: value => ({ data: value }) },
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
const casesModal = () => nodes(render()).find(n => n.type === "Modal" && n.props.title.startsWith("Test Cases -"));
function fill(nome, descricao = "Descrição sintética") {
  button(render(), "+ New Suite").props.onClick();
  find(render(), "input").props.onChange({ target: { value: nome } });
  find(render(), "textarea").props.onChange({ target: { value: descricao } });
}
const submit = () => find(render(), "form").props.onSubmit({ preventDefault() {} });
const openCases = () => nodes(render()).find(n => n.type === "ActionButton" && n.props.action === "view").props.onClick();
const unlink = () => nodes(casesModal()).find(n => n.type === "ActionButton" && text(n) === "Excluir vínculo").props.onClick();
function deferred() {
  let resolve;
  const promise = new Promise(ok => { resolve = ok; });
  return { promise, resolve };
}

describe("TestSuites — criação e vínculos isolados", () => {
  it("cria com payload original, anuncia sucesso, limpa o formulário e solicita recarga", async () => {
    api.create.mockResolvedValueOnce({ id: 43 }); fill("  Suite sintética  ");
    await submit();
    expect(api.create.mock.calls).toEqual([[{ nome: "  Suite sintética  ", descricao: "Descrição sintética" }]]);
    expect(text(toast())).toBe("Test Suite criada com sucesso!");
    expect(toast().props.className).toBe("toast success");
    expect(find(render(), "form")).toBeUndefined();
    expect(list.reload).toHaveBeenCalledTimes(1);
    button(render(), "+ New Suite").props.onClick();
    expect(find(render(), "input").props.value).toBe("");
    expect(find(render(), "textarea").props.value).toBe("");
  });

  it.each(["", " \t\n "])("nome vazio/em branco %j não cria nem recarrega", async nome => {
    fill(nome); await submit();
    expect(api.create).not.toHaveBeenCalled(); expect(list.reload).not.toHaveBeenCalled();
    expect(text(toast())).toBe("Preencha o nome"); expect(toast().props.className).toBe("toast warning");
    expect(button(render(), "Create Suite").props.disabled).toBe(false);
  });

  it("falha de criação preserva campos e não apresenta sucesso ou recarrega", async () => {
    api.create.mockRejectedValueOnce(new Error("Falha sintética")); fill("Preservar suite");
    await submit();
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(find(render(), "input").props.value).toBe("Preservar suite");
    expect(find(render(), "textarea").props.value).toBe("Descrição sintética");
    expect(text(toast())).toBe("Erro ao criar test suite"); expect(toast().props.className).toBe("toast error");
    expect(button(render(), "Create Suite").props.disabled).toBe(false); expect(list.reload).not.toHaveBeenCalled();
  });

  it("resposta de criação sem id mantém formulário aberto e indica erro", async () => {
    api.create.mockResolvedValueOnce({}); fill("Suite sintética"); await submit();
    expect(text(toast())).toBe("Erro ao criar suite"); expect(toast().props.className).toBe("toast error");
    expect(find(render(), "input").props.value).toBe("Suite sintética"); expect(list.reload).not.toHaveBeenCalled();
  });

  it("associa pelos IDs corretos e atualiza vinculados/disponíveis após recarregar", async () => {
    await openCases();
    api.addCase.mockResolvedValueOnce({}); api.getCases.mockResolvedValueOnce([caseA]);
    await button(casesModal(), "+ Adicionar").props.onClick();
    expect(api.addCase.mock.calls).toEqual([[41, 51]]); expect(api.getCases.mock.calls).toEqual([[41], [41]]);
    expect(text(casesModal())).toContain("Vinculados (1)");
    expect(text(casesModal())).toContain("Disponíveis para vincular (1)");
    expect(text(toast())).toBe("Test case adicionado à suite!"); expect(toast().props.className).toBe("toast success");
    expect(list.reload).not.toHaveBeenCalled();
  });

  it("remove somente o vínculo e devolve o caso à lista disponível", async () => {
    api.getCases.mockResolvedValueOnce([caseA]); await openCases();
    api.removeCase.mockResolvedValueOnce({}); api.getCases.mockResolvedValueOnce([]);
    await unlink();
    expect(api.removeCase.mock.calls).toEqual([[41, 51]]); expect(api.getCases.mock.calls).toEqual([[41], [41]]);
    expect(text(casesModal())).toContain("Vinculados (0)");
    expect(text(casesModal())).toContain("Disponíveis para vincular (2)");
    expect(text(toast())).toBe("Test case removido da suite"); expect(toast().props.className).toBe("toast success");
    expect(api.delete).not.toHaveBeenCalled();
  });

  it.each(["addCase", "removeCase"])("falha de %s preserva vínculos sem recarregar ou anunciar sucesso", async operation => {
    api.getCases.mockResolvedValueOnce(operation === "removeCase" ? [caseA] : []); await openCases();
    api[operation].mockRejectedValueOnce(new Error("Falha sintética de vínculo"));
    if (operation === "removeCase") await unlink(); else await button(casesModal(), "+ Adicionar").props.onClick();
    expect(api[operation].mock.calls).toEqual([[41, 51]]); expect(api.getCases).toHaveBeenCalledTimes(1);
    expect(text(casesModal())).toContain(operation === "removeCase" ? "Vinculados (1)" : "Vinculados (0)");
    expect(text(toast())).toBe(operation === "removeCase" ? "Erro ao remover test case" : "Erro ao adicionar test case");
    expect(toast().props.className).toBe("toast error");
  });

  it("falha de recarga após associação não anuncia sucesso nem altera os vínculos locais", async () => {
    await openCases(); api.addCase.mockResolvedValueOnce({});
    api.getCases.mockRejectedValueOnce(new Error("Falha sintética na recarga"));
    await button(casesModal(), "+ Adicionar").props.onClick();
    expect(api.addCase.mock.calls).toEqual([[41, 51]]); expect(api.getCases).toHaveBeenCalledTimes(2);
    expect(text(casesModal())).toContain("Vinculados (0)");
    expect(text(toast())).toBe("Erro ao adicionar test case"); expect(toast().props.className).toBe("toast error");
    // Associação pode ter persistido: falha de recarga não implica rollback.
  });

  it("conclusão atrasada após desmontagem não recarrega nem anuncia sucesso", async () => {
    await openCases(); const pending = deferred(); api.addCase.mockReturnValueOnce(pending.promise);
    const operation = button(casesModal(), "+ Adicionar").props.onClick();
    try {
      expect(api.addCase.mock.calls).toEqual([[41, 51]]); expect(toast()).toBeUndefined();
      list.mounted.current = false;
    } finally { pending.resolve({}); await operation; }
    expect(api.getCases).toHaveBeenCalledTimes(1); expect(toast()).toBeUndefined();
    expect(list.reload).not.toHaveBeenCalled();
  });
});
