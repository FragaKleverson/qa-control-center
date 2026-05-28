const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { generateDoc } = require("./generator");
const projetosRoutes = require("./routes/projetos");
const runsRoutes = require("./routes/runs");
const executionsRoutes = require("./routes/executions");

const app = express();


/* =========================
   MIDDLEWARES
========================= */
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

/* =========================
   ROUTE PRINCIPAL
========================= */
app.post("/api/generate-doc", async (req, res) => {
  console.log("\n🔥 ===== REQUISIÇÃO RECEBIDA =====");

  try {
    console.log("📦 BODY:", req.body);

    const data = req.body;

    if (!data?.titulo || !Array.isArray(data.cenarios)) {
      console.log("❌ PAYLOAD INVÁLIDO");
      return res.status(400).json({ error: "Payload inválido" });
    }

    console.log("🧠 CHAMANDO GENERATE DOC...");

    const { buffer, fileName } = await generateDoc(data);

    console.log("✅ DOC GERADO");
    console.log("📏 BUFFER SIZE:", buffer?.length);

      const safeBuffer = Buffer.isBuffer(buffer)
      ? buffer
      : Buffer.from(buffer);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}.docx"`
    );

    console.log("📤 ENVIANDO RESPOSTA...");

    return res.send(safeBuffer);

  } catch (err) {
    console.log("💥 ERRO NA ROTA:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.use("/projetos", projetosRoutes);
app.use("/runs", runsRoutes);
app.use("/executions", executionsRoutes);

module.exports = app;