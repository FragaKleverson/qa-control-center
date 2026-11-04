const fs = require("node:fs");
const { readDatabaseTarget } = require("./integrationTarget");
const CLUSTER_ID = "7704309760569225254";
const fail = code => { throw new Error(`HOMOLOGATION_GUARD: ${code}`); };
function readHomologationConfig(env) {
  if (env.QA_HOMOLOGATION_MODE !== "manual" || env.NODE_ENV !== "development") fail("MANUAL_REAL_AUTH_REQUIRED");
  if (env.QA_HOMOLOGATION_ALLOW_WRITES !== "authorized") fail("EXPLICIT_AUTHORIZATION_REQUIRED");
  if (Object.keys(env).some(key => (key.startsWith("QA_INTEGRATION_") && key !== "QA_INTEGRATION_CLUSTER_ID") || key === "RUN_PLAN_DB_TESTS")) fail("AUTOMATED_TEST_MODE_FORBIDDEN");
  const db = readDatabaseTarget(env);
  if (db.clusterId !== CLUSTER_ID) fail("CLUSTER_PIN_MISMATCH");
  if (env.PORT !== "3105" || env.QA_HOMOLOGATION_FRONTEND_PORT !== "5175") fail("EXCLUSIVE_HTTP_PORTS_REQUIRED");
  if (env.ALLOWED_ORIGINS !== "http://127.0.0.1:5175" || env.VITE_API_BASE_URL !== "http://127.0.0.1:3105") fail("LOCAL_API_ORIGIN_REQUIRED");
  for (const key of ["JWT_SECRET", "REGISTER_TOKEN"]) if (typeof env[key] !== "string" || env[key].length < 32) fail("DEDICATED_AUTH_SECRETS_REQUIRED");
  return db;
}
function loadHomologationEnvironment(file, inherited = process.env, readFile = fs.readFileSync) {
  let source, parsed;
  try { if (!file) fail("EXPLICIT_ENV_REQUIRED"); source = readFile(file, "utf8"); parsed = require("dotenv").parse(source); } catch { fail("EXPLICIT_ENV_UNREADABLE"); }
  if (Object.keys(parsed).some(key => key.includes("ALLOW_") || key.startsWith("QA_INTEGRATION_VERIFIED_"))) fail("AUTHORIZATION_MUST_BE_EPHEMERAL");
  for (const key of Object.keys(parsed)) {
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) fail("INVALID_KEY");
    if (source.split(/\r?\n/).filter(line => new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`).test(line)).length !== 1) fail("DUPLICATE_KEY");
    if (inherited[key] !== undefined && inherited[key] !== parsed[key]) fail("CONFLICTING_INHERITED_CONFIGURATION");
  }
  const env = { ...parsed, ...inherited };
  readHomologationConfig(env);
  return env;
}
module.exports = { CLUSTER_ID, readHomologationConfig, loadHomologationEnvironment };
