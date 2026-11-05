jest.mock("../../src/db", () => ({ query: jest.fn(), connect: jest.fn() }));
const pool = require("../../src/db");
const service = require("../../src/services/testPlansService");
const { createSchema, executeSchema } = require("../../src/validators/testPlans");
const { createSchema: executionSchema } = require("../../src/validators/execucoes");
const { ENVIRONMENTS } = require("../../src/domain/environments");
let client, plan, suites, cases, fail;
beforeEach(() => {
  jest.resetAllMocks();
  plan = { id: 1, ambiente: "production", legacy_classification: "eligible", executed_at: null, deleted_at: null };
  suites = [{ id: 2 }, { id: 3 }]; cases = [{ id: 4 }, { id: 5 }]; fail = null;
  client = { release: jest.fn(), query: jest.fn(async (sql, params) => {
    if (fail && sql.includes(fail)) throw new Error("injected failure");
    if (sql.includes("FOR UPDATE")) return { rows: plan ? [plan] : [] };
    if (sql.startsWith("SELECT ts.id")) return { rows: suites };
    if (sql.startsWith("SELECT DISTINCT p.id")) return { rows: cases };
    if (sql.startsWith("SELECT id FROM test_suites")) return { rows: suites };
    if (sql.includes("INSERT INTO execucoes")) return { rows: [{ id: 10, plan_id: params[0], ambiente: params[2] }] };
    return { rows: [{ ...plan }] };
  }) };
  pool.connect.mockResolvedValue(client);
});

it.each(ENVIRONMENTS)("validates canonical environment %s", (ambiente) => {
  expect(createSchema.safeParse({ titulo: "Plan", ambiente }).success).toBe(true);
  expect(executionSchema.safeParse({ suite_id: 1, ambiente }).success).toBe(true);
});
it.each([undefined, null, "", "qa", "dev", "homologation", "Production"])("rejects noncanonical plan environment %s", (ambiente) => {
  expect(createSchema.safeParse({ titulo: "Plan", ambiente }).success).toBe(false);
});
it("discards supplied execution environment and state fields", () => {
  expect(executeSchema.parse({ ambiente: "qa", executed_at: "forged" })).toEqual({});
});
it("creates eligible plan without suites", async () => {
  pool.query.mockResolvedValue({ rows: [plan] });
  await expect(service.create({ titulo: "Plan", ambiente: "production" })).resolves.toEqual(plan);
  expect(pool.connect).not.toHaveBeenCalled();
  expect(pool.query.mock.calls[0][0]).toContain("'eligible'");
});
it("inherits environment, links execution, inserts distinct active cases and marks plan in one transaction", async () => {
  expect(await service.execute(1, 7)).toMatchObject({ plan_id: 1, ambiente: "production" });
  const calls = client.query.mock.calls;
  expect(calls[0][0]).toBe("BEGIN");
  expect(calls[1][0]).toContain("FOR UPDATE");
  expect(calls.find(([sql]) => sql.includes("INSERT INTO execucoes"))[1]).toEqual([1, 2, "production", 7]);
  expect(calls.find(([sql]) => sql.includes("INSERT INTO execution_results"))[1]).toEqual([10, [4, 5]]);
  expect(calls.some(([sql]) => sql.includes("executed_at = NOW()"))).toBe(true);
  expect(calls.at(-1)[0]).toBe("COMMIT");
  expect(pool.query).not.toHaveBeenCalled();
  expect(client.release).toHaveBeenCalledTimes(1);
});
it.each(["INSERT INTO execucoes", "INSERT INTO execution_results", "UPDATE test_plans SET executed_at"])("rolls back on %s failure", async (stage) => {
  fail = stage;
  await expect(service.execute(1)).rejects.toThrow("injected failure");
  expect(client.query).toHaveBeenLastCalledWith("ROLLBACK");
  expect(client.query.mock.calls.some(([sql]) => sql === "COMMIT")).toBe(false);
  expect(client.release).toHaveBeenCalledTimes(1);
});
it.each(["executed", "review_required"])("blocks legacy classification %s", async (classification) => {
  plan.legacy_classification = classification;
  await expect(service.execute(1)).rejects.toMatchObject({ statusCode: 409 });
});
it("rejects missing plan", async () => {
  plan = null; await expect(service.execute(1)).rejects.toMatchObject({ statusCode: 404 });
});
it("rejects deleted plan", async () => {
  plan.deleted_at = new Date(); await expect(service.execute(1)).rejects.toMatchObject({ statusCode: 404 });
});
it("rejects invalid persisted environment before creating execution", async () => {
  plan.ambiente = "qa"; await expect(service.execute(1)).rejects.toMatchObject({ statusCode: 422 });
});
it("blocks no active suite", async () => {
  suites = []; await expect(service.execute(1)).rejects.toMatchObject({ statusCode: 409 });
});
it("blocks no active cases", async () => {
  cases = []; await expect(service.execute(1)).rejects.toMatchObject({ statusCode: 409 });
  expect(client.query.mock.calls.some(([sql]) => sql.includes("INSERT INTO execucoes"))).toBe(false);
});
it.each(["update", "addSuite", "removeSuite", "execute"])("executed plan blocks %s even for admin callers", async (method) => {
  plan.executed_at = new Date();
  await expect(service[method](1, method === "update" ? { titulo: "changed" } : 2)).rejects.toMatchObject({ statusCode: 409 });
});
it.each(["update", "addSuite", "removeSuite"])("unreviewed legacy blocks %s", async (method) => {
  plan.legacy_classification = "review_required";
  await expect(service[method](1, {})).rejects.toMatchObject({ statusCode: 409 });
});
it("soft delete retains executed state and history", async () => {
  plan.executed_at = new Date(); await service.delete(1);
  expect(client.query.mock.calls.some(([sql]) => sql.startsWith("DELETE"))).toBe(false);
});
it("restore keeps execution marker", async () => {
  plan.deleted_at = new Date(); plan.executed_at = new Date();
  expect(await service.restore(1)).toMatchObject({ executed_at: plan.executed_at });
});
it.each(["update", "addSuite", "removeSuite", "delete", "restore"])("%s uses same parent lock and dedicated client", async (method) => {
  if (method === "restore") plan.deleted_at = new Date();
  await service[method](1, method === "update" ? { titulo: "changed" } : 2);
  expect(client.query.mock.calls[1][0]).toContain("FOR UPDATE");
  expect(client.query).toHaveBeenLastCalledWith("COMMIT");
  expect(pool.query).not.toHaveBeenCalled();
});
it("preserves paginated contract and execution reference", async () => {
  pool.query.mockImplementation(async (sql) => ({ rows: sql.startsWith("SELECT COUNT") ? [{ count: "1" }] : [{ ...plan, execution_id: 10 }] }));
  expect(await service.listAll({ page: 1, limit: 20 })).toMatchObject({ total: 1, page: 1, limit: 20, data: [{ execution_id: 10 }] });
});
it("requires active suite on linking", async () => {
  suites = []; await expect(service.addSuite(1, 2)).rejects.toMatchObject({ statusCode: 404 });
});

