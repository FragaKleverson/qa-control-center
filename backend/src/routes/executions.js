const express = require("express");
const router = express.Router();

const pool = require("../db");

console.log("🔥 executions.js carregado");

router.post("/", async (req, res) => {
  try {
    const {
      test_run_id,
      cenario_id,
      status,
      comentario,
      evidencias
    } = req.body;

    const valid = ["PASSED", "FAILED", "BLOCKED", "N/A"];

    if (!valid.includes(status)) {
      return res.status(400).json({
        error: "Status inválido. Use PASSED, FAILED, BLOCKED ou N/A"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO test_executions
        (test_run_id, cenario_id, status, comentario, evidencias)
      VALUES
        ($1,$2,$3,$4,$5)
      RETURNING *
      `,
      [
        test_run_id,
        cenario_id,
        status,
        comentario || null,
        evidencias || null
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error("❌ EXECUTION ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;