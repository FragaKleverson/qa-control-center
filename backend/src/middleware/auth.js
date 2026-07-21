const jwt = require("jsonwebtoken");
const pool = require("../db");
const config = require("../config/env");

/**
 * Middleware de autenticação JWT.
 * Verifica o header Authorization: Bearer <token>.
 * Expõe req.user = { id, email, name, jti, tokenExp } para os handlers seguintes.
 *
 * Se o token tiver JTI, verifica na tabela revoked_tokens (logout seguro).
 * Falha do banco é propagada como erro 503 via next(err).
 */
async function authenticate(req, res, next) {
  const header = req.headers["authorization"];
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autenticação necessário" });
  }

  const token = header.slice(7);
  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }

  // Verifica blocklist de logout (somente se o token tem JTI)
  if (payload.jti) {
    try {
      const { rows } = await pool.query(
        "SELECT 1 FROM revoked_tokens WHERE jti = $1",
        [payload.jti]
      );
      if (rows.length > 0) {
        return res.status(401).json({ error: "Token revogado. Faça login novamente." });
      }
    } catch (err) {
      return next(err); // falha no banco → error handler global
    }
  }

  req.user = {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role || "reader", // fallback para tokens legados sem role
    jti: payload.jti,
    tokenExp: payload.exp, // Unix timestamp (segundos) — usado pelo logout
  };
  next();
}

module.exports = authenticate;

