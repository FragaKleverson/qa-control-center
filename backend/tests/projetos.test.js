/**
 * Testes de integração: rota /projetos
 * Cobre: listagem, criação, busca por ID, atualização, deleção e casos de erro.
 * Cada describe limpa as tabelas antes de rodar para garantir isolamento.
 */

const request = require("supertest");
const app = require("../src/app");
const { clearTables, closePool, createProjeto } = require("./helpers/db");

// Payload válido reutilizado nos testes de criação
const PAYLOAD_VALIDO = {
  titulo: "Projeto QA Test",
  descricao: "Teste automatizado backend",
  feature: "Feature: Autenticação",
  cenarios: [{ nome: "Cenário 1", tipo: "Happy Path", passos: "Given x\nWhen y\nThen z" }],
};

beforeEach(async () => {
  // Garante banco limpo antes de cada teste
  await clearTables();
});

afterAll(async () => {
  // Fecha o pool para o Jest não ficar pendurado
  await closePool();
});

describe("Projetos API - Suite completa", () => {

    // =====================================================
    // GET /projetos
    // =====================================================
    describe("GET /projetos", () => {

        it("deve retornar 200 com banco vazio", async () => {
            const res = await request(app).get("/projetos");
            expect(res.statusCode).toBe(200);
        });

        it("deve retornar array vazio quando não há projetos", async () => {
            const res = await request(app).get("/projetos");
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body).toHaveLength(0);
        });

        it("deve retornar projetos criados com estrutura correta", async () => {
            await createProjeto({ titulo: "Projeto A" });
            await createProjeto({ titulo: "Projeto B" });

            const res = await request(app).get("/projetos");
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveLength(2);

            const p = res.body[0];
            expect(p).toHaveProperty("id");
            expect(p).toHaveProperty("titulo");
            expect(p).toHaveProperty("descricao");
            expect(p).toHaveProperty("feature");
            expect(p).toHaveProperty("created_at");
        });

        it("deve retornar projetos em ordem decrescente por created_at", async () => {
            await createProjeto({ titulo: "Primeiro" });
            await createProjeto({ titulo: "Segundo" });

            const res = await request(app).get("/projetos");
            // Ordem DESC: o mais recente vem primeiro
            expect(res.body[0].titulo).toBe("Segundo");
        });

    });

    // =====================================================
    // GET /projetos/:id
    // =====================================================
    describe("GET /projetos/:id", () => {

        it("deve retornar o projeto pelo ID", async () => {
            const criado = await createProjeto({ titulo: "Busca por ID" });
            const res = await request(app).get(`/projetos/${criado.id}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.id).toBe(criado.id);
            expect(res.body.titulo).toBe("Busca por ID");
        });

        it("deve retornar 404 para ID inexistente", async () => {
            const res = await request(app).get("/projetos/999999");
            expect(res.statusCode).toBe(404);
            expect(res.body).toHaveProperty("error");
        });

    });

    // =====================================================
    // POST /projetos
    // =====================================================
    describe("POST /projetos", () => {

        it("deve criar projeto com sucesso e retornar 201", async () => {
            const res = await request(app).post("/projetos").send(PAYLOAD_VALIDO);
            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty("id");
            expect(res.body.titulo).toBe(PAYLOAD_VALIDO.titulo);
        });

        it("deve persistir os dados corretamente no banco", async () => {
            const res = await request(app).post("/projetos").send(PAYLOAD_VALIDO);
            const id = res.body.id;

            const busca = await request(app).get(`/projetos/${id}`);
            expect(busca.body.titulo).toBe(PAYLOAD_VALIDO.titulo);
            expect(busca.body.feature).toBe(PAYLOAD_VALIDO.feature);
        });

        it("deve retornar 422 sem titulo", async () => {
            const { titulo, ...sem } = PAYLOAD_VALIDO;
            const res = await request(app).post("/projetos").send(sem);
            expect(res.statusCode).toBe(422);
        });

        it("deve retornar 422 sem descricao", async () => {
            const { descricao, ...sem } = PAYLOAD_VALIDO;
            const res = await request(app).post("/projetos").send(sem);
            expect(res.statusCode).toBe(422);
        });

        it("deve retornar 422 sem feature", async () => {
            const { feature, ...sem } = PAYLOAD_VALIDO;
            const res = await request(app).post("/projetos").send(sem);
            expect(res.statusCode).toBe(422);
        });

        it("deve retornar 422 para título composto só de espaços", async () => {
            const res = await request(app).post("/projetos").send({ ...PAYLOAD_VALIDO, titulo: "   " });
            expect(res.statusCode).toBe(422);
        });

        it("deve aceitar cenarios como array vazio", async () => {
            const res = await request(app).post("/projetos").send({ ...PAYLOAD_VALIDO, cenarios: [] });
            expect(res.statusCode).toBe(201);
        });

        it("deve aceitar criação sem enviar cenarios", async () => {
            const { cenarios, ...sem } = PAYLOAD_VALIDO;
            const res = await request(app).post("/projetos").send(sem);
            expect([200, 201]).toContain(res.statusCode);
        });

        it("GET deve refletir o POST criado", async () => {
            await request(app).post("/projetos").send({ ...PAYLOAD_VALIDO, titulo: "Fluxo Completo" });
            const res = await request(app).get("/projetos");
            expect(res.body.some(p => p.titulo === "Fluxo Completo")).toBe(true);
        });

    });

    // =====================================================
    // PUT /projetos/:id
    // =====================================================
    describe("PUT /projetos/:id", () => {

        it("deve atualizar titulo e retornar o projeto atualizado", async () => {
            const criado = await createProjeto();
            const res = await request(app)
                .put(`/projetos/${criado.id}`)
                .send({ titulo: "Título Atualizado" });

            expect(res.statusCode).toBe(200);
            expect(res.body.titulo).toBe("Título Atualizado");
        });

        it("deve atualizar parcialmente sem apagar outros campos", async () => {
            const criado = await createProjeto({ titulo: "Original", descricao: "Desc Original" });
            await request(app).put(`/projetos/${criado.id}`).send({ titulo: "Novo Título" });

            const busca = await request(app).get(`/projetos/${criado.id}`);
            expect(busca.body.descricao).toBe("Desc Original");
        });

        it("deve retornar 404 para ID inexistente", async () => {
            const res = await request(app).put("/projetos/999999").send({ titulo: "x" });
            expect(res.statusCode).toBe(404);
        });

    });

    // =====================================================
    // DELETE /projetos/:id
    // =====================================================
    describe("DELETE /projetos/:id", () => {

        it("deve deletar o projeto e retornar mensagem de sucesso", async () => {
            const criado = await createProjeto();
            const res = await request(app).delete(`/projetos/${criado.id}`);
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty("message");
        });

        it("deve confirmar que o projeto não existe mais após deleção", async () => {
            const criado = await createProjeto();
            await request(app).delete(`/projetos/${criado.id}`);

            const busca = await request(app).get(`/projetos/${criado.id}`);
            expect(busca.statusCode).toBe(404);
        });

        it("deve retornar 404 ao tentar deletar ID inexistente", async () => {
            const res = await request(app).delete("/projetos/999999");
            expect(res.statusCode).toBe(404);
        });

    });

    // =====================================================
    // POST /projetos - Testes de resiliência e validações extras
    // =====================================================
    describe("POST /projetos - Validações extras", () => {

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
            expect(res.body).toHaveProperty("id");
        });

        it("deve rejeitar sem titulo (422)", async () => {
            const res = await request(app)
                .post("/projetos")
                .send({
                    descricao: "x",
                    feature: "y",
                    cenarios: []
                });

            expect(res.statusCode).toBe(422);
        });

        it("deve rejeitar sem descricao (422)", async () => {
            const res = await request(app)
                .post("/projetos")
                .send({
                    titulo: "x",
                    feature: "y",
                    cenarios: []
                });

            expect(res.statusCode).toBe(422);
        });

        it("deve rejeitar sem feature (422)", async () => {
            const res = await request(app)
                .post("/projetos")
                .send({
                    titulo: "x",
                    descricao: "y",
                    cenarios: []
                });

            expect(res.statusCode).toBe(422);
        });

        // =========================
        // VALIDAÇÃO CENÁRIOS
        // =========================

        it("deve aceitar cenarios não-array (usa default de array vazio)", async () => {
            const res = await request(app)
                .post("/projetos")
                .send({
                    titulo: "teste",
                    descricao: "teste",
                    feature: "teste",
                    cenarios: "inválido"
                });

            // O serviço aceita e converte em JSON — comportamento permissivo
            expect([200, 201]).toContain(res.statusCode);
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

        it("deve aceitar cenário com nome vazio (serviço não valida conteúdo interno)", async () => {
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

            expect([200, 201]).toContain(res.statusCode);
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

            expect(res.statusCode).toBe(422);
        });

        it("deve persistir projeto e retornar id", async () => {
            const res = await request(app)
                .post("/projetos")
                .send(payloadValido);

            expect(res.body.id).toBeDefined();
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