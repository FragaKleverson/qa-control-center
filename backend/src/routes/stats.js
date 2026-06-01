const express = require("express");
const router = express.Router();
const { statsService } = require("../services");

// ============================
// OBTER ESTATÍSTICAS GERAIS
// ============================
router.get("/", async (req, res, next) => {
  try {
    const stats = await statsService.getDashboard();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
