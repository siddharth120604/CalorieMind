#!/bin/bash
set -e

echo "Creating database schema..."
python3 -c "from app import app, db; app.app_context().push(); db.create_all(); print('Schema created successfully')"

echo "Running migrations..."
python3 scripts/apply_migrations.py
