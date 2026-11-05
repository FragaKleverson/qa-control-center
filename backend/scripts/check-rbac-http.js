// Safe scoped HTTP validation: no Jest, TRUNCATE, migrations or global cleanup.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
async function main() {
  if (process.env.QA_RBAC_HTTP_ALLOW_WRITES !== "authorized") throw new Error("Explicit scoped HTTP authorization required");
  const root = path.resolve(__dirname, "../..");
  const target = path.join(root, "backend/.env.rbac-http-results.local");
  if (fs.existsSync(target)) throw new Error("Previous validation report exists; refuse duplicate fixture creation");
  const { loadHomologationEnvironment, readHomologationConfig } = require("../src/config/homologation");
  const env = loadHomologationEnvironment(path.join(root, "backend/.env.homologation.local"));
  const pool = require("../src/config/integrationPool").createIntegrationPool(require("pg").Pool, env, readHomologationConfig);
  const accounts = JSON.parse(fs.readFileSync(path.join(root, "backend/.env.homologation-users.local"), "utf8")).accounts;
  const tokens = {}, checks = [], fixtures = [], tag = "RBAC-" + crypto.randomUUID();
  const expect = (condition, message) => { if (!condition) throw new Error(message); };
  async function http(method, url, role, body, headers = {}) {
    const response = await fetch(env.VITE_API_BASE_URL + url, { method, headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(role ? { Authorization: "Bearer " + tokens[role] } : {}), ...headers }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
    let data; try { data = await response.json(); } catch { data = {}; }
    return { status: response.status, data };
  }
  async function snapshot(table, id, entity) {
    // table names come only from the static inventory below, never HTTP/user input.
    const rows = (await pool.query(`SELECT to_jsonb(t) AS data FROM ${table} t WHERE id = $1`, [id])).rows;
    const audit = (await pool.query("SELECT COUNT(*)::integer AS count FROM audit_logs WHERE entity_type=$1 AND entity_id=$2", [entity, id])).rows;
    return JSON.stringify({ rows, audit });
  }
  async function denied(method, url, role, body, table, id, entity) {
    const before = await snapshot(table, id, entity);
    const result = await http(method, url, role, body);
    expect(result.status === 403, `${role} ${method} ${url}: expected 403, got ${result.status}`);
    expect(await snapshot(table, id, entity) === before, "Denied request changed record or audit");
    checks.push({ method, url, role, status: result.status, unchanged: true });
  }
  try {
    const identity = (await pool.query(require("../src/config/integrationTarget").IDENTITY_SQL)).rows[0];
    expect(identity.cluster_id === "7704309760569225254", "Unexpected cluster");
    const active = (await pool.query("SELECT COUNT(*)::integer AS count FROM pg_stat_activity WHERE datname=current_database() AND application_name='qa-disposable-integration'")).rows[0].count;
    expect(active === 0, "Automated integration connections present");
    expect((await http("GET", "/projects")).status === 401, "Real authentication not active");
    for (const account of accounts) {
      const login = await http("POST", "/auth/login", null, { email: account.email, password: account.password });
      expect(login.status === 200 && login.data.user.role === account.role, "Real account login/role failed"); tokens[account.role] = login.data.token;
    }
    const inventory = [
      ["projects", "projects", "project", { nome: tag }],
      ["projetos", "projetos", "projeto", { titulo: tag, descricao: "RBAC fixture", feature: "RBAC", cenarios: [] }],
      ["test-suites", "test_suites", "test_suite", { nome: tag }],
      ["test-plans", "test_plans", "test_plan", { titulo: tag, ambiente: "staging" }],
      ["requirements", "requirements", "requirement", { titulo: tag }],
    ];
    for (const [base, table, entity, payload] of inventory) {
      const result = await http("POST", "/" + base, "admin", payload);
      expect(result.status === 201, `Fixture creation failed: ${base}`); fixtures.push({ base, table, entity, payload, id: result.data.id });
    }
    const suite = fixtures.find(f => f.base === "test-suites"), plan = fixtures.find(f => f.base === "test-plans"), tc = fixtures.find(f => f.base === "projetos");
    const ex = await http("POST", "/execucoes", "admin", { suite_id: suite.id, ambiente: "staging" }); expect(ex.status === 201, "Execution fixture failed");
    fixtures.push({ base: "execucoes", table: "execucoes", entity: "execucao", payload: { suite_id: suite.id }, id: ex.data.id });
    for (const f of fixtures) {
      for (const role of ["qa", "reader"]) await denied("DELETE", `/${f.base}/${f.id}`, role, null, f.table, f.id, f.entity);
      await denied("PUT", `/${f.base}/${f.id}`, "reader", f.payload, f.table, f.id, f.entity);
      const field = ["projects", "test_suites"].includes(f.table) ? "nome" : "titulo";
      const filter = f.table === "execucoes" ? "suite_id=$1" : `${field}=$1`;
      const params = [f.table === "execucoes" ? suite.id : tag];
      const before = await pool.query(`SELECT COUNT(*)::integer AS count FROM ${f.table} WHERE ${filter}`, params);
      const beforeRecord = await snapshot(f.table, f.id, f.entity);
      const creation = await http("POST", "/" + f.base, "reader", f.payload);
      expect(creation.status === 403, "Reader creation not denied");
      // Scope the assertion to these fixtures; unrelated manual activity is allowed.
      expect(before.rows[0].count === (await pool.query(`SELECT COUNT(*)::integer AS count FROM ${f.table} WHERE ${filter}`, params)).rows[0].count, "Denied creation changed scoped records");
      expect(await snapshot(f.table, f.id, f.entity) === beforeRecord, "Denied creation changed record/audit");
      checks.push({ method: "POST", url: "/" + f.base, role: "reader", status: creation.status, unchanged: true });
      const update = await http("PUT", `/${f.base}/${f.id}`, "qa", { descricao: "RBAC QA edit", status: f.base === "execucoes" ? "pending" : undefined });
      expect(update.status === 200, "QA edit failed: " + f.base); checks.push({ method: "PUT", url: `/${f.base}/${f.id}`, role: "qa", status: update.status });
    }
    for (const [url, body, linkUrl, table, id, entity] of [
      [`/test-suites/${suite.id}/cases`, { projeto_id: tc.id }, `/test-suites/${suite.id}/cases/${tc.id}`, suite.table, suite.id, suite.entity],
      [`/test-plans/${plan.id}/suites`, { suite_id: suite.id }, `/test-plans/${plan.id}/suites/${suite.id}`, plan.table, plan.id, plan.entity],
    ]) {
      expect((await http("POST", url, "qa", body)).status === 201, "QA link creation failed");
      for (const role of ["qa", "reader"]) {
        const before = JSON.stringify((await pool.query(table === "test_suites" ? "SELECT * FROM test_suite_cases WHERE suite_id=$1" : "SELECT * FROM test_plan_suites WHERE plan_id=$1", [id])).rows);
        await denied("DELETE", linkUrl, role, null, table, id, entity);
        expect(JSON.stringify((await pool.query(table === "test_suites" ? "SELECT * FROM test_suite_cases WHERE suite_id=$1" : "SELECT * FROM test_plan_suites WHERE plan_id=$1", [id])).rows) === before, "Denied unlink changed relationships");
      }
      expect((await http("DELETE", linkUrl, "admin")).status === 200, "Admin unlink failed");
      expect((await http("POST", url, "qa", body)).status === 201, "QA relink failed"); checks.push({ method: "DELETE", url: linkUrl, role: "admin", status: 200 });
    }
    expect((await http("POST", `/test-plans/${plan.id}/execute`, "admin", {})).status === 201, "Plan execution fixture failed");
    for (const f of fixtures) {
      expect((await http("DELETE", `/${f.base}/${f.id}`, "admin")).status === 200, "Admin deletion failed: " + f.base);
      checks.push({ method: "DELETE", url: `/${f.base}/${f.id}`, role: "admin", status: 200 });
      for (const role of ["qa", "reader"]) await denied("POST", `/${f.base}/${f.id}/restore`, role, {}, f.table, f.id, f.entity);
      expect((await http("POST", `/${f.base}/${f.id}/restore`, "admin", {})).status === 200, "Admin restore failed");
      checks.push({ method: "POST", url: `/${f.base}/${f.id}/restore`, role: "admin", status: 200 });
    }
    for (const role of ["admin", "qa"]) {
      expect((await http("PUT", `/test-plans/${plan.id}`, role, { titulo: tag })).status === 409, "Executed plan mutation unlocked");
      expect((await http("POST", `/test-plans/${plan.id}/execute`, role, {})).status === 409, "Executed plan reexecution unlocked");
    }
    for (const role of ["qa", "reader"]) await denied("DELETE", "/admin/usuarios/" + accounts.find(a => a.role === "admin").id, role, null, "users", accounts.find(a => a.role === "admin").id, "user");
    for (const role of ["admin", "qa", "reader"]) expect((await http("GET", "/relatorios", role)).status === 200, "Report reading denied");
    for (const action of ["generate", "export"]) expect((await http("POST", "/relatorios/" + action, "reader", {})).status === 403, "Reader Reports action not denied");
    const result = { database: identity.database, clusterId: identity.cluster_id, tag, fixtures, checks, checksPassed: checks.length, deniedRequestsUnchanged: checks.filter(c => c.unchanged).length, executedPlanStillImmutable: true };
    fs.writeFileSync(target, JSON.stringify(result, null, 2), { flag: "wx" });
    console.log(JSON.stringify({ database: result.database, clusterId: result.clusterId, checksPassed: result.checksPassed, deniedRequestsUnchanged: result.deniedRequestsUnchanged, executedPlanStillImmutable: true, fixturesRetained: fixtures.map(({base,id}) => ({base,id})), report: target }));
  } finally { await pool.end(); }
}
if (require.main === module) main().catch(error => { console.error("RBAC_HTTP_CHECK_STOPPED:", error.message); process.exitCode = 1; });
