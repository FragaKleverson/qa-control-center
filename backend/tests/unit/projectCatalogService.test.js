jest.mock("../../src/db", () => ({ query: jest.fn(), connect: jest.fn() }));
const pool = require("../../src/db");
const service = require("../../src/services/projectCatalogService");
const actor = { userId: 7, ipAddress: "127.0.0.1" };
const original = { id: 42, nome: "Original", descricao: "Texto", created_by: 2, deleted_at: null };
let client, current;
beforeEach(() => {
  pool.query.mockReset(); pool.connect.mockReset(); current = { ...original };
  client = { query: jest.fn(async (sql, params) => {
    if (/^SELECT/.test(sql)) return { rows: current ? [{ ...current }] : [] };
    if (/^INSERT INTO projects/.test(sql)) current = { ...original, nome: params[0], descricao: params[1], created_by: params[2] };
    if (/^UPDATE projects SET nome/.test(sql)) current = { ...current, nome: params[0] ?? current.nome, descricao: params[1] ? params[2] : current.descricao };
    if (/^UPDATE projects SET deleted_at = CURRENT/.test(sql)) current = { ...current, deleted_at: "2026-10-30T12:00:00Z" };
    if (/^UPDATE projects SET deleted_at = NULL/.test(sql)) current = { ...current, deleted_at: null };
    return { rows: [{ ...current }] };
  }), release: jest.fn() };
  pool.connect.mockResolvedValue(client);
});
afterEach(() => {
  for (const [sql] of [...pool.query.mock.calls, ...client.query.mock.calls]) expect(sql).not.toMatch(/\bprojetos\b/i);
});
it.each([[[]], [[original]]])("lists active records as an array without pagination", async (rows) => {
  pool.query.mockResolvedValue({ rows }); expect(await service.listAll()).toEqual(rows);
  expect(pool.query.mock.calls[0][0]).toMatch(/deleted_at IS NULL ORDER BY created_at DESC, id DESC$/);
});
it.each([{ page: 2 }, { limit: 3 }, { page: 2, limit: 3 }])("paginates only when requested: %j", async (options) => {
  pool.query.mockImplementation(async sql => ({ rows: sql.includes("COUNT") ? [{ count: "5" }] : [original] }));
  const result = await service.listAll(options);
  expect(result).toEqual({ data: [original], total: 5, page: options.page || 1, limit: options.limit || 20 });
  expect(pool.query.mock.calls[0][1]).toEqual([result.limit, (result.page - 1) * result.limit]);
});
it("queries active project by ID without user joins", async () => {
  pool.query.mockResolvedValue({ rows: [original] }); expect(await service.getById(42)).toEqual(original);
  expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("id = $1 AND deleted_at IS NULL"), [42]);
});
it("returns 404 for missing or excluded ID", async () => {
  pool.query.mockResolvedValue({ rows: [] }); await expect(service.getById(42)).rejects.toMatchObject({ statusCode: 404 });
});
it.each([{}, { nome: " " }, { nome: null }, { nome: 1 }, { nome: [] }, { nome: "OK", descricao: 1 }])("rejects invalid creation %j before acquiring connection", async payload => {
  await expect(service.create(payload, actor)).rejects.toMatchObject({ statusCode: 422 }); expect(pool.connect).not.toHaveBeenCalled();
});
it.each([undefined, null, "Description"])("creates with optional description %j and trusted author", async descricao => {
  const result = await service.create({ nome: "  Catalogo  ", descricao, created_by: 99, deleted_at: "forged" }, actor);
  expect(result).toMatchObject({ nome: "Catalogo", descricao: descricao ?? null, created_by: 7, deleted_at: null });
  expect(client.query.mock.calls[0][0]).toBe("BEGIN"); expect(client.query.mock.calls.at(-1)[0]).toBe("COMMIT");
  const audit = client.query.mock.calls.find(([sql]) => sql.includes("INSERT INTO audit_logs"));
  expect(audit[0]).toContain("'project'"); expect(audit[1]).toEqual([7, 42, "CREATE", null, JSON.stringify(result), actor.ipAddress]);
  expect(pool.query).not.toHaveBeenCalled(); expect(client.release).toHaveBeenCalledTimes(1);
});
it.each([[{ nome: "New" }, "New", "Texto"], [{ descricao: null }, "Original", null], [{ descricao: "New" }, "Original", "New"]])("updates partially %j preserving omitted fields and authorship", async (payload, nome, descricao) => {
  const result = await service.update(42, payload, actor); expect(result).toMatchObject({ nome, descricao, created_by: 2 });
  const audit = client.query.mock.calls.find(([sql]) => sql.includes("audit_logs"));
  expect(audit[1][2]).toBe("UPDATE"); expect(JSON.parse(audit[1][3])).toEqual(original); expect(JSON.parse(audit[1][4])).toEqual(result);
  expect(client.query.mock.calls[1][0]).toContain("FOR UPDATE");
});
it.each([{}, { nome: " " }, { nome: null }, { created_by: 9 }])("rejects invalid/empty update %j", async payload => {
  await expect(service.update(42, payload, actor)).rejects.toMatchObject({ statusCode: 422 }); expect(pool.connect).not.toHaveBeenCalled();
});
it("soft deletes and restores identity without touching linked cases", async () => {
  expect((await service.delete(42, actor)).deleted_at).not.toBeNull();
  await expect(service.delete(42, actor)).rejects.toMatchObject({ statusCode: 404 });
  expect(await service.restore(42, actor)).toEqual(original);
  await expect(service.restore(42, actor)).rejects.toMatchObject({ statusCode: 404 });
  expect(client.query.mock.calls.filter(([sql]) => sql.includes("INSERT INTO audit_logs")).map(([, p]) => p[2])).toEqual(["DELETE", "RESTORE"]);
  expect(client.query.mock.calls.every(([sql]) => !/^DELETE FROM/.test(sql))).toBe(true);
});
it("cannot update excluded or missing project", async () => {
  current.deleted_at = "2026-10-30";
  await expect(service.update(42, { nome: "No" }, actor)).rejects.toMatchObject({ statusCode: 404 });
  current = null; await expect(service.delete(42, actor)).rejects.toMatchObject({ statusCode: 404 });
});
it.each([0, -1, "42", 2147483648, 1.5])("rejects invalid service ID %j", async id => {
  await expect(service.getById(id)).rejects.toMatchObject({ statusCode: 422 }); expect(pool.query).not.toHaveBeenCalled();
});
it.each(["INSERT INTO projects", "INSERT INTO audit_logs", "UPDATE projects", "COMMIT"])("rolls back a simulated failure at %s", async stage => {
  const implementation = client.query.getMockImplementation();
  client.query.mockImplementation((sql, params) => { if (sql.startsWith(stage)) throw new Error("simulated failure"); return implementation(sql, params); });
  const operation = stage === "UPDATE projects" ? service.update(42, { nome: "Changed" }, actor) : service.create({ nome: "New" }, actor);
  await expect(operation).rejects.toThrow("simulated failure");
  expect(client.query.mock.calls.at(-1)[0]).toBe("ROLLBACK"); expect(client.release).toHaveBeenCalledTimes(1);
});
it("propagates pool/read failures without hiding them", async () => {
  pool.connect.mockRejectedValue(new Error("offline")); await expect(service.create({ nome: "New" }, actor)).rejects.toThrow("offline");
  pool.query.mockRejectedValue(new Error("offline")); await expect(service.listAll()).rejects.toThrow("offline");
});
it("discards client if rollback fails and preserves original error", async () => {
  client.query.mockImplementation(async sql => { if (sql === "ROLLBACK") throw new Error("rollback failure"); if (sql !== "BEGIN") throw new Error("write failure"); });
  await expect(service.create({ nome: "New" }, actor)).rejects.toThrow("write failure");
  expect(client.release).toHaveBeenCalledWith(expect.objectContaining({ message: "rollback failure" }));
});
