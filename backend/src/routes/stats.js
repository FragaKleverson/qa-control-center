const express = require("express");
const router = express.Router();
const { statsService } = require("../services");

// ============================
// OBTER ESTATÍSTICAS GERAIS
// ============================
router.get("/", async (req, res, next) => {
  try {
    const stats = await statsService.getDashboard();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
/**
 * @openapi
 * {
 *   "/stats": {
 *     "get": {
 *       "tags": [
 *         "Dashboard"
 *       ],
 *       "operationId": "get_stats",
 *       "summary": "Consultar dashboard",
 *       "description": "totalProjects conta projetos legados. Serviço executa ALTER TABLE preexistente e captura erro retornando zeros/listas vazias com HTTP 200. Não comprova indicadores válidos em falha nem somente ativos.",
 *       "security": [
 *         {
 *           "bearerAuth": []
 *         }
 *       ],
 *       "responses": {
 *         "200": {
 *           "description": "Sucesso",
 *           "content": {
 *             "application/json": {
 *               "schema": {
 *                 "$ref": "#/components/schemas/Dashboard"
 *               }
 *             }
 *           }
 *         },
 *         "400": {
 *           "$ref": "#/components/responses/Http400"
 *         },
 *         "401": {
 *           "$ref": "#/components/responses/Http401"
 *         },
 *         "413": {
 *           "$ref": "#/components/responses/Http413"
 *         },
 *         "429": {
 *           "$ref": "#/components/responses/Http429"
 *         },
 *         "500": {
 *           "$ref": "#/components/responses/Http500"
 *         }
 *       },
 *       "x-roles": [
 *         "admin",
 *         "qa",
 *         "reader"
 *       ],
 *       "x-business-rules": [
 *         "RN-007"
 *       ],
 *       "x-source": "backend/src/routes/stats.js"
 *     }
 *   }
 * }
 */
