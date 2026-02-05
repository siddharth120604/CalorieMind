#!/bin/bash
set -e

echo "=== CalorieMind Database Initialization ==="

# Try to restore from S3 backup
echo "Checking for existing backup in S3..."
python3 scripts/restore_from_s3.py
RESTORE_STATUS=$?

if [ $RESTORE_STATUS -eq 0 ]; then
    # Backup was downloaded, restore it
    echo "Restoring database from backup..."

    PGHOST="${POSTGRES_HOST:-db}"
    PGPORT="${POSTGRES_PORT:-5432}"
    PGUSER="${POSTGRES_USER:-postgres}"
    PGPASSWORD="${POSTGRES_PASSWORD:-postgres}"
    PGDATABASE="${POSTGRES_DB:-calorie_tracker}"

    export PGPASSWORD

    psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -f /tmp/Data_dump.sql

    echo "Database restored successfully from backup."
    rm -f /tmp/Data_dump.sql
else
    # No backup found, create fresh schema
    echo "No backup found. Creating fresh database schema..."
    python3 -c "from app import app, db; app.app_context().push(); db.create_all(); print('Schema created successfully')"
fi

echo "Running migrations..."
python3 scripts/apply_migrations.py

echo "=== Database Initialization Complete ==="
