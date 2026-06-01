const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const projetosRoutes = require("./routes/projetos");
const testSuitesRoutes = require("./routes/testSuites");
const requirementsRoutes = require("./routes/requirements");
const testPlansRoutes = require("./routes/testPlans");
const statsRoutes = require("./routes/stats");
const execucoesDetalhado = require("./routes/execucoesDetalhado");
const relatorios = require("./routes/relatorios");

const app = express();


/* =========================
   MIDDLEWARES
========================= */
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
// Log de requisições HTTP: método, rota, status e tempo de resposta
app.use(morgan("dev"));

/* =========================
   ROTAS
========================= */
app.use("/projetos", projetosRoutes);
app.use("/test-suites", testSuitesRoutes);
app.use("/requirements", requirementsRoutes);
app.use("/test-plans", testPlansRoutes);
app.use("/stats", statsRoutes);
app.use("/execucoes", execucoesDetalhado);
app.use("/relatorios", relatorios);

module.exports = app;