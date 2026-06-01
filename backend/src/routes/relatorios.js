const express = require("express");
const router = express.Router();
const { reportsService } = require("../services");

// GET - Listar todos os relatórios/execuções
router.get("/", async (req, res) => {
  try {
    const reports = await reportsService.listAll();
    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Gerar relatório com filtros
router.post("/generate", async (req, res) => {
  try {
    const report = await reportsService.generateReport(req.body);
    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
