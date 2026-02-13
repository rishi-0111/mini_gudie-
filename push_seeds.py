"""
Push enum migration + all 7 seed batch SQL files to Supabase.
Connects directly to the Supabase PostgreSQL database.
"""
import psycopg2
import os
import sys
import time

# Supabase connection via session pooler (port 5432 for DDL support)
DB_HOST = "aws-0-ap-south-1.pooler.supabase.com"
DB_PORT = 5432
DB_NAME = "postgres"
DB_USER = "postgres.bqpkltznzkwvageimfic"
DB_PASS = "ZPNUB5DR76DGK965HQ8UD389"

BATCHES_DIR = r"d:\miniguide\supabase\batches"
BATCH_FILES = [
    "batch_0_enum.sql",
    "batch_1_core.sql",
    "batch_2_kaggle.sql",
    "batch_3_osm_infra.sql",
    "batch_4_osm_tourist.sql",
    "batch_5_worship.sql",
    "batch_6_hidden_gems.sql",
]


def main():
    print("Connecting to Supabase PostgreSQL...")
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            connect_timeout=15,
            options="-c statement_timeout=120000",  # 2 min per statement
        )
        conn.autocommit = True
        print("Connected!\n")
    except Exception as e:
        print(f"Connection failed: {e}")
        sys.exit(1)

    cur = conn.cursor()

    # Check current enum values
    cur.execute("SELECT enumlabel FROM pg_enum WHERE enumtypid = 'place_category'::regtype ORDER BY enumsortorder;")
    current_vals = [r[0] for r in cur.fetchall()]
    print(f"Current place_category values ({len(current_vals)}): {current_vals}\n")

    total_start = time.time()
    success_count = 0
    total_rows = 0

    for batch_file in BATCH_FILES:
        filepath = os.path.join(BATCHES_DIR, batch_file)
        if not os.path.exists(filepath):
            print(f"SKIP  {batch_file} — file not found")
            continue

        size_kb = os.path.getsize(filepath) / 1024
        print(f"{'='*60}")
        print(f"Loading {batch_file} ({size_kb:.1f} KB)...")
        start = time.time()

        try:
            with open(filepath, "r", encoding="utf-8") as f:
                sql = f.read()

            cur.execute(sql)

            elapsed = time.time() - start
            # Try to get row count from last INSERT
            rows = cur.rowcount if cur.rowcount > 0 else 0
            total_rows += rows
            success_count += 1
            print(f"  OK  {elapsed:.1f}s  ({rows} rows affected)")

        except Exception as e:
            elapsed = time.time() - start
            err_msg = str(e).strip().split("\n")[0]
            print(f"  ERR {elapsed:.1f}s  {err_msg}")
            # Continue to next batch even on error
            conn.rollback()
            conn.autocommit = True

    # Verify enum after migration
    cur.execute("SELECT enumlabel FROM pg_enum WHERE enumtypid = 'place_category'::regtype ORDER BY enumsortorder;")
    final_vals = [r[0] for r in cur.fetchall()]
    print(f"\n{'='*60}")
    print(f"Final place_category values ({len(final_vals)}): {final_vals}")

    # Count places
    cur.execute("SELECT category, COUNT(*) FROM places GROUP BY category ORDER BY count DESC;")
    cats = cur.fetchall()
    print(f"\nPlaces by category:")
    total_places = 0
    for cat, cnt in cats:
        print(f"  {cat:<20} {cnt:>6}")
        total_places += cnt
    print(f"  {'TOTAL':<20} {total_places:>6}")

    total_elapsed = time.time() - total_start
    print(f"\nDone! {success_count}/{len(BATCH_FILES)} batches loaded in {total_elapsed:.1f}s")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
