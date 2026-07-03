/**
 * Testes de integração: rota /requirements
 * Cobre: listagem, criação, busca por ID, atualização, deleção e validações.
 */

const request = require("supertest");
const app = require("../src/app");
const { clearTables, closePool, createRequirement } = require("./helpers/db");

const PAYLOAD_VALIDO = {
  titulo: "REQ-001: Usuário deve fazer login",
  descricao: "O sistema deve permitir autenticação com email e senha",
  status: "Open",
  prioridade: "High",
};

beforeEach(async () => {
  await clearTables();
});

afterAll(async () => {
  await closePool();
});

describe("Requirements API - Suite completa", () => {

    // =====================================================
    // GET /requirements
    // =====================================================
    describe("GET /requirements", () => {

        it("deve retornar 200 com array vazio", async () => {
            const res = await request(app).get("/requirements");
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it("deve retornar requirements criados", async () => {
            await createRequirement({ titulo: "Req A" });
            await createRequirement({ titulo: "Req B" });

            const res = await request(app).get("/requirements");
            expect(res.body).toHaveLength(2);
            expect(res.body[0]).toHaveProperty("id");
            expect(res.body[0]).toHaveProperty("status");
            expect(res.body[0]).toHaveProperty("prioridade");
        });

    });

    // =====================================================
    // GET /requirements/:id
    // =====================================================
    describe("GET /requirements/:id", () => {

        it("deve retornar o requirement pelo ID", async () => {
            const req = await createRequirement({ titulo: "Req Busca" });
            const res = await request(app).get(`/requirements/${req.id}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.titulo).toBe("Req Busca");
        });

        it("deve retornar 404 para ID inexistente", async () => {
            const res = await request(app).get("/requirements/999999");
            expect(res.statusCode).toBe(404);
        });

    });

    // =====================================================
    // POST /requirements
    // =====================================================
    describe("POST /requirements", () => {

        it("deve criar requirement com sucesso (201)", async () => {
            const res = await request(app).post("/requirements").send(PAYLOAD_VALIDO);
            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty("id");
            expect(res.body.titulo).toBe(PAYLOAD_VALIDO.titulo);
        });

        it("deve usar valores padrão para status e prioridade", async () => {
            const res = await request(app)
                .post("/requirements")
                .send({ titulo: "Só título" });
            expect(res.statusCode).toBe(201);
            expect(res.body.status).toBe("Open");
            expect(res.body.prioridade).toBe("Medium");
        });

        it("deve retornar 422 sem titulo", async () => {
            const res = await request(app)
                .post("/requirements")
                .send({ descricao: "sem titulo", status: "Open" });
            expect(res.statusCode).toBe(422);
        });

        it("deve retornar 422 para titulo só com espaços", async () => {
            const res = await request(app)
                .post("/requirements")
                .send({ ...PAYLOAD_VALIDO, titulo: "   " });
            expect(res.statusCode).toBe(422);
        });

        it("deve aceitar todos os valores válidos de status", async () => {
            for (const status of ["Open", "In Progress", "Closed"]) {
                const res = await request(app)
                    .post("/requirements")
                    .send({ titulo: `Req ${status}`, status });
                expect(res.statusCode).toBe(201);
                expect(res.body.status).toBe(status);
            }
        });

        it("deve aceitar todos os valores válidos de prioridade", async () => {
            for (const prioridade of ["Low", "Medium", "High"]) {
                const res = await request(app)
                    .post("/requirements")
                    .send({ titulo: `Req ${prioridade}`, prioridade });
                expect(res.statusCode).toBe(201);
                expect(res.body.prioridade).toBe(prioridade);
            }
        });

    });

    // =====================================================
    // DELETE /requirements/:id
    // =====================================================
    describe("DELETE /requirements/:id", () => {

        it("deve deletar requirement e confirmar remoção", async () => {
            const req = await createRequirement();
            const del = await request(app).delete(`/requirements/${req.id}`);
            expect(del.statusCode).toBe(200);

            const busca = await request(app).get(`/requirements/${req.id}`);
            expect(busca.statusCode).toBe(404);
        });

        it("deve retornar 404 para ID inexistente", async () => {
            const res = await request(app).delete("/requirements/999999");
            expect(res.statusCode).toBe(404);
        });

    });

});
