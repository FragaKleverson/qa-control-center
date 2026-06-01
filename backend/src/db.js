const envFile = process.env.NODE_ENV === "test" ? "../.env.test" : "../.env";
require("dotenv").config({ path: envFile });
const { Pool } = require("pg");

// Pool de conexões com o PostgreSQL; credenciais lidas do .env
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: String(process.env.DB_PASSWORD),
  port: Number(process.env.DB_PORT),
});

module.exports = pool;