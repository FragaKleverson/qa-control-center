const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const helmet = require("helmet");
const hpp = require("hpp");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const config = require("./config/env");
const { globalLimiter, perUserLimiter } = require("./middleware/rateLimiters");
const projetosRoutes = require("./routes/projetos");
const testSuitesRoutes = require("./routes/testSuites");
const requirementsRoutes = require("./routes/requirements");
const testPlansRoutes = require("./routes/testPlans");
const statsRoutes = require("./routes/stats");
const execucoesDetalhado = require("./routes/execucoesDetalhado");
const relatorios = require("./routes/relatorios");
const authRoutes = require("./routes/auth");
const authMiddleware = require("./middleware/auth");
const errorHandler = require("./middleware/errorHandler");

const app = express();

/* =========================
   SWAGGER DOCUMENTATION
   Documentação interativa em http://localhost:3001/api-docs
========================= */
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: `
      .swagger-ui {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .topbar {
        background-color: #1e1e1e;
      }
      .swagger-ui .topbar .download-url-wrapper input {
        max-width: 100%;
      }
    `,
    customSiteTitle: "QA Control Center - API Docs",
    swaggerOptions: {
      persistAuthorization: true,
      displayOperationId: true,
      docExpansion: "list",
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 1,
    },
    customfavIcon: "https://swagger.io/favicon-32x32.png",
  })
);

/* =========================
   SWAGGER JSON ENDPOINT
   Para ferramentas externas (Postman, Insomnia, etc)
========================= */
app.get("/openapi.json", (req, res) => {
  res.json(swaggerSpec);
});

/* =========================
   SEGURANÇA — HTTP HEADERS
   Helmet define cabeçalhos de segurança HTTP:
   X-Frame-Options, X-XSS-Protection, X-Content-Type-Options,
   Strict-Transport-Security, Content-Security-Policy, etc.
========================= */
app.use(helmet());

/* =========================
   CORS
   Permite apenas origens listadas em ALLOWED_ORIGINS (env).
   Requisições sem cabeçalho Origin (Postman, curl, server-to-server)
   são permitidas; origens de browser desconhecidas são bloqueadas.
========================= */
app.use(
  cors({
    origin: (origin, callback) => {
      // Requisições sem Origin (mobile apps, ferramentas, APIs internas)
      if (!origin) return callback(null, true);
      if (config.allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Origem não permitida pelo CORS"), false);
    },
    optionsSuccessStatus: 200,
  })
);

/* =========================
   RATE LIMITING — Global IP
   Teto geral: limita cada IP a RATE_LIMIT_MAX req por janela.
   Desativado em teste via skip() interno do limiter.
   Brute-force e per-user limiters ficam em middleware/rateLimiters.js
   e são aplicados por rota (auth) ou por bloco (rotas protegidas).
========================= */
app.use(globalLimiter);

/* =========================
   HTTP PARAMETER POLLUTION
   Previne poluição de parâmetros via query string duplicada.
   Ex: GET /projetos?id=1&id=2 poderia causar comportamentos inesperados.
========================= */
app.use(hpp());

/* =========================
   BODY PARSER
   Limite reduzido de 10mb para 500kb — payloads legítimos desta API
   não excedem esse tamanho. Limites altos facilitam ataques de DoS.
========================= */
app.use(bodyParser.json({ limit: "500kb" }));

/* =========================
   LOGS HTTP
   Formato "combined" em produção (IP, user-agent, referrer — auditável).
   Formato "dev" em desenvolvimento (colorido, compacto).
========================= */
app.use(morgan(config.isProduction ? "combined" : "dev"));

/* =========================
   VALIDAÇÃO DE PARÂMETROS DE ROTA
   Garante que parâmetros :id, :suiteId, :projetoId
   sejam inteiros positivos antes de chegar aos serviços.
   Defesa extra contra payloads malformados.
========================= */
const numericParamValidator = (req, res, next, value) => {
  if (!/^\d+$/.test(value)) {
    return res.status(400).json({ error: "ID inválido" });
  }
  next();
};
app.param("id", numericParamValidator);
app.param("suiteId", numericParamValidator);
app.param("projetoId", numericParamValidator);

/* =========================
   ROTAS PÚBLICAS (antes do middleware de auth)
   /auth/login e /auth/register não exigem token.
========================= */
app.use("/auth", authRoutes);

/* =========================
   AUTENTICAÇÃO JWT + PER-USER RATE LIMIT
   authMiddleware: protege todas as rotas abaixo (desativado em teste).
   perUserLimiter: após auth, chaveado por user ID — previne abuso mesmo
   com múltiplos IPs (desativado em teste via skip() interno).
========================= */
if (process.env.NODE_ENV !== "test") {
  app.use(authMiddleware);
  app.use(perUserLimiter);
}

/* =========================
   ROTAS PROTEGIDAS
========================= */
app.use("/projetos", projetosRoutes);
app.use("/test-suites", testSuitesRoutes);
app.use("/requirements", requirementsRoutes);
app.use("/test-plans", testPlansRoutes);
app.use("/stats", statsRoutes);
app.use("/execucoes", execucoesDetalhado);
app.use("/relatorios", relatorios);

/* =========================
   HANDLER 404 — ROTA NÃO ENCONTRADA
   Captura qualquer requisição que não bateu em nenhuma rota registrada.
   Deve vir ANTES do errorHandler global.
========================= */
app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

/* =========================
   HANDLER DE ERROS GLOBAL
   Deve ser o ÚLTIMO middleware.
   Captura erros passados via next(err) e garante que detalhes
   internos (stack traces, mensagens de DB) nunca sejam expostos
   em produção.
========================= */
app.use(errorHandler);

module.exports = app;