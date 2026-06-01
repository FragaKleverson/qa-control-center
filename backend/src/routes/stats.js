const express = require("express");
const router = express.Router();
const { statsService } = require("../services");

// ============================
// OBTER ESTATÍSTICAS GERAIS
// ============================
router.get("/", async (req, res) => {
  try {
    const stats = await statsService.getDashboard();
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
