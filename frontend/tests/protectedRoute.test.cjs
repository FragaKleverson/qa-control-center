// Componente real; contexto e Router simulados, sem DOM, rede ou AuthProvider.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const React = require("../../backend/node_modules/react");
const babel = require("../../backend/node_modules/@babel/core");

let ProtectedRoute, useAuth, useLocation, Navigate, location;

beforeEach(async () => {
  useAuth = jest.fn().mockReturnValue({ isAuthenticated: false });
  location = Object.freeze({ pathname: "/reports", search: "", hash: "", state: null, key: "synthetic" });
  useLocation = jest.fn(() => location);
  Navigate = jest.fn(() => null);
  const source = fs.readFileSync(path.join(__dirname, "../src/routes/ProtectedRoute.jsx"), "utf8");
  // Mesmo padrão Babel/VM das suítes existentes; transformação somente em memória.
  const code = babel.transformSync(source, {
    configFile: false, babelrc: false, parserOpts: { plugins: ["jsx"] },
    plugins: [({ types: t }) => ({ visitor: {
      JSXElement: { exit(p) {
        const opening = p.node.openingElement;
        const props = opening.attributes.map(attribute => t.objectProperty(
          t.stringLiteral(attribute.name.name),
          attribute.value === null ? t.booleanLiteral(true)
            : attribute.value.type === "JSXExpressionContainer" ? attribute.value.expression : attribute.value,
        ));
        p.replaceWith(t.callExpression(t.identifier("__jsx"), [
          t.identifier(opening.name.name), t.objectExpression(props),
        ]));
      } },
    } })],
  }).code;
  const context = vm.createContext({ __jsx: React.createElement });
  const imports = {
    "react-router-dom": { Navigate, useLocation },
    "../contexts/AuthContext": { useAuth },
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
  ProtectedRoute = module.namespace.default;
});

function protectedChild() {
  const render = jest.fn(() => null);
  return { render, element: React.createElement(render) };
}

describe("ProtectedRoute — contrato isolado", () => {
  it("sem autenticação retorna Navigate para login com replace, sem liberar o conteúdo", () => {
    const child = protectedChild();

    const result = ProtectedRoute({ children: child.element });

    expect(React.isValidElement(result)).toBe(true);
    expect(result.type).toBe(Navigate);
    expect(result.props.to).toBe("/login");
    expect(result.props.replace).toBe(true);
    expect(result.props.children).toBeUndefined();
    expect(result).not.toBe(child.element);
    expect(child.render).not.toHaveBeenCalled();
    expect(useAuth).toHaveBeenCalledTimes(1);
    expect(useLocation).toHaveBeenCalledTimes(1);
  });

  it("preserva a localização completa por referência, incluindo busca, hash e state", () => {
    location = Object.freeze({
      pathname: "/executions", search: "?page=2", hash: "#resultados",
      state: Object.freeze({ source: "dashboard" }), key: "origin-synthetic",
    });

    const result = ProtectedRoute({ children: "Conteúdo protegido" });

    expect(result.type).toBe(Navigate);
    expect(result.props.state).toEqual({ from: location });
    expect(result.props.state.from).toBe(location);
    expect(result.props.to).toBe("/login");
    expect(result.props.replace).toBe(true);
  });

  it("autenticado devolve exatamente children, sem envolver em redirecionamento", () => {
    useAuth.mockReturnValue({ isAuthenticated: true });
    const child = protectedChild();

    expect(ProtectedRoute({ children: child.element })).toBe(child.element);

    expect(child.render).not.toHaveBeenCalled();
    expect(useAuth).toHaveBeenCalledTimes(1);
    expect(useLocation).toHaveBeenCalledTimes(1);
  });

  it("usa imediatamente o estado inicial informado e libera acesso na próxima renderização autenticada", () => {
    const child = protectedChild();
    const initial = ProtectedRoute({ children: child.element });
    expect(initial.type).toBe(Navigate);

    useAuth.mockReturnValue({ isAuthenticated: true });

    expect(ProtectedRoute({ children: child.element })).toBe(child.element);
    expect(useAuth).toHaveBeenCalledTimes(2);
    // Não existe loading/hidratação assíncrona no contrato atual do componente.
  });

  it("volta a bloquear quando o contexto passa a não autenticado, usando a origem atual", () => {
    useAuth.mockReturnValue({ isAuthenticated: true });
    const child = protectedChild();
    expect(ProtectedRoute({ children: child.element })).toBe(child.element);
    useAuth.mockReturnValue({ isAuthenticated: false });
    location = Object.freeze({ pathname: "/test-plans", search: "?page=3", hash: "", state: null, key: "next" });

    const result = ProtectedRoute({ children: child.element });

    expect(result.type).toBe(Navigate);
    expect(result.props.to).toBe("/login");
    expect(result.props.state.from).toBe(location);
    expect(result.props.replace).toBe(true);
    expect(child.render).not.toHaveBeenCalled();
  });

  it("propaga falha do contexto sem devolver acesso protegido como fallback", () => {
    const failure = new Error("Falha sintética do contexto");
    useAuth.mockImplementation(() => { throw failure; });
    const child = protectedChild();

    expect(() => ProtectedRoute({ children: child.element })).toThrow(failure);

    expect(useLocation).not.toHaveBeenCalled();
    expect(child.render).not.toHaveBeenCalled();
  });
});
