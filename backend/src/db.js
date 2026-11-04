const { Pool } = require("pg");
const { db: dbConfig } = require("./config/env");

// Pool de conexões com o PostgreSQL; credenciais lidas do config centralizado
const guarded = process.env.QA_INTEGRATION_MODE !== undefined || process.env.QA_HOMOLOGATION_MODE !== undefined;
const readConfig = process.env.QA_HOMOLOGATION_MODE !== undefined
  ? require("./config/homologation").readHomologationConfig
  : require("./config/integrationTarget").readIntegrationConfig;
const pool = guarded
  ? require("./config/integrationPool").createIntegrationPool(Pool, process.env, readConfig)
  : new Pool(dbConfig);

module.exports = pool;
