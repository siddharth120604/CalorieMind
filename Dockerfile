FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Make migration script executable
RUN chmod +x scripts/init_and_migrate.sh

EXPOSE 8080

CMD [ "python3","main.py" ]