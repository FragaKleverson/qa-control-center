const express = require("express");
const router = express.Router();
const authService = require("../services/authService");

/**
 * POST /auth/register
 * Protegido pelo header x-register-token (valor em REGISTER_TOKEN env).
 * Usado pelo admin para cadastrar membros da equipe.
 */
router.post("/register", async (req, res, next) => {
  const provided = req.headers["x-register-token"];
  if (!provided || provided !== process.env.REGISTER_TOKEN) {
    return res.status(403).json({ error: "Token de registro inválido ou ausente" });
  }
  try {
    const user = await authService.register(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/login
 * Público. Retorna JWT + dados básicos do usuário.
 */
router.post("/login", async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
