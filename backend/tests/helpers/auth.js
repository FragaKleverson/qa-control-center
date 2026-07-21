/**
 * Helper de autenticação para testes de integração.
 * Cria um usuário de teste diretamente no banco (bypassando a rota,
 * para não depender do REGISTER_TOKEN em todos os testes).
 */

const pool = require("../../src/db");
const bcrypt = require("bcryptjs");

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 4;

const TEST_USER = {
  name: "QA Tester",
  email: "tester@qa.dev",
  password: "Test@1234",
  role: "qa",
};

/**
 * Insere o usuário de teste diretamente no banco.
 * Usa ON CONFLICT DO NOTHING para ser idempotente.
 * @param {object} overrides — sobrescreve campos (incluindo role)
 */
async function createTestUser(overrides = {}) {
  const user = { ...TEST_USER, ...overrides };
  const hash = await bcrypt.hash(user.password, BCRYPT_ROUNDS);
  await pool.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role",
    [user.name, user.email.toLowerCase(), hash, user.role]
  );
  return user;
}

module.exports = { createTestUser, TEST_USER };
