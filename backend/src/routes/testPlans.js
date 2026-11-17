const express = require("express");
const router = express.Router();
const { testPlansService } = require("../services");
const { logAudit } = require("../services/auditService");
const { validate } = require("../middleware/validate");
const { authorize } = require("../middleware/authorize");
const { idParamSchema, idAndSuiteIdSchema, paginationQuerySchema } = require("../validators/common");
const { createSchema, updateSchema, addSuiteSchema, executeSchema } = require("../validators/testPlans");

// GET - Listar todos os test plans (opcionalmente paginado via ?page=&limit=)
router.get("/", validate(paginationQuerySchema, "query"), async (req, res, next) => {
  try {
    const plans = await testPlansService.listAll(req.query);
    res.json(plans);
  } catch (err) {
    next(err);
  }
});

// GET - Obter test plan por ID
router.get("/:id", validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    const plan = await testPlansService.getById(req.params.id);
    if (!plan) return res.status(404).json({ error: "Test plan não encontrado" });
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

// POST - Criar novo test plan
router.post("/", authorize("admin", "qa"), validate(createSchema), async (req, res, next) => {
  try {
    const plan = await testPlansService.create(req.body);
    await logAudit({ userId: req.user?.id, entityType: "test_plan", entityId: plan.id, action: "CREATE", newValues: plan, ipAddress: req.ip });
    res.status(201).json(plan);
  } catch (err) {
    next(err);
  }
});

// PUT - Atualizar test plan
router.put("/:id", authorize("admin", "qa"), validate(idParamSchema, "params"), validate(updateSchema), async (req, res, next) => {
  try {
    const old = await testPlansService.getById(req.params.id);
    const plan = await testPlansService.update(req.params.id, req.body);
    await logAudit({ userId: req.user?.id, entityType: "test_plan", entityId: plan.id, action: "UPDATE", oldValues: old, newValues: plan, ipAddress: req.ip });
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

// DELETE - Deletar test plan
router.delete("/:id", authorize("admin"), validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    const deleted = await testPlansService.delete(req.params.id);
    await logAudit({ userId: req.user?.id, entityType: "test_plan", entityId: parseInt(req.params.id), action: "DELETE", oldValues: deleted, ipAddress: req.ip });
    res.json({ message: "Test plan deletado com sucesso" });
  } catch (err) {
    next(err);
  }
});

// GET - Listar suites de um plan
router.get("/:id/suites", validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    const suites = await testPlansService.getSuites(req.params.id);
    res.json(suites);
  } catch (err) {
    next(err);
  }
});

