const express = require("express");
const router = express.Router();
const { testSuitesService } = require("../services");
const { logAudit } = require("../services/auditService");
const { validate } = require("../middleware/validate");
const { authorize } = require("../middleware/authorize");
const { idParamSchema, idAndProjetoIdSchema, paginationQuerySchema } = require("../validators/common");
const { createSchema, updateSchema, addCaseSchema } = require("../validators/testSuites");

// GET - Listar todos os test suites (opcionalmente paginado via ?page=&limit=)
router.get("/", validate(paginationQuerySchema, "query"), async (req, res, next) => {
  try {
    const suites = await testSuitesService.listAll(req.query);
    res.json(suites);
  } catch (err) {
    next(err);
  }
});

// GET - Obter test suite por ID
router.get("/:id", validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    const suite = await testSuitesService.getById(req.params.id);
    if (!suite) return res.status(404).json({ error: "Test suite não encontrada" });
    res.json(suite);
  } catch (err) {
    next(err);
  }
});

// GET - Listar test cases de uma suite
router.get("/:id/cases", validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    const cases = await testSuitesService.getCases(req.params.id);
    res.json(cases);
  } catch (err) {
    next(err);
  }
});

// POST - Criar novo test suite
router.post("/", authorize("admin", "qa"), validate(createSchema), async (req, res, next) => {
  try {
    const suite = await testSuitesService.create(req.body, req.user?.id ?? null);
    await logAudit({ userId: req.user?.id, entityType: "test_suite", entityId: suite.id, action: "CREATE", newValues: suite, ipAddress: req.ip });
    res.status(201).json(suite);
  } catch (err) {
    next(err);
  }
});

// PUT - Atualizar test suite
router.put("/:id", authorize("admin", "qa"), validate(idParamSchema, "params"), validate(updateSchema), async (req, res, next) => {
  try {
    const old = await testSuitesService.getById(req.params.id);
    const suite = await testSuitesService.update(req.params.id, req.body);
    await logAudit({ userId: req.user?.id, entityType: "test_suite", entityId: suite.id, action: "UPDATE", oldValues: old, newValues: suite, ipAddress: req.ip });
    res.json(suite);
  } catch (err) {
    next(err);
  }
});

// DELETE - Deletar test suite
router.delete("/:id", authorize("admin"), validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    const deleted = await testSuitesService.delete(req.params.id);
    await logAudit({ userId: req.user?.id, entityType: "test_suite", entityId: parseInt(req.params.id), action: "DELETE", oldValues: deleted, ipAddress: req.ip });
    res.json({ message: "Test suite deletada com sucesso" });
  } catch (err) {
    next(err);
  }
});

