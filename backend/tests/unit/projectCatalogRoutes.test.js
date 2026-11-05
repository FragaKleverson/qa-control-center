jest.mock("../../src/db", () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock("../../src/config/env", () => ({ jwt: { secret: "isolated-project-catalog" } }));
const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const pool = require("../../src/db");
const app = express();
app.use(express.json()); app.use(require("../../src/middleware/auth"));
app.use("/projects", require("../../src/routes/projects"));
app.use(require("../../src/middleware/errorHandler"));
const endpoints = [["get", "/projects"], ["get", "/projects/42"], ["post", "/projects"], ["put", "/projects/42"], ["delete", "/projects/42"], ["post", "/projects/42/restore"]];
let client;
const perform = (method, path, role, body = { nome: " Catalogo " }) => {
  const req = request(app)[method](path);
  if (role) req.set("Authorization", `Bearer ${jwt.sign({ sub: 7, role }, "isolated-project-catalog")}`);
  return req.send(body);
};
beforeEach(() => {
  pool.query.mockReset(); pool.connect.mockReset();
  pool.query.mockResolvedValue({ rows: [{ id: 42, nome: "Catalogo", descricao: null }] });
  client = { release: jest.fn(), query: jest.fn(async sql => ({ rows: [{ id: 42, nome: "Catalogo", descricao: null, deleted_at: sql.includes("FOR UPDATE") ? null : undefined }] })) };
  pool.connect.mockResolvedValue(client);
});
it.each(endpoints)("%s %s denies unauthenticated users before DB calls", async (method, path) => {
  expect((await perform(method, path)).status).toBe(401); expect(pool.query).not.toHaveBeenCalled(); expect(pool.connect).not.toHaveBeenCalled();
});
it.each(["admin", "qa", "reader"].flatMap(role => endpoints.map(([method, path], index) => [role, method, path, index])))("%s permissions for %s %s", async (role, method, path, index) => {
  if (index === 5) client.query.mockImplementation(async () => ({ rows: [{ id: 42, nome: "Catalogo", deleted_at: "2026-10-30" }] }));
  const allowed = index < 2 || role === "admin" || (role === "qa" && index < 4);
  const response = await perform(method, path, role);
  expect(response.status).toBe(allowed ? (index === 2 ? 201 : 200) : 403);
  if (!allowed) { expect(pool.query).not.toHaveBeenCalled(); expect(pool.connect).not.toHaveBeenCalled(); }
});
it.each([{}, { nome: " " }, { nome: false }, { nome: null }, { nome: "Good", descricao: 2 }])("rejects invalid POST payload %j", async payload => {
  expect((await perform("post", "/projects", "qa", payload)).status).toBe(422); expect(pool.connect).not.toHaveBeenCalled();
});
it.each(["0", "-1", "1.5", "abc", "2147483648"])("rejects invalid URL ID %s", async id => {
  expect((await perform("get", `/projects/${id}`, "reader")).status).toBe(422); expect(pool.query).not.toHaveBeenCalled();
});
it.each(["page=0", "limit=101", "page=abc"])("validates pagination %s", async query => {
  expect((await perform("get", `/projects?${query}`, "reader")).status).toBe(422); expect(pool.query).not.toHaveBeenCalled();
});
it("returns opt-in envelope and defaults", async () => {
  pool.query.mockImplementation(async sql => ({ rows: sql.includes("COUNT") ? [{ count: "1" }] : [{ id: 42 }] }));
  const response = await perform("get", "/projects?limit=3", "reader");
  expect(response.body).toEqual({ data: [{ id: 42 }], total: 1, page: 1, limit: 3 });
});
it("returns 404 for excluded/missing record", async () => {
  pool.query.mockResolvedValue({ rows: [] }); expect((await perform("get", "/projects/42", "reader")).status).toBe(404);
});
it("returns standard 500 for simulated database failures", async () => {
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  try { pool.query.mockRejectedValue(new Error("simulated")); expect((await perform("get", "/projects", "reader")).status).toBe(500); }
  finally { log.mockRestore(); }
});
it("ignores forged ownership/control fields and trims name", async () => {
  expect((await perform("post", "/projects", "qa", { nome: " Catalogo ", created_by: 99, deleted_at: "forged" })).status).toBe(201);
  const insert = client.query.mock.calls.find(([sql]) => sql.startsWith("INSERT INTO projects"));
  expect(insert[1]).toEqual(["Catalogo", null, 7]);
});
