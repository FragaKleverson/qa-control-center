-- Migration: add_auth_tokens
-- Adds tables for secure logout (JTI blocklist) and password reset flow.

-- ── Password reset tokens ─────────────────────────────────────────────────────
CREATE TABLE password_reset_tokens (
    id         SERIAL      PRIMARY KEY,
    user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT        NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Revoked JWT tokens (secure logout / JTI blocklist) ───────────────────────
-- Tokens are inserted on logout and automatically expire.
-- The expires_at index speeds up cleanup queries.
CREATE TABLE revoked_tokens (
    id         SERIAL      PRIMARY KEY,
    jti        VARCHAR(36) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX revoked_tokens_expires_at_idx ON revoked_tokens(expires_at);
