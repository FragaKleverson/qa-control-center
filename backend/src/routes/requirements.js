const express = require("express");
const router = express.Router();
const { requirementsService } = require("../services");

// GET - Listar todos os requirements
router.get("/", async (req, res) => {
  try {
    const requirements = await requirementsService.listAll();
    res.json(requirements);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Obter requirement por ID
router.get("/:id", async (req, res) => {
  try {
    const requirement = await requirementsService.getById(req.params.id);
    if (!requirement) return res.status(404).json({ error: "Requirement não encontrado" });
    res.json(requirement);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Criar novo requirement
router.post("/", async (req, res) => {
  try {
    const requirement = await requirementsService.create(req.body);
    res.status(201).json(requirement);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// PUT - Atualizar requirement
router.put("/:id", async (req, res) => {
  try {
    const requirement = await requirementsService.update(req.params.id, req.body);
    res.json(requirement);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE - Deletar requirement
router.delete("/:id", async (req, res) => {
  try {
    await requirementsService.delete(req.params.id);
    res.json({ message: "Requirement deletado com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
