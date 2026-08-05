const express = require("express");
const router = express.Router();
const { testSuitesService } = require("../services");
const { logAudit } = require("../services/auditService");
const { validate } = require("../middleware/validate");
const { authorize } = require("../middleware/authorize");
const { idParamSchema, idAndProjetoIdSchema } = require("../validators/common");
const { createSchema, updateSchema, addCaseSchema } = require("../validators/testSuites");

// GET - Listar todos os test suites
router.get("/", async (req, res, next) => {
  try {
    const suites = await testSuitesService.listAll();
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
router.delete("/:id", authorize("admin", "qa"), validate(idParamSchema, "params"), async (req, res, next) => {
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
router.delete("/:id/cases/:projetoId", authorize("admin", "qa"), validate(idAndProjetoIdSchema, "params"), async (req, res, next) => {
  try {
    await testSuitesService.removeCase(req.params.id, req.params.projetoId);
    res.json({ message: "Test case removido da suite" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