// POST - Vincular test case a uma suite
router.post("/:id/cases", authorize("admin", "qa"), validate(idParamSchema, "params"), validate(addCaseSchema), async (req, res, next) => {
  try {
    const result = await testSuitesService.addCase(req.params.id, req.body.projeto_id);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// DELETE - Desvincular test case de uma suite
router.delete("/:id/cases/:projetoId", authorize("admin"), validate(idAndProjetoIdSchema, "params"), async (req, res, next) => {
  try {
    await testSuitesService.removeCase(req.params.id, req.params.projetoId);
    res.json({ message: "Test case removido da suite" });
  } catch (err) {
    next(err);
  }
});

// POST - Restaurar test suite soft-deletada (admin only)
router.post("/:id/restore", authorize("admin"), validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    const restored = await testSuitesService.restore(req.params.id);
    await logAudit({ userId: req.user?.id, entityType: "test_suite", entityId: restored.id, action: "RESTORE", newValues: restored, ipAddress: req.ip });
    res.json(restored);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
/**
 * @openapi
 * {
 *   "/test-suites": {
 *     "get": {
 *       "tags": [
 *         "Test Suites"
 *       ],
 *       "operationId": "get_test_suites",
 *       "summary": "Listar TestSuite",
 *       "description": "Suíte de casos; projeto_id legado referencia projetos, não projects. PUT usa COALESCE/valores falsy. Paginação opt-in; sem page/limit retorna array. Ordenação default por created_at DESC; Projects/Plans/Executions e casos têm desempate por id, Suites/Requirements não.",
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
 *                 "$ref": "#/components/schemas/TestSuiteList"
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
 *         "RN-015",
 *         "RN-018"
 *       ],
 *       "x-source": "backend/src/routes/testSuites.js",
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
 *         "Test Suites"
 *       ],
 *       "operationId": "post_test_suites",
 *       "summary": "Criar TestSuite",
 *       "description": "Suíte de casos; projeto_id legado referencia projetos, não projects. PUT usa COALESCE/valores falsy.",
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
 *                 "$ref": "#/components/schemas/TestSuite"
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
 *         "RN-015",
 *         "RN-018"
 *       ],
 *       "x-source": "backend/src/routes/testSuites.js",
 *       "requestBody": {
 *         "required": true,
 *         "description": "Objeto JSON; campos desconhecidos são descartados quando há validator Zod.",
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "$ref": "#/components/schemas/TestSuiteCreate"
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   "/test-suites/{id}": {
 *     "get": {
 *       "tags": [
 *         "Test Suites"
 *       ],
 *       "operationId": "get_test_suites_id",
 *       "summary": "Consultar TestSuite",
 *       "description": "Suíte de casos; projeto_id legado referencia projetos, não projects. PUT usa COALESCE/valores falsy.",
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
 *                 "$ref": "#/components/schemas/TestSuite"
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
 *         "RN-015",
 *         "RN-018"
 *       ],
 *       "x-source": "backend/src/routes/testSuites.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/LegacyId"
 *         }
 *       ]
 *     },
 *     "put": {
 *       "tags": [
 *         "Test Suites"
 *       ],
 *       "operationId": "put_test_suites_id",
 *       "summary": "Atualizar TestSuite",
 *       "description": "Suíte de casos; projeto_id legado referencia projetos, não projects. PUT usa COALESCE/valores falsy. PUT parcial: campos omitidos preservam valores.",
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
 *                 "$ref": "#/components/schemas/TestSuite"
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
 *         "RN-015",
 *         "RN-018"
 *       ],
 *       "x-source": "backend/src/routes/testSuites.js",
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
 *               "$ref": "#/components/schemas/TestSuiteUpdate"
 *             }
 *           }
 *         }
 *       }
 *     },
 *     "delete": {
 *       "tags": [
 *         "Test Suites"
 *       ],
 *       "operationId": "delete_test_suites_id",
 *       "summary": "Excluir logicamente TestSuite",
 *       "description": "Suíte de casos; projeto_id legado referencia projetos, não projects. PUT usa COALESCE/valores falsy. Preenche deleted_at sem excluir fisicamente. Repetição/ausente retorna 404.",
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
 *         "RN-015",
 *         "RN-018"
 *       ],
 *       "x-source": "backend/src/routes/testSuites.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/LegacyId"
 *         }
 *       ]
 *     }
 *   },
 *   "/test-suites/{id}/restore": {
 *     "post": {
 *       "tags": [
 *         "Test Suites"
 *       ],
 *       "operationId": "post_test_suites_id_restore",
 *       "summary": "Restaurar TestSuite",
 *       "description": "Suíte de casos; projeto_id legado referencia projetos, não projects. PUT usa COALESCE/valores falsy. Limpa deleted_at; ativo/ausente retorna 404; preserva identidade/vínculos e bloqueios do plano. Sem UI administrativa de restauração.",
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
 *                 "$ref": "#/components/schemas/TestSuite"
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
 *         "RN-015",
 *         "RN-018"
 *       ],
 *       "x-source": "backend/src/routes/testSuites.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/LegacyId"
 *         }
 *       ]
 *     }
 *   },
 *   "/test-suites/{id}/cases": {
 *     "get": {
 *       "tags": [
 *         "Test Suites"
 *       ],
 *       "operationId": "get_test_suites_id_cases",
 *       "summary": "Consultar casos vinculados",
 *       "description": "Consulta vínculo legado por suite_id; não verifica existência/ativo da suíte e não filtra deleted_at dos casos. Sem linhas retorna array vazio, não 404 garantido.",
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
 *                   "$ref": "#/components/schemas/TestCase"
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
 *         "RN-006",
 *         "RN-007"
 *       ],
 *       "x-source": "backend/src/routes/testSuites.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/LegacyId"
 *         }
 *       ]
 *     },
 *     "post": {
 *       "tags": [
 *         "Test Suites"
 *       ],
 *       "operationId": "post_test_suites_id_cases",
 *       "summary": "Vincular caso",
 *       "description": "projeto_id referencia caso legado. ON CONFLICT não duplica; FK inválida pode gerar 422. Não impõe a mesma verificação de ativo do serviço de planos.",
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
 *                 "$ref": "#/components/schemas/SuiteCaseLink"
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
 *         "RN-007"
 *       ],
 *       "x-source": "backend/src/routes/testSuites.js",
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
 *               "$ref": "#/components/schemas/AddCaseInput"
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   "/test-suites/{id}/cases/{projetoId}": {
 *     "delete": {
 *       "tags": [
 *         "Test Suites"
 *       ],
 *       "operationId": "delete_test_suites_id_cases_projetoId",
 *       "summary": "Remover vínculo de caso",
 *       "description": "DELETE físico somente da associação; não exclui caso. Responde mensagem mesmo sem vínculo correspondente; não garante 404.",
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
 *         "RN-015"
 *       ],
 *       "x-source": "backend/src/routes/testSuites.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/LegacyId"
 *         },
 *         {
 *           "$ref": "#/components/parameters/ProjetoId"
 *         }
 *       ]
 *     }
 *   }
 * }
 */
