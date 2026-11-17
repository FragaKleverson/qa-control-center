const express = require("express");
const router = express.Router();
const { projectsService } = require("../services");
const { logAudit } = require("../services/auditService");
const { validate } = require("../middleware/validate");
const { authorize } = require("../middleware/authorize");
const { idParamSchema } = require("../validators/common");
const { createSchema, updateSchema, listQuerySchema } = require("../validators/projetos");


// GET - Listar todos os projetos (opcionalmente paginado via ?page=&limit=)
router.get("/", validate(listQuerySchema, "query"), async (req, res, next) => {
  try {
    // Express 5 expõe req.query por getter; usa os valores transformados do schema.
    const projetos = await projectsService.listAll(listQuerySchema.parse(req.query));
    res.json(projetos);
  } catch (err) {
    next(err);
  }
});


// GET - Obter projeto por ID
router.get("/:id", validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    const projeto = await projectsService.getById(req.params.id);
    if (!projeto) return res.status(404).json({ error: "Projeto não encontrado" });
    res.json(projeto);
  } catch (err) {
    next(err);
  }
});


// POST - Criar novo projeto
router.post("/", authorize("admin", "qa"), validate(createSchema), async (req, res, next) => {
  try {
    const projeto = await projectsService.create(req.body, req.user?.id ?? null);
    await logAudit({ userId: req.user?.id, entityType: "projeto", entityId: projeto.id, action: "CREATE", newValues: projeto, ipAddress: req.ip });
    res.status(201).json(projeto);
  } catch (err) {
    next(err);
  }
});


// PUT - Atualizar projeto
router.put("/:id", authorize("admin", "qa"), validate(idParamSchema, "params"), validate(updateSchema), async (req, res, next) => {
  try {
    const old = await projectsService.getById(req.params.id);
    const projeto = await projectsService.update(req.params.id, req.body);
    await logAudit({ userId: req.user?.id, entityType: "projeto", entityId: projeto.id, action: "UPDATE", oldValues: old, newValues: projeto, ipAddress: req.ip });
    res.json(projeto);
  } catch (err) {
    next(err);
  }
});


// DELETE - Deletar projeto (soft delete)
router.delete("/:id", authorize("admin"), validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    const deleted = await projectsService.delete(req.params.id);
    await logAudit({ userId: req.user?.id, entityType: "projeto", entityId: parseInt(req.params.id), action: "DELETE", oldValues: deleted, ipAddress: req.ip });
    res.json({ message: "Projeto deletado com sucesso" });
  } catch (err) {
    next(err);
  }
});

