#!/bin/bash
set -e

echo "=== CalorieMind Database Initialization ==="

echo "Creating database schema..."
python3 -c "from backend.app import create_app; from backend.extensions import db; app = create_app(); print('Schema created successfully')"

echo "Running migrations..."
python3 scripts/apply_migrations.py

echo "=== Database Initialization Complete ==="
