FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ backend/
COPY scripts/ scripts/
COPY migrations/ migrations/

RUN chmod +x scripts/init_and_migrate.sh scripts/restore_from_s3.py

EXPOSE 8080

CMD ["python3", "-m", "backend.main"]
