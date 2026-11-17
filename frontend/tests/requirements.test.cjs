// Página real; hooks e dependências externas simulados, sem API ou DOM reais.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const React = require("../../backend/node_modules/react");
const babel = require("../../backend/node_modules/@babel/core");

let render, api, list, logError;

beforeEach(async () => {
  const state = [];
  let cursor = 0;
  const hooks = {
    useState(initial) {
      const id = cursor++;
      if (!(id in state)) state[id] = typeof initial === "function" ? initial() : initial;
      return [state[id], value => { state[id] = typeof value === "function" ? value(state[id]) : value; }];
    },
    useRef(value) { const id = cursor++; return state[id] ||= { current: value }; },
    useCallback(fn) { cursor++; return fn; },
    useEffect() { cursor++; },
  };
  api = {
    list: jest.fn(), getById: jest.fn(),
    create: jest.fn().mockRejectedValue(new Error("Criação sintética não prevista")),
    delete: jest.fn().mockRejectedValue(new Error("Exclusão sintética não prevista")),
  };
  list = {
    data: [{ id: 41, titulo: "Requisito sintético existente", descricao: "Descrição", status: "Open", prioridade: "Medium" }],
    page: 2, pageSize: 20, total: 1, isLoading: false, error: "", mounted: { current: true },
    setPage: jest.fn(), setPageSize: jest.fn(), reload: jest.fn(),
  };
  logError = jest.fn();
  const source = fs.readFileSync(path.join(__dirname, "../src/pages/Requirements.jsx"), "utf8");
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
    "../services/api": { requirementsAPI: api },
    "../hooks/usePaginatedList": { default: () => list },
    "../hooks/useRecordDetails": { default: () => ({ open: jest.fn() }) },
    "../components/ActionButton": { default: "ActionButton" },
    "../components/RecordDetails": { default: "Details", ViewRecordButton: "View" },
    "../components/Modal": { default: "Modal" },
    "../components/ConfirmDialog": { default: "ConfirmDialog" },
    "../components/Pagination": { default: "Pagination" },
    "./Pages.css": {},
  };
  const context = vm.createContext({ __jsx: React.createElement, console: { error: logError }, setTimeout: () => 1, clearTimeout() {} });
  const module = new vm.SourceTextModule(code, { context });
  await module.link(name => {
    if (!Object.hasOwn(imports, name)) throw new Error(`Import inesperado: ${name}`);
    const exports = imports[name];
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate();
  render = () => { cursor = 0; return module.namespace.default(); };
});

const nodes = e => !e || typeof e !== "object" || (e.type === "Modal" && !e.props.isOpen)
  ? [] : [e, ...React.Children.toArray(e.props?.children).flatMap(nodes)];
const text = e => React.Children.toArray(e?.props?.children).map(c => typeof c === "object" ? text(c) : c).join("");
const find = (tree, type) => nodes(tree).find(n => n.type === type);
const button = (tree, label) => nodes(tree).find(n => n.type === "button" && text(n) === label);
const toast = () => nodes(render()).find(n => n.props?.className?.startsWith("toast "));
function openForm() { button(render(), "+ New Requirement").props.onClick(); }
function fill(payload) {
  for (const [key, value] of Object.entries(payload)) {
    const tree = render();
    const field = key === "titulo" ? find(tree, "input") : key === "descricao" ? find(tree, "textarea")
      : nodes(tree).filter(n => n.type === "select")[key === "status" ? 0 : 1];
    field.props.onChange({ target: { value } });
  }
}
const submit = () => find(render(), "form").props.onSubmit({ preventDefault() {} });
const deleteAction = () => find(render(), "ActionButton").props.onClick();

describe("Requirements — criação e exclusão funcionais isoladas", () => {
  it("envia os quatro campos, apresenta sucesso, limpa/fecha o formulário e solicita atualização", async () => {
    const payload = { titulo: "  Requisito sintético  ", descricao: "Descrição sintética", status: "In Progress", prioridade: "High" };
    api.create.mockResolvedValueOnce({ id: 42, ...payload });
    openForm(); fill(payload);

    await submit();

    expect(api.create.mock.calls).toEqual([[payload]]);
    expect(toast().props.className).toBe("toast success");
    expect(text(toast())).toBe("Requirement criado com sucesso!");
    expect(find(render(), "Modal")).toBeUndefined();
    expect(list.reload).toHaveBeenCalledTimes(1);
    openForm();
    expect(find(render(), "input").props.value).toBe("");
    expect(find(render(), "textarea").props.value).toBe("");
    expect(nodes(render()).filter(n => n.type === "select").map(n => n.props.value)).toEqual(["Open", "Medium"]);
  });

  it.each(["", " \t\n "])("rejeita título vazio/em branco %j sem criar ou atualizar a lista", async titulo => {
    openForm(); fill({ titulo });

    await submit();

    expect(api.create).not.toHaveBeenCalled();
    expect(list.reload).not.toHaveBeenCalled();
    expect(text(toast())).toBe("Preencha o título");
    expect(toast().props.className).toBe("toast warning");
    expect(find(render(), "Modal").props.isOpen).toBe(true);
    expect(button(render(), "Create Requirement").props.disabled).toBe(false);
  });

  it("falha de criação mantém os campos e o modal, sem sucesso ou atualização indevidos", async () => {
    api.create.mockRejectedValueOnce(new Error("Falha sintética de criação"));
    openForm(); fill({ titulo: "Preservar requisito", descricao: "Preservar descrição" });

    await submit();

    expect(api.create).toHaveBeenCalledTimes(1);
    expect(text(toast())).toBe("Erro ao criar requirement");
    expect(toast().props.className).toBe("toast error");
    expect(find(render(), "Modal").props.isOpen).toBe(true);
    expect(find(render(), "input").props.value).toBe("Preservar requisito");
    expect(find(render(), "textarea").props.value).toBe("Preservar descrição");
    expect(button(render(), "Create Requirement").props.disabled).toBe(false);
    expect(list.reload).not.toHaveBeenCalled();
  });

  it("resposta JSON sem id cai no erro genérico sem anunciar sucesso", async () => {
    api.create.mockResolvedValueOnce({ error: "Resposta sintética sem id" });
    openForm(); fill({ titulo: "Requisito sintético" });

    await submit();

    expect(text(toast())).toBe("Erro ao criar requirement");
    expect(toast().props.className).toBe("toast error");
    expect(logError).toHaveBeenCalledTimes(1);
    expect(find(render(), "Modal").props.isOpen).toBe(true);
    expect(list.reload).not.toHaveBeenCalled();
    // O cliente retorna JSON; res.text() não existe nesse objeto e cai no catch.
  });

  it("abrir e cancelar a confirmação não exclui nem atualiza a lista", () => {
    deleteAction();
    expect(find(render(), "ConfirmDialog").props).toMatchObject({ isOpen: true, danger: true });
    expect(api.delete).not.toHaveBeenCalled();

    find(render(), "ConfirmDialog").props.onCancel();

    expect(find(render(), "ConfirmDialog").props.isOpen).toBe(false);
    expect(api.delete).not.toHaveBeenCalled();
    expect(list.reload).not.toHaveBeenCalled();
    expect(toast()).toBeUndefined();
    expect(text(render())).toContain("Requisito sintético existente");
  });

  it("confirmar exclui o ID persistido, fecha o diálogo e solicita a lista atualizada", async () => {
    api.delete.mockResolvedValueOnce({});
    deleteAction();

    await find(render(), "ConfirmDialog").props.onConfirm();

    expect(api.delete.mock.calls).toEqual([[41]]);
    expect(list.reload).toHaveBeenCalledTimes(1);
    expect(find(render(), "ConfirmDialog").props.isOpen).toBe(false);
    expect(text(toast())).toBe("Requirement deletado");
    expect(toast().props.className).toBe("toast success");
    // A nova lista vem do hook: a página não remove registros otimisticamente.
    list.data = []; list.total = 0;
    expect(text(render())).toContain("No requirements created yet.");
    expect(text(render())).not.toContain("Requisito sintético existente");
  });

  it("falha de exclusão mantém o registro e não apresenta sucesso ou solicita recarga", async () => {
    api.delete.mockRejectedValueOnce(new Error("Falha sintética de exclusão"));
    deleteAction();

    await find(render(), "ConfirmDialog").props.onConfirm();

    expect(api.delete.mock.calls).toEqual([[41]]);
    expect(text(toast())).toBe("Erro ao deletar requirement");
    expect(toast().props.className).toBe("toast error");
    expect(list.reload).not.toHaveBeenCalled();
    expect(text(render())).toContain("Requisito sintético existente");
  });
});
