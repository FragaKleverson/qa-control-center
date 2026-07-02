const express = require("express");
const router = express.Router();
const { requirementsService } = require("../services");
const { validate } = require("../middleware/validate");
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
router.post("/", validate(createSchema), async (req, res) => {
  try {
    const requirement = await requirementsService.create(req.body);
    res.status(201).json(requirement);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// PUT - Atualizar requirement
router.put("/:id", validate(idParamSchema, "params"), validate(updateSchema), async (req, res) => {
  try {
    const requirement = await requirementsService.update(req.params.id, req.body);
    res.json(requirement);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE - Deletar requirement
router.delete("/:id", validate(idParamSchema, "params"), async (req, res) => {
  try {
    await requirementsService.delete(req.params.id);
    res.json({ message: "Requirement deletado com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
