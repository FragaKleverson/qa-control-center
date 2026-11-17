const express = require("express");
const router = express.Router();
const { requirementsService } = require("../services");
const { logAudit } = require("../services/auditService");
const { validate } = require("../middleware/validate");
const { authorize } = require("../middleware/authorize");
const { idParamSchema, paginationQuerySchema } = require("../validators/common");
const { createSchema, updateSchema } = require("../validators/requirements");

// GET - Listar todos os requirements (opcionalmente paginado via ?page=&limit=)
router.get("/", validate(paginationQuerySchema, "query"), async (req, res, next) => {
  try {
    const requirements = await requirementsService.listAll(req.query);
    res.json(requirements);
  } catch (err) {
    next(err);
  }
});

// GET - Obter requirement por ID
router.get("/:id", validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    const requirement = await requirementsService.getById(req.params.id);
    if (!requirement) return res.status(404).json({ error: "Requirement não encontrado" });
    res.json(requirement);
  } catch (err) {
    next(err);
  }
});

// POST - Criar novo requirement
router.post("/", authorize("admin", "qa"), validate(createSchema), async (req, res, next) => {
  try {
    const requirement = await requirementsService.create(req.body, req.user?.id ?? null);
    await logAudit({ userId: req.user?.id, entityType: "requirement", entityId: requirement.id, action: "CREATE", newValues: requirement, ipAddress: req.ip });
    res.status(201).json(requirement);
  } catch (err) {
    next(err);
  }
});

// PUT - Atualizar requirement
router.put("/:id", authorize("admin", "qa"), validate(idParamSchema, "params"), validate(updateSchema), async (req, res, next) => {
  try {
    const old = await requirementsService.getById(req.params.id);
    const requirement = await requirementsService.update(req.params.id, req.body);
    await logAudit({ userId: req.user?.id, entityType: "requirement", entityId: requirement.id, action: "UPDATE", oldValues: old, newValues: requirement, ipAddress: req.ip });
    res.json(requirement);
  } catch (err) {
    next(err);
  }
});

// DELETE - Deletar requirement
router.delete("/:id", authorize("admin"), validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    const deleted = await requirementsService.delete(req.params.id);
    await logAudit({ userId: req.user?.id, entityType: "requirement", entityId: parseInt(req.params.id), action: "DELETE", oldValues: deleted, ipAddress: req.ip });
    res.json({ message: "Requirement deletado com sucesso" });
  } catch (err) {
    next(err);
  }
});

// POST - Restaurar requirement soft-deletado (admin only)
router.post("/:id/restore", authorize("admin"), validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    const restored = await requirementsService.restore(req.params.id);
    await logAudit({ userId: req.user?.id, entityType: "requirement", entityId: restored.id, action: "RESTORE", newValues: restored, ipAddress: req.ip });
    res.json(restored);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
/**
 * @openapi
 * {
 *   "/requirements": {
 *     "get": {
 *       "tags": [
 *         "Requirements"
 *       ],
 *       "operationId": "get_requirements",
 *       "summary": "Listar Requirement",
 *       "description": "Sem vínculo com Projects/casos. Domínios Open/In Progress/Closed/Blocked e Low/Medium/High/Critical. Update não limpa descrição vazia pelo COALESCE. Paginação opt-in; sem page/limit retorna array. Ordenação default por created_at DESC; Projects/Plans/Executions e casos têm desempate por id, Suites/Requirements não.",
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
 *                 "$ref": "#/components/schemas/RequirementList"
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
 *         "RN-010",
 *         "RN-015",
 *         "RN-018"
 *       ],
 *       "x-source": "backend/src/routes/requirements.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/Page"
 *         },
 *         {
 *           "$ref": "#/components/parameters/Limit"
 *         }
 *       ]
 *     },
 *     "post": {
 *       "tags": [
 *         "Requirements"
 *       ],
 *       "operationId": "post_requirements",
 *       "summary": "Criar Requirement",
 *       "description": "Sem vínculo com Projects/casos. Domínios Open/In Progress/Closed/Blocked e Low/Medium/High/Critical. Update não limpa descrição vazia pelo COALESCE.",
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
 *                 "$ref": "#/components/schemas/Requirement"
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
 *         "RN-010",
 *         "RN-015",
 *         "RN-018"
 *       ],
 *       "x-source": "backend/src/routes/requirements.js",
 *       "requestBody": {
 *         "required": true,
 *         "description": "Objeto JSON; campos desconhecidos são descartados quando há validator Zod.",
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "$ref": "#/components/schemas/RequirementCreate"
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   "/requirements/{id}": {
 *     "get": {
 *       "tags": [
 *         "Requirements"
 *       ],
 *       "operationId": "get_requirements_id",
 *       "summary": "Consultar Requirement",
 *       "description": "Sem vínculo com Projects/casos. Domínios Open/In Progress/Closed/Blocked e Low/Medium/High/Critical. Update não limpa descrição vazia pelo COALESCE.",
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
 *                 "$ref": "#/components/schemas/Requirement"
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
 *         "RN-010",
 *         "RN-015",
 *         "RN-018"
 *       ],
 *       "x-source": "backend/src/routes/requirements.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/LegacyId"
 *         }
 *       ]
 *     },
 *     "put": {
 *       "tags": [
 *         "Requirements"
 *       ],
 *       "operationId": "put_requirements_id",
 *       "summary": "Atualizar Requirement",
 *       "description": "Sem vínculo com Projects/casos. Domínios Open/In Progress/Closed/Blocked e Low/Medium/High/Critical. Update não limpa descrição vazia pelo COALESCE. PUT parcial: campos omitidos preservam valores.",
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
 *                 "$ref": "#/components/schemas/Requirement"
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
 *         "RN-010",
 *         "RN-015",
 *         "RN-018"
 *       ],
 *       "x-source": "backend/src/routes/requirements.js",
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
 *               "$ref": "#/components/schemas/RequirementUpdate"
 *             }
 *           }
 *         }
 *       }
 *     },
 *     "delete": {
 *       "tags": [
 *         "Requirements"
 *       ],
 *       "operationId": "delete_requirements_id",
 *       "summary": "Excluir logicamente Requirement",
 *       "description": "Sem vínculo com Projects/casos. Domínios Open/In Progress/Closed/Blocked e Low/Medium/High/Critical. Update não limpa descrição vazia pelo COALESCE. Preenche deleted_at sem excluir fisicamente. Repetição/ausente retorna 404.",
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
 *         "RN-010",
 *         "RN-015",
 *         "RN-018"
 *       ],
 *       "x-source": "backend/src/routes/requirements.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/LegacyId"
 *         }
 *       ]
 *     }
 *   },
 *   "/requirements/{id}/restore": {
 *     "post": {
 *       "tags": [
 *         "Requirements"
 *       ],
 *       "operationId": "post_requirements_id_restore",
 *       "summary": "Restaurar Requirement",
 *       "description": "Sem vínculo com Projects/casos. Domínios Open/In Progress/Closed/Blocked e Low/Medium/High/Critical. Update não limpa descrição vazia pelo COALESCE. Limpa deleted_at; ativo/ausente retorna 404; preserva identidade/vínculos e bloqueios do plano. Sem UI administrativa de restauração.",
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
 *                 "$ref": "#/components/schemas/Requirement"
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
 *         "RN-010",
 *         "RN-015",
 *         "RN-018"
 *       ],
 *       "x-source": "backend/src/routes/requirements.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/LegacyId"
 *         }
 *       ]
 *     }
 *   }
 * }
 */
