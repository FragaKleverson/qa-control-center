const express = require("express");
const router = express.Router();
const { testSuitesService } = require("../services");

console.log("🔥 testSuites.js carregado");

// GET - Listar todos os test suites
router.get("/", async (req, res) => {
  try {
    const suites = await testSuitesService.listAll();
    res.json(suites);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Obter test suite por ID
router.get("/:id", async (req, res) => {
  try {
    const suite = await testSuitesService.getById(req.params.id);
    if (!suite) return res.status(404).json({ error: "Test suite não encontrada" });
    res.json(suite);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Criar novo test suite
router.post("/", async (req, res) => {
  try {
    const suite = await testSuitesService.create(req.body);
    res.status(201).json(suite);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// PUT - Atualizar test suite
router.put("/:id", async (req, res) => {
  try {
    const suite = await testSuitesService.update(req.params.id, req.body);
    res.json(suite);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE - Deletar test suite
router.delete("/:id", async (req, res) => {
  try {
    await testSuitesService.delete(req.params.id);
    res.json({ message: "Test suite deletada com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
