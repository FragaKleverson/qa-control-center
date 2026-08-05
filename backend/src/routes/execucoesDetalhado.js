const express = require("express");
const router = express.Router();
const { executionsService } = require("../services");
const { logAudit } = require("../services/auditService");
const { validate } = require("../middleware/validate");
const { authorize } = require("../middleware/authorize");
const { idParamSchema, idAndProjetoIdSchema } = require("../validators/common");
const { createSchema, updateSchema, updateResultSchema } = require("../validators/execucoes");

// GET - Listar todas as execuções
router.get("/", async (req, res, next) => {
  try {
    const executions = await executionsService.listAll();
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
router.delete("/:id", authorize("admin", "qa"), validate(idParamSchema, "params"), async (req, res, next) => {
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
