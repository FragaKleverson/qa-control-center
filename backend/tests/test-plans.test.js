/**
 * Testes de integração: rota /test-plans
 * Cobre: listagem, criação, busca por ID, deleção,
 *        gerenciamento de suites (vincular/desvincular) e execução de plan.
 */

const request = require("supertest");
const app = require("../src/app");
const { clearTables, closePool, createPlan, createSuite, createProjeto } = require("./helpers/db");
const pool = require("../src/db");

const PAYLOAD_VALIDO = {
  titulo: "Plano de Teste Regressão",
  descricao: "Cobre todos os fluxos principais",
  escopo: "Login, Cadastro, Checkout",
  objetivo: "Garantir estabilidade após release",
  ambiente: "staging",
};

beforeEach(async () => {
  await clearTables();
});

afterAll(async () => {
  await closePool();
});

describe("Test Plans API - Suite completa", () => {

    // =====================================================
    // GET /test-plans
    // =====================================================
    describe("GET /test-plans", () => {

        it("deve retornar 200 com array vazio", async () => {
            const res = await request(app).get("/test-plans");
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it("deve retornar plans criados com estrutura correta", async () => {
            await createPlan({ titulo: "Plan Alpha" });
            const res = await request(app).get("/test-plans");
            expect(res.body).toHaveLength(1);
            expect(res.body[0]).toHaveProperty("id");
            expect(res.body[0]).toHaveProperty("titulo");
        });

    });

    // =====================================================
    // GET /test-plans/:id
    // =====================================================
    describe("GET /test-plans/:id", () => {

        it("deve retornar o plan pelo ID", async () => {
            const plan = await createPlan({ titulo: "Plan Busca" });
            const res = await request(app).get(`/test-plans/${plan.id}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.titulo).toBe("Plan Busca");
        });

        it("deve retornar 404 para ID inexistente", async () => {
            const res = await request(app).get("/test-plans/999999");
            expect(res.statusCode).toBe(404);
        });

    });

    // =====================================================
    // POST /test-plans
    // =====================================================
    describe("POST /test-plans", () => {

        it("deve criar plan com sucesso (201)", async () => {
            const res = await request(app).post("/test-plans").send(PAYLOAD_VALIDO);
            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty("id");
            expect(res.body.titulo).toBe(PAYLOAD_VALIDO.titulo);
        });

        it("deve aceitar criação só com título", async () => {
            const res = await request(app)
                .post("/test-plans")
                .send({ titulo: "Plan Mínimo" });
            expect(res.statusCode).toBe(201);
        });

        it("deve retornar 422 sem titulo", async () => {
            const res = await request(app)
                .post("/test-plans")
                .send({ descricao: "sem titulo" });
            expect(res.statusCode).toBe(422);
        });

        it("deve persistir todos os campos corretamente", async () => {
            const res = await request(app).post("/test-plans").send(PAYLOAD_VALIDO);
            expect(res.body.escopo).toBe(PAYLOAD_VALIDO.escopo);
            expect(res.body.objetivo).toBe(PAYLOAD_VALIDO.objetivo);
            expect(res.body.ambiente).toBe(PAYLOAD_VALIDO.ambiente);
        });

    });

    // =====================================================
    // DELETE /test-plans/:id
    // =====================================================
    describe("DELETE /test-plans/:id", () => {

        it("deve deletar plan e confirmar remoção", async () => {
            const plan = await createPlan();
            const del = await request(app).delete(`/test-plans/${plan.id}`);
            expect(del.statusCode).toBe(200);

            const busca = await request(app).get(`/test-plans/${plan.id}`);
            expect(busca.statusCode).toBe(404);
        });

        it("deve retornar 400 para ID inexistente", async () => {
            const res = await request(app).delete("/test-plans/999999");
            expect(res.statusCode).toBe(400);
        });

    });

    // =====================================================
    // Gerenciamento de Suites num Plan
    // =====================================================
    describe("Suites de um Plan", () => {

        it("GET /test-plans/:id/suites deve retornar array vazio inicialmente", async () => {
            const plan = await createPlan();
            const res = await request(app).get(`/test-plans/${plan.id}/suites`);
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveLength(0);
        });

        it("deve vincular uma suite ao plan", async () => {
            const plan = await createPlan();
            const suite = await createSuite();

            const res = await request(app)
                .post(`/test-plans/${plan.id}/suites`)
                .send({ suite_id: suite.id });
            expect(res.statusCode).toBe(201);

            const suites = await request(app).get(`/test-plans/${plan.id}/suites`);
            expect(suites.body).toHaveLength(1);
        });

        it("não deve duplicar a mesma suite no plan", async () => {
            const plan = await createPlan();
            const suite = await createSuite();

            await request(app).post(`/test-plans/${plan.id}/suites`).send({ suite_id: suite.id });
            await request(app).post(`/test-plans/${plan.id}/suites`).send({ suite_id: suite.id });

            const suites = await request(app).get(`/test-plans/${plan.id}/suites`);
            expect(suites.body).toHaveLength(1);
        });

        it("deve desvincular suite do plan", async () => {
            const plan = await createPlan();
            const suite = await createSuite();
            await request(app).post(`/test-plans/${plan.id}/suites`).send({ suite_id: suite.id });

            const del = await request(app).delete(`/test-plans/${plan.id}/suites/${suite.id}`);
            expect(del.statusCode).toBe(200);

            const suites = await request(app).get(`/test-plans/${plan.id}/suites`);
            expect(suites.body).toHaveLength(0);
        });

        it("deve retornar 422 ao vincular sem suite_id", async () => {
            const plan = await createPlan();
            const res = await request(app).post(`/test-plans/${plan.id}/suites`).send({});
            expect(res.statusCode).toBe(422);
        });

    });

    // =====================================================
    // POST /test-plans/:id/execute
    // =====================================================
    describe("Execução de Plan", () => {

        it("deve criar execução a partir do plan e retornar execução com ID", async () => {
            // Montar: plan → suite → projeto (test case)
            const plan = await createPlan();
            const suite = await createSuite();
            const projeto = await createProjeto();

            // Vincular suite ao plan
            await pool.query(
                "INSERT INTO test_plan_suites (plan_id, suite_id) VALUES ($1, $2)",
                [plan.id, suite.id]
            );
            // Vincular projeto à suite
            await pool.query(
                "INSERT INTO test_suite_cases (suite_id, projeto_id) VALUES ($1, $2)",
                [suite.id, projeto.id]
            );

            const res = await request(app)
                .post(`/test-plans/${plan.id}/execute`)
                .send({ ambiente: "staging" });

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty("id");
            expect(res.body.status).toBe("pending");
        });

        it("deve retornar 400 para plan inexistente", async () => {
            const res = await request(app)
                .post("/test-plans/999999/execute")
                .send({ ambiente: "staging" });
            expect(res.statusCode).toBe(400);
        });

    });

});
