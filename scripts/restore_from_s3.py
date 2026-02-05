#!/usr/bin/env python3
"""
Restores database data from S3 backup if available.
This script is idempotent - safe to run multiple times.
"""

import os
import sys
import gzip
import subprocess
import tempfile

S3_BUCKET = "caloriemind-terraform-state"
S3_KEY = "backups/db/caloriemind-latest.sql.gz"
AWS_REGION = "us-east-1"


def check_aws_credentials():
    """Check if AWS credentials are available."""
    access_key = os.environ.get("AWS_ACCESS_KEY_ID")
    secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
    return bool(access_key and secret_key)


def check_backup_exists(s3_client):
    """Check if backup file exists in S3."""
    try:
        s3_client.head_object(Bucket=S3_BUCKET, Key=S3_KEY)
        return True
    except Exception:
        return False


def download_backup(s3_client, local_path):
    """Download backup from S3."""
    s3_client.download_file(S3_BUCKET, S3_KEY, local_path)


def restore_database(backup_path):
    """Restore data to PostgreSQL using psql."""
    pg_host = os.environ.get("POSTGRES_HOST", "db")
    pg_user = os.environ.get("POSTGRES_USER")
    pg_db = os.environ.get("POSTGRES_DB")
    pg_password = os.environ.get("POSTGRES_PASSWORD")

    if not all([pg_user, pg_db, pg_password]):
        print("[restore] Missing PostgreSQL credentials")
        return False

    # Decompress and restore
    with gzip.open(backup_path, "rt") as f:
        sql_content = f.read()

    env = os.environ.copy()
    env["PGPASSWORD"] = pg_password

    # Use ON_ERROR_STOP=0 for idempotency (ignore duplicate key errors)
    result = subprocess.run(
        [
            "psql",
            "-h", pg_host,
            "-U", pg_user,
            "-d", pg_db,
            "-v", "ON_ERROR_STOP=0",
        ],
        input=sql_content,
        text=True,
        env=env,
        capture_output=True,
    )

    if result.returncode != 0 and result.stderr:
        # Log warnings but don't fail (idempotent restore)
        print(f"[restore] psql output: {result.stderr[:500]}")

    return True


def main():
    print("[restore] Checking for S3 backup...")

    # Check AWS credentials
    if not check_aws_credentials():
        print("[restore] AWS credentials not set, skipping restore")
        return 0

    # Import boto3 only if credentials exist
    try:
        import boto3
    except ImportError:
        print("[restore] boto3 not installed, skipping restore")
        return 0

    # Create S3 client
    s3_client = boto3.client("s3", region_name=AWS_REGION)

    # Check if backup exists
    if not check_backup_exists(s3_client):
        print("[restore] No backup found in S3, skipping restore (first deploy?)")
        return 0

    # Download and restore
    with tempfile.NamedTemporaryFile(suffix=".sql.gz", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        print("[restore] Downloading backup from S3...")
        download_backup(s3_client, tmp_path)

        print("[restore] Restoring data...")
        restore_database(tmp_path)

        print("[restore] Database restore completed")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    return 0


if __name__ == "__main__":
    sys.exit(main())
