const express = require("express");
const router = express.Router();
const { testPlansService } = require("../services");
const { validate } = require("../middleware/validate");
const { authorize } = require("../middleware/authorize");
const { idParamSchema, idAndSuiteIdSchema } = require("../validators/common");
const { createSchema, updateSchema, addSuiteSchema, executeSchema } = require("../validators/testPlans");

// GET - Listar todos os test plans
router.get("/", async (req, res, next) => {
  try {
    const plans = await testPlansService.listAll();
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
    res.status(201).json(plan);
  } catch (err) {
    next(err);
  }
});

// PUT - Atualizar test plan
router.put("/:id", authorize("admin", "qa"), validate(idParamSchema, "params"), validate(updateSchema), async (req, res, next) => {
  try {
    const plan = await testPlansService.update(req.params.id, req.body);
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

// DELETE - Deletar test plan
router.delete("/:id", authorize("admin", "qa"), validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    await testPlansService.delete(req.params.id);
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
router.delete("/:id/suites/:suiteId", authorize("admin", "qa"), validate(idAndSuiteIdSchema, "params"), async (req, res, next) => {
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
    const execucao = await testPlansService.execute(req.params.id, req.body.ambiente);
    res.status(201).json(execucao);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
