import os
import sys
import time
from pathlib import Path

import psycopg2


def _get_database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if url:
        return url

    # fallback for docker-compose style envs
    host = os.getenv("POSTGRES_HOST", "db")
    dbname = os.getenv("POSTGRES_DB", "calorie_tracker")
    user = os.getenv("POSTGRES_USER", "postgres")
    password = os.getenv("POSTGRES_PASSWORD", "postgres")
    port = os.getenv("POSTGRES_PORT", "5432")
    return f"postgresql://{user}:{password}@{host}:{port}/{dbname}"


def _connect_with_retry(dsn: str, timeout_seconds: int = 60):
    start = time.time()
    last_err = None
    while time.time() - start < timeout_seconds:
        try:
            conn = psycopg2.connect(dsn)
            conn.autocommit = False
            return conn
        except Exception as e:
            last_err = e
            time.sleep(2)
    raise RuntimeError(f"Could not connect to DB within {timeout_seconds}s: {last_err}")


def _ensure_migrations_table(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )
    conn.commit()


def _is_applied(conn, version: str) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM schema_migrations WHERE version = %s", (version,))
        return cur.fetchone() is not None


def _record_applied(conn, version: str) -> None:
    with conn.cursor() as cur:
        cur.execute("INSERT INTO schema_migrations (version) VALUES (%s)", (version,))


def _append_applied_txt(repo_root: Path, version: str) -> None:
    applied_txt = repo_root / "migrations" / "applied.txt"
    if not applied_txt.exists():
        return
    try:
        existing = set(
            line.strip() for line in applied_txt.read_text(encoding="utf-8").splitlines() if line.strip()
        )
        if version in existing:
            return
        applied_txt.write_text(
            (applied_txt.read_text(encoding="utf-8").rstrip("\n") + "\n" + version + "\n"),
            encoding="utf-8",
        )
    except Exception:
        # best-effort; DB table is the source of truth
        return


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    migrations_dir = repo_root / "migrations" / "versions"

    if not migrations_dir.exists():
        print(f"Migrations directory not found: {migrations_dir}", file=sys.stderr)
        return 1

    dsn = _get_database_url()
    print("[migrate] Connecting to DB…")
    conn = _connect_with_retry(dsn)

    try:
        _ensure_migrations_table(conn)

        migration_files = sorted(p for p in migrations_dir.glob("*.sql") if p.is_file())
        if not migration_files:
            print("[migrate] No migration files found.")
            return 0

        applied_any = False
        for path in migration_files:
            version = path.name
            if _is_applied(conn, version):
                print(f"[migrate] Skipping {version} (already applied)")
                continue

            sql = path.read_text(encoding="utf-8")
            print(f"[migrate] Applying {version}…")
            try:
                with conn.cursor() as cur:
                    cur.execute(sql)
                _record_applied(conn, version)
                conn.commit()
                _append_applied_txt(repo_root, version)
                applied_any = True
                print(f"[migrate] Applied {version}")
            except Exception as e:
                conn.rollback()
                print(f"[migrate] FAILED {version}: {e}", file=sys.stderr)
                return 2

        if not applied_any:
            print("[migrate] Database already up to date.")

        return 0
    finally:
        try:
            conn.close()
        except Exception:
            pass


if __name__ == "__main__":
    raise SystemExit(main())
