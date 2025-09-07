-- Migration: add goal column to users
-- Run with: python3 scripts/apply_migrations.py

ALTER TABLE users
ADD COLUMN IF NOT EXISTS goal VARCHAR(50) DEFAULT 'maintain';
