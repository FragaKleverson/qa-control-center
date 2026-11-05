const fs = require("node:fs");
const TARGET = Object.freeze({ host: "127.0.0.1", port: 5435, database: "qa_control_integration" });
const KEYS = ["QA_INTEGRATION_MODE", "QA_INTEGRATION_CLUSTER_ID", "NODE_ENV", "DATABASE_URL", "DB_HOST", "DB_PORT", "DB_DATABASE", "DB_NAME", "DB_USER", "DB_PASSWORD"];
function fail(code) { throw new Error(`INTEGRATION_GUARD: ${code}`); }
function readIntegrationConfig(env) {
  if (env.QA_HOMOLOGATION_MODE !== undefined) fail("CONFLICTING_RUNTIME_MODES");
  if (env.QA_INTEGRATION_MODE !== "disposable") fail("MODE_REQUIRED");
  if (env.QA_INTEGRATION_ALLOW_DESTRUCTIVE !== "authorized") fail("DESTRUCTIVE_AUTHORIZATION_REQUIRED");
  if (env.NODE_ENV !== "test") fail("TEST_RUNTIME_REQUIRED");
  return readDatabaseTarget(env);
}
function readDatabaseTarget(env) {
  if (Object.keys(env).some(key => key.startsWith("PG") && env[key] !== undefined)) fail("PG_OVERRIDES_FORBIDDEN");
  if (env.DB_NAME !== undefined) fail("DB_NAME_UNSUPPORTED_USE_DB_DATABASE");
  for (const key of ["DATABASE_URL", "DB_HOST", "DB_PORT", "DB_DATABASE", "DB_USER", "DB_PASSWORD", "QA_INTEGRATION_CLUSTER_ID"]) {
    if (typeof env[key] !== "string" || !env[key] || env[key] !== env[key].trim()) fail("MISSING_OR_INVALID_CONFIGURATION");
  }
  if (env.DB_HOST !== TARGET.host || env.DB_PORT !== String(TARGET.port) || env.DB_DATABASE !== TARGET.database) fail("DESTINATION_NOT_ALLOWLISTED");
  if (env.DB_USER !== "qa_integration_runner") fail("DEDICATED_CREDENTIAL_REQUIRED");
  if (!/^[0-9]{10,30}$/.test(env.QA_INTEGRATION_CLUSTER_ID)) fail("CLUSTER_ID_REQUIRED");
  try {
    const url = new URL(env.DATABASE_URL);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hostname !== TARGET.host || url.port !== String(TARGET.port) || url.pathname !== `/${TARGET.database}` || url.hash ||
      [...url.searchParams].some(([key,value]) => key !== "schema" || value !== "public") || [...url.searchParams].length > 1 ||
      decodeURIComponent(url.username) !== env.DB_USER || decodeURIComponent(url.password) !== env.DB_PASSWORD) fail("PRISMA_POOL_MISMATCH");
  } catch { fail("INVALID_OR_MISMATCHED_DATABASE_URL"); }
  return Object.freeze({ ...TARGET, user: env.DB_USER, password: env.DB_PASSWORD, clusterId: env.QA_INTEGRATION_CLUSTER_ID });
}
function loadIntegrationEnvironment(file, inherited = process.env, readFile = fs.readFileSync) {
  if (!file) fail("EXPLICIT_ENV_FILE_REQUIRED");
  let source, parsed;
  try { source = readFile(file, "utf8"); parsed = require("dotenv").parse(source); } catch { fail("ENV_FILE_UNREADABLE"); }
  if (Object.keys(parsed).some(key => (key.startsWith("QA_INTEGRATION_ALLOW_") || key.startsWith("QA_INTEGRATION_VERIFIED_")))) fail("AUTHORIZATION_MUST_NOT_BE_STORED_IN_ENV_FILE");
  for (const key of KEYS) {
    if (source.split(/\r?\n/).filter(line => new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`).test(line)).length > 1) fail("DUPLICATE_ENV_KEY");
    if (inherited[key] !== undefined && parsed[key] !== undefined && inherited[key] !== parsed[key]) fail("CONFLICTING_INHERITED_ENV");
  }
  const env = { ...parsed, ...inherited };
  readIntegrationConfig(env);
  return env;
}
const IDENTITY_SQL = `SELECT current_database() AS database, current_user AS role,
  inet_server_addr()::text AS server_addr, inet_server_port() AS server_port,
  system_identifier::text AS cluster_id FROM pg_control_system()`;
async function verifyIntegrationConnection(client, config) {
  const stream = client.connection?.stream;
  if (stream?.remoteAddress !== TARGET.host || stream?.remotePort !== TARGET.port) fail("SOCKET_DESTINATION_MISMATCH");
  let row;
  try { row = (await client.query(IDENTITY_SQL)).rows[0]; } catch { fail("IDENTITY_QUERY_FAILED"); }
  if (!row || row.database !== TARGET.database || row.role !== config.user || row.cluster_id !== config.clusterId || row.server_port !== 5432 || !row.server_addr) fail("REAL_IDENTITY_MISMATCH");
  return { database: row.database, clusterId: row.cluster_id };
}
function assertPrismaIntegrationExecution(env) {
  const config = readIntegrationConfig(env);
  if (env.QA_INTEGRATION_ALLOW_MIGRATIONS !== "authorized") fail("MIGRATION_AUTHORIZATION_REQUIRED");
  if (env.QA_INTEGRATION_VERIFIED_CLUSTER_ID !== config.clusterId) fail("VERIFIED_RUNNER_REQUIRED");
  return config;
}
module.exports = { assertPrismaIntegrationExecution, TARGET, IDENTITY_SQL, readDatabaseTarget, readIntegrationConfig, loadIntegrationEnvironment, verifyIntegrationConnection };
