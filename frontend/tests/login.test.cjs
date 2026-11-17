// Login real, com hooks/contexto/Router simulados; JSX transformado só em memória.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const React = require("../../backend/node_modules/react");
const babel = require("../../backend/node_modules/@babel/core");

let Login, login, navigate, render;

beforeEach(async () => {
  const state = [];
  let cursor = 0;
  function useState(initial) {
    const index = cursor++;
    if (!(index in state)) state[index] = initial;
    return [state[index], value => { state[index] = value; }];
  }
  login = jest.fn().mockRejectedValue(new Error("Login sintético não previsto"));
  navigate = jest.fn();
  const source = fs.readFileSync(path.join(__dirname, "../src/pages/Login.jsx"), "utf8");
  const code = babel.transformSync(source, {
    configFile: false, babelrc: false, parserOpts: { plugins: ["jsx"] },
    plugins: [({ types: t }) => ({ visitor: {
      JSXElement: { exit(p) {
        const node = p.node;
        const props = node.openingElement.attributes.map(attribute => t.objectProperty(
          t.stringLiteral(attribute.name.name),
          attribute.value === null ? t.booleanLiteral(true)
            : attribute.value.type === "JSXExpressionContainer" ? attribute.value.expression : attribute.value,
        ));
        const children = node.children.flatMap(child => child.type === "JSXText"
          ? (child.value.trim() ? [t.stringLiteral(child.value.replace(/\s+/g, " ").trim())] : [])
          : child.type === "JSXExpressionContainer"
            ? (child.expression.type === "JSXEmptyExpression" ? [] : [child.expression]) : [child]);
        p.replaceWith(t.callExpression(t.identifier("__jsx"), [
          t.stringLiteral(node.openingElement.name.name), t.objectExpression(props), ...children,
        ]));
      } },
    } })],
  }).code;
  const context = vm.createContext({ __jsx: React.createElement });
  const imports = {
    react: { useState },
    "react-router-dom": { useNavigate: () => navigate },
    "../contexts/AuthContext": { useAuth: () => ({ login }) },
    "./Login.css": {},
  };
  const module = new vm.SourceTextModule(code, { context });
  await module.link(name => {
    if (!Object.hasOwn(imports, name)) throw new Error(`Import inesperado: ${name}`);
    const exports = imports[name];
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate();
  Login = module.namespace.default;
  render = () => { cursor = 0; return Login(); };
});

const nodes = element => !element || typeof element !== "object" ? [] : [
  element, ...React.Children.toArray(element.props?.children).flatMap(nodes),
];
const text = element => React.Children.toArray(element?.props?.children)
  .map(child => typeof child === "object" ? text(child) : child).join("");
const find = (tree, type) => nodes(tree).find(node => node.type === type);
const error = tree => nodes(tree).find(node => node.props?.className === "login-error");
function fill(email = "qa@example.invalid", password = "SenhaSintetica@123") {
  const tree = render();
  for (const [id, value] of [["email", email], ["password", password]]) {
    nodes(tree).find(node => node.type === "input" && node.props.id === id)
      .props.onChange({ target: { value } });
  }
  return render();
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

describe("Login — componente isolado", () => {
  it("inicia com formulário vazio, labels, campos obrigatórios e botão disponível", () => {
    const tree = render();
    const inputs = nodes(tree).filter(node => node.type === "input");

    expect(inputs.map(node => node.props)).toEqual([
      expect.objectContaining({ id: "email", type: "email", value: "", required: true, autoFocus: true, autoComplete: "email" }),
      expect.objectContaining({ id: "password", type: "password", value: "", required: true, autoComplete: "current-password" }),
    ]);
    expect(nodes(tree).filter(node => node.type === "label").map(node => node.props.htmlFor)).toEqual(["email", "password"]);
    expect(find(tree, "form").props.onSubmit).toEqual(expect.any(Function));
    expect(find(tree, "button").props).toMatchObject({ type: "submit", disabled: false });
    expect(text(find(tree, "button"))).toBe("Entrar");
    expect(error(tree)).toBeUndefined();
    expect(login).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("envia as credenciais preenchidas e navega para a raiz com replace após sucesso", async () => {
    login.mockResolvedValueOnce({ token: "token-sintetico" });
    const tree = fill();
    const preventDefault = jest.fn();

    await find(tree, "form").props.onSubmit({ preventDefault });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(login).toHaveBeenCalledTimes(1);
    expect(login).toHaveBeenCalledWith("qa@example.invalid", "SenhaSintetica@123");
    expect(navigate.mock.calls).toEqual([["/", { replace: true }]]);
    expect(find(render(), "button").props.disabled).toBe(false);
    expect(error(render())).toBeUndefined();
  });

  it("durante a autenticação mostra loading e desabilita o botão sem navegar antecipadamente", async () => {
    const pending = deferred();
    login.mockReturnValueOnce(pending.promise);
    const operation = find(fill(), "form").props.onSubmit({ preventDefault() {} });
    try {
      const button = find(render(), "button");
      expect(button.props.disabled).toBe(true);
      expect(text(button)).toBe("Entrando…");
      expect(navigate).not.toHaveBeenCalled();
    } finally {
      pending.resolve({});
      await operation;
    }
    expect(find(render(), "button").props.disabled).toBe(false);
    expect(text(find(render(), "button"))).toBe("Entrar");
    expect(navigate.mock.calls).toEqual([["/", { replace: true }]]);
  });

  it.each([
    ["mensagem recebida", new Error("Autenticação sintética recusada"), "Autenticação sintética recusada"],
    ["fallback sem mensagem", new Error(), "Credenciais inválidas"],
  ])("em falha apresenta %s, mantém campos e libera nova tentativa sem navegar", async (_label, failure, message) => {
    login.mockRejectedValueOnce(failure);

    await find(fill(), "form").props.onSubmit({ preventDefault() {} });

    const tree = render();
    expect(text(error(tree))).toBe(message);
    expect(find(tree, "button").props.disabled).toBe(false);
    expect(text(find(tree, "button"))).toBe("Entrar");
    expect(nodes(tree).filter(node => node.type === "input").map(node => node.props.value))
      .toEqual(["qa@example.invalid", "SenhaSintetica@123"]);
    expect(login).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("limpa o erro anterior ao tentar novamente e navega somente após a nova autenticação", async () => {
    login.mockRejectedValueOnce(new Error("Primeira falha sintética"));
    await find(fill(), "form").props.onSubmit({ preventDefault() {} });
    expect(text(error(render()))).toBe("Primeira falha sintética");
    const pending = deferred();
    login.mockReturnValueOnce(pending.promise);
    const operation = find(fill("outro@example.invalid", "OutraSenhaSintetica@123"), "form")
      .props.onSubmit({ preventDefault() {} });
    try {
      expect(error(render())).toBeUndefined();
      expect(find(render(), "button").props.disabled).toBe(true);
      expect(navigate).not.toHaveBeenCalled();
      expect(login).toHaveBeenLastCalledWith("outro@example.invalid", "OutraSenhaSintetica@123");
    } finally {
      pending.resolve({});
      await operation;
    }
    expect(login).toHaveBeenCalledTimes(2);
    expect(navigate.mock.calls).toEqual([["/", { replace: true }]]);
    expect(find(render(), "button").props.disabled).toBe(false);
  });
});
