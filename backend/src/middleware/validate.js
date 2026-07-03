/**
 * Middleware de validação com Zod.
 *
 * Uso:
 *   router.post("/", validate(meuSchema), handler)
 *   router.get("/:id", validate(idParamSchema, "params"), handler)
 *   router.get("/", validate(filtrosSchema, "query"), handler)
 *
 * Em caso de erro retorna 422 com lista de campos inválidos.
 * Em caso de sucesso, req[alvo] é substituído pelo valor já validado/sanitizado.
 */

// Formata os erros do Zod num array [{campo, mensagem}]
// Zod v4 usa .issues; v3 usava .errors (mantemos compatibilidade com ambos)
function formatarErros(zodError) {
  const issues = zodError.issues ?? zodError.errors ?? [];
  return issues.map((e) => ({
    campo: e.path.join(".") || "body",
    mensagem: e.message,
  }));
}

/**
 * Factory que retorna um middleware Express.
 * @param {import("zod").ZodTypeAny} schema - Schema Zod a aplicar
 * @param {"body"|"params"|"query"} alvo - Parte da request a validar
 */
function validate(schema, alvo = "body") {
  return (req, res, next) => {
    const resultado = schema.safeParse(req[alvo]);

    if (!resultado.success) {
      return res.status(422).json({
        error: "Dados inválidos",
        detalhes: formatarErros(resultado.error),
      });
    }

    // Substitui req[alvo] com os dados já validados e transformados
    // Para params, usamos Object.assign para não perder a referência original do Express
    if (alvo === "params") {
      Object.assign(req.params, resultado.data);
    } else {
      req[alvo] = resultado.data;
    }

    next();
  };
}

module.exports = { validate };
