const express = require("express");
const router = express.Router();
const { requirementsService } = require("../services");
const { logAudit } = require("../services/auditService");
const { validate } = require("../middleware/validate");
const { authorize } = require("../middleware/authorize");
const { idParamSchema } = require("../validators/common");
const { createSchema, updateSchema } = require("../validators/requirements");

// GET - Listar todos os requirements
router.get("/", async (req, res, next) => {
  try {
    const requirements = await requirementsService.listAll();
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
router.delete("/:id", authorize("admin", "qa"), validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    const deleted = await requirementsService.delete(req.params.id);
    await logAudit({ userId: req.user?.id, entityType: "requirement", entityId: parseInt(req.params.id), action: "DELETE", oldValues: deleted, ipAddress: req.ip });
    res.json({ message: "Requirement deletado com sucesso" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
