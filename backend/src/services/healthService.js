/**
 * Serviço de Health Check — Fase 4, Item 14.
 *
 * Verifica conectividade com o banco e expõe informações básicas de runtime,
 * usado pelo endpoint público GET /health (liveness/readiness para orquestradores
 * como Docker/Kubernetes).
 */

const pool = require("../db");

const healthService = {
  check: async () => {
    const startedAt = Date.now();
    let database = { status: "up" };

    try {
      await pool.query("SELECT 1");
    } catch (err) {
      database = { status: "down", error: err.message };
    }

    const isHealthy = database.status === "up";

    return {
      healthy: isHealthy,
      status: isHealthy ? "ok" : "degraded",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startedAt,
      database,
    };
  }
};

module.exports = healthService;
