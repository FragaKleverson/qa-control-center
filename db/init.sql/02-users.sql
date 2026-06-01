-- =============================================================
-- 02-users.sql
-- Tabela de usuários para autenticação JWT
-- =============================================================

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255)        NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255)        NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
