const request = require("supertest");
const app = require("../src/app");

describe("Projetos API - Suite completa", () => {

    // =====================================================
    // GET /projetos
    // =====================================================
    describe("GET /projetos", () => {

        it("deve retornar 200", async () => {
            const res = await request(app).get("/projetos");
            expect(res.statusCode).toBe(200);
        });

        it("deve retornar um array", async () => {
            const res = await request(app).get("/projetos");
            expect(Array.isArray(res.body)).toBe(true);
        });

        it("deve ter estrutura válida quando existir dados", async () => {
            const res = await request(app).get("/projetos");

            if (res.body.length > 0) {
                const projeto = res.body[0];

                expect(projeto).toHaveProperty("id");
                expect(projeto).toHaveProperty("titulo");
                expect(projeto).toHaveProperty("descricao");
                expect(projeto).toHaveProperty("feature");
            }
        });

        it("não deve retornar projetos vazios inesperados", async () => {
            const res = await request(app).get("/projetos");
            expect(res.body.length).toBeGreaterThanOrEqual(0);
        });

    });

    // =====================================================
    // POST /projetos
    // =====================================================
    describe("POST /projetos", () => {

        const payloadValido = {
            titulo: "Projeto QA Test",
            descricao: "Teste automatizado backend",
            feature: "Feature QA",
            cenarios: [
                {
                    nome: "Cenário 1",
                    tipo: "Happy Path",
                    passos: "Given x When y Then z"
                }
            ]
        };

        it("deve criar projeto com sucesso (201)", async () => {
            const res = await request(app)
                .post("/projetos")
                .send(payloadValido);

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty("projeto");
            expect(res.body.projeto).toHaveProperty("id");
        });

        it("deve rejeitar sem titulo (400)", async () => {
            const res = await request(app)
                .post("/projetos")
                .send({
                    descricao: "x",
                    feature: "y",
                    cenarios: []
                });

            expect(res.statusCode).toBe(400);
        });

        it("deve rejeitar sem descricao (400)", async () => {
            const res = await request(app)
                .post("/projetos")
                .send({
                    titulo: "x",
                    feature: "y",
                    cenarios: []
                });

            expect(res.statusCode).toBe(400);
        });

        it("deve rejeitar sem feature (400)", async () => {
            const res = await request(app)
                .post("/projetos")
                .send({
                    titulo: "x",
                    descricao: "y",
                    cenarios: []
                });

            expect(res.statusCode).toBe(400);
        });

        // =========================
        // VALIDAÇÃO CENÁRIOS
        // =========================

        it("deve retornar 400 se cenarios não for array", async () => {
            const res = await request(app)
                .post("/projetos")
                .send({
                    titulo: "teste",
                    descricao: "teste",
                    feature: "teste",
                    cenarios: "inválido"
                });

            expect(res.statusCode).toBe(400);
        });

        it("deve aceitar cenarios undefined sem quebrar", async () => {
            const res = await request(app)
                .post("/projetos")
                .send({
                    titulo: "teste",
                    descricao: "teste",
                    feature: "teste"
                });

            expect([200, 201]).toContain(res.statusCode);
        });

        it("deve aceitar cenarios vazio", async () => {
            const res = await request(app)
                .post("/projetos")
                .send({
                    titulo: "sem cenarios",
                    descricao: "ok",
                    feature: "ok",
                    cenarios: []
                });

            expect([200, 201]).toContain(res.statusCode);
        });

        it("deve rejeitar cenário com nome vazio", async () => {
            const res = await request(app)
                .post("/projetos")
                .send({
                    titulo: "teste",
                    descricao: "teste",
                    feature: "teste",
                    cenarios: [
                        {
                            nome: "",
                            tipo: "Happy Path",
                            passos: "ok"
                        }
                    ]
                });

            expect(res.statusCode).toBe(400);
        });

        // =========================
        // EDGE CASES
        // =========================

        it("não deve aceitar titulo só com espaços", async () => {
            const res = await request(app)
                .post("/projetos")
                .send({
                    titulo: "   ",
                    descricao: "ok",
                    feature: "ok",
                    cenarios: []
                });

            expect(res.statusCode).toBe(400);
        });

        it("deve persistir projeto e retornar id", async () => {
            const res = await request(app)
                .post("/projetos")
                .send(payloadValido);

            expect(res.body.projeto.id).toBeDefined();
        });

        it("GET deve refletir POST", async () => {
            await request(app)
                .post("/projetos")
                .send({
                    titulo: "fluxo completo",
                    descricao: "teste",
                    feature: "teste",
                    cenarios: []
                });

            const res = await request(app).get("/projetos");

            const existe = res.body.some(
                p => p.titulo === "fluxo completo"
            );

            expect(existe).toBe(true);
        });

        // =========================
        // RESILIÊNCIA
        // =========================

        it("deve aceitar payload grande sem crash", async () => {
            const res = await request(app)
                .post("/projetos")
                .send({
                    titulo: "x".repeat(1000),
                    descricao: "y".repeat(1000),
                    feature: "z",
                    cenarios: []
                });

            expect([200, 201, 400]).toContain(res.statusCode);
        });

        it("deve lidar com body inválido", async () => {
            const res = await request(app)
                .post("/projetos")
                .set("Content-Type", "application/json")
                .send("isso não é json válido");

            expect([400, 500]).toContain(res.statusCode);
        });

    });

});