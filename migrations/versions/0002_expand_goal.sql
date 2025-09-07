-- Migration: expand users.goal to 200 chars
-- Run with: python3 scripts/apply_migrations.py

ALTER TABLE users
ALTER COLUMN goal TYPE VARCHAR(200);
