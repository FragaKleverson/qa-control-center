const { readHomologationConfig, loadHomologationEnvironment, CLUSTER_ID } = require("../../src/config/homologation");
const { readIntegrationConfig } = require("../../src/config/integrationTarget");
const { createIntegrationPool } = require("../../src/config/integrationPool");
const env = () => ({ QA_HOMOLOGATION_MODE: "manual", QA_HOMOLOGATION_ALLOW_WRITES: "authorized", NODE_ENV: "development", QA_INTEGRATION_CLUSTER_ID: CLUSTER_ID,
  DB_HOST: "127.0.0.1", DB_PORT: "5435", DB_DATABASE: "qa_control_integration", DB_USER: "qa_integration_runner", DB_PASSWORD: "synthetic",
  DATABASE_URL: "postgresql://qa_integration_runner:synthetic@127.0.0.1:5435/qa_control_integration?schema=public", JWT_SECRET: "s".repeat(40), REGISTER_TOKEN: "r".repeat(40),
  PORT: "3105", QA_HOMOLOGATION_FRONTEND_PORT: "5175", VITE_API_BASE_URL: "http://127.0.0.1:3105", ALLOWED_ORIGINS: "http://127.0.0.1:5175" });
test("manual mode has real authentication and the same allowlisted database", () => {
  expect(readHomologationConfig(env())).toMatchObject({ host: "127.0.0.1", port: 5435, database: "qa_control_integration", clusterId: CLUSTER_ID });
  expect(() => readIntegrationConfig(env())).toThrow("CONFLICTING_RUNTIME_MODES");
});
test.each([{NODE_ENV:"test"},{NODE_ENV:"production"},{QA_HOMOLOGATION_MODE:undefined},{QA_HOMOLOGATION_ALLOW_WRITES:undefined},
  {QA_INTEGRATION_MODE:"disposable"},{QA_INTEGRATION_ALLOW_DESTRUCTIVE:"authorized"},{QA_INTEGRATION_ALLOW_MIGRATIONS:"authorized"},{RUN_PLAN_DB_TESTS:"authorized"},
  {DB_PORT:"5433"},{DB_PORT:"5434"},{DB_PORT:undefined},{DB_DATABASE:"qadb"},{DB_DATABASE:"qa_control_test"},{DB_HOST:"localhost"},{DB_USER:"qauser"},
  {QA_INTEGRATION_CLUSTER_ID:"1111111111111111111"},{JWT_SECRET:"short"},{REGISTER_TOKEN:undefined},{PORT:"3001"},{QA_HOMOLOGATION_FRONTEND_PORT:"5173"},
  {VITE_API_BASE_URL:"http://localhost:3001"},{ALLOWED_ORIGINS:"*"},{PGHOST:"localhost"},{DB_NAME:"qadb"},
  {DATABASE_URL:"postgresql://qa_integration_runner:synthetic@127.0.0.1:5434/qa_control_test"}])("fails closed on unsafe manual configuration %j", patch => {
  expect(() => readHomologationConfig({ ...env(), ...patch })).toThrow();
});
function source() { return Object.entries(env()).filter(([key]) => key !== "QA_HOMOLOGATION_ALLOW_WRITES").map(([key,value]) => `${key}=${value}`).join("\n"); }
test("loads explicit local environment without development dotenv fallback", () => {
  expect(loadHomologationEnvironment("synthetic", { QA_HOMOLOGATION_ALLOW_WRITES: "authorized" }, () => source()).DB_PORT).toBe("5435");
});
test.each(["DB_PORT=5434", "NODE_ENV=test", "JWT_SECRET=other"])("rejects inherited conflicting variable %s", line => {
  const [key,value]=line.split("="); expect(() => loadHomologationEnvironment("synthetic", { QA_HOMOLOGATION_ALLOW_WRITES: "authorized", [key]:value }, () => source())).toThrow("CONFLICTING_INHERITED");
});
test.each(["\nDB_PORT=5435", "\nQA_HOMOLOGATION_ALLOW_WRITES=authorized"])("rejects duplicate keys or persisted consent", extra => {
  expect(() => loadHomologationEnvironment("synthetic", { QA_HOMOLOGATION_ALLOW_WRITES: "authorized" }, () => source()+extra)).toThrow();
});
test("manual pool checks real socket/cluster before every checkout and authorization before writes", async () => {
  const config=env(), rawQuery=jest.fn().mockResolvedValue({rows:[{database:"qa_control_integration",role:"qa_integration_runner",cluster_id:CLUSTER_ID,server_port:5432,server_addr:"172.21.0.2"}]}), release=jest.fn();
  const client={connection:{stream:{remoteAddress:"127.0.0.1",remotePort:5435}},query:rawQuery,release};
  const Pool=jest.fn().mockImplementation(()=>({connect:jest.fn().mockResolvedValue(client)}));
  const pool=createIntegrationPool(Pool,config,readHomologationConfig);
  expect(Pool.mock.calls[0][0].application_name).toBe("qa-manual-homologation");
  const checked=await pool.connect(); expect(rawQuery).toHaveBeenCalledTimes(1);
  config.QA_HOMOLOGATION_ALLOW_WRITES=undefined;
  expect(()=>checked.query("SELECT 42")).toThrow("EXPLICIT_AUTHORIZATION_REQUIRED"); checked.release(); expect(release).toHaveBeenCalledTimes(1);
});
test("mismatched real cluster closes the connection before an application query", async () => {
  const release=jest.fn(), client={connection:{stream:{remoteAddress:"127.0.0.1",remotePort:5435}},query:jest.fn().mockResolvedValue({rows:[{database:"qa_control_integration",role:"qa_integration_runner",cluster_id:"1111111111111111111",server_port:5432,server_addr:"172.21.0.2"}]}),release};
  const pool=createIntegrationPool(jest.fn().mockImplementation(()=>({connect:async()=>client})),env(),readHomologationConfig);
  await expect(pool.connect()).rejects.toThrow("REAL_IDENTITY_MISMATCH"); expect(release).toHaveBeenCalledTimes(1); expect(client.query).toHaveBeenCalledTimes(1);
});