// POST - Restaurar projeto soft-deletado (admin only)
router.post("/:id/restore", authorize("admin"), validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    const restored = await projectsService.restore(req.params.id);
    await logAudit({ userId: req.user?.id, entityType: "projeto", entityId: restored.id, action: "RESTORE", newValues: restored, ipAddress: req.ip });
    res.json(restored);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
/**
 * @openapi
 * {
 *   "/projetos": {
 *     "get": {
 *       "tags": [
 *         "Test Cases (legado)"
 *       ],
 *       "operationId": "get_projetos",
 *       "summary": "Listar TestCase",
 *       "description": "Casos de teste legados, não catálogo Projects. GET enriquece Project atual mesmo excluído; cenarios JSON livre. project_id omitido preserva/null remove/ID ativo vincula. Auditoria best-effort. Paginação opt-in; sem page/limit retorna array. Ordenação default por created_at DESC; Projects/Plans/Executions e casos têm desempate por id, Suites/Requirements não.",
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
 *                 "$ref": "#/components/schemas/TestCaseList"
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
 *         "RN-007",
 *         "RN-008",
 *         "RN-009",
 *         "RN-015",
 *         "RN-018",
 *         "RN-019"
 *       ],
 *       "x-source": "backend/src/routes/projetos.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/Page"
 *         },
 *         {
 *           "$ref": "#/components/parameters/Limit"
 *         },
 *         {
 *           "name": "sort_by",
 *           "in": "query",
 *           "required": false,
 *           "description": "Ordenação global; default created_at.",
 *           "schema": {
 *             "type": "string",
 *             "enum": [
 *               "id",
 *               "created_at"
 *             ]
 *           }
 *         },
 *         {
 *           "name": "sort_dir",
 *           "in": "query",
 *           "required": false,
 *           "description": "Direção; default desc; desempate por id.",
 *           "schema": {
 *             "type": "string",
 *             "enum": [
 *               "asc",
 *               "desc"
 *             ]
 *           }
 *         }
 *       ]
 *     },
 *     "post": {
 *       "tags": [
 *         "Test Cases (legado)"
 *       ],
 *       "operationId": "post_projetos",
 *       "summary": "Criar TestCase",
 *       "description": "Casos de teste legados, não catálogo Projects. GET enriquece Project atual mesmo excluído; cenarios JSON livre. project_id omitido preserva/null remove/ID ativo vincula. Auditoria best-effort.",
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
 *                 "$ref": "#/components/schemas/TestCase"
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
 *         "RN-007",
 *         "RN-008",
 *         "RN-009",
 *         "RN-015",
 *         "RN-018",
 *         "RN-019"
 *       ],
 *       "x-source": "backend/src/routes/projetos.js",
 *       "requestBody": {
 *         "required": true,
 *         "description": "Objeto JSON; campos desconhecidos são descartados quando há validator Zod.",
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "$ref": "#/components/schemas/TestCaseCreate"
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   "/projetos/{id}": {
 *     "get": {
 *       "tags": [
 *         "Test Cases (legado)"
 *       ],
 *       "operationId": "get_projetos_id",
 *       "summary": "Consultar TestCase",
 *       "description": "Casos de teste legados, não catálogo Projects. GET enriquece Project atual mesmo excluído; cenarios JSON livre. project_id omitido preserva/null remove/ID ativo vincula. Auditoria best-effort.",
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
 *                 "$ref": "#/components/schemas/TestCase"
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
 *         "RN-007",
 *         "RN-008",
 *         "RN-009",
 *         "RN-015",
 *         "RN-018",
 *         "RN-019"
 *       ],
 *       "x-source": "backend/src/routes/projetos.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/LegacyId"
 *         }
 *       ]
 *     },
 *     "put": {
 *       "tags": [
 *         "Test Cases (legado)"
 *       ],
 *       "operationId": "put_projetos_id",
 *       "summary": "Atualizar TestCase",
 *       "description": "Casos de teste legados, não catálogo Projects. GET enriquece Project atual mesmo excluído; cenarios JSON livre. project_id omitido preserva/null remove/ID ativo vincula. Auditoria best-effort. PUT parcial: campos omitidos preservam valores.",
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
 *                 "$ref": "#/components/schemas/TestCase"
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
 *         "RN-007",
 *         "RN-008",
 *         "RN-009",
 *         "RN-015",
 *         "RN-018",
 *         "RN-019"
 *       ],
 *       "x-source": "backend/src/routes/projetos.js",
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
 *               "$ref": "#/components/schemas/TestCaseUpdate"
 *             }
 *           }
 *         }
 *       }
 *     },
 *     "delete": {
 *       "tags": [
 *         "Test Cases (legado)"
 *       ],
 *       "operationId": "delete_projetos_id",
 *       "summary": "Excluir logicamente TestCase",
 *       "description": "Casos de teste legados, não catálogo Projects. GET enriquece Project atual mesmo excluído; cenarios JSON livre. project_id omitido preserva/null remove/ID ativo vincula. Auditoria best-effort. Preenche deleted_at sem excluir fisicamente. Repetição/ausente retorna 404.",
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
 *         "RN-007",
 *         "RN-008",
 *         "RN-009",
 *         "RN-015",
 *         "RN-018",
 *         "RN-019"
 *       ],
 *       "x-source": "backend/src/routes/projetos.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/LegacyId"
 *         }
 *       ]
 *     }
 *   },
 *   "/projetos/{id}/restore": {
 *     "post": {
 *       "tags": [
 *         "Test Cases (legado)"
 *       ],
 *       "operationId": "post_projetos_id_restore",
 *       "summary": "Restaurar TestCase",
 *       "description": "Casos de teste legados, não catálogo Projects. GET enriquece Project atual mesmo excluído; cenarios JSON livre. project_id omitido preserva/null remove/ID ativo vincula. Auditoria best-effort. Limpa deleted_at; ativo/ausente retorna 404; preserva identidade/vínculos e bloqueios do plano. Sem UI administrativa de restauração.",
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
 *                 "$ref": "#/components/schemas/TestCase"
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
 *         "RN-007",
 *         "RN-008",
 *         "RN-009",
 *         "RN-015",
 *         "RN-018",
 *         "RN-019"
 *       ],
 *       "x-source": "backend/src/routes/projetos.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/LegacyId"
 *         }
 *       ]
 *     }
 *   }
 * }
 */
