import os
from sqlalchemy import text
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import create_app, db

MIGRATIONS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'migrations', 'versions'))
APPLIED_LOG = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'migrations', 'applied.txt'))

app = create_app()

with app.app_context():
    os.makedirs(MIGRATIONS_DIR, exist_ok=True)
    applied = set()
    if os.path.exists(APPLIED_LOG):
        with open(APPLIED_LOG, 'r') as f:
            applied = set(line.strip() for line in f if line.strip())

    files = sorted(f for f in os.listdir(MIGRATIONS_DIR) if f.lower().endswith('.sql'))
    for fname in files:
        if fname in applied:
            print(f"Skipping already applied: {fname}")
            continue
        path = os.path.join(MIGRATIONS_DIR, fname)
        print(f"Applying {fname}...")
        with open(path, 'r') as fh:
            sql = fh.read()
        try:
            with db.engine.begin() as conn:
                conn.execute(text(sql))
            with open(APPLIED_LOG, 'a') as f:
                f.write(fname + '\n')
            print(f"Applied {fname}")
        except Exception as e:
            print(f"Failed to apply {fname}: {e}")
            break

print('Migrations complete')
