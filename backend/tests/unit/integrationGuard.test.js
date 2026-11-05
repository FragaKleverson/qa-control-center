jest.mock("../../src/db", () => { throw new Error("Real application database must never load"); });
const { readIntegrationConfig, loadIntegrationEnvironment, verifyIntegrationConnection, IDENTITY_SQL } = require("../../src/config/integrationTarget");
const { createIntegrationPool } = require("../../src/config/integrationPool");
const { run } = require("../../scripts/run-disposable-integration");
const fs = require("node:fs");
const path = require("node:path");
function environment() {
  return { NODE_ENV: "test", QA_INTEGRATION_MODE: "disposable", QA_INTEGRATION_ALLOW_DESTRUCTIVE: "authorized",
    QA_INTEGRATION_CLUSTER_ID: "9999999999999999999", DB_HOST: "127.0.0.1", DB_PORT: "5435", DB_DATABASE: "qa_control_integration",
    DB_USER: "qa_integration_runner", DB_PASSWORD: "synthetic-only-secret",
    DATABASE_URL: "postgresql://qa_integration_runner:synthetic-only-secret@127.0.0.1:5435/qa_control_integration?schema=public" };
}
function identity(env = environment()) { return { database: env.DB_DATABASE, role: env.DB_USER, cluster_id: env.QA_INTEGRATION_CLUSTER_ID, server_addr: "172.30.0.2", server_port: 5432 }; }
function fakePool(row = identity()) {
  const client = { connection: { stream: { remoteAddress: "127.0.0.1", remotePort: 5435 } }, query: jest.fn(async () => ({ rows: [row] })), release: jest.fn() };
  const connect = jest.fn(async () => client), end = jest.fn();
  const Pool = jest.fn().mockImplementation(options => ({ options, connect, end }));
  return { Pool, client, connect, end };
}
const source = env => Object.entries(env).filter(([key]) => !key.startsWith("QA_INTEGRATION_ALLOW_")).map(([key,value]) => `${key}=${value}`).join("\n");
it("accepts only explicit disposable integration destination", () => {
  expect(readIntegrationConfig(environment())).toMatchObject({ host: "127.0.0.1", port: 5435, database: "qa_control_integration" });
});
it.each(["QA_INTEGRATION_MODE", "QA_INTEGRATION_ALLOW_DESTRUCTIVE", "QA_INTEGRATION_CLUSTER_ID", "DB_HOST", "DB_PORT", "DB_DATABASE", "DB_USER", "DB_PASSWORD", "DATABASE_URL"])("fails closed when %s is absent", key => {
  const env = environment(); delete env[key]; expect(() => readIntegrationConfig(env)).toThrow("INTEGRATION_GUARD");
});
it.each([{DB_DATABASE:"qadb"},{DB_DATABASE:"qa_control_test"},{DB_PORT:"5433"},{DB_PORT:"5434"},{DB_PORT:""},{DB_HOST:"localhost"},{DB_HOST:"db"},{DB_USER:"legacy-user"},{NODE_ENV:"development"},{DB_NAME:"qa_control_integration"},{PGHOST:"127.0.0.1"},{PGOPTIONS:"-c search_path=other"}])("rejects forbidden destination/override %j", patch => {
  expect(() => readIntegrationConfig({...environment(),...patch})).toThrow("INTEGRATION_GUARD");
});
it.each(["postgresql://other:secret@127.0.0.1:5435/qa_control_integration", "postgresql://qa_integration_runner:synthetic-only-secret@127.0.0.1:5433/qadb", "postgresql://qa_integration_runner:synthetic-only-secret@127.0.0.1:5435/qa_control_integration?host=elsewhere", "invalid"])("rejects Prisma mismatch without leaking URL", url => {
  try { readIntegrationConfig({...environment(),DATABASE_URL:url}); throw new Error("must reject"); }
  catch(error) { expect(error.message).toMatch(/^INTEGRATION_GUARD/); expect(error.message).not.toContain("secret"); expect(error.message).not.toContain("postgresql:"); }
});
it("explicit file loader detects conflicting inherited variables", () => {
  expect(() => loadIntegrationEnvironment("fixture",{...environment(),DB_PORT:"5433"},()=>source(environment()))).toThrow("CONFLICTING_INHERITED_ENV");
});
it("duplicate definitions and authorization persisted in file are rejected", () => {
  expect(() => loadIntegrationEnvironment("fixture",environment(),()=>source(environment())+"\nDB_PORT=5435")).toThrow("DUPLICATE");
  expect(() => loadIntegrationEnvironment("fixture",environment(),()=>source(environment())+"\nQA_INTEGRATION_ALLOW_DESTRUCTIVE=authorized")).toThrow("MUST_NOT_BE_STORED");
});
it("explicit file loader refuses missing file and never falls back", () => {
  expect(() => loadIntegrationEnvironment(undefined,environment())).toThrow("ENV_FILE_REQUIRED");
  expect(() => loadIntegrationEnvironment("missing",environment(),()=>{throw Error("contains credentials");})).toThrow("ENV_FILE_UNREADABLE");
});
it("file loader preserves consistent explicit values", () => {
  expect(loadIntegrationEnvironment("fixture",{QA_INTEGRATION_ALLOW_DESTRUCTIVE:"authorized"},()=>source(environment()))).toEqual(environment());
});
it("verifies actual database, cluster, role and local socket with read-only SQL", async () => {
  const {client}=fakePool(); await expect(verifyIntegrationConnection(client,readIntegrationConfig(environment()))).resolves.toMatchObject({database:"qa_control_integration"});
  expect(client.query).toHaveBeenCalledWith(IDENTITY_SQL); expect(IDENTITY_SQL.trim()).toMatch(/^SELECT/);
});
it.each([{database:"qadb"},{database:"qa_control_test"},{cluster_id:"1111111111111111111"},{role:"other"},{server_port:5433},{server_addr:null}])("rejects mismatched real identity %j before application queries", async patch => {
  const f=fakePool({...identity(),...patch}); const pool=createIntegrationPool(f.Pool,environment());
  await expect(pool.query("SELECT 42")).rejects.toThrow("REAL_IDENTITY_MISMATCH"); expect(f.client.query).toHaveBeenCalledTimes(1); expect(f.client.release).toHaveBeenCalledTimes(1);
});
it("socket cannot point to protected port even when returned database name matches", async () => {
  const f=fakePool();f.client.connection.stream.remotePort=5434;
  await expect(createIntegrationPool(f.Pool,environment()).query("SELECT 42")).rejects.toThrow("SOCKET_DESTINATION_MISMATCH");expect(f.client.query).not.toHaveBeenCalled();
});
it("identity query failure prevents application query and discards connection", async () => {
  const f=fakePool();f.client.query.mockRejectedValue(new Error("sensitive-driver-details"));
  await expect(createIntegrationPool(f.Pool,environment()).query("SELECT 42")).rejects.toThrow("IDENTITY_QUERY_FAILED");expect(f.client.query).toHaveBeenCalledTimes(1);
});
it("each acquired connection is verified before use", async () => {
  const f=fakePool(); const pool=createIntegrationPool(f.Pool,environment()); await pool.query("SELECT 42");await pool.query("SELECT 43");
  expect(f.client.query.mock.calls.map(([sql])=>sql)).toEqual([IDENTITY_SQL,"SELECT 42",IDENTITY_SQL,"SELECT 43"]);
});
it("revoked authorization or changed configuration refuses pool access", async () => {
  const env=environment(),f=fakePool(),pool=createIntegrationPool(f.Pool,env); delete env.QA_INTEGRATION_ALLOW_DESTRUCTIVE;
  await expect(pool.query("SELECT 42")).rejects.toThrow("AUTHORIZATION_REQUIRED");expect(f.connect).not.toHaveBeenCalled();
});
it("runner validates real identity before check without spawning commands", async () => {
  const f=fakePool(),spawnSync=jest.fn(); const result=await run(["check","fixture"],{...f,env:environment(),readFile:()=>source(environment()),spawnSync});
  expect(result.identityVerified).toBe(true);expect(spawnSync).not.toHaveBeenCalled();expect(f.end).toHaveBeenCalledTimes(1);
});
it("runner cannot launch a child if identity fails", async () => {
  const f=fakePool({...identity(),database:"qadb"}),spawnSync=jest.fn();
  await expect(run(["test","fixture","projetos.test.js"],{...f,env:environment(),readFile:()=>source(environment()),spawnSync})).rejects.toThrow("REAL_IDENTITY_MISMATCH");expect(spawnSync).not.toHaveBeenCalled();
});
it("runner refuses migration action without a separate authorization before connecting", async () => {
  const f=fakePool(),spawnSync=jest.fn();await expect(run(["migrate","fixture"],{...f,env:environment(),readFile:()=>source(environment()),spawnSync})).rejects.toThrow("MIGRATION_AUTHORIZATION_REQUIRED");expect(f.connect).not.toHaveBeenCalled();expect(spawnSync).not.toHaveBeenCalled();
});
it("runner refuses arbitrary test paths", async () => {
  const f=fakePool();await expect(run(["test","fixture","../unit/other.test.js"],{...f,env:environment(),readFile:()=>source(environment())})).rejects.toThrow("INVALID_TEST_PATH");expect(f.connect).not.toHaveBeenCalled();
});
it("legacy setup and Compose stay separate from disposable mode", () => {
  const legacy=fs.readFileSync(path.join(__dirname,"../../jest.setup.js"),"utf8");expect(legacy).toContain("'5434'");expect(legacy).toContain("'qa_control_test'");
  const compose=fs.readFileSync(path.join(__dirname,"../../../docker-compose.integration.yml"),"utf8");expect(compose).toContain("127.0.0.1:5435:5432");expect(compose).toContain("qa-control-integration_pgdata");expect(compose).not.toContain("docker-entrypoint-initdb.d");expect(compose).not.toMatch(/pgdata-test|qa-control-center_pgdata/);
});
it("authorization revoked after checkout blocks queries on dedicated transaction client", async () => {
  const env=environment(),f=fakePool(),pool=createIntegrationPool(f.Pool,env),query=f.client.query;
  const client=await pool.connect();delete env.QA_INTEGRATION_ALLOW_DESTRUCTIVE;
  expect(()=>client.query("SELECT 42")).toThrow("AUTHORIZATION_REQUIRED");expect(query).toHaveBeenCalledTimes(1);client.release();
});
it("connection failure is sanitized and no application query is issued", async () => {
  const f=fakePool();f.connect.mockRejectedValue(new Error("sensitive-driver-details"));
  await expect(createIntegrationPool(f.Pool,environment()).query("SELECT 42")).rejects.toThrow("CONNECTION_FAILED");expect(f.client.query).not.toHaveBeenCalled();
});
it("protected destination never constructs a pool", () => {
  const f=fakePool();expect(()=>createIntegrationPool(f.Pool,{...environment(),DB_PORT:"5434"})).toThrow("DESTINATION_NOT_ALLOWLISTED");expect(f.Pool).not.toHaveBeenCalled();
});
it("Prisma config gate refuses unverified direct invocation", () => {
  const {assertPrismaIntegrationExecution}=require("../../src/config/integrationTarget");
  const env={...environment(),QA_INTEGRATION_ALLOW_MIGRATIONS:"authorized"};
  expect(()=>assertPrismaIntegrationExecution(env)).toThrow("VERIFIED_RUNNER_REQUIRED");
  expect(assertPrismaIntegrationExecution({...env,QA_INTEGRATION_VERIFIED_CLUSTER_ID:env.QA_INTEGRATION_CLUSTER_ID})).toMatchObject({database:"qa_control_integration"});
});
it("verified identity markers cannot be persisted in env files", () => {
  expect(()=>loadIntegrationEnvironment("fixture",environment(),()=>source(environment())+"\nQA_INTEGRATION_VERIFIED_CLUSTER_ID=9999999999999999999")).toThrow("MUST_NOT_BE_STORED");
});
