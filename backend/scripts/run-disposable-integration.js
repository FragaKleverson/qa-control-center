const path = require("node:path");
const fs = require("node:fs");
const { loadIntegrationEnvironment, readIntegrationConfig } = require("../src/config/integrationTarget");
const { createIntegrationPool } = require("../src/config/integrationPool");
async function run(args, dependencies = {}) {
  const [action, file, ...tests] = args;
  if (!["check", "test", "migrate"].includes(action) || !file) throw new Error("INTEGRATION_GUARD: EXPLICIT_ACTION_AND_ENV_REQUIRED");
  const env = loadIntegrationEnvironment(file, dependencies.env || process.env, dependencies.readFile);
  const config = readIntegrationConfig(env);
  if (action === "migrate" && env.QA_INTEGRATION_ALLOW_MIGRATIONS !== "authorized") throw new Error("INTEGRATION_GUARD: MIGRATION_AUTHORIZATION_REQUIRED");
  const backend = path.resolve(__dirname, "..");
  const testPaths = tests.map(name => {
    if (!/^[a-z0-9.-]+\.test\.js$/.test(name)) throw new Error("INTEGRATION_GUARD: INVALID_TEST_PATH");
    const target = fs.realpathSync(path.join(backend, "tests", name));
    if (path.dirname(target) !== path.join(backend, "tests")) throw new Error("INTEGRATION_GUARD: INVALID_TEST_PATH");
    return target;
  });
  if ((action === "test") !== (testPaths.length > 0)) throw new Error("INTEGRATION_GUARD: EXPLICIT_TEST_SELECTION_REQUIRED");
  if (tests.includes("test-plans-lifecycle.integration.test.js") && env.RUN_PLAN_DB_TESTS !== "authorized") throw new Error("INTEGRATION_GUARD: PLAN_TEST_AUTHORIZATION_REQUIRED");
  const Pool = dependencies.Pool || require("pg").Pool;
  const pool = createIntegrationPool(Pool, env);
  try { const client = await pool.connect(); client.release(); } finally { await pool.end(); }
  if (action === "check") return { code: 0, target: { host: config.host, port: config.port, database: config.database }, identityVerified: true };
  const spawnSync = dependencies.spawnSync || require("node:child_process").spawnSync;
  const argv = action === "test"
    ? [path.join(backend, "node_modules/jest/bin/jest.js"), "--config", path.join(backend, "jest.integration.config.js"), "--runInBand", "--runTestsByPath", ...testPaths]
    : [path.join(backend, "node_modules/prisma/build/index.js"), "migrate", "deploy", "--config", path.join(backend, "prisma.integration.config.ts")];
  const result = spawnSync(process.execPath, argv, { cwd: backend, env: { ...env, QA_INTEGRATION_ENV_FILE: path.resolve(file), QA_INTEGRATION_VERIFIED_CLUSTER_ID: config.clusterId, CHECKPOINT_DISABLE: "1" }, stdio: "inherit", shell: false });
  if (result.error || result.signal || result.status === null) throw new Error("INTEGRATION_GUARD: CHILD_EXECUTION_FAILED");
  return { code: result.status };
}
if (require.main === module) run(process.argv.slice(2)).then(result => {
  if (result.identityVerified) process.stdout.write(JSON.stringify(result) + "\n");
  process.exitCode = result.code;
}).catch(() => { process.stderr.write("INTEGRATION_GUARD: refused; verify explicit configuration, authorization and pinned identity.\n"); process.exitCode = 1; });
module.exports = { run };
