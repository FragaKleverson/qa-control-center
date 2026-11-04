jest.mock("../../src/db", () => ({ query: jest.fn(), connect: jest.fn() }));
const pool = require("../../src/db");
const service = require("../../src/services/projectsService");
const { createSchema, updateSchema } = require("../../src/validators/projetos");
const data = { titulo: "Caso", descricao: "Descricao", feature: "Feature", cenarios: [{ nome: "Cenario" }] };
let client, saved;
beforeEach(() => {
  pool.query.mockReset(); pool.connect.mockReset();
  saved = { id: 42, ...data, project_id: 5 };
  const write = async (sql, params) => {
    if (sql.startsWith("INSERT INTO projetos")) return { rows: [{ ...data, id: 42, created_by: params[4], project_id: params[5] ?? null }] };
    if (sql.startsWith("UPDATE projetos")) {
      saved = { ...saved, titulo: params[0] ?? saved.titulo, descricao: params[1] ?? saved.descricao, feature: params[2] ?? saved.feature, ...(sql.includes("project_id =") ? { project_id: params[4] } : {}), ...(sql.includes("cenarios =") ? { cenarios: JSON.parse(params[sql.includes("project_id =") ? 5 : 4]) } : {}) };
      return { rows: [saved] };
    }
    return { rows: [] };
  };
  pool.query.mockImplementation(write);
  client = { query: jest.fn(async (sql, params) => sql.startsWith("SELECT id FROM projects") ? { rows: [{ id: params[0] }] } : write(sql, params)), release: jest.fn() };
  pool.connect.mockResolvedValue(client);
});
afterEach(() => {
  for (const [sql] of [...pool.query.mock.calls, ...client.query.mock.calls]) {
    expect(sql).not.toMatch(/\b(test_suites|test_plans|execucoes|execution_results|test_suite_cases)\b/);
    expect(sql).not.toMatch(/(?:UPDATE|INSERT INTO|DELETE FROM) projects\b/);
  }
});
it.each([undefined, null])("creates without Project %j", async project_id => {
  const result = await service.create({ ...data, ...(project_id === undefined ? {} : { project_id }) }, 7);
  expect(result).toMatchObject({ id: 42, project_id: null, created_by: 7 }); expect(pool.connect).not.toHaveBeenCalled();
});
it("creates with active catalog Project and retains case fields", async () => {
  const result = await service.create({ ...data, project_id: 9 }, 7);
  expect(result).toMatchObject({ ...data, id: 42, project_id: 9 });
  expect(client.query.mock.calls.map(([sql]) => sql.split(" ")[0])).toEqual(["BEGIN", "SELECT", "INSERT", "COMMIT"]);
  expect(client.query.mock.calls[1]).toEqual(["SELECT id FROM projects WHERE id = $1 AND deleted_at IS NULL FOR SHARE", [9]]);
  expect(client.query.mock.calls[2][1]).toEqual([data.titulo, data.descricao, data.feature, JSON.stringify(data.cenarios), 7, 9]);
  expect(pool.query).not.toHaveBeenCalled();
});
it.each([0, -1, 1.2, "9", true, {}, 2147483648])("rejects invalid link %j at HTTP schema and service", async project_id => {
  expect(createSchema.safeParse({ ...data, project_id }).success).toBe(false);
  expect(updateSchema.safeParse({ project_id }).success).toBe(false);
  await expect(service.create({ ...data, project_id })).rejects.toMatchObject({ statusCode: 422 });
  await expect(service.update(42, { project_id })).rejects.toMatchObject({ statusCode: 422 });
  expect(pool.query).not.toHaveBeenCalled(); expect(pool.connect).not.toHaveBeenCalled();
});
it.each(["missing", "soft-deleted", "only exists in legacy projetos"])("rejects Project %s without writing", async () => {
  const original = client.query.getMockImplementation();
  client.query.mockImplementation((sql, params) => sql.startsWith("SELECT id FROM projects") ? Promise.resolve({ rows: [] }) : original(sql, params));
  await expect(service.create({ ...data, project_id: 9 })).rejects.toMatchObject({ statusCode: 422 });
  await expect(service.update(42, { project_id: 9 })).rejects.toMatchObject({ statusCode: 422 });
  expect(client.query.mock.calls.filter(([sql]) => /^(INSERT|UPDATE)/.test(sql))).toEqual([]);
  expect(client.query.mock.calls.at(-1)[0]).toBe("ROLLBACK");
});
it("preserves omitted link and fields, even if historical Project is deleted", async () => {
  const result = await service.update(42, { titulo: "Novo" });
  expect(result).toEqual({ ...saved, titulo: "Novo", project_id: 5, cenarios: data.cenarios });
  expect(pool.connect).not.toHaveBeenCalled();
  expect(pool.query.mock.calls[0][0]).not.toMatch(/project_id\s*=/);
});
it.each([[null, "removes"], [8, "changes"], [9, "adds"]])("project_id %j %s link while retaining case identity", async (project_id, action) => {
  if (action === "adds") saved.project_id = null;
  const result = await service.update(42, { project_id });
  expect(result).toEqual({ ...data, id: 42, project_id });
  const calls = [...pool.query.mock.calls, ...client.query.mock.calls];
  const update = calls.find(([sql]) => sql.startsWith("UPDATE projetos"));
  expect(update[0]).toContain("project_id = $5"); expect(update[0]).not.toMatch(/COALESCE\([^)]*project_id/);
  expect(update[1]).toEqual([null, null, null, 42, project_id]);
});
it.each([null, { nome: "Ativo", deleted_at: null }, { nome: "Historico", deleted_at: "2026-10-30" }])("consults linked/unlinked/deleted Project %j without filtering cases", async project => {
  const row = { id: 42, project_id: project ? 9 : null, project_nome: project?.nome ?? null, project_deleted_at: project?.deleted_at ?? null };
  pool.query.mockResolvedValue({ rows: [row] });
  expect(await service.getById(42)).toEqual(row); expect(await service.listAll()).toEqual([row]);
  for (const [sql] of pool.query.mock.calls) {
    expect(sql).toContain("LEFT JOIN projects pr ON pr.id = p.project_id");
    expect(sql).not.toContain("pr.deleted_at IS NULL");
  }
});
it("keeps opt-in pagination and unlinked/deleted-parent rows in count", async () => {
  pool.query.mockImplementation(async sql => ({ rows: sql.includes("COUNT") ? [{ count: "2" }] : [{ id: 42, project_id: null }] }));
  expect(await service.listAll({ page: 2, limit: 1 })).toEqual({ data: [{ id: 42, project_id: null }], total: 2, page: 2, limit: 1 });
  expect(pool.query.mock.calls[0][1]).toEqual([1, 1]); expect(pool.query.mock.calls[1][0]).not.toContain("JOIN");
});
it("rolls back failed link write and releases dedicated client", async () => {
  const original = client.query.getMockImplementation();
  client.query.mockImplementation((sql, params) => { if (sql.startsWith("UPDATE projetos")) throw new Error("write failure"); return original(sql, params); });
  await expect(service.update(42, { project_id: 9 })).rejects.toThrow("write failure");
  expect(client.query.mock.calls.at(-1)[0]).toBe("ROLLBACK"); expect(client.release).toHaveBeenCalledTimes(1);
});
it("rolls back nonexistent case instead of committing link operation", async () => {
  const original = client.query.getMockImplementation();
  client.query.mockImplementation((sql, params) => sql.startsWith("UPDATE projetos") ? Promise.resolve({ rows: [] }) : original(sql, params));
  await expect(service.update(99, { project_id: 9 })).rejects.toMatchObject({ statusCode: 404 });
  expect(client.query.mock.calls.at(-1)[0]).toBe("ROLLBACK");
});
it("simulates deletion winning: waits for Project lock then rejects excluded parent", async () => {
  let unlock; const deletionCommitted = new Promise(resolve => { unlock = resolve; });
  client.query.mockImplementation(async sql => {
    if (sql.startsWith("SELECT id FROM projects")) { await deletionCommitted; return { rows: [] }; }
    return { rows: [] };
  });
  const attempt = service.update(42, { project_id: 9 });
  await new Promise(resolve => setImmediate(resolve));
  expect(client.query.mock.calls.map(([sql]) => sql.split(" ")[0])).toEqual(["BEGIN", "SELECT"]);
  unlock(); await expect(attempt).rejects.toMatchObject({ statusCode: 422 });
  expect(client.query.mock.calls.some(([sql]) => sql.startsWith("UPDATE projetos"))).toBe(false);
});
it("simulates linking winning: deletion waits until transaction commits", async () => {
  let releaseCommit, deletionFinished = false;
  const committed = new Promise(resolve => { releaseCommit = resolve; });
  const original = client.query.getMockImplementation();
  client.query.mockImplementation(async (sql, params) => {
    if (sql === "COMMIT") { releaseCommit(); return { rows: [] }; }
    return original(sql, params);
  });
  const deletion = committed.then(() => { deletionFinished = true; });
  await service.update(42, { project_id: 9 }); await deletion;
  expect(deletionFinished).toBe(true);
  const sqls = client.query.mock.calls.map(([sql]) => sql);
  expect(sqls[1]).toContain("FOR SHARE"); expect(sqls.at(-1)).toBe("COMMIT");
  expect(saved.project_id).toBe(9);
});
