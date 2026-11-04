const { readIntegrationConfig, verifyIntegrationConnection } = require("./integrationTarget");
function createIntegrationPool(Pool, env = process.env, readConfig = readIntegrationConfig) {
  const config = readConfig(env);
  const pool = new Pool({ host: config.host, port: config.port, database: config.database,
    user: config.user, password: config.password, connectionTimeoutMillis: 5000,
    application_name: env.QA_HOMOLOGATION_MODE === "manual" ? "qa-manual-homologation" : "qa-disposable-integration" });
  const connect = pool.connect.bind(pool);
  pool.connect = async () => {
    const current = readConfig(env);
    if (JSON.stringify(current) !== JSON.stringify(config)) throw new Error("INTEGRATION_GUARD: CONFIGURATION_CHANGED");
    let client;
    try { client = await connect(); } catch { throw new Error("INTEGRATION_GUARD: CONNECTION_FAILED"); }
    try {
      await verifyIntegrationConnection(client, config);
      const originalQuery = client.query;
      const originalRelease = client.release;
      client.query = (...args) => {
        const current = readConfig(env);
        if (JSON.stringify(current) !== JSON.stringify(config)) throw new Error("INTEGRATION_GUARD: CONFIGURATION_CHANGED");
        return originalQuery.apply(client, args);
      };
      client.release = (...args) => {
        client.query = originalQuery;
        client.release = originalRelease;
        return originalRelease.apply(client, args);
      };
      return client;
    }
    catch (error) { client.release(error); throw error; }
  };
  // All application/helper queries acquire a verified connection first.
  pool.query = async (...args) => {
    const client = await pool.connect();
    try { return await client.query(...args); } finally { client.release(); }
  };
  return pool;
}
module.exports = { createIntegrationPool };
