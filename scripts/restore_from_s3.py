#!/usr/bin/env python3
"""
Download database dump from S3 if it exists.
Exit codes:
  0 - Dump downloaded successfully
  1 - No dump found in S3 (fresh install)
  2 - Error occurred
"""

import os
import sys

import boto3
from botocore.exceptions import ClientError, NoCredentialsError

S3_BUCKET = "caloriemind-db-backups"
DUMP_FILE = "Data_dump.sql"
LOCAL_PATH = "/tmp/Data_dump.sql"


def main():
    print("=== Checking S3 for database backup ===")

    # Check for AWS credentials
    aws_key = os.getenv("AWS_ACCESS_KEY_ID")
    aws_secret = os.getenv("AWS_SECRET_ACCESS_KEY")
    aws_region = os.getenv("AWS_DEFAULT_REGION", "us-east-1")

    if not aws_key or not aws_secret:
        print("AWS credentials not found. Proceeding with fresh install.")
        return 1

    try:
        s3 = boto3.client(
            "s3",
            aws_access_key_id=aws_key,
            aws_secret_access_key=aws_secret,
            region_name=aws_region,
        )

        # Check if file exists
        print(f"Checking for s3://{S3_BUCKET}/{DUMP_FILE}...")
        s3.head_object(Bucket=S3_BUCKET, Key=DUMP_FILE)

        # File exists, download it
        print("Backup found! Downloading...")
        s3.download_file(S3_BUCKET, DUMP_FILE, LOCAL_PATH)

        # Verify download
        if os.path.exists(LOCAL_PATH) and os.path.getsize(LOCAL_PATH) > 0:
            size_kb = os.path.getsize(LOCAL_PATH) / 1024
            print(f"Downloaded successfully: {size_kb:.1f} KB")
            return 0
        else:
            print("Download failed or file is empty.")
            return 2

    except ClientError as e:
        if e.response["Error"]["Code"] == "404":
            print("No backup found in S3. Proceeding with fresh install.")
            return 1
        else:
            print(f"S3 error: {e}")
            return 2

    except NoCredentialsError:
        print("AWS credentials invalid. Proceeding with fresh install.")
        return 1

    except Exception as e:
        print(f"Unexpected error: {e}")
        return 2


if __name__ == "__main__":
    sys.exit(main())
