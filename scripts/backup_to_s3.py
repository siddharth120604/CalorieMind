#!/usr/bin/env python3
"""
Backs up database data to S3.
Called during infra destroy to preserve data.
"""

import os
import sys
import gzip

S3_BUCKET = "caloriemind-terraform-state"
S3_KEY = "backups/db/caloriemind-latest.sql.gz"
AWS_REGION = "us-east-1"


def main():
    backup_file = sys.argv[1] if len(sys.argv) > 1 else "/tmp/backup.sql"

    print(f"[backup] Uploading {backup_file} to S3...")

    # Check AWS credentials
    access_key = os.environ.get("AWS_ACCESS_KEY_ID")
    secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")

    if not access_key or not secret_key:
        print("[backup] AWS credentials not set")
        return 1

    try:
        import boto3
    except ImportError:
        print("[backup] boto3 not installed")
        return 1

    # Read and compress the backup
    print("[backup] Compressing backup...")
    with open(backup_file, "rb") as f:
        sql_content = f.read()

    compressed = gzip.compress(sql_content)

    # Upload to S3
    print(f"[backup] Uploading to s3://{S3_BUCKET}/{S3_KEY}...")
    s3_client = boto3.client("s3", region_name=AWS_REGION)
    s3_client.put_object(
        Bucket=S3_BUCKET,
        Key=S3_KEY,
        Body=compressed,
        ContentType="application/gzip",
    )

    print("[backup] Backup uploaded successfully")
    return 0


if __name__ == "__main__":
    sys.exit(main())
