const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const config = require("../config/env");

// Bcrypt rounds via config centralizado
const BCRYPT_ROUNDS = config.bcryptRounds;

// Hash fictício de formato válido para prevenir timing attacks
// (bcrypt.compare sempre executa, mesmo quando o usuário não existe)
const DUMMY_HASH =
  "$2b$12$invalidhashfortimingequalityXXXXXXXXXXXXXXXXXXXXXXXX.";

/** SHA-256 do token bruto — o que é armazenado no banco */
function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

async function register({ name, email, password }) {
  if (!name || !email || !password) {
    const err = new Error("name, email e password são obrigatórios");
    err.status = 400;
    throw err;
  }
  if (password.length < 8) {
    const err = new Error("Password deve ter ao menos 8 caracteres");
    err.status = 400;
    throw err;
  }

  try {
    // Primeiro usuário registrado recebe role 'admin'; demais recebem 'qa'
    const countResult = await pool.query("SELECT COUNT(*) FROM users");
    const isFirstUser = parseInt(countResult.rows[0].count, 10) === 0;
    const role = isFirstUser ? "admin" : "qa";

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const result = await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at",
      [name, email.toLowerCase().trim(), hash, role]
    );
    return result.rows[0];
  } catch (err) {
    if (err.code === "23505") {
      const e = new Error("Email já cadastrado");
      e.status = 409;
      throw e;
    }
    throw err;
  }
}

async function login({ email, password }) {
  if (!email || !password) {
    const err = new Error("email e password são obrigatórios");
    err.status = 400;
    throw err;
  }

  const result = await pool.query(
    "SELECT id, name, email, password_hash, role FROM users WHERE email = $1",
    [email.toLowerCase().trim()]
  );
  const user = result.rows[0];

  // Sempre executa bcrypt.compare para evitar timing attacks (enumeração de usuários)
  const valid = await bcrypt.compare(
    password,
    user ? user.password_hash : DUMMY_HASH
  );

  if (!user || !valid) {
    const err = new Error("Credenciais inválidas");
    err.status = 401;
    throw err;
  }

  // jti (JWT ID) único por token — permite revogação individual no logout
  const jti = crypto.randomUUID();

  const token = jwt.sign(
    { sub: user.id, email: user.email, name: user.name, role: user.role, jti },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}

/**
 * Revoga o token atual adicionando seu JTI à blocklist.
 * Faz limpeza lazy dos tokens expirados para não crescer sem controle.
 *
 * @param {string} jti - JWT ID do token a revogar
 * @param {number} exp - Unix timestamp (segundos) da expiração do token
 */
async function logout(jti, exp) {
  if (!jti) return; // tokens legados sem jti — nada a fazer

  // Limpeza lazy: remove tokens já expirados antes de inserir novo
  await pool.query("DELETE FROM revoked_tokens WHERE expires_at < NOW()");

  const expiresAt = new Date(exp * 1000);
  await pool.query(
    "INSERT INTO revoked_tokens (jti, expires_at) VALUES ($1, $2) ON CONFLICT (jti) DO NOTHING",
    [jti, expiresAt]
  );
}

/**
 * Inicia o fluxo de redefinição de senha.
 * Retorna o token bruto para ser enviado ao usuário (via e-mail em produção).
 * Sempre responde com a mesma mensagem, independente do e-mail existir ou não.
 *
 * @param {string} email
 * @returns {string|null} token bruto (apenas em dev/test), ou null se e-mail não encontrado
 */
async function forgotPassword(email) {
  const result = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [email.toLowerCase().trim()]
  );

  if (result.rows.length === 0) {
    return null; // e-mail não existe — rota responde igual para não vazar info
  }

  const userId = result.rows[0].id;

  // Invalida tokens anteriores não utilizados deste usuário
  await pool.query(
    "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
    [userId]
  );

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + config.passwordResetExpiresMs);

  await pool.query(
    "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, tokenHash, expiresAt]
  );

  return rawToken;
}

/**
 * Conclui o fluxo de redefinição de senha.
 *
 * @param {string} token - Token bruto recebido do usuário
 * @param {string} newPassword - Nova senha
 */
async function resetPassword(token, newPassword) {
  const tokenHash = hashToken(token);

  const result = await pool.query(
    `SELECT id, user_id, expires_at, used_at
     FROM password_reset_tokens
     WHERE token_hash = $1`,
    [tokenHash]
  );

  if (result.rows.length === 0) {
    const err = new Error("Token inválido ou expirado");
    err.status = 400;
    throw err;
  }

  const row = result.rows[0];

  if (row.used_at) {
    const err = new Error("Token já utilizado");
    err.status = 400;
    throw err;
  }

  if (new Date(row.expires_at) < new Date()) {
    const err = new Error("Token expirado");
    err.status = 400;
    throw err;
  }

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await pool.query(
    "UPDATE users SET password_hash = $1 WHERE id = $2",
    [hash, row.user_id]
  );

  await pool.query(
    "UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1",
    [row.id]
  );
}

// ─── Gestão de usuários (admin only) ──────────────────────────────────────────

/** Lista todos os usuários (sem password_hash). */
async function getAllUsers() {
  const result = await pool.query(
    "SELECT id, name, email, role, created_at FROM users ORDER BY id"
  );
  return result.rows;
}

const VALID_ROLES = ["admin", "qa", "reader"];

/**
 * Altera o role de um usuário.
 * @param {number} targetId - ID do usuário a alterar
 * @param {number} requesterId - ID de quem faz a requisição (não pode alterar o próprio role)
 * @param {string} newRole - Novo role ('admin' | 'qa' | 'reader')
 */
async function changeUserRole(targetId, requesterId, newRole) {
  if (!VALID_ROLES.includes(newRole)) {
    const err = new Error(`Role inválido. Valores aceitos: ${VALID_ROLES.join(", ")}`);
    err.status = 400;
    throw err;
  }
  if (Number(targetId) === Number(requesterId)) {
    const err = new Error("Você não pode alterar o próprio role.");
    err.status = 403;
    throw err;
  }

  const result = await pool.query(
    "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role",
    [newRole, targetId]
  );
  if (result.rows.length === 0) {
    const err = new Error("Usuário não encontrado");
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

/**
 * Deleta um usuário.
 * @param {number} targetId - ID do usuário a deletar
 * @param {number} requesterId - Não pode deletar a si mesmo
 */
async function deleteUser(targetId, requesterId) {
  if (Number(targetId) === Number(requesterId)) {
    const err = new Error("Você não pode deletar sua própria conta.");
    err.status = 403;
    throw err;
  }

  const result = await pool.query(
    "DELETE FROM users WHERE id = $1 RETURNING id",
    [targetId]
  );
  if (result.rows.length === 0) {
    const err = new Error("Usuário não encontrado");
    err.status = 404;
    throw err;
  }
}

module.exports = { register, login, logout, forgotPassword, resetPassword, getAllUsers, changeUserRole, deleteUser };

