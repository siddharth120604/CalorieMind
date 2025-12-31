-- Migration: add role column to users and create notifications table
-- Run this SQL against the application's database to add RBAC support

BEGIN;

-- Add `role` column to users table (default 'pending') if it doesn't exist
ALTER TABLE IF EXISTS users
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'pending';

-- Create notifications table for internal admin notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

COMMIT;
