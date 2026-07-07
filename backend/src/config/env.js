/**
 * Configuração centralizada de ambiente.
 *
 * Este é o ÚNICO lugar do backend que chama dotenv.
 * Todos os outros módulos importam daqui em vez de ler process.env diretamente.
 *
 * Resolução de path via __dirname garante que o arquivo correto é carregado
 * independente de qual diretório o processo é iniciado (problema clássico de CWD).
 *
 * Hierarquia de arquivos:
 *   NODE_ENV=test        → backend/.env.test       (banco qa_control_test, porta 5434)
 *   NODE_ENV=production  → backend/.env            (banco de produção)
 *   NODE_ENV=development → backend/.env            (banco local de dev)
 */

const path = require("path");

const envFile =
  process.env.NODE_ENV === "test"
    ? path.join(__dirname, "../../.env.test")  // backend/.env.test
    : path.join(__dirname, "../../.env");      // backend/.env

require("dotenv").config({ path: envFile });

// ─── Validação de variáveis obrigatórias ──────────────────────────────────────
// Apenas em dev/prod — testes usam valores definidos no jest.setup.js
if (process.env.NODE_ENV !== "test") {
  const required = [
    "JWT_SECRET",
    "REGISTER_TOKEN",
    "DB_HOST",
    "DB_DATABASE",
    "DB_USER",
    "DB_PASSWORD",
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(
      `FATAL: Variáveis de ambiente obrigatórias não configuradas: ${missing.join(", ")}`
    );
    console.error(`Copie backend/.env.example para backend/.env e preencha os valores.`);
    process.exit(1);
  }
}

// ─── Configuração exportada ───────────────────────────────────────────────────
module.exports = {
  // ── Ambiente ──────────────────────────────────────────────────────────────
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 3001,
  isTest: process.env.NODE_ENV === "test",
  isProduction: process.env.NODE_ENV === "production",

  // ── Banco de dados ────────────────────────────────────────────────────────
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5433,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : undefined,
  },

  // ── JWT ───────────────────────────────────────────────────────────────────
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  },

  // ── Registro de usuários ──────────────────────────────────────────────────
  registerToken: process.env.REGISTER_TOKEN,

  // ── CORS ──────────────────────────────────────────────────────────────────
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),

  // ── Rate Limiting — Global (todas as rotas) ────────────────────────────────
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
    max: Number(process.env.RATE_LIMIT_MAX) || 200,
  },

  // ── Rate Limiting — Auth Login (brute-force) ───────────────────────────────
  // skipSuccessfulRequests ativo: apenas tentativas falhas consomem cota.
  rateLimitAuth: {
    windowMs: Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || 15 * 60 * 1000, // 15 min
    max: Number(process.env.RATE_LIMIT_AUTH_MAX) || 10,  // 10 tentativas falhas por IP
  },

  // ── Rate Limiting — Register ───────────────────────────────────────────────
  rateLimitRegister: {
    windowMs: Number(process.env.RATE_LIMIT_REGISTER_WINDOW_MS) || 60 * 60 * 1000, // 1 hora
    max: Number(process.env.RATE_LIMIT_REGISTER_MAX) || 5, // 5 cadastros por IP por hora
  },

  // ── Rate Limiting — Per-user (rotas autenticadas) ──────────────────────────
  // Chaveado pelo ID do usuário; previne abuso mesmo com IPs rotativos.
  rateLimitUser: {
    windowMs: Number(process.env.RATE_LIMIT_USER_WINDOW_MS) || 15 * 60 * 1000, // 15 min
    max: Number(process.env.RATE_LIMIT_USER_MAX) || 300, // 300 req por usuário
  },

  // ── Bcrypt ────────────────────────────────────────────────────────────────
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
};
