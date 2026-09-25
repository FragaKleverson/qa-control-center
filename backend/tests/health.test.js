/**
 * Testes de integração: rota /health (Fase 4, item 14)
 * Endpoint público, sem autenticação — usado por orquestradores/monitoramento.
 */

const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/db");
const { closePool } = require("./helpers/db");

afterAll(async () => {
  await closePool();
});

describe("GET /health", () => {

    it("deve retornar 200 com status ok quando o banco está acessível", async () => {
        const res = await request(app).get("/health");
        expect(res.statusCode).toBe(200);
        expect(res.body.healthy).toBe(true);
        expect(res.body.status).toBe("ok");
        expect(res.body.database).toEqual({ status: "up" });
    });

    it("deve retornar timestamp, uptime e responseTimeMs", async () => {
        const res = await request(app).get("/health");
        expect(res.body).toHaveProperty("timestamp");
        expect(typeof res.body.uptime).toBe("number");
        expect(typeof res.body.responseTimeMs).toBe("number");
    });

    it("não deve exigir token de autenticação", async () => {
        // Sem header Authorization — se exigisse auth, retornaria 401
        const res = await request(app).get("/health");
        expect(res.statusCode).not.toBe(401);
    });

    it("deve retornar 503 e database.status down quando o banco falha", async () => {
        const originalQuery = pool.query;
        pool.query = jest.fn().mockRejectedValueOnce(new Error("connection refused"));

        const res = await request(app).get("/health");

        expect(res.statusCode).toBe(503);
        expect(res.body.healthy).toBe(false);
        expect(res.body.status).toBe("degraded");
        expect(res.body.database.status).toBe("down");
        expect(res.body.database.error).toBe("connection refused");

        pool.query = originalQuery;
    });

});
