const express = require("express");
const router = express.Router();
const authService = require("../services/authService");
const { validate } = require("../middleware/validate");
const { registerSchema, loginSchema } = require("../validators/auth");
const { authLoginLimiter, authRegisterLimiter } = require("../middleware/rateLimiters");
const config = require("../config/env");

// Middleware: verifica se o x-register-token está correto antes de validar o body
function requireRegisterToken(req, res, next) {
  const provided = req.headers["x-register-token"];
  if (!provided || provided !== config.registerToken) {
    return res.status(403).json({ error: "Token de registro inválido ou ausente" });
  }
  next();
}

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registrar novo usuário
 *     tags:
 *       - Autenticação
 *     parameters:
 *       - in: header
 *         name: x-register-token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token de registro (valor de REGISTER_TOKEN no .env)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *                 example: João Silva
 *               email:
 *                 type: string
 *                 example: joao@empresa.com
 *               password:
 *                 type: string
 *                 example: SenhaForte@123
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 nome:
 *                   type: string
 *                 email:
 *                   type: string
 *       403:
 *         description: Token de registro inválido
 */
// Ordem: 1) rate limit → 2) token check → 3) validação body → 4) handler
router.post("/register", authRegisterLimiter, requireRegisterToken, validate(registerSchema), async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Fazer login e receber JWT
 *     tags:
 *       - Autenticação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: usuario@empresa.com
 *               password:
 *                 type: string
 *                 example: SenhaForte@123
 *     responses:
 *       200:
 *         description: Login bem-sucedido. Copie o token para autorização.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                   description: JWT token. Use em Authorization header como "Bearer TOKEN"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     nome:
 *                       type: string
 *                     email:
 *                       type: string
 *       401:
 *         description: Email ou senha inválidos
 */
router.post("/login", authLoginLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
