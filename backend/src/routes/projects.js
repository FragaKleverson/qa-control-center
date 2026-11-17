const express = require("express");
const router = express.Router();
const service = require("../services/projectCatalogService");
const { authorize } = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const { idParamSchema, listQuerySchema, createSchema, updateSchema } = require("../validators/projects");
const actor = (req) => ({ userId: req.user.id, ipAddress: req.ip });

// authenticate is mounted by app.js before this router, as for other protected resources.
router.use(authorize());
router.get("/", validate(listQuerySchema, "query"), async (req, res, next) => {
  try {
    // Express 5 query is a getter; explicitly pass the parsed values.
    res.json(await service.listAll(listQuerySchema.parse(req.query)));
  } catch (err) { next(err); }
});
router.get("/:id", validate(idParamSchema, "params"), async (req, res, next) => {
  try { res.json(await service.getById(req.params.id)); } catch (err) { next(err); }
});
router.post("/", authorize("admin", "qa"), validate(createSchema), async (req, res, next) => {
  try { res.status(201).json(await service.create(req.body, actor(req))); } catch (err) { next(err); }
});
router.put("/:id", authorize("admin", "qa"), validate(idParamSchema, "params"), validate(updateSchema), async (req, res, next) => {
  try { res.json(await service.update(req.params.id, req.body, actor(req))); } catch (err) { next(err); }
});
router.delete("/:id", authorize("admin"), validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    await service.delete(req.params.id, actor(req));
    res.json({ message: "Project excluído com sucesso" });
  } catch (err) { next(err); }
});
router.post("/:id/restore", authorize("admin"), validate(idParamSchema, "params"), async (req, res, next) => {
  try { res.json(await service.restore(req.params.id, actor(req))); } catch (err) { next(err); }
});
module.exports = router;
/**
 * @openapi
 * {
 *   "/projects": {
 *     "get": {
 *       "tags": [
 *         "Projects"
 *       ],
 *       "operationId": "get_projects",
 *       "summary": "Listar Project",
 *       "description": "Catálogo independente. Leituras somente ativas; nome trim; autoria do servidor; descricao:null limpa. Escrita/auditoria transacionais. Paginação opt-in; sem page/limit retorna array. Ordenação default por created_at DESC; Projects/Plans/Executions e casos têm desempate por id, Suites/Requirements não.",
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
 *                 "$ref": "#/components/schemas/ProjectList"
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
 *         "RN-018"
 *       ],
 *       "x-source": "backend/src/routes/projects.js",
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
 *         "Projects"
 *       ],
 *       "operationId": "post_projects",
 *       "summary": "Criar Project",
 *       "description": "Catálogo independente. Leituras somente ativas; nome trim; autoria do servidor; descricao:null limpa. Escrita/auditoria transacionais. ID, autoria, timestamps e deleted_at enviados pelo cliente são descartados.",
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
 *                 "$ref": "#/components/schemas/Project"
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
 *         "RN-018"
 *       ],
 *       "x-source": "backend/src/routes/projects.js",
 *       "requestBody": {
 *         "required": true,
 *         "description": "Objeto JSON; campos desconhecidos são descartados quando há validator Zod.",
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "$ref": "#/components/schemas/ProjectCreate"
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   "/projects/{id}": {
 *     "get": {
 *       "tags": [
 *         "Projects"
 *       ],
 *       "operationId": "get_projects_id",
 *       "summary": "Consultar Project",
 *       "description": "Catálogo independente. Leituras somente ativas; nome trim; autoria do servidor; descricao:null limpa. Escrita/auditoria transacionais.",
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
 *                 "$ref": "#/components/schemas/Project"
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
 *         "RN-018"
 *       ],
 *       "x-source": "backend/src/routes/projects.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/ProjectId"
 *         }
 *       ]
 *     },
 *     "put": {
 *       "tags": [
 *         "Projects"
 *       ],
 *       "operationId": "put_projects_id",
 *       "summary": "Atualizar Project",
 *       "description": "Catálogo independente. Leituras somente ativas; nome trim; autoria do servidor; descricao:null limpa. Escrita/auditoria transacionais. PUT parcial: campos omitidos preservam valores.",
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
 *                 "$ref": "#/components/schemas/Project"
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
 *         "RN-018"
 *       ],
 *       "x-source": "backend/src/routes/projects.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/ProjectId"
 *         }
 *       ],
 *       "requestBody": {
 *         "required": true,
 *         "description": "Objeto JSON; campos desconhecidos são descartados quando há validator Zod.",
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "$ref": "#/components/schemas/ProjectUpdate"
 *             }
 *           }
 *         }
 *       }
 *     },
 *     "delete": {
 *       "tags": [
 *         "Projects"
 *       ],
 *       "operationId": "delete_projects_id",
 *       "summary": "Excluir logicamente Project",
 *       "description": "Catálogo independente. Leituras somente ativas; nome trim; autoria do servidor; descricao:null limpa. Escrita/auditoria transacionais. Preenche deleted_at sem excluir fisicamente. Repetição/ausente retorna 404.",
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
 *         "RN-018"
 *       ],
 *       "x-source": "backend/src/routes/projects.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/ProjectId"
 *         }
 *       ]
 *     }
 *   },
 *   "/projects/{id}/restore": {
 *     "post": {
 *       "tags": [
 *         "Projects"
 *       ],
 *       "operationId": "post_projects_id_restore",
 *       "summary": "Restaurar Project",
 *       "description": "Catálogo independente. Leituras somente ativas; nome trim; autoria do servidor; descricao:null limpa. Escrita/auditoria transacionais. Limpa deleted_at; ativo/ausente retorna 404; preserva identidade/vínculos e bloqueios do plano. Sem UI administrativa de restauração.",
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
 *                 "$ref": "#/components/schemas/Project"
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
 *         "RN-018"
 *       ],
 *       "x-source": "backend/src/routes/projects.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/ProjectId"
 *         }
 *       ]
 *     }
 *   }
 * }
 */
