const express = require("express");
const router = express.Router();
const { projectsService } = require("../services");

console.log("🔥 projetos.js carregado");

// GET - Listar todos os projetos
router.get("/", async (req, res) => {
  try {
    const projetos = await projectsService.listAll();
    res.json(projetos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Obter projeto por ID
router.get("/:id", async (req, res) => {
  try {
    const projeto = await projectsService.getById(req.params.id);
    if (!projeto) return res.status(404).json({ error: "Projeto não encontrado" });
    res.json(projeto);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Criar novo projeto
router.post("/", async (req, res) => {
  try {
    const projeto = await projectsService.create(req.body);
    res.status(201).json(projeto);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// PUT - Atualizar projeto
router.put("/:id", async (req, res) => {
  try {
    const projeto = await projectsService.update(req.params.id, req.body);
    res.json(projeto);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE - Deletar projeto
router.delete("/:id", async (req, res) => {
  try {
    await projectsService.delete(req.params.id);
    res.json({ message: "Projeto deletado com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;