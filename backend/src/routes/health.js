const express = require("express");
const router = express.Router();
const healthService = require("../services/healthService");

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check da API e do banco de dados
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: API e banco operacionais
 *       503:
 *         description: Banco de dados inacessível
 */
// GET - Health check (público, sem autenticação — usado por orquestradores/monitoramento)
router.get("/", async (req, res) => {
  const result = await healthService.check();
  res.status(result.healthy ? 200 : 503).json(result);
});

module.exports = router;