// POST - Vincular suite a um plan
router.post("/:id/suites", authorize("admin", "qa"), validate(idParamSchema, "params"), validate(addSuiteSchema), async (req, res, next) => {
  try {
    const result = await testPlansService.addSuite(req.params.id, req.body.suite_id);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// DELETE - Desvincular suite de um plan
router.delete("/:id/suites/:suiteId", authorize("admin"), validate(idAndSuiteIdSchema, "params"), async (req, res, next) => {
  try {
    await testPlansService.removeSuite(req.params.id, req.params.suiteId);
    res.json({ message: "Suite removida do plan" });
  } catch (err) {
    next(err);
  }
});

// POST - Executar plan
router.post("/:id/execute", authorize("admin", "qa"), validate(idParamSchema, "params"), validate(executeSchema), async (req, res, next) => {
  try {
    const execucao = await testPlansService.execute(req.params.id, req.user?.id ?? null);
    res.status(201).json(execucao);
  } catch (err) {
    next(err);
  }
});

// POST - Restaurar test plan soft-deletado (admin only)
router.post("/:id/restore", authorize("admin"), validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    const restored = await testPlansService.restore(req.params.id);
    await logAudit({ userId: req.user?.id, entityType: "test_plan", entityId: restored.id, action: "RESTORE", newValues: restored, ipAddress: req.ip });
    res.json(restored);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
/**
 * @openapi
 * {
 *   "/test-plans": {
 *     "get": {
 *       "tags": [
 *         "Test Plans"
 *       ],
 *       "operationId": "get_test_plans",
 *       "summary": "Listar TestPlan",
 *       "description": "Planos eligible podem ser editados; review_required/executed ou executed_at bloqueiam mutações e reexecução. Ambiente canônico obrigatório ao criar. Consulta adiciona vínculo de execução, sem created_by. Paginação opt-in; sem page/limit retorna array. Ordenação default por created_at DESC; Projects/Plans/Executions e casos têm desempate por id, Suites/Requirements não.",
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
 *                 "$ref": "#/components/schemas/TestPlanList"
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
 *         "RN-011",
 *         "RN-012",
 *         "RN-015"
 *       ],
 *       "x-source": "backend/src/routes/testPlans.js",
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
 *         "Test Plans"
 *       ],
 *       "operationId": "post_test_plans",
 *       "summary": "Criar TestPlan",
 *       "description": "Planos eligible podem ser editados; review_required/executed ou executed_at bloqueiam mutações e reexecução. Ambiente canônico obrigatório ao criar. Consulta adiciona vínculo de execução, sem created_by.",
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
 *                 "$ref": "#/components/schemas/TestPlan"
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
 *         "RN-011",
 *         "RN-012",
 *         "RN-015"
 *       ],
 *       "x-source": "backend/src/routes/testPlans.js",
 *       "requestBody": {
 *         "required": true,
 *         "description": "Objeto JSON; campos desconhecidos são descartados quando há validator Zod.",
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "$ref": "#/components/schemas/TestPlanCreate"
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   "/test-plans/{id}": {
 *     "get": {
 *       "tags": [
 *         "Test Plans"
 *       ],
 *       "operationId": "get_test_plans_id",
 *       "summary": "Consultar TestPlan",
 *       "description": "Planos eligible podem ser editados; review_required/executed ou executed_at bloqueiam mutações e reexecução. Ambiente canônico obrigatório ao criar. Consulta adiciona vínculo de execução, sem created_by.",
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
 *                 "$ref": "#/components/schemas/TestPlan"
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
 *         "RN-011",
 *         "RN-012",
 *         "RN-015"
 *       ],
 *       "x-source": "backend/src/routes/testPlans.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/LegacyId"
 *         }
 *       ]
 *     },
 *     "put": {
 *       "tags": [
 *         "Test Plans"
 *       ],
 *       "operationId": "put_test_plans_id",
 *       "summary": "Atualizar TestPlan",
 *       "description": "Planos eligible podem ser editados; review_required/executed ou executed_at bloqueiam mutações e reexecução. Ambiente canônico obrigatório ao criar. Consulta adiciona vínculo de execução, sem created_by. PUT parcial: campos omitidos preservam valores. Estado de plano pode produzir 409.",
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
 *                 "$ref": "#/components/schemas/TestPlan"
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
 *         "RN-011",
 *         "RN-012",
 *         "RN-015"
 *       ],
 *       "x-source": "backend/src/routes/testPlans.js",
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
 *               "$ref": "#/components/schemas/TestPlanUpdate"
 *             }
 *           }
 *         }
 *       }
 *     },
 *     "delete": {
 *       "tags": [
 *         "Test Plans"
 *       ],
 *       "operationId": "delete_test_plans_id",
 *       "summary": "Excluir logicamente TestPlan",
 *       "description": "Planos eligible podem ser editados; review_required/executed ou executed_at bloqueiam mutações e reexecução. Ambiente canônico obrigatório ao criar. Consulta adiciona vínculo de execução, sem created_by. Preenche deleted_at sem excluir fisicamente. Repetição/ausente retorna 404. Em planos, delete é permitido também a executados e não os desbloqueia.",
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
 *         "RN-011",
 *         "RN-012",
 *         "RN-015"
 *       ],
 *       "x-source": "backend/src/routes/testPlans.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/LegacyId"
 *         }
 *       ]
 *     }
 *   },
 *   "/test-plans/{id}/restore": {
 *     "post": {
 *       "tags": [
 *         "Test Plans"
 *       ],
 *       "operationId": "post_test_plans_id_restore",
 *       "summary": "Restaurar TestPlan",
 *       "description": "Planos eligible podem ser editados; review_required/executed ou executed_at bloqueiam mutações e reexecução. Ambiente canônico obrigatório ao criar. Consulta adiciona vínculo de execução, sem created_by. Limpa deleted_at; ativo/ausente retorna 404; preserva identidade/vínculos e bloqueios do plano. Sem UI administrativa de restauração.",
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
 *                 "$ref": "#/components/schemas/TestPlan"
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
 *         "RN-011",
 *         "RN-012",
 *         "RN-015"
 *       ],
 *       "x-source": "backend/src/routes/testPlans.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/LegacyId"
 *         }
 *       ]
 *     }
 *   },
 *   "/test-plans/{id}/suites": {
 *     "get": {
 *       "tags": [
 *         "Test Plans"
 *       ],
 *       "operationId": "get_test_plans_id_suites",
 *       "summary": "Consultar suítes do plano",
 *       "description": "Plano ativo obrigatório (404 caso ausente/excluído). Preserva vínculos de suítes excluídas; total_cases conta casos ativos atuais.",
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
 *                   "$ref": "#/components/schemas/TestSuite"
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
 *         "RN-011",
 *         "RN-012"
 *       ],
 *       "x-source": "backend/src/routes/testPlans.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/LegacyId"
 *         }
 *       ]
 *     },
 *     "post": {
 *       "tags": [
 *         "Test Plans"
 *       ],
 *       "operationId": "post_test_plans_id_suites",
 *       "summary": "Vincular suíte",
 *       "description": "Plano ativo eligible não executado; suíte ativa necessária (404). Lock de plano e transação; ON CONFLICT devolve vínculo existente; estado bloqueado 409.",
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
 *                 "$ref": "#/components/schemas/PlanSuiteLink"
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
 *         "RN-011"
 *       ],
 *       "x-source": "backend/src/routes/testPlans.js",
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
 *               "$ref": "#/components/schemas/AddSuiteInput"
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   "/test-plans/{id}/suites/{suiteId}": {
 *     "delete": {
 *       "tags": [
 *         "Test Plans"
 *       ],
 *       "operationId": "delete_test_plans_id_suites_suiteId",
 *       "summary": "Remover vínculo de suíte",
 *       "description": "Lock/transação e elegibilidade do plano. Remove associação física; inexistência do vínculo não gera 404 por si só. Plano ausente/excluído 404; estado bloqueado 409.",
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
 *         "admin"
 *       ],
 *       "x-business-rules": [
 *         "RN-006",
 *         "RN-011"
 *       ],
 *       "x-source": "backend/src/routes/testPlans.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/LegacyId"
 *         },
 *         {
 *           "$ref": "#/components/parameters/SuiteId"
 *         }
 *       ]
 *     }
 *   },
 *   "/test-plans/{id}/execute": {
 *     "post": {
 *       "tags": [
 *         "Test Plans"
 *       ],
 *       "operationId": "post_test_plans_id_execute",
 *       "summary": "Executar plano uma única vez",
 *       "description": "Ambiente vem do plano. Exige plano ativo eligible, suíte ativa e caso ativo; deduplica casos. Cria execução/resultados pending e executed_at na mesma transação com lock. Falta de suítes/casos ou reexecução: 409. UNIQUE plan_id persiste após soft delete. suite_id é a primeira suíte ativa; não snapshot completo. Não executa runner de automação.",
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
 *         "RN-011",
 *         "RN-012"
 *       ],
 *       "x-source": "backend/src/routes/testPlans.js",
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
 *               "$ref": "#/components/schemas/ExecutePlanInput"
 *             }
 *           }
 *         }
 *       }
 *     }
 *   }
 * }
 */
