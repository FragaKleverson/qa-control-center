/**
 * Rate Limiters — Fase 2, Item 5 do roadmap.
 *
 * Três camadas de proteção independentes:
 *
 *  1. globalLimiter        — por IP, todas as rotas. Teto geral contra DoS.
 *  2. authLoginLimiter     — por IP, apenas POST /auth/login.
 *                            skipSuccessfulRequests: logins bem-sucedidos NÃO
 *                            consomem cota — só tentativas falhas contam.
 *  3. authRegisterLimiter  — por IP, apenas POST /auth/register.
 *                            Impede criação em massa de contas.
 *  4. perUserLimiter       — por user ID (JWT), rotas protegidas.
 *                            Previne abuso via múltiplos IPs com o mesmo token.
 *
 * Todos têm `skip: () => config.isTest` por padrão, portanto a suite Jest
 * existente não é afetada.
 *
 * Para testar rate limiting em isolamento, use `createLimiter(overrides)`
 * que retorna uma instância configurável com `skip: () => false`.
 */

const rateLimit = require("express-rate-limit");
const config = require("../config/env");

// ── 1. Global IP limiter ──────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  message: { error: "Muitas requisições. Tente novamente em alguns minutos." },
});

// ── 2. Auth login brute-force limiter ─────────────────────────────────────────
// Aplicado por rota em routes/auth.js (POST /auth/login).
// skipSuccessfulRequests: true → 200 não conta; 401/422 contam.
const authLoginLimiter = rateLimit({
  windowMs: config.rateLimitAuth.windowMs,
  max: config.rateLimitAuth.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  skipSuccessfulRequests: true,
  message: { error: "Muitas tentativas de login. Aguarde antes de tentar novamente." },
});

// ── 3. Auth register limiter ──────────────────────────────────────────────────
// Aplicado por rota em routes/auth.js (POST /auth/register).
const authRegisterLimiter = rateLimit({
  windowMs: config.rateLimitRegister.windowMs,
  max: config.rateLimitRegister.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  message: { error: "Muitas tentativas de registro. Aguarde antes de tentar novamente." },
});

// ── 4. Per-user limiter ───────────────────────────────────────────────────────
// Requer que authMiddleware já tenha rodado (req.user disponível via JWT).
// keyGenerator: user ID quando autenticado, IP como fallback.
const perUserLimiter = rateLimit({
  windowMs: config.rateLimitUser.windowMs,
  max: config.rateLimitUser.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,  // validate.keyGeneratorIpFallback: false suprime a ValidationError do express-rate-limit v8
  // que exige uso do ipKeyGenerator() quando req.ip aparece em keyGenerators customizados.
  validate: { keyGeneratorIpFallback: false },  keyGenerator: (req) => (req.user ? `user:${req.user.id}` : req.ip),
  message: { error: "Limite de requisições atingido. Tente novamente em alguns minutos." },
});

// ── 5. Password reset limiter ─────────────────────────────────────────────────
// Aplicado em POST /auth/forgot-password.
// Evita spam de tokens de reset (3 por IP por 15 min por padrão).
const passwordResetLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_PWD_RESET_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_PWD_RESET_MAX) || 3,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  message: { error: "Muitas solicitações de reset. Aguarde antes de tentar novamente." },
});

/**
 * Fábrica para criar limiters com configuração personalizada.
 * Destinada exclusivamente aos testes de integração: o `skip` padrão é
 * `() => false` (nunca pula), ao contrário dos limiters de produção.
 *
 * Exemplo de uso em testes:
 *   const limiter = createLimiter({ max: 3, windowMs: 60_000 });
 */
function createLimiter(overrides = {}) {
  return rateLimit({
    windowMs: 60_000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => false,
    validate: { keyGeneratorIpFallback: false },
    message: { error: "Limite de requisições atingido." },
    ...overrides,
  });
}

module.exports = {
  globalLimiter,
  authLoginLimiter,
  authRegisterLimiter,
  passwordResetLimiter,
  perUserLimiter,
  createLimiter,
};