it("independent execution stays unlinked and accepts canonical environment", async () => {
  const executions = require("../../src/services/executionsService");
  pool.query.mockResolvedValue({ rows: [{ id: 20, plan_id: null, ambiente: "development" }] });
  await expect(executions.create({ suite_id: 2, ambiente: "development" }, 7)).resolves.toMatchObject({ plan_id: null });
  expect(pool.query.mock.calls[0][0]).not.toContain("plan_id");
  expect(pool.query.mock.calls[0][1]).toEqual([2, "development", "pending", null, 7]);
});
it("independent execution rejects legacy environment before writing", async () => {
  const executions = require("../../src/services/executionsService");
  await expect(executions.create({ suite_id: 2, ambiente: "dev" })).rejects.toMatchObject({ statusCode: 422 });
  expect(pool.query).not.toHaveBeenCalled();
});
it("one suite and one active case creates a complete execution", async () => {
  suites = [{ id: 2 }]; cases = [{ id: 4 }];
  await service.execute(1);
  expect(client.query.mock.calls.find(([sql]) => sql.includes("INSERT INTO execution_results"))[1]).toEqual([10, [4]]);
});
it("query explicitly excludes soft deleted suites and cases", async () => {
  await service.execute(1);
  const sql = client.query.mock.calls.find(([sql]) => sql.startsWith("SELECT DISTINCT p.id"))[0];
  expect(sql).toContain("ts.deleted_at IS NULL");
  expect(sql).toContain("p.deleted_at IS NULL");
});

it("consultation includes soft deletion marker without dropping historical execution id", async () => {
  const row = { ...plan, executed_at: "2026-10-29", execution_id: 10, execution_deleted_at: "2026-10-30" };
  pool.query.mockResolvedValue({ rows: [row] });
  expect(await service.getById(1)).toEqual(row);
  const sql = pool.query.mock.calls[0][0];
  expect(sql).toContain("AS execution_deleted_at");
  expect(sql).toContain("SELECT e.id FROM execucoes e WHERE e.plan_id = p.id");
  expect(pool.connect).not.toHaveBeenCalled();
});
