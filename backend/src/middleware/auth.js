const jwt = require("jsonwebtoken");

/**
 * Middleware de autenticação JWT.
 * Verifica o header Authorization: Bearer <token>.
 * Expõe req.user = { id, email, name } para os handlers seguintes.
 */
function authenticate(req, res, next) {
  const header = req.headers["authorization"];
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autenticação necessário" });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email, name: payload.name };
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

module.exports = authenticate;
