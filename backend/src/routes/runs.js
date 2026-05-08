const express = require("express");
const router = express.Router();

const pool = require("../db");

console.log("🔥 runs.js carregado");

router.post("/", async (req, res) => {
  try {
    const { projeto_id, nome, descricao } = req.body;

    const result = await pool.query(
      `INSERT INTO test_runs (projeto_id, nome, descricao)
       VALUES ($1,$2,$3)
       RETURNING *`,
      [projeto_id, nome, descricao]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;