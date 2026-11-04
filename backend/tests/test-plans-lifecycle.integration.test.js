/**
 * OPT-IN integration: requires reviewed migration and explicit authorization.
 * Legacy mode uses qa_control_test; guarded disposable mode uses qa_control_integration.
 * Uses independent PostgreSQL sessions and observes actual lock contention.
 */
const enabled = process.env.RUN_PLAN_DB_TESTS === "authorized";
(enabled ? describe : describe.skip)("Plan lifecycle PostgreSQL integration (pending)", () => {
  const pool = require("../src/db");
  const service = require("../src/services/testPlansService");
  let plan, suite, testCase;
  beforeAll(async () => {
    const expectedDatabase = process.env.QA_INTEGRATION_MODE === "disposable" ? "qa_control_integration" : "qa_control_test";
    if (pool.options.database !== expectedDatabase) throw new Error("Refusing unexpected database");
    const { rows } = await pool.query("SELECT current_database() AS db");
    if (rows[0].db !== expectedDatabase) throw new Error("Effective database does not match authorized target");
  });
  beforeEach(async () => {
    plan = await service.create({ titulo: "Lifecycle isolated fixture", ambiente: "production" });
    suite = (await pool.query("INSERT INTO test_suites (nome) VALUES ('Lifecycle suite') RETURNING *")).rows[0];
    testCase = (await pool.query("INSERT INTO projetos (titulo) VALUES ('Lifecycle case') RETURNING *")).rows[0];
    await pool.query("INSERT INTO test_suite_cases (suite_id, projeto_id) VALUES ($1, $2)", [suite.id, testCase.id]);
    await service.addSuite(plan.id, suite.id);
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    // Only this test's fixtures; no global TRUNCATE.
    if (plan) {
      await pool.query("DELETE FROM execution_results WHERE execucao_id IN (SELECT id FROM execucoes WHERE plan_id = $1)", [plan.id]);
      await pool.query("DELETE FROM execucoes WHERE plan_id = $1", [plan.id]);
      await pool.query("DELETE FROM test_plans WHERE id = $1", [plan.id]);
    }
    if (suite) await pool.query("DELETE FROM test_suites WHERE id = $1", [suite.id]);
    if (testCase) await pool.query("DELETE FROM projetos WHERE id = $1", [testCase.id]);
  });
  afterAll(() => pool.end());
  async function assertNoPartial() {
    expect((await pool.query("SELECT * FROM execucoes WHERE plan_id = $1", [plan.id])).rows).toHaveLength(0);
    expect((await service.getById(plan.id)).executed_at).toBeNull();
  }
  async function countExecutions() {
    return Number((await pool.query("SELECT COUNT(*) FROM execucoes WHERE plan_id = $1", [plan.id])).rows[0].count);
  }
  // Gate the winner AFTER it has the row lock. Inspect pg_blocking_pids before
  // releasing it, proving that a different PostgreSQL connection really waits.
  async function race(firstAction, secondAction) {
    const originalConnect = pool.connect.bind(pool);
    const observer = await originalConnect();
    let unlock, lockedResolve, secondConnected;
    const gate = new Promise((r) => { unlock = r; });
    const locked = new Promise((r) => { lockedResolve = r; });
    const connected = new Promise((r) => { secondConnected = r; });
    let ordinal = 0, firstPid, secondPid;
    const spy = jest.spyOn(pool, "connect").mockImplementation(async () => {
      const client = await originalConnect();
      const position = ++ordinal;
      if (position === 1) firstPid = client.processID;
      if (position === 2) { secondPid = client.processID; secondConnected(); }
      const query = client.query.bind(client);
      const querySpy = jest.spyOn(client, "query").mockImplementation(async (...args) => {
        const result = await query(...args);
        if (position === 1 && args[0].includes("FOR UPDATE")) { lockedResolve(); await gate; }
        return result;
      });
      const release = client.release.bind(client);
      client.release = (...args) => { querySpy.mockRestore(); return release(...args); };
      return client;
    });
    let first, second;
    try {
      first = firstAction().then((value) => ({ value }), (error) => ({ error }));
      await locked;
      second = secondAction().then((value) => ({ value }), (error) => ({ error }));
      await connected;
      let blocked = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        const { rows } = await observer.query("SELECT $1::integer = ANY(pg_blocking_pids($2::integer)) AS blocked", [firstPid, secondPid]);
        if (rows[0].blocked) { blocked = true; break; }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(firstPid).not.toBe(secondPid);
      expect(blocked).toBe(true);
      unlock();
      return await Promise.all([first, second]);
    } finally {
      unlock();
      await Promise.all([first, second].filter(Boolean));
      spy.mockRestore(); observer.release();
    }
  }
  test("two simultaneous executions create exactly one, then retry stays blocked", async () => {
    const [first, second] = await race(() => service.execute(plan.id), () => service.execute(plan.id));
    expect(first.value.plan_id).toBe(plan.id); expect(second.error.statusCode).toBe(409);
    expect(await countExecutions()).toBe(1);
    await expect(service.execute(plan.id)).rejects.toMatchObject({ statusCode: 409 });
    expect(await countExecutions()).toBe(1);
  });
  test.each(["edit", "remove", "add"])("execution wins over %s", async (operation) => {
    const action = () => operation === "edit" ? service.update(plan.id, { titulo: "changed" }) :
      operation === "add" ? service.addSuite(plan.id, suite.id) : service.removeSuite(plan.id, suite.id);
    const [first, second] = await race(() => service.execute(plan.id), action);
    expect(first.value.id).toBeDefined(); expect(second.error.statusCode).toBe(409);
    expect(await countExecutions()).toBe(1);
  });
  test("removing last suite wins before execution", async () => {
    const [, second] = await race(() => service.removeSuite(plan.id, suite.id), () => service.execute(plan.id));
    expect(second.error.statusCode).toBe(409); await assertNoPartial();
  });
  test("editing first commits environment inherited by execution", async () => {
    const [, second] = await race(() => service.update(plan.id, { ambiente: "development" }), () => service.execute(plan.id));
    expect(second.value.ambiente).toBe("development");
  });
  test("deleting first blocks execution", async () => {
    const [, second] = await race(() => service.delete(plan.id), () => service.execute(plan.id));
    expect(second.error.statusCode).toBe(404); expect(await countExecutions()).toBe(0);
  });
  test("execution before deletion preserves history and restore remains locked", async () => {
    await race(() => service.execute(plan.id), () => service.delete(plan.id));
    await service.restore(plan.id);
    await expect(service.execute(plan.id)).rejects.toMatchObject({ statusCode: 409 });
    expect(await countExecutions()).toBe(1);
  });
  test("restore and execution coordinate on the same lock", async () => {
    await service.delete(plan.id);
    const [first, second] = await race(() => service.restore(plan.id), () => service.execute(plan.id));
    expect(first.value.deleted_at).toBeNull(); expect(second.value.plan_id).toBe(plan.id);
  });
  test.each(["INSERT INTO execucoes", "INSERT INTO execution_results", "UPDATE test_plans SET executed_at"])("rollback on %s leaves no partial data", async (stage) => {
    const originalConnect = pool.connect.bind(pool);
    const connectSpy = jest.spyOn(pool, "connect").mockImplementation(async () => {
      const client = await originalConnect(); const query = client.query.bind(client);
      const querySpy = jest.spyOn(client, "query").mockImplementation((sql, params) => {
        if (sql.includes(stage)) return Promise.reject(new Error("injected failure"));
        return query(sql, params);
      });
      const release = client.release.bind(client);
      client.release = (...args) => { querySpy.mockRestore(); return release(...args); };
      return client;
    });
    try { await expect(service.execute(plan.id)).rejects.toThrow("injected failure"); }
    finally { connectSpy.mockRestore(); }
    await assertNoPartial();
  });
  test("only active cases of active suites are eligible", async () => {
    await pool.query("UPDATE projetos SET deleted_at = NOW() WHERE id = $1", [testCase.id]);
    await expect(service.execute(plan.id)).rejects.toMatchObject({ statusCode: 409 }); await assertNoPartial();
    await pool.query("UPDATE projetos SET deleted_at = NULL WHERE id = $1", [testCase.id]);
    await pool.query("UPDATE test_suites SET deleted_at = NOW() WHERE id = $1", [suite.id]);
    await expect(service.execute(plan.id)).rejects.toMatchObject({ statusCode: 409 }); await assertNoPartial();
  });
  test("legacy review and historical executed classification stay blocked without fabricated links", async () => {
    for (const classification of ["review_required", "executed"]) {
      await pool.query("UPDATE test_plans SET legacy_classification = $1 WHERE id = $2", [classification, plan.id]);
      await expect(service.execute(plan.id)).rejects.toMatchObject({ statusCode: 409 });
      await assertNoPartial();
    }
  });
  test("unique plan reference survives execution soft deletion", async () => {
    const execution = await service.execute(plan.id);
    await pool.query("UPDATE execucoes SET deleted_at = NOW() WHERE id = $1", [execution.id]);
    await expect(pool.query("INSERT INTO execucoes (plan_id, ambiente) VALUES ($1, 'staging')", [plan.id])).rejects.toMatchObject({ code: "23505" });
    expect((await service.getById(plan.id)).execution_id).toBe(execution.id);
  });
  test("multiple suites deduplicate shared cases and ignore a deleted case", async () => {
    const other = (await pool.query("INSERT INTO test_suites (nome) VALUES ('Second lifecycle suite') RETURNING *")).rows[0];
    const deleted = (await pool.query("INSERT INTO projetos (titulo, deleted_at) VALUES ('Deleted lifecycle case', NOW()) RETURNING *")).rows[0];
    try {
      await service.addSuite(plan.id, other.id);
      await pool.query("INSERT INTO test_suite_cases (suite_id, projeto_id) VALUES ($1, $2), ($1, $3)", [other.id, testCase.id, deleted.id]);
      const execution = await service.execute(plan.id);
      expect(execution.plan_id).toBe(plan.id); expect(execution.ambiente).toBe(plan.ambiente);
      expect((await service.getById(plan.id)).executed_at).not.toBeNull();
      expect((await pool.query("SELECT projeto_id FROM execution_results WHERE execucao_id = $1", [execution.id])).rows).toEqual([{ projeto_id: testCase.id }]);
    } finally {
      await pool.query("DELETE FROM test_suites WHERE id = $1", [other.id]);
      await pool.query("DELETE FROM projetos WHERE id = $1", [deleted.id]);
    }
  });
  test("empty suite never produces an empty execution", async () => {
    await pool.query("DELETE FROM test_suite_cases WHERE suite_id = $1", [suite.id]);
    await expect(service.execute(plan.id)).rejects.toMatchObject({ statusCode: 409 }); await assertNoPartial();
  });
  test("legacy environment stays untouched and blocks execution", async () => {
    await pool.query("UPDATE test_plans SET ambiente = 'qa' WHERE id = $1", [plan.id]);
    await expect(service.execute(plan.id)).rejects.toMatchObject({ statusCode: 422 }); await assertNoPartial();
    expect((await service.getById(plan.id)).ambiente).toBe("qa");
  });

});
