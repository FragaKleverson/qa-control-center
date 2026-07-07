const { Pool } = require("pg");
const { db: dbConfig } = require("./config/env");

// Pool de conexões com o PostgreSQL; credenciais lidas do config centralizado
const pool = new Pool(dbConfig);

module.exports = pool;