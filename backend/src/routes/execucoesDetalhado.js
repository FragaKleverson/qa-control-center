const express = require("express");
const router = express.Router();
const { executionsService } = require("../services");
const { logAudit } = require("../services/auditService");
const { validate } = require("../middleware/validate");
const { authorize } = require("../middleware/authorize");
const { idParamSchema, idAndProjetoIdSchema } = require("../validators/common");
const { createSchema, updateSchema, updateResultSchema, listQuerySchema } = require("../validators/execucoes");

// GET - Listar todas as execuções (opcionalmente paginado via ?page=&limit=)
router.get("/", validate(listQuerySchema, "query"), async (req, res, next) => {
  try {
    // Express 5 expõe req.query por getter; usa os valores transformados do schema.
    const executions = await executionsService.listAll(listQuerySchema.parse(req.query));
    res.json(executions);
  } catch (err) {
    next(err);
  }
});

// GET - Obter estatísticas de execuções (deve vir antes de /:id para evitar conflito de rota)
router.get("/stats/summary", async (req, res, next) => {
  try {
    const stats = await executionsService.getStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// GET - Obter execução por ID
router.get("/:id", validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    const execution = await executionsService.getById(req.params.id);
    if (!execution) return res.status(404).json({ error: "Execução não encontrada" });
    res.json(execution);
  } catch (err) {
    next(err);
  }
});

// POST - Criar nova execução
router.post("/", authorize("admin", "qa"), validate(createSchema), async (req, res, next) => {
  try {
    const execution = await executionsService.create(req.body, req.user?.id ?? null);
    await logAudit({ userId: req.user?.id, entityType: "execucao", entityId: execution.id, action: "CREATE", newValues: execution, ipAddress: req.ip });
    res.status(201).json(execution);
  } catch (err) {
    next(err);
  }
});

// PUT - Atualizar execução
router.put("/:id", authorize("admin", "qa"), validate(idParamSchema, "params"), validate(updateSchema), async (req, res, next) => {
  try {
    const old = await executionsService.getById(req.params.id);
    const execution = await executionsService.update(req.params.id, req.body);
    await logAudit({ userId: req.user?.id, entityType: "execucao", entityId: execution.id, action: "UPDATE", oldValues: old, newValues: execution, ipAddress: req.ip });
    res.json(execution);
  } catch (err) {
    next(err);
  }
});

// DELETE - Deletar execução
router.delete("/:id", authorize("admin"), validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    const deleted = await executionsService.delete(req.params.id);
    await logAudit({ userId: req.user?.id, entityType: "execucao", entityId: parseInt(req.params.id), action: "DELETE", oldValues: deleted, ipAddress: req.ip });
    res.json({ message: "Execução deletada com sucesso" });
  } catch (err) {
    next(err);
  }
});

