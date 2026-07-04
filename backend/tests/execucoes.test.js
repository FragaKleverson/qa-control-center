/**
 * Testes de integração: rota /execucoes
 * Cobre: listagem, criação, busca por ID, deleção,
 *        resultados de test cases e atualização de status.
 */

const request = require("supertest");
const app = require("../src/app");
const { clearTables, closePool, createSuite, createProjeto } = require("./helpers/db");
const pool = require("../src/db");

beforeEach(async () => {
  await clearTables();
});

afterAll(async () => {
  await closePool();
});

/**
 * Cria uma execução diretamente no banco para uso nos testes.
 * @param {number} suiteId - ID da suite associada
 * @param {string} ambiente - Ambiente de execução
 */
async function createExecucao(suiteId, ambiente = "staging") {
  const result = await pool.query(
    "INSERT INTO execucoes (suite_id, ambiente, status) VALUES ($1, $2, 'pending') RETURNING *",
    [suiteId, ambiente]
  );
  return result.rows[0];
}

describe("Execuções API - Suite completa", () => {

    // =====================================================
    // GET /execucoes
    // =====================================================
    describe("GET /execucoes", () => {

        it("deve retornar 200 com array vazio", async () => {
            const res = await request(app).get("/execucoes");
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it("deve retornar execuções com campos agregados", async () => {
            const suite = await createSuite();
            await createExecucao(suite.id);

            const res = await request(app).get("/execucoes");
            expect(res.body).toHaveLength(1);
            expect(res.body[0]).toHaveProperty("id");
            expect(res.body[0]).toHaveProperty("status");
            expect(res.body[0]).toHaveProperty("ambiente");
            expect(res.body[0]).toHaveProperty("total_cases");
            expect(res.body[0]).toHaveProperty("passed_cases");
            expect(res.body[0]).toHaveProperty("failed_cases");
        });

        it("deve retornar execuções em ordem decrescente por created_at", async () => {
            const suite = await createSuite();
            await createExecucao(suite.id);
            await createExecucao(suite.id);

            const res = await request(app).get("/execucoes");
            expect(res.body[0].id).toBeGreaterThan(res.body[1].id);
        });

    });

    // =====================================================
    // GET /execucoes/:id
    // =====================================================
    describe("GET /execucoes/:id", () => {

        it("deve retornar a execução pelo ID", async () => {
            const suite = await createSuite();
            const exec = await createExecucao(suite.id, "production");

            const res = await request(app).get(`/execucoes/${exec.id}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.ambiente).toBe("production");
        });

        it("deve retornar 404 para ID inexistente", async () => {
            const res = await request(app).get("/execucoes/999999");
            expect(res.statusCode).toBe(404);
        });

    });

    // =====================================================
    // POST /execucoes
    // =====================================================
    describe("POST /execucoes", () => {

        it("deve criar execução manual com sucesso (201)", async () => {
            const suite = await createSuite();
            const res = await request(app)
                .post("/execucoes")
                .send({ suite_id: suite.id, ambiente: "qa", status: "pending" });

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty("id");
            expect(res.body.ambiente).toBe("qa");
        });

        it("deve usar valores padrão de ambiente e status", async () => {
            const suite = await createSuite();
            const res = await request(app)
                .post("/execucoes")
                .send({ suite_id: suite.id });

            expect(res.statusCode).toBe(201);
            expect(res.body.ambiente).toBe("staging");
            expect(res.body.status).toBe("pending");
        });

        it("deve retornar 422 sem suite_id", async () => {
            const res = await request(app)
                .post("/execucoes")
                .send({ ambiente: "staging" });
            expect(res.statusCode).toBe(422);
        });

    });

    // =====================================================
    // DELETE /execucoes/:id
    // =====================================================
    describe("DELETE /execucoes/:id", () => {

        it("deve deletar execução e confirmar remoção", async () => {
            const suite = await createSuite();
            const exec = await createExecucao(suite.id);

            const del = await request(app).delete(`/execucoes/${exec.id}`);
            expect(del.statusCode).toBe(200);

            const busca = await request(app).get(`/execucoes/${exec.id}`);
            expect(busca.statusCode).toBe(404);
        });

        it("deve retornar 404 para ID inexistente", async () => {
            const res = await request(app).delete("/execucoes/999999");
            expect(res.statusCode).toBe(404);
        });

    });

    // =====================================================
    // GET /execucoes/:id/results
    // =====================================================
    describe("Resultados de uma Execução", () => {

        it("deve retornar array vazio quando não há test cases", async () => {
            const suite = await createSuite();
            const exec = await createExecucao(suite.id);

            const res = await request(app).get(`/execucoes/${exec.id}/results`);
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveLength(0);
        });

        it("deve retornar resultados com dados do test case", async () => {
            const suite = await createSuite();
            const projeto = await createProjeto({ titulo: "TC com resultado" });
            const exec = await createExecucao(suite.id);

            // Insere resultado diretamente para testar o GET
            await pool.query(
                "INSERT INTO execution_results (execucao_id, projeto_id, status) VALUES ($1, $2, 'pending')",
                [exec.id, projeto.id]
            );

            const res = await request(app).get(`/execucoes/${exec.id}/results`);
            expect(res.body).toHaveLength(1);
            expect(res.body[0]).toHaveProperty("titulo", "TC com resultado");
            expect(res.body[0]).toHaveProperty("status", "pending");
        });

        it("deve atualizar o status de um resultado", async () => {
            const suite = await createSuite();
            const projeto = await createProjeto();
            const exec = await createExecucao(suite.id);

            await pool.query(
                "INSERT INTO execution_results (execucao_id, projeto_id, status) VALUES ($1, $2, 'pending')",
                [exec.id, projeto.id]
            );

            const res = await request(app)
                .put(`/execucoes/${exec.id}/results/${projeto.id}`)
                .send({ status: "passed" });

            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe("passed");
        });

        it("deve retornar 422 ao atualizar resultado sem status", async () => {
            const suite = await createSuite();
            const projeto = await createProjeto();
            const exec = await createExecucao(suite.id);

            await pool.query(
                "INSERT INTO execution_results (execucao_id, projeto_id, status) VALUES ($1, $2, 'pending')",
                [exec.id, projeto.id]
            );

            const res = await request(app)
                .put(`/execucoes/${exec.id}/results/${projeto.id}`)
                .send({});
            expect(res.statusCode).toBe(422);
        });

    });

    // =====================================================
    // GET /execucoes/stats/summary
    // =====================================================
    describe("GET /execucoes/stats/summary", () => {

        it("deve retornar estatísticas com zeros quando banco vazio", async () => {
            const res = await request(app).get("/execucoes/stats/summary");
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty("total");
            expect(res.body).toHaveProperty("passed");
            expect(res.body).toHaveProperty("failed");
            expect(res.body).toHaveProperty("pending");
            expect(res.body.total).toBe(0);
        });

        it("deve contabilizar execuções corretamente por status", async () => {
            // getStats() conta execution_results (resultados de test cases), não execucoes
            // Criamos 1 suite + 1 projeto + 3 execucoes, cada uma com 1 result diferente
            const suite = await createSuite();
            const projeto = await createProjeto();

            const exec1 = await createExecucao(suite.id);
            const exec2 = await createExecucao(suite.id);
            const exec3 = await createExecucao(suite.id);

            // 2 pending + 1 passed → total: 3, pending: 2, passed: 1
            await pool.query(
                "INSERT INTO execution_results (execucao_id, projeto_id, status) VALUES ($1, $2, 'pending')",
                [exec1.id, projeto.id]
            );
            await pool.query(
                "INSERT INTO execution_results (execucao_id, projeto_id, status) VALUES ($1, $2, 'pending')",
                [exec2.id, projeto.id]
            );
            await pool.query(
                "INSERT INTO execution_results (execucao_id, projeto_id, status) VALUES ($1, $2, 'passed')",
                [exec3.id, projeto.id]
            );

            const res = await request(app).get("/execucoes/stats/summary");
            expect(res.body.total).toBe(3);   // total de execution_results
            expect(res.body.pending).toBe(2);
            expect(res.body.passed).toBe(1);
        });

    });

});
