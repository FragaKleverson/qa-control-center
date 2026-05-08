const express = require("express");
const router = express.Router();
const pool = require("../db");

console.log("🔥 projetos.js carregado");

// ============================
// CRIAR PROJETO + CENÁRIOS
// ============================
router.post("/", async (req, res) => {
  const client = await pool.connect();

  try {
    const { titulo, descricao, feature, cenarios } = req.body;

    await client.query("BEGIN");

    // 1. cria projeto
    const projetoResult = await client.query(
      `
      INSERT INTO projetos (titulo, descricao, feature)
      VALUES ($1,$2,$3)
      RETURNING *
      `,
      [titulo, descricao, feature]
    );

    const projeto = projetoResult.rows[0];

    // 2. cria cenários
    for (const c of cenarios || []) {
      await client.query(
        `
        INSERT INTO cenarios (projeto_id, nome, tipo, passos)
        VALUES ($1,$2,$3,$4)
        `,
        [
          projeto.id,
          c.nome,
          c.tipo,
          JSON.stringify(c.passos || [])
        ]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      projeto,
      message: "Projeto e cenários salvos com sucesso"
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ ERRO:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;