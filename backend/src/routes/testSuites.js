const express = require("express");
const router = express.Router();
const { testSuitesService } = require("../services");

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
router.get("/:id", async (req, res, next) => {
  try {
    const suite = await testSuitesService.getById(req.params.id);
    if (!suite) return res.status(404).json({ error: "Test suite não encontrada" });
    res.json(suite);
  } catch (err) {
    next(err);
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

// GET - Listar test cases de uma suite
router.get("/:id/cases", async (req, res, next) => {
  try {
    const cases = await testSuitesService.getCases(req.params.id);
    res.json(cases);
  } catch (err) {
    next(err);
  }
});

// POST - Vincular test case a uma suite
router.post("/:id/cases", async (req, res) => {
  try {
    const { projeto_id } = req.body;
    if (!projeto_id) return res.status(400).json({ error: "projeto_id é obrigatório" });
    const result = await testSuitesService.addCase(req.params.id, projeto_id);
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE - Desvincular test case de uma suite
router.delete("/:id/cases/:projetoId", async (req, res) => {
  try {
    await testSuitesService.removeCase(req.params.id, req.params.projetoId);
    res.json({ message: "Test case removido da suite" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
