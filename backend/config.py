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
