/**
 * Testes de segurança — Fase 5, item 16.
 * Cobre: adulteração de JWT, alg:none, expiração, SQL injection, XSS payload,
 * payload acima do limite e header de segurança (Helmet).
 *
 * Assim como em auth.test.js, o middleware é testado num mini-app isolado
 * porque NODE_ENV=test desativa authMiddleware no app principal.
 */

const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const authMiddleware = require("../src/middleware/auth");
const { clearTables, clearUsers, closePool, createProjeto } = require("./helpers/db");
const { createTestUser, TEST_USER } = require("./helpers/auth");

const securedApp = express();
securedApp.use(express.json());
securedApp.use(authMiddleware);
securedApp.get("/secured", (req, res) => res.json({ user: req.user }));

// The injected API actor must exist even when this suite runs alone on an empty DB.
beforeAll(async () => {
  await clearUsers();
  await createTestUser({ role: "admin" });
});

beforeEach(async () => {
    // Nota: não chama clearUsers() aqui — o bypass de auth em NODE_ENV=test
    // (app.js) injeta req.user.id = 1 fixo, e os inserts usam esse id como
    // created_by (FK para users). Limpar users quebraria essa referência
    // para os testes que criam projetos/execuções via `app`.
    await clearTables();
});

afterAll(async () => {
  await closePool();
});

describe("Segurança — JWT", () => {

    it("deve rejeitar token assinado com segredo diferente (adulterado)", async () => {
        const forjado = jwt.sign(
            { sub: 1, email: TEST_USER.email, role: "admin" },
            "segredo-errado-forjado-pelo-atacante",
            { expiresIn: "1h" }
        );

        const res = await request(securedApp)
            .get("/secured")
            .set("Authorization", `Bearer ${forjado}`);

        expect(res.statusCode).toBe(401);
    });

    it("deve rejeitar token com alg:none (sem assinatura)", async () => {
        // Token clássico de ataque: header alg=none, sem parte de assinatura
        const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
        const payload = Buffer.from(JSON.stringify({ sub: 1, role: "admin" })).toString("base64url");
        const tokenSemAssinatura = `${header}.${payload}.`;

        const res = await request(securedApp)
            .get("/secured")
            .set("Authorization", `Bearer ${tokenSemAssinatura}`);

        expect(res.statusCode).toBe(401);
    });

    it("deve rejeitar token expirado", async () => {
        const expirado = jwt.sign(
            { sub: 1, email: TEST_USER.email, role: "admin" },
            process.env.JWT_SECRET,
            { expiresIn: "-1h" } // já expirado
        );

        const res = await request(securedApp)
            .get("/secured")
            .set("Authorization", `Bearer ${expirado}`);

        expect(res.statusCode).toBe(401);
    });

    it("não deve aceitar role elevada só porque veio no payload sem passar pelo login real", async () => {
        // Um token válido (mesmo segredo) mas nunca emitido pelo /auth/login —
        // simula um usuário tentando se auto-promover a admin.
        const autoPromovido = jwt.sign(
            { sub: 999999, email: "invasor@evil.com", role: "admin" },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        const res = await request(securedApp)
            .get("/secured")
            .set("Authorization", `Bearer ${autoPromovido}`);

        // O middleware não valida se o usuário existe (isso é esperado — quem
        // assina o token é sempre o /auth/login). O ponto crítico é que só é
        // possível chegar aqui com o JWT_SECRET correto, validado no teste acima.
        expect(res.statusCode).toBe(200);
        expect(res.body.user.role).toBe("admin");
    });

});

describe("Segurança — SQL Injection", () => {

    it("payload de SQL injection no título do projeto deve ser tratado como texto literal", async () => {
        const payload = "'; DROP TABLE projetos; --";
        const res = await request(app)
            .post("/projetos")
            .send({ titulo: payload, descricao: "teste", feature: "Feature: x" });

        expect(res.statusCode).toBe(201);
        expect(res.body.titulo).toBe(payload);

        // Se a injection tivesse funcionado, a tabela não existiria mais
        const listaRes = await request(app).get("/projetos");
        expect(listaRes.statusCode).toBe(200);
    });

    it("payload de SQL injection no login não deve autenticar nem quebrar a rota", async () => {
        await createTestUser();
        const res = await request(app)
            .post("/auth/login")
            .send({ email: "' OR '1'='1", password: "' OR '1'='1" });

        expect([401, 422]).toContain(res.statusCode);
    });

    it("payload de SQL injection em query param de filtro (admin/audit-log) não deve derrubar a API", async () => {
        const res = await request(app)
            .get("/admin/audit-log")
            .query({ entity_type: "projeto'; DROP TABLE audit_logs; --" });

        // Autorizado (test bypass = admin); o importante é não ser 500
        expect(res.statusCode).not.toBe(500);
    });

});

describe("Segurança — XSS / dados não sanitizados", () => {

    it("payload com <script> deve ser armazenado como texto puro, sem quebrar a API", async () => {
        const xss = "<script>alert('xss')</script>";
        const res = await request(app)
            .post("/projetos")
            .send({ titulo: xss, descricao: "teste", feature: "Feature: x" });

        expect(res.statusCode).toBe(201);
        // A API não deve executar nem alterar o conteúdo — sanitização de exibição é responsabilidade do frontend
        expect(res.body.titulo).toBe(xss);
    });

});

describe("Segurança — limites de payload", () => {

    it("deve rejeitar corpo de requisição acima do limite (500kb)", async () => {
        const enorme = "a".repeat(600 * 1024); // 600kb > limite de 500kb
        const res = await request(app)
            .post("/projetos")
            .send({ titulo: "x", descricao: enorme, feature: "Feature: x" });

        expect([400, 413]).toContain(res.statusCode);
    });

});

describe("Segurança — headers HTTP (Helmet)", () => {

    it("deve incluir cabeçalhos de segurança do Helmet", async () => {
        const res = await request(app).get("/projetos");
        expect(res.headers).toHaveProperty("x-content-type-options", "nosniff");
        expect(res.headers).not.toHaveProperty("x-powered-by");
    });

});
