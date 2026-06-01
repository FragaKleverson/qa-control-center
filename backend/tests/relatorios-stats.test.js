/**
 * Testes de integração: rotas /relatorios e /stats
 * Cobre: listagem de relatórios, estatísticas do dashboard.
 */

const request = require("supertest");
const app = require("../src/app");
const { clearTables, closePool, createProjeto, createSuite } = require("./helpers/db");
const pool = require("../src/db");

beforeEach(async () => {
  await clearTables();
});

afterAll(async () => {
  await closePool();
});

describe("Relatórios e Stats - Suite completa", () => {

    // =====================================================
    // GET /relatorios
    // =====================================================
    describe("GET /relatorios", () => {

        it("deve retornar 200 com estrutura correta", async () => {
            const res = await request(app).get("/relatorios");
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty("executions");
            expect(res.body).toHaveProperty("stats");
            expect(res.body).toHaveProperty("suiteStats");
            expect(Array.isArray(res.body.executions)).toBe(true);
        });

        it("deve refletir execuções criadas", async () => {
            const suite = await createSuite();
            await pool.query(
                "INSERT INTO execucoes (suite_id, ambiente, status) VALUES ($1, 'staging', 'passed')",
                [suite.id]
            );

            const res = await request(app).get("/relatorios");
            expect(res.body.executions).toHaveLength(1);
            expect(res.body.executions[0].status).toBe("passed");
        });

        it("deve retornar stats agrupados por status", async () => {
            const suite = await createSuite();
            await pool.query(
                "INSERT INTO execucoes (suite_id, ambiente, status) VALUES ($1, 'staging', 'passed')",
                [suite.id]
            );
            await pool.query(
                "INSERT INTO execucoes (suite_id, ambiente, status) VALUES ($1, 'staging', 'failed')",
                [suite.id]
            );

            const res = await request(app).get("/relatorios");
            const statuses = res.body.stats.map(s => s.status);
            expect(statuses).toContain("passed");
            expect(statuses).toContain("failed");
        });

    });

    // =====================================================
    // GET /stats
    // =====================================================
    describe("GET /stats", () => {

        it("deve retornar 200 com estrutura correta", async () => {
            const res = await request(app).get("/stats");
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty("stats");
            expect(res.body).toHaveProperty("recentProjects");
            expect(res.body).toHaveProperty("recentExecutions");
        });

        it("deve retornar zeros quando banco está vazio", async () => {
            const res = await request(app).get("/stats");
            expect(res.body.stats.totalProjects).toBe(0);
            expect(res.body.stats.totalExecutions).toBe(0);
        });

        it("deve contar projetos corretamente", async () => {
            await createProjeto({ titulo: "P1" });
            await createProjeto({ titulo: "P2" });
            await createProjeto({ titulo: "P3" });

            const res = await request(app).get("/stats");
            expect(res.body.stats.totalProjects).toBe(3);
        });

        it("deve retornar os 5 projetos mais recentes", async () => {
            // Cria 6 projetos — deve retornar no máximo 5
            for (let i = 1; i <= 6; i++) {
                await createProjeto({ titulo: `Projeto ${i}` });
            }

            const res = await request(app).get("/stats");
            expect(res.body.recentProjects.length).toBeLessThanOrEqual(5);
        });

        it("deve contar execuções corretamente", async () => {
            const suite = await createSuite();
            await pool.query(
                "INSERT INTO execucoes (suite_id, ambiente, status) VALUES ($1, 'staging', 'pending')",
                [suite.id]
            );

            const res = await request(app).get("/stats");
            expect(res.body.stats.totalExecutions).toBe(1);
        });

    });

});