// GET - Listar resultados de test cases de uma execução
router.get("/:id/results", validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    const results = await executionsService.getResults(req.params.id);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

// PUT - Atualizar status de um test case em uma execução
router.put("/:id/results/:projetoId", authorize("admin", "qa"), validate(idAndProjetoIdSchema, "params"), validate(updateResultSchema), async (req, res, next) => {
  try {
    const { status, comentario } = req.body;
    const result = await executionsService.updateResult(
      req.params.id,
      req.params.projetoId,
      status,
      comentario
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST - Finalizar execução
router.post("/:id/finalize", authorize("admin", "qa"), validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    const execution = await executionsService.finalize(req.params.id);
    res.json(execution);
  } catch (err) {
    next(err);
  }
});

// POST - Restaurar execução soft-deletada (admin only)
router.post("/:id/restore", authorize("admin"), validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    const restored = await executionsService.restore(req.params.id);
    await logAudit({ userId: req.user?.id, entityType: "execucao", entityId: restored.id, action: "RESTORE", newValues: restored, ipAddress: req.ip });
    res.json(restored);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
/**
 * @openapi
 * {
 *   "/execucoes": {
 *     "get": {
 *       "tags": [
 *         "Execuções"
 *       ],
 *       "operationId": "get_execucoes",
 *       "summary": "Listar Execution",
 *       "description": "Registro de execução. Criação direta não materializa execution_results; PUT geral NÃO verifica finalized. Não confundir com execução transacional do plano. Paginação opt-in; sem page/limit retorna array. Ordenação default por created_at DESC; Projects/Plans/Executions e casos têm desempate por id, Suites/Requirements não.",
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
 *                 "$ref": "#/components/schemas/ExecutionList"
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
 *         "422": {
 *           "$ref": "#/components/responses/Http422"
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
 *         "RN-006",
 *         "RN-014",
 *         "RN-015"
 *       ],
 *       "x-source": "backend/src/routes/execucoesDetalhado.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/Page"
 *         },
 *         {
 *           "$ref": "#/components/parameters/Limit"
 *         },
 *         {
 *           "name": "projeto_id",
 *           "in": "query",
 *           "required": false,
 *           "description": "Filtro global em ts.projeto_id legado, antes de paginação; não é Project do catálogo.",
 *           "schema": {
 *             "type": "integer",
 *             "minimum": 1,
 *             "maximum": 2147483647
 *           }
 *         }
 *       ]
 *     },
 *     "post": {
 *       "tags": [
 *         "Execuções"
 *       ],
 *       "operationId": "post_execucoes",
 *       "summary": "Criar Execution",
 *       "description": "Registro de execução. Criação direta não materializa execution_results; PUT geral NÃO verifica finalized. Não confundir com execução transacional do plano.",
 *       "security": [
 *         {
 *           "bearerAuth": []
 *         }
 *       ],
 *       "responses": {
 *         "201": {
 *           "description": "Sucesso",
 *           "content": {
 *             "application/json": {
 *               "schema": {
 *                 "$ref": "#/components/schemas/Execution"
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
 *         "403": {
 *           "$ref": "#/components/responses/Http403"
 *         },
 *         "409": {
 *           "$ref": "#/components/responses/Http409"
 *         },
 *         "413": {
 *           "$ref": "#/components/responses/Http413"
 *         },
 *         "422": {
 *           "$ref": "#/components/responses/Http422"
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
 *         "qa"
 *       ],
 *       "x-business-rules": [
 *         "RN-006",
 *         "RN-014",
 *         "RN-015"
 *       ],
 *       "x-source": "backend/src/routes/execucoesDetalhado.js",
 *       "requestBody": {
 *         "required": true,
 *         "description": "Objeto JSON; campos desconhecidos são descartados quando há validator Zod.",
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "$ref": "#/components/schemas/ExecutionCreate"
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   "/execucoes/{id}": {
 *     "get": {
 *       "tags": [
 *         "Execuções"
 *       ],
 *       "operationId": "get_execucoes_id",
 *       "summary": "Consultar Execution",
 *       "description": "Registro de execução. Criação direta não materializa execution_results; PUT geral NÃO verifica finalized. Não confundir com execução transacional do plano.",
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
 *                 "$ref": "#/components/schemas/Execution"
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
 *         "404": {
 *           "$ref": "#/components/responses/Http404"
 *         },
 *         "413": {
 *           "$ref": "#/components/responses/Http413"
 *         },
 *         "422": {
 *           "$ref": "#/components/responses/Http422"
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
 *         "RN-006",
 *         "RN-014",
 *         "RN-015"
 *       ],
 *       "x-source": "backend/src/routes/execucoesDetalhado.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/LegacyId"
 *         }
 *       ]
 *     },
 *     "put": {
 *       "tags": [
 *         "Execuções"
 *       ],
 *       "operationId": "put_execucoes_id",
 *       "summary": "Atualizar Execution",
 *       "description": "Registro de execução. Criação direta não materializa execution_results; PUT geral NÃO verifica finalized. Não confundir com execução transacional do plano. PUT parcial: campos omitidos preservam valores.",
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
 *                 "$ref": "#/components/schemas/Execution"
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
 *         "403": {
 *           "$ref": "#/components/responses/Http403"
 *         },
 *         "404": {
 *           "$ref": "#/components/responses/Http404"
 *         },
 *         "409": {
 *           "$ref": "#/components/responses/Http409"
 *         },
 *         "413": {
 *           "$ref": "#/components/responses/Http413"
 *         },
 *         "422": {
 *           "$ref": "#/components/responses/Http422"
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
 *         "qa"
 *       ],
 *       "x-business-rules": [
 *         "RN-006",
 *         "RN-014",
 *         "RN-015"
 *       ],
 *       "x-source": "backend/src/routes/execucoesDetalhado.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/LegacyId"
 *         }
 *       ],
 *       "requestBody": {
 *         "required": true,
 *         "description": "Objeto JSON; campos desconhecidos são descartados quando há validator Zod.",
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "$ref": "#/components/schemas/ExecutionUpdate"
 *             }
 *           }
 *         }
 *       }
 *     },
 *     "delete": {
 *       "tags": [
 *         "Execuções"
 *       ],
 *       "operationId": "delete_execucoes_id",
 *       "summary": "Excluir logicamente Execution",
 *       "description": "Registro de execução. Criação direta não materializa execution_results; PUT geral NÃO verifica finalized. Não confundir com execução transacional do plano. Preenche deleted_at sem excluir fisicamente. Repetição/ausente retorna 404.",
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
 *                 "$ref": "#/components/schemas/Message"
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
 *         "403": {
 *           "$ref": "#/components/responses/Http403"
 *         },
 *         "404": {
 *           "$ref": "#/components/responses/Http404"
 *         },
 *         "413": {
 *           "$ref": "#/components/responses/Http413"
 *         },
 *         "422": {
 *           "$ref": "#/components/responses/Http422"
 *         },
 *         "429": {
 *           "$ref": "#/components/responses/Http429"
 *         },
 *         "500": {
 *           "$ref": "#/components/responses/Http500"
 *         }
 *       },
 *       "x-roles": [
 *         "admin"
 *       ],
 *       "x-business-rules": [
 *         "RN-006",
 *         "RN-014",
 *         "RN-015"
 *       ],
 *       "x-source": "backend/src/routes/execucoesDetalhado.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/LegacyId"
 *         }
 *       ]
 *     }
 *   },
 *   "/execucoes/{id}/restore": {
 *     "post": {
 *       "tags": [
 *         "Execuções"
 *       ],
 *       "operationId": "post_execucoes_id_restore",
 *       "summary": "Restaurar Execution",
 *       "description": "Registro de execução. Criação direta não materializa execution_results; PUT geral NÃO verifica finalized. Não confundir com execução transacional do plano. Limpa deleted_at; ativo/ausente retorna 404; preserva identidade/vínculos e bloqueios do plano. Sem UI administrativa de restauração.",
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
 *                 "$ref": "#/components/schemas/Execution"
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
 *         "403": {
 *           "$ref": "#/components/responses/Http403"
 *         },
 *         "404": {
 *           "$ref": "#/components/responses/Http404"
 *         },
 *         "413": {
 *           "$ref": "#/components/responses/Http413"
 *         },
 *         "422": {
 *           "$ref": "#/components/responses/Http422"
 *         },
 *         "429": {
 *           "$ref": "#/components/responses/Http429"
 *         },
 *         "500": {
 *           "$ref": "#/components/responses/Http500"
 *         }
 *       },
 *       "x-roles": [
 *         "admin"
 *       ],
 *       "x-business-rules": [
 *         "RN-006",
 *         "RN-014",
 *         "RN-015"
 *       ],
 *       "x-source": "backend/src/routes/execucoesDetalhado.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/LegacyId"
 *         }
 *       ]
 *     }
 *   },
 *   "/execucoes/stats/summary": {
 *     "get": {
 *       "tags": [
 *         "Execuções"
 *       ],
 *       "operationId": "get_execucoes_stats_summary",
 *       "summary": "Consultar totais de resultados",
 *       "description": "Contagens de execution_results e execuções/finalizadas. Não filtra uniformemente soft delete; números normalizados por parseInt.",
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
 *                 "$ref": "#/components/schemas/ExecutionStats"
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
 *         "RN-014"
 *       ],
 *       "x-source": "backend/src/routes/execucoesDetalhado.js"
 *     }
 *   },
 *   "/execucoes/{id}/results": {
 *     "get": {
 *       "tags": [
 *         "Execuções"
 *       ],
 *       "operationId": "get_execucoes_id_results",
 *       "summary": "Consultar resultados",
 *       "description": "JOIN com dados atuais do caso; não exige execução ativa nem produz 404 pela ausência da execução. Array vazio se sem linhas; ORDER BY er.created_at ASC.",
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
 *                 "type": "array",
 *                 "items": {
 *                   "$ref": "#/components/schemas/ExecutionResult"
 *                 }
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
 *         "422": {
 *           "$ref": "#/components/responses/Http422"
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
 *         "RN-014"
 *       ],
 *       "x-source": "backend/src/routes/execucoesDetalhado.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/LegacyId"
 *         }
 *       ]
 *     }
 *   },
 *   "/execucoes/{id}/results/{projetoId}": {
 *     "put": {
 *       "tags": [
 *         "Execuções"
 *       ],
 *       "operationId": "put_execucoes_id_results_projetoId",
 *       "summary": "Atualizar resultado e comentário",
 *       "description": "Consulta finalized e rejeita com 422; resultado ausente 404. Status obrigatório; comentário omitido/vazio pode virar null. Atualiza resultado e depois execução running sem transação abrangente. Não filtra execução soft-deletada; corrida com finalize não é atomicamente bloqueada.",
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
 *                 "$ref": "#/components/schemas/ExecutionResult"
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
 *         "403": {
 *           "$ref": "#/components/responses/Http403"
 *         },
 *         "404": {
 *           "$ref": "#/components/responses/Http404"
 *         },
 *         "413": {
 *           "$ref": "#/components/responses/Http413"
 *         },
 *         "422": {
 *           "$ref": "#/components/responses/Http422"
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
 *         "qa"
 *       ],
 *       "x-business-rules": [
 *         "RN-014"
 *       ],
 *       "x-source": "backend/src/routes/execucoesDetalhado.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/LegacyId"
 *         },
 *         {
 *           "$ref": "#/components/parameters/ProjetoId"
 *         }
 *       ],
 *       "requestBody": {
 *         "required": true,
 *         "description": "Objeto JSON; campos desconhecidos são descartados quando há validator Zod.",
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "$ref": "#/components/schemas/ResultUpdate"
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   "/execucoes/{id}/finalize": {
 *     "post": {
 *       "tags": [
 *         "Execuções"
 *       ],
 *       "operationId": "post_execucoes_id_finalize",
 *       "summary": "Finalizar execução",
 *       "description": "Ausente 404; já finalizada 422. Algum failed => failed; todos passed com total positivo => passed; demais => completed, inclusive pending/zero resultados. Marca finalized=true. Sem transação/lock abrangente; não filtra deleted_at e PUT geral não é bloqueado por essa guarda. Política caracterizada, não correção dos riscos.",
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
 *                 "$ref": "#/components/schemas/Execution"
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
 *         "403": {
 *           "$ref": "#/components/responses/Http403"
 *         },
 *         "404": {
 *           "$ref": "#/components/responses/Http404"
 *         },
 *         "413": {
 *           "$ref": "#/components/responses/Http413"
 *         },
 *         "422": {
 *           "$ref": "#/components/responses/Http422"
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
 *         "qa"
 *       ],
 *       "x-business-rules": [
 *         "RN-013",
 *         "RN-014"
 *       ],
 *       "x-source": "backend/src/routes/execucoesDetalhado.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/LegacyId"
 *         }
 *       ]
 *     }
 *   }
 * }
 */
