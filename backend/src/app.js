const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { generateDoc } = require("./generator");

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

app.post("/api/generate-doc", async (req, res) => {
  try {
    const data = req.body;

    if (!data || !data.titulo || !Array.isArray(data.cenarios)) {
      return res.status(400).json({ error: "Payload inválido" })
    }

    const { buffer, fileName } = await generateDoc(data);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${fileName}.docx`
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao gerar documento" });
  }
});

app.listen(3001, () => {
  console.log("🚀 Backend rodando em http://localhost:3001");
});