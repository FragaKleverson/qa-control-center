const express = require("express");
const router = express.Router();
const { testPlansService } = require("../services");

console.log("🔥 testPlans.js carregado");

// GET - Listar todos os test plans
router.get("/", async (req, res) => {
  try {
    const plans = await testPlansService.listAll();
    res.json(plans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Obter test plan por ID
router.get("/:id", async (req, res) => {
  try {
    const plan = await testPlansService.getById(req.params.id);
    if (!plan) return res.status(404).json({ error: "Test plan não encontrado" });
    res.json(plan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Criar novo test plan
router.post("/", async (req, res) => {
  try {
    const plan = await testPlansService.create(req.body);
    res.status(201).json(plan);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// PUT - Atualizar test plan
router.put("/:id", async (req, res) => {
  try {
    const plan = await testPlansService.update(req.params.id, req.body);
    res.json(plan);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE - Deletar test plan
router.delete("/:id", async (req, res) => {
  try {
    await testPlansService.delete(req.params.id);
    res.json({ message: "Test plan deletado com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// GET - Listar suites de um plan
router.get("/:id/suites", async (req, res) => {
  try {
    const suites = await testPlansService.getSuites(req.params.id);
    res.json(suites);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Vincular suite a um plan
router.post("/:id/suites", async (req, res) => {
  try {
    const { suite_id } = req.body;
    if (!suite_id) return res.status(400).json({ error: "suite_id é obrigatório" });
    const result = await testPlansService.addSuite(req.params.id, suite_id);
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE - Desvincular suite de um plan
router.delete("/:id/suites/:suiteId", async (req, res) => {
  try {
    await testPlansService.removeSuite(req.params.id, req.params.suiteId);
    res.json({ message: "Suite removida do plan" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// POST - Executar plan (cria execução com todos os test cases das suites)
router.post("/:id/execute", async (req, res) => {
  try {
    const { ambiente = "staging" } = req.body;
    const execucao = await testPlansService.execute(req.params.id, ambiente);
    res.status(201).json(execucao);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
