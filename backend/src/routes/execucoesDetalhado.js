const express = require("express");
const router = express.Router();
const { executionsService } = require("../services");

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
router.get("/:id", async (req, res, next) => {
  try {
    const execution = await executionsService.getById(req.params.id);
    if (!execution) return res.status(404).json({ error: "Execução não encontrada" });
    res.json(execution);
  } catch (err) {
    next(err);
  }
});

// POST - Criar nova execução
router.post("/", async (req, res) => {
  try {
    const execution = await executionsService.create(req.body);
    res.status(201).json(execution);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// PUT - Atualizar execução
router.put("/:id", async (req, res) => {
  try {
    const execution = await executionsService.update(req.params.id, req.body);
    res.json(execution);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE - Deletar execução
router.delete("/:id", async (req, res) => {
  try {
    await executionsService.delete(req.params.id);
    res.json({ message: "Execução deletada com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// GET - Listar resultados de test cases de uma execução
router.get("/:id/results", async (req, res, next) => {
  try {
    const results = await executionsService.getResults(req.params.id);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

// PUT - Atualizar status de um test case em uma execução
router.put("/:id/results/:projetoId", async (req, res) => {
  try {
    const { status, comentario } = req.body;
    if (!status) return res.status(400).json({ error: "status é obrigatório" });
    const result = await executionsService.updateResult(
      req.params.id,
      req.params.projetoId,
      status,
      comentario
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
