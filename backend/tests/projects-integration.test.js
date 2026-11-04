// Real HTTP + PostgreSQL; invoke only through the guarded integration runner.
// Legacy Jest discovery must not run disposable fixtures against qa_control_test.
if (process.env.QA_INTEGRATION_MODE === undefined) {
  test.skip("requires the explicit disposable integration runner", () => {});
} else {
require("../src/config/integrationTarget").readIntegrationConfig(process.env);
const request = require("supertest");
const express = require("express");
const pool = require("../src/db");
const { clearTables, clearUsers, closePool, createSuite } = require("./helpers/db");
const { createTestUser, TEST_USER } = require("./helpers/auth");
const catalog = require("../src/services/projectCatalogService");
const cases = require("../src/services/projectsService");
const suites = require("../src/services/testSuitesService");
const actor = { userId: 1 };
// Production authentication middleware is deliberately used, without app.js test bypass.
const app = express();
app.use(express.json());
app.use("/auth", require("../src/routes/auth"));
app.use(require("../src/middleware/auth"));
app.use("/projects", require("../src/routes/projects"));
app.use("/projetos", require("../src/routes/projetos"));
app.use(require("../src/middleware/errorHandler"));
const payload = { titulo: "Case", descricao: "Description", feature: "Feature", cenarios: [] };
let tokens;
beforeEach(async () => {
  await clearTables(); await clearUsers();
  tokens = {};
  for (const role of ["admin", "qa", "reader"]) {
    const email = `${role}@integration.invalid`;
    await createTestUser({ email, role });
    const login = await request(app).post("/auth/login").send({ email, password: TEST_USER.password });
    expect(login.status).toBe(200); tokens[role] = `Bearer ${login.body.token}`;
  }
});
afterAll(closePool);
const api = (method, url, role = "admin") => request(app)[method](url).set("Authorization", tokens[role]);

test.each(["admin", "qa"])("%s creates and edits independent Project with transactional audit", async role => {
  const created = await api("post", "/projects", role).send({ nome: "  Catalog  ", descricao: "D", created_by: 999 });
  expect(created.status).toBe(201); expect(created.body.nome).toBe("Catalog");
  expect(created.body.created_by).toBe(role === "admin" ? 1 : 2);
  const changed = await api("put", `/projects/${created.body.id}`, role).send({ descricao: null });
  expect(changed.status).toBe(200); expect(changed.body.nome).toBe("Catalog"); expect(changed.body.descricao).toBeNull();
  const audit = (await pool.query("SELECT entity_type, old_values, new_values FROM audit_logs WHERE entity_type = 'project' AND action = 'UPDATE' ORDER BY id DESC LIMIT 1")).rows[0];
  expect(audit.entity_type).toBe("project"); expect(audit.old_values.descricao).toBe("D"); expect(audit.new_values.descricao).toBeNull();
  expect((await pool.query("SELECT COUNT(*)::integer AS count FROM projetos")).rows[0].count).toBe(0);
});
test("real JWT denies unauthenticated access and Reader writes", async () => {
  expect((await request(app).get("/projects")).status).toBe(401);
  expect((await api("get", "/projects", "reader")).status).toBe(200);
  expect((await api("post", "/projects", "reader").send({ nome: "Denied" })).status).toBe(403);
});
test("only Admin deletes/restores; historical case link survives both", async () => {
  const p = await catalog.create({ nome: "Catalog" }, actor);
  const tc = await cases.create({ ...payload, project_id: p.id }, 1);
  expect((await api("delete", `/projects/${p.id}`, "qa")).status).toBe(403);
  expect((await api("delete", `/projects/${p.id}`)).status).toBe(200);
  expect((await api("get", `/projects/${p.id}`)).status).toBe(404);
  const historical = await cases.getById(tc.id);
  expect(historical.project_id).toBe(p.id); expect(historical.project_nome).toBe("Catalog"); expect(historical.project_deleted_at).not.toBeNull();
  expect((await api("post", `/projects/${p.id}/restore`, "qa")).status).toBe(403);
  expect((await api("post", `/projects/${p.id}/restore`)).status).toBe(200);
  expect((await cases.getById(tc.id)).project_deleted_at).toBeNull();
});
test("catalog pagination opt-in and blank-name validation", async () => {
  expect((await api("post", "/projects").send({ nome: "   " })).status).toBe(422);
  for (const nome of ["A", "B", "C"]) await catalog.create({ nome }, actor);
  expect((await api("get", "/projects")).body).toHaveLength(3);
  const response = await api("get", "/projects?page=2&limit=2");
  expect(response.status).toBe(200); expect(response.body).toMatchObject({ total: 3, page: 2, limit: 2 }); expect(response.body.data).toHaveLength(1);
});
test("optional link supports omission, addition, replacement, removal and scenarios", async () => {
  const a = await catalog.create({ nome: "A" }, actor), b = await catalog.create({ nome: "B" }, actor);
  const created = await api("post", "/projetos").send(payload); expect(created.status).toBe(201);
  const id = created.body.id; expect(created.body.project_id).toBeNull();
  expect((await api("put", `/projetos/${id}`).send({ project_id: a.id })).status).toBe(200);
  expect((await api("put", `/projetos/${id}`).send({ descricao: "", cenarios: [null, { legacy: true }] })).status).toBe(200);
  const preserved = (await api("get", `/projetos/${id}`)).body;
  expect(preserved.project_id).toBe(a.id); expect(preserved.project_nome).toBe("A"); expect(preserved.descricao).toBe(""); expect(preserved.cenarios).toEqual([null, { legacy: true }]);
  expect((await api("put", `/projetos/${id}`).send({ project_id: b.id })).status).toBe(200);
  expect((await api("put", `/projetos/${id}`).send({ project_id: null, cenarios: [] })).status).toBe(200);
  expect((await cases.getById(id)).project_id).toBeNull(); expect((await cases.getById(id)).cenarios).toEqual([]);
});
test.each([0, -1, "1", 999999])("rejects invalid/missing Project %j", async project_id => {
  expect((await api("post", "/projetos").send({ ...payload, project_id })).status).toBe(422);
});
test("deleted Project cannot be assigned and Reader cannot change a link", async () => {
  const p = await catalog.create({ nome: "Deleted" }, actor), tc = await cases.create(payload, 1);
  await catalog.delete(p.id, actor);
  expect((await api("put", `/projetos/${tc.id}`).send({ project_id: p.id })).status).toBe(422);
  expect((await api("put", `/projetos/${tc.id}`, "reader").send({ project_id: null })).status).toBe(403);
});
test("shared suite accepts cases of different Projects and no Project", async () => {
  const suite = await createSuite(); const ids = [];
  for (const nome of ["A", "B"]) { const p = await catalog.create({ nome }, actor); ids.push((await cases.create({ ...payload, project_id: p.id }, 1)).id); }
  ids.push((await cases.create(payload, 1)).id);
  for (const id of ids) await suites.addCase(suite.id, id);
  expect((await suites.getCases(suite.id)).map(tc => tc.id).sort()).toEqual(ids.sort());
});

// Independent sessions with observed PostgreSQL blocking, rather than timing alone.
async function race(firstAction, secondAction) {
  const connect = pool.connect.bind(pool), observer = await connect();
  let unlock, lockedResolve, connectedResolve, firstPid, secondPid, ordinal = 0;
  const gate = new Promise(r => { unlock = r; }), locked = new Promise(r => { lockedResolve = r; }), connected = new Promise(r => { connectedResolve = r; });
  const spy = jest.spyOn(pool, "connect").mockImplementation(async () => {
    const client = await connect(), position = ++ordinal, query = client.query.bind(client), release = client.release.bind(client);
    if (position === 1) firstPid = client.processID;
    if (position === 2) { secondPid = client.processID; connectedResolve(); }
    client.query = async (...args) => { const result = await query(...args); if (position === 1 && /FOR (SHARE|UPDATE)/.test(args[0])) { lockedResolve(); await gate; } return result; };
    client.release = (...args) => release(...args);
    return client;
  });
  let first, second;
  try {
    first = firstAction().then(value => ({ value }), error => ({ error })); await locked;
    second = secondAction().then(value => ({ value }), error => ({ error })); await connected;
    let blocked = false;
    for (let n = 0; n < 100; n++) { const row = (await observer.query("SELECT $1::integer = ANY(pg_blocking_pids($2::integer)) AS blocked", [firstPid, secondPid])).rows[0]; if (row.blocked) { blocked = true; break; } await new Promise(r => setTimeout(r, 10)); }
    expect(firstPid).not.toBe(secondPid); expect(blocked).toBe(true); unlock(); return await Promise.all([first, second]);
  } finally { unlock(); await Promise.all([first, second].filter(Boolean)); spy.mockRestore(); observer.release(); }
}
test.each(["link-first", "delete-first"])("Project link/delete serialize safely: %s", async order => {
  const p = await catalog.create({ nome: "Concurrent" }, actor);
  const link = () => cases.create({ ...payload, project_id: p.id }, 1), remove = () => catalog.delete(p.id, actor);
  const result = await race(order === "link-first" ? link : remove, order === "link-first" ? remove : link);
  expect(result[0].error).toBeUndefined();
  if (order === "link-first") { expect(result[1].error).toBeUndefined(); expect((await cases.getById(result[0].value.id)).project_deleted_at).not.toBeNull(); }
  else { expect(result[1].error).toMatchObject({ statusCode: 422 }); expect((await cases.listAll()).length).toBe(0); }
});
}
