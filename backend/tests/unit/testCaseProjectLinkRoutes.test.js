jest.mock("../../src/db", () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock("../../src/config/env", () => ({ jwt: { secret: "isolated-case-link" } }));
const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const pool = require("../../src/db");
const app = express(); app.use(express.json()); app.use(require("../../src/middleware/auth"));
app.use("/projetos", require("../../src/routes/projetos")); app.use(require("../../src/middleware/errorHandler"));
const before = { id: 42, titulo: "Caso", descricao: "D", feature: "F", project_id: 5 };
let client;
const call = (method, path, role, body) => {
  const req = request(app)[method](path);
  if (role) req.set("Authorization", `Bearer ${jwt.sign({ sub: 7, role }, "isolated-case-link")}`);
  return body ? req.send(body) : req;
};
beforeEach(() => {
  pool.query.mockReset(); pool.connect.mockReset();
  pool.query.mockImplementation(async (sql, params) => {
    if (sql.startsWith("SELECT")) return { rows: [{ ...before, project_nome: "Anterior", project_deleted_at: null }] };
    if (sql.startsWith("UPDATE projetos")) return { rows: [{ ...before, project_id: params.length === 5 ? params[4] : 5 }] };
    return { rows: [] };
  });
  client = { release: jest.fn(), query: jest.fn(async (sql, params) => {
    if (sql.startsWith("SELECT id FROM projects")) return { rows: [{ id: params[0] }] };
    if (sql.startsWith("INSERT INTO projetos")) return { rows: [{ ...before, project_id: params[5] }] };
    if (sql.startsWith("UPDATE projetos")) return { rows: [{ ...before, project_id: params[4] }] };
    return { rows: [] };
  }) };
  pool.connect.mockResolvedValue(client);
});
it.each(["admin", "qa"])("%s can create and change Project link with legacy audit type", async role => {
  const created = await call("post", "/projetos", role, { titulo: "Caso", descricao: "D", feature: "F", project_id: 9 });
  expect(created.status).toBe(201); expect(created.body.project_id).toBe(9);
  const updated = await call("put", "/projetos/42", role, { project_id: 8 });
  expect(updated.status).toBe(200); expect(updated.body.project_id).toBe(8);
  const audits = pool.query.mock.calls.filter(([sql]) => sql.includes("INSERT INTO audit_logs"));
  expect(audits).toHaveLength(2);
  expect(audits[0][1].slice(0, 4)).toEqual([7, "projeto", 42, "CREATE"]);
  expect(JSON.parse(audits[0][1][5]).project_id).toBe(9);
  expect(audits[1][1].slice(0, 4)).toEqual([7, "projeto", 42, "UPDATE"]);
  expect(JSON.parse(audits[1][1][4]).project_id).toBe(5);
  expect(JSON.parse(audits[1][1][5]).project_id).toBe(8);
});
it("explicit null unlinks and audits the previous and new link", async () => {
  expect((await call("put", "/projetos/42", "qa", { project_id: null })).status).toBe(200);
  expect(pool.connect).not.toHaveBeenCalled();
  const audit = pool.query.mock.calls.find(([sql]) => sql.includes("INSERT INTO audit_logs"));
  expect(JSON.parse(audit[1][4]).project_id).toBe(5); expect(JSON.parse(audit[1][5]).project_id).toBeNull();
});
it.each(["admin", "qa", "reader"])("%s reads historical Project metadata", async role => {
  const result = await call("get", "/projetos/42", role);
  expect(result.status).toBe(200); expect(result.body).toMatchObject({ id: 42, project_id: 5, project_nome: "Anterior", project_deleted_at: null });
});
it.each([["post", "/projetos"], ["put", "/projetos/42"], ["delete", "/projetos/42"], ["post", "/projetos/42/restore"]])("reader cannot %s %s", async (method, path) => {
  expect((await call(method, path, "reader", { ...before, project_id: 9 })).status).toBe(403);
  expect(pool.query).not.toHaveBeenCalled(); expect(pool.connect).not.toHaveBeenCalled();
});
it.each([["delete", "/projetos/42"], ["post", "/projetos/42/restore"]])("QA cannot %s %s", async (method, path) => {
  expect((await call(method, path, "qa")).status).toBe(403); expect(pool.query).not.toHaveBeenCalled();
});
it.each(["get", "put"])("requires authentication for %s", async method => {
  expect((await call(method, "/projetos/42", undefined, { project_id: 9 })).status).toBe(401);
  expect(pool.query).not.toHaveBeenCalled(); expect(pool.connect).not.toHaveBeenCalled();
});
it.each(["9", 0, -1, false, 1.5, 2147483648])("rejects invalid ID %j with 422 before writes", async project_id => {
  expect((await call("put", "/projetos/42", "qa", { project_id })).status).toBe(422);
  expect(pool.query).not.toHaveBeenCalled(); expect(pool.connect).not.toHaveBeenCalled();
});
it("rejects unavailable Project without an audit event", async () => {
  client.query.mockResolvedValue({ rows: [] });
  expect((await call("put", "/projetos/42", "qa", { project_id: 9 })).status).toBe(422);
  expect(pool.query.mock.calls.some(([sql]) => sql.includes("audit_logs"))).toBe(false);
});
it('PUT persists scenarios and audits before/after with legacy entity type', async () => {
  const cenarios = [{ nome: 'Changed', extra: { retained: true } }];
  pool.query.mockImplementation(async (sql, params) => {
    if (sql.startsWith('SELECT')) return { rows: [{ ...before, cenarios: [{ nome: 'Before' }] }] };
    if (sql.startsWith('UPDATE projetos')) return { rows: [{ ...before, cenarios: JSON.parse(params[4]) }] };
    return { rows: [] };
  });
  const response = await call('put', '/projetos/42', 'qa', { cenarios });
  expect(response.status).toBe(200); expect(response.body.cenarios).toEqual(cenarios); expect(response.body.project_id).toBe(5);
  const event = pool.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO audit_logs'));
  expect(event[1][1]).toBe('projeto'); expect(JSON.parse(event[1][4]).cenarios).toEqual([{ nome: 'Before' }]); expect(JSON.parse(event[1][5]).cenarios).toEqual(cenarios);
});
