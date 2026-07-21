/**
 * Middleware de autorização RBAC (Fase 2, Item 7).
 *
 * Uso:
 *   router.delete("/:id", authorize("admin"), handler)
 *   router.post("/",      authorize("admin", "qa"), handler)
 *   router.get("/",       authorize(), handler)  // qualquer role autenticada
 *
 * Roles válidas: "admin" | "qa" | "reader"
 *
 * Requer que authMiddleware já tenha rodado (req.user.role disponível).
 * Em produção, req.user é preenchido pelo JWT.
 * Em test mode, req.user é injetado pelo mock de teste em app.js.
 *
 * Hierarquia de permissões (da mais ao menos privilegiada):
 *   admin  → acesso total, gerencia usuários e projetos
 *   qa     → gerencia testes e execuções
 *   reader → somente leitura (GET)
 */

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Token de autenticação necessário" });
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Acesso negado. Permissão insuficiente.",
      });
    }

    next();
  };
}

module.exports = { authorize };
