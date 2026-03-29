import os


class Config:
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "postgresql://localhost/calorie_tracker"
    )
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_recycle": 300, "pool_pre_ping": True}
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.environ.get(
        "JWT_SECRET_KEY",
        os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production"),
    )
    JWT_ACCESS_TOKEN_EXPIRES = 3600       # 1 hour
    JWT_REFRESH_TOKEN_EXPIRES = 2592000   # 30 days

    ADMIN_EMAIL = "siddharthraturi12@gmail.com"

    # S3 / Export
    S3_BUCKET_NAME = os.environ.get("S3_BUCKET_NAME", "caloriemind-exports")
    S3_ENDPOINT_URL = os.environ.get("S3_ENDPOINT_URL", None)
    S3_PUBLIC_ENDPOINT_URL = os.environ.get("S3_PUBLIC_ENDPOINT_URL", None)
    S3_REGION = os.environ.get("S3_REGION", "us-east-1")
    AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID", "test")
    AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY", "test")
    EXPORT_URL_EXPIRY = int(os.environ.get("EXPORT_URL_EXPIRY", "900"))
