-- Migration: add_user_role
-- Adds role column to users table for RBAC (Fase 2, Item 7).
-- Valid values: 'admin', 'qa', 'reader'
-- Default is 'qa' for all existing and new users.

ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'qa';
