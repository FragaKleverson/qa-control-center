/**
 * Testes de integração: rota /test-suites
 * Cobre: listagem, criação, busca por ID, deleção,
 *        gerenciamento de test cases (vincular/desvincular).
 */

const request = require("supertest");
const app = require("../src/app");
const { clearTables, closePool, createSuite, createProjeto } = require("./helpers/db");

beforeEach(async () => {
  await clearTables();
});

afterAll(async () => {
  await closePool();
});

describe("Test Suites API - Suite completa", () => {

    // =====================================================
    // GET /test-suites
    // =====================================================
    describe("GET /test-suites", () => {

        it("deve retornar 200 com array vazio", async () => {
            const res = await request(app).get("/test-suites");
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body).toHaveLength(0);
        });

        it("deve retornar suites criadas com estrutura correta", async () => {
            await createSuite({ nome: "Suite Alpha" });
            const res = await request(app).get("/test-suites");
            expect(res.body).toHaveLength(1);
            expect(res.body[0]).toHaveProperty("id");
            expect(res.body[0]).toHaveProperty("nome");
        });

    });

    // =====================================================
    // GET /test-suites/:id
    // =====================================================
    describe("GET /test-suites/:id", () => {

        it("deve retornar a suite pelo ID", async () => {
            const suite = await createSuite({ nome: "Suite Busca" });
            const res = await request(app).get(`/test-suites/${suite.id}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.nome).toBe("Suite Busca");
        });

        it("deve retornar 404 para ID inexistente", async () => {
            const res = await request(app).get("/test-suites/999999");
            expect(res.statusCode).toBe(404);
        });

    });

    // =====================================================
    // POST /test-suites
    // =====================================================
    describe("POST /test-suites", () => {

        it("deve criar suite com sucesso (201)", async () => {
            const res = await request(app)
                .post("/test-suites")
                .send({ nome: "Nova Suite", descricao: "Desc" });
            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty("id");
            expect(res.body.nome).toBe("Nova Suite");
        });

        it("deve retornar 422 sem nome", async () => {
            const res = await request(app)
                .post("/test-suites")
                .send({ descricao: "sem nome" });
            expect(res.statusCode).toBe(422);
        });

        it("deve aceitar criação sem descricao", async () => {
            const res = await request(app)
                .post("/test-suites")
                .send({ nome: "Só Nome" });
            expect(res.statusCode).toBe(201);
        });

    });

    // =====================================================
    // DELETE /test-suites/:id
    // =====================================================
    describe("DELETE /test-suites/:id", () => {

        it("deve deletar suite e confirmar remoção", async () => {
            const suite = await createSuite();
            const del = await request(app).delete(`/test-suites/${suite.id}`);
            expect(del.statusCode).toBe(200);

            const busca = await request(app).get(`/test-suites/${suite.id}`);
            expect(busca.statusCode).toBe(404);
        });

        it("deve retornar 400 para ID inexistente", async () => {
            const res = await request(app).delete("/test-suites/999999");
            expect(res.statusCode).toBe(400);
        });

    });

    // =====================================================
    // Gerenciamento de Test Cases numa Suite
    // =====================================================
    describe("Test Cases de uma Suite (cases)", () => {

        it("GET /test-suites/:id/cases deve retornar array vazio inicialmente", async () => {
            const suite = await createSuite();
            const res = await request(app).get(`/test-suites/${suite.id}/cases`);
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveLength(0);
        });

        it("deve vincular um test case à suite", async () => {
            const suite = await createSuite();
            const projeto = await createProjeto();

            const res = await request(app)
                .post(`/test-suites/${suite.id}/cases`)
                .send({ projeto_id: projeto.id });
            expect(res.statusCode).toBe(201);

            const cases = await request(app).get(`/test-suites/${suite.id}/cases`);
            expect(cases.body).toHaveLength(1);
            expect(cases.body[0].id).toBe(projeto.id);
        });

        it("não deve duplicar o mesmo test case na suite", async () => {
            const suite = await createSuite();
            const projeto = await createProjeto();

            await request(app).post(`/test-suites/${suite.id}/cases`).send({ projeto_id: projeto.id });
            // Segunda vinculação — deve ignorar silenciosamente (ON CONFLICT DO NOTHING)
            const res2 = await request(app).post(`/test-suites/${suite.id}/cases`).send({ projeto_id: projeto.id });
            expect([200, 201]).toContain(res2.statusCode);

            const cases = await request(app).get(`/test-suites/${suite.id}/cases`);
            expect(cases.body).toHaveLength(1);
        });

        it("deve desvincular um test case da suite", async () => {
            const suite = await createSuite();
            const projeto = await createProjeto();

            await request(app).post(`/test-suites/${suite.id}/cases`).send({ projeto_id: projeto.id });

            const del = await request(app).delete(`/test-suites/${suite.id}/cases/${projeto.id}`);
            expect(del.statusCode).toBe(200);

            const cases = await request(app).get(`/test-suites/${suite.id}/cases`);
            expect(cases.body).toHaveLength(0);
        });

        it("deve retornar 422 ao vincular sem projeto_id", async () => {
            const suite = await createSuite();
            const res = await request(app).post(`/test-suites/${suite.id}/cases`).send({});
            expect(res.statusCode).toBe(422);
        });

    });

});
