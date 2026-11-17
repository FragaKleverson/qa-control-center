const express = require("express");
const router = express.Router();
const healthService = require("../services/healthService");


// GET - Health check (público, sem autenticação — usado por orquestradores/monitoramento)
router.get("/", async (req, res) => {
  const result = await healthService.check();
  res.status(result.healthy ? 200 : 503).json(result);
});

module.exports = router;
/**
 * @openapi
 * {
 *   "/health": {
 *     "get": {
 *       "tags": [
 *         "Saúde"
 *       ],
 *       "operationId": "get_health",
 *       "summary": "Consultar saúde",
 *       "description": "Público antes de auth/Helmet/CORS/limiters. SELECT 1; 200 saudável ou 503 degradado com mensagem do driver. Não comprova SLA.",
 *       "security": [],
 *       "responses": {
 *         "200": {
 *           "description": "Sucesso",
 *           "content": {
 *             "application/json": {
 *               "schema": {
 *                 "$ref": "#/components/schemas/Health"
 *               }
 *             }
 *           }
 *         },
 *         "503": {
 *           "description": "Degradado: banco inacessível, mensagem interna em database.error no comportamento atual.",
 *           "content": {
 *             "application/json": {
 *               "schema": {
 *                 "$ref": "#/components/schemas/Health"
 *               }
 *             }
 *           }
 *         }
 *       },
 *       "x-roles": [],
 *       "x-business-rules": [],
 *       "x-source": "backend/src/routes/health.js"
 *     }
 *   }
 * }
 */
