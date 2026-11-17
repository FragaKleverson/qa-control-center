// Sidebar real; contexto/Link simulados, sem provider, armazenamento ou navegador.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const React = require("../../backend/node_modules/react");
const babel = require("../../backend/node_modules/@babel/core");

let Sidebar, user, logout, Link, useAuth;

beforeEach(async () => {
  user = { id: 7, name: "qa Sintético", email: "qa@example.invalid", role: "qa" };
  logout = jest.fn();
  useAuth = jest.fn(() => ({ user, logout }));
  Link = jest.fn(() => null);
  const source = fs.readFileSync(path.join(__dirname, "../src/components/Sidebar.jsx"), "utf8");
  const code = babel.transformSync(source, {
    configFile: false, babelrc: false, parserOpts: { plugins: ["jsx"] },
    plugins: [({ types: t }) => ({ visitor: {
      JSXElement: { exit(p) {
        const node = p.node;
        const name = node.openingElement.name.name;
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
          /^[a-z]/.test(name) ? t.stringLiteral(name) : t.identifier(name),
          t.objectExpression(props), ...children,
        ]));
      } },
    } })],
  }).code;
  const context = vm.createContext({ __jsx: React.createElement });
  const imports = {
    "react-router-dom": { Link },
    "../contexts/AuthContext": { useAuth },
    "./Sidebar.css": {},
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
  Sidebar = module.namespace.default;
});

const nodes = element => !element || typeof element !== "object" ? [] : [
  element, ...React.Children.toArray(element.props?.children).flatMap(nodes),
];
const text = element => React.Children.toArray(element?.props?.children)
  .map(child => typeof child === "object" ? text(child) : child).join("");
const byClass = (tree, name) => nodes(tree).find(node => node.props?.className === name);

describe("Sidebar — navegação e logout isolados", () => {
  it.each(["admin", "qa", "reader"])("exibe os oito destinos de navegação para %s, sem filtro por papel", role => {
    user = { ...user, role };

    const tree = Sidebar();

    expect(tree.type).toBe("aside");
    expect(tree.props.className).toBe("sidebar");
    expect(nodes(tree).some(node => node.type === "nav")).toBe(true);
    expect(nodes(tree).filter(node => node.type === Link).map(node => [node.props.to, text(node)])).toEqual([
      ["/", "📊 Dashboard"], ["/projects", "📁 Projects"],
      ["/requirements", "📝 Requirements"], ["/test-cases", "🧪 Test Cases"],
      ["/test-suites", "📦 Test Suites"], ["/test-plans", "📋 Test Plans"],
      ["/executions", "🚀 Executions"], ["/reports", "📈 Reports"],
    ]);
    expect(logout).not.toHaveBeenCalled();
  });

  it("exibe nome, e-mail e inicial maiúscula do usuário informado pelo contexto", () => {
    const tree = Sidebar();

    expect(text(byClass(tree, "sidebar-user-name"))).toBe("qa Sintético");
    expect(text(byClass(tree, "sidebar-user-email"))).toBe("qa@example.invalid");
    expect(text(byClass(tree, "sidebar-user-avatar"))).toBe("Q");
    expect(logout).not.toHaveBeenCalled();
  });

  it.each([null, undefined])("sem usuário (%s) mantém a estrutura e usa avatar de fallback", value => {
    user = value;

    const tree = Sidebar();

    expect(text(byClass(tree, "sidebar-user-avatar"))).toBe("?");
    expect(text(byClass(tree, "sidebar-user-name"))).toBe("");
    expect(text(byClass(tree, "sidebar-user-email"))).toBe("");
    expect(nodes(tree).filter(node => node.type === Link)).toHaveLength(8);
    expect(logout).not.toHaveBeenCalled();
  });

  it("aciona o callback de logout pelo botão Sair, sem executá-lo durante a renderização", () => {
    const tree = Sidebar();
    const button = byClass(tree, "sidebar-logout");

    expect(button.type).toBe("button");
    expect(button.props.title).toBe("Sair");
    expect(button.props.onClick).toBe(logout);
    expect(logout).not.toHaveBeenCalled();
    button.props.onClick();
    expect(logout).toHaveBeenCalledTimes(1);
    expect(logout).toHaveBeenCalledWith();
    expect(useAuth).toHaveBeenCalledTimes(1);
    // Limpeza da sessão e redirecionamento pertencem ao provider/ProtectedRoute.
  });

  it("reflete o contexto sem usuário após logout, sem produzir um elemento de redirecionamento", () => {
    logout.mockImplementation(() => { user = null; });
    byClass(Sidebar(), "sidebar-logout").props.onClick();

    const tree = Sidebar();

    expect(tree.type).toBe("aside");
    expect(text(byClass(tree, "sidebar-user-name"))).toBe("");
    expect(text(byClass(tree, "sidebar-user-avatar"))).toBe("?");
    expect(nodes(tree).filter(node => node.type === Link)).toHaveLength(8);
    expect(logout).toHaveBeenCalledTimes(1);
    // Não há useNavigate/Navigate na Sidebar: a navegação real não é testada aqui.
  });
});
