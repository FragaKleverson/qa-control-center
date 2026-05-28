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

    if (
      !titulo || !titulo.trim() ||
      !descricao || !descricao.trim() ||
      !feature || !feature.trim()
    ) {
      return res.status(400).json({
        error: "Campos obrigatórios inválidos"
      });
    }

    // cenários obrigatório ser array se existir
    if (cenarios !== undefined && !Array.isArray(cenarios)) {
      return res.status(400).json({
        error: "cenarios deve ser um array"
      });
    }

    // valida cenários
    if (Array.isArray(cenarios)) {
      for (const c of cenarios) {
        if (
          typeof c !== "object" ||
          !c.nome ||
          typeof c.nome !== "string" ||
          !c.nome.trim()
        ) {
          return res.status(400).json({
            error: "Cenário inválido"
          });
        }
      }
    }

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

// ============================
// LISTAR PROJETOS
// ============================
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM projetos ORDER BY id DESC"
    );

    res.json(result.rows);
  } catch (err) {
    console.error("❌ ERRO:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;