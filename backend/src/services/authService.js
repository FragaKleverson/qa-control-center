const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");

// Rounds reduzidos em teste para performance; 12 em produção
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

// Hash fictício de formato válido para prevenir timing attacks
// (bcrypt.compare sempre executa, mesmo quando o usuário não existe)
const DUMMY_HASH =
  "$2b$12$invalidhashfortimingequalityXXXXXXXXXXXXXXXXXXXXXXXX.";

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
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const result = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at",
      [name, email.toLowerCase().trim(), hash]
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
    "SELECT id, name, email, password_hash FROM users WHERE email = $1",
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

  const token = jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );

  return { token, user: { id: user.id, name: user.name, email: user.email } };
}

module.exports = { register, login };
