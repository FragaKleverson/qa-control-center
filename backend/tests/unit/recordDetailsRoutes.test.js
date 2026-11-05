jest.mock("../../src/db", () => ({ query: jest.fn() }));
jest.mock("../../src/config/env", () => ({ jwt: { secret: "isolated-details-test-secret" } }));
const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const pool = require("../../src/db");
const authenticate = require("../../src/middleware/auth");
const app = express();
app.use(authenticate);
app.use("/requirements", require("../../src/routes/requirements"));
app.use("/projetos", require("../../src/routes/projetos"));
beforeEach(() => pool.query.mockReset());
const token = (role) => jwt.sign({ sub: 1, role }, "isolated-details-test-secret", { expiresIn: "1h" });
it.each(["requirements", "projetos"].flatMap((endpoint) => ["admin", "qa", "reader"].map((role) => [endpoint, role])))("GET /%s allows authenticated %s without writing", async (endpoint, role) => {
  pool.query.mockResolvedValue({ rows: [{ id: 42, titulo: "Detalhes" }] });
  const response = await request(app).get(`/${endpoint}/42`).set("Authorization", `Bearer ${token(role)}`);
  expect(response.status).toBe(200); expect(response.body.titulo).toBe("Detalhes");
  expect(pool.query).toHaveBeenCalledTimes(1);
  expect(pool.query.mock.calls[0][0]).toMatch(endpoint === "projetos" ? /^SELECT p\.\*, pr\.nome AS project_nome/ : /^SELECT \* FROM/);
  expect(pool.query.mock.calls[0][0]).toContain("deleted_at IS NULL");
});
it.each(["requirements", "projetos"])("GET /%s requires authentication", async (endpoint) => {
  expect((await request(app).get(`/${endpoint}/42`)).status).toBe(401);
  expect(pool.query).not.toHaveBeenCalled();
});
it.each(["requirements", "projetos"])("GET /%s returns 404 for missing or excluded record", async (endpoint) => {
  pool.query.mockResolvedValue({ rows: [] });
  expect((await request(app).get(`/${endpoint}/42`).set("Authorization", `Bearer ${token("reader")}`)).status).toBe(404);
  expect(pool.query.mock.calls[0][0]).toContain("deleted_at IS NULL");
});
