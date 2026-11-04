jest.mock("../../src/db", () => ({ query: jest.fn(), connect: jest.fn() }));
const pool = require("../../src/db");
const service = require("../../src/services/projectsService");
const { createSchema, updateSchema } = require("../../src/validators/projetos");
let client;
beforeEach(() => {
  pool.query.mockReset(); pool.connect.mockReset();
  pool.query.mockResolvedValue({ rows: [{ id: 42 }] });
  client = { query: jest.fn(async sql => ({ rows: sql.startsWith("SELECT") ? [{ id: 9 }] : [{ id: 42 }] })), release: jest.fn() };
  pool.connect.mockResolvedValue(client);
});
it.each([[[]], [[{ nome: "A", tipo: "Happy Path", passos: "Given", extra: 7 }]], [null], [{ legacy: [1, "value"] }], ["historical string"], [false], [5]])("persists explicitly supplied JSON %j without touching project_id", async cenarios => {
  expect(updateSchema.safeParse({ cenarios }).success).toBe(true);
  expect(createSchema.safeParse({ titulo: "T", descricao: "D", feature: "F", cenarios }).success).toBe(true);
  await service.update(42, { cenarios });
  const [sql, params] = pool.query.mock.calls[0];
  expect(sql).toContain("cenarios = $5::jsonb"); expect(params).toEqual([null, null, null, 42, JSON.stringify(cenarios)]);
  expect(sql).not.toContain("project_id ="); expect(sql).not.toContain("created_by =");
});
it("omission never assigns scenarios or changes the Project link", async () => {
  await service.update(42, { titulo: "Changed" });
  expect(pool.query.mock.calls[0][0]).not.toMatch(/cenarios\s*=|project_id\s*=/);
  expect(pool.query.mock.calls[0][1]).toEqual(["Changed", null, null, 42]);
});
it("persists explicitly empty optional text without modifying omitted scenarios or Project", async () => {
  expect(updateSchema.safeParse({ descricao: "", feature: "" }).success).toBe(true);
  await service.update(42, { descricao: "", feature: "" });
  const [sql, params] = pool.query.mock.calls[0];
  expect(params).toEqual([null, "", "", 42]);
  expect(sql).not.toMatch(/cenarios\s*=|project_id\s*=/);
});
it("persists scenarios and active Project link on the same transaction", async () => {
  const cenarios = [{ passos: "New" }]; await service.update(42, { cenarios, project_id: 9 });
  const update = client.query.mock.calls.find(([sql]) => sql.startsWith("UPDATE projetos"));
  expect(update[0]).toContain("project_id = $5, cenarios = $6::jsonb"); expect(update[1]).toEqual([null, null, null, 42, 9, JSON.stringify(cenarios)]);
  expect(pool.query).not.toHaveBeenCalled(); expect(client.query.mock.calls.at(-1)[0]).toBe("COMMIT");
});
it.each([NaN, Infinity, () => {}, 1n])("rejects non JSON values before writing", async cenarios => {
  expect(updateSchema.safeParse({ cenarios }).success).toBe(false);
  await expect(service.update(42, { cenarios })).rejects.toMatchObject({ statusCode: 422 }); expect(pool.query).not.toHaveBeenCalled(); expect(pool.connect).not.toHaveBeenCalled();
});
it("rolls back a scenario write failure when linking a Project", async () => {
  const original = client.query.getMockImplementation();
  client.query.mockImplementation((sql, params) => { if (sql.startsWith("UPDATE")) throw new Error("write failed"); return original(sql, params); });
  await expect(service.update(42, { project_id: 9, cenarios: [] })).rejects.toThrow("write failed");
  expect(client.query.mock.calls.at(-1)[0]).toBe("ROLLBACK"); expect(client.release).toHaveBeenCalledTimes(1);
});
