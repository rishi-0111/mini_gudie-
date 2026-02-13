"""
Push seed data to Supabase via REST API using service_role key.
Parses SQL INSERT statements from batch files and POSTs them as JSON.
"""

import re
import json
import urllib.request
import urllib.error
import os
import sys
import time

SUPABASE_URL = "https://bqpkltznzkwvageimfic.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxcGtsdHpuemt3dmFnZWltZmljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDQzMzEwMSwiZXhwIjoyMDg2MDA5MTAxfQ.nO00nan189XwlPtQkf8eimSwn7WJyR5aKJSuALEFvqU"

BATCHES_DIR = r"d:\miniguide\supabase\batches"

# Batch files to load (skip batch_0_enum — that's DDL, must be run in SQL Editor)
BATCH_FILES = [
    "batch_1_core.sql",
]

HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}


def parse_sql_value(raw: str) -> object:
    """Parse a single SQL value into a Python object."""
    raw = raw.strip()

    # NULL
    if raw.upper() == "NULL":
        return None

    # Boolean
    if raw.upper() in ("TRUE", "FALSE"):
        return raw.upper() == "TRUE"

    # Numeric
    try:
        if "." in raw:
            return float(raw)
        return int(raw)
    except ValueError:
        pass

    # String (single-quoted)
    if raw.startswith("'") and raw.endswith("'"):
        return raw[1:-1].replace("''", "'")

    # ARRAY[...]::TEXT[]
    arr_match = re.match(r"ARRAY\[(.*?)\]::TEXT\[\]", raw, re.IGNORECASE | re.DOTALL)
    if arr_match:
        inner = arr_match.group(1).strip()
        if not inner:
            return []
        # Split by commas outside quotes
        items = re.findall(r"'((?:[^']|'')*)'", inner)
        return [item.replace("''", "'") for item in items]

    # JSON cast: '{...}'::jsonb or '{}'::jsonb
    json_match = re.match(r"'(.*?)'::jsonb", raw, re.IGNORECASE | re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1).replace("''", "'"))
        except json.JSONDecodeError:
            return {}

    # Fallback: strip quotes if present
    if raw.startswith("'") and raw.endswith("'"):
        return raw[1:-1]

    return raw


def split_values(values_str: str) -> list:
    """Split a SQL VALUES tuple into individual value strings, respecting quotes and parentheses."""
    result = []
    current = []
    depth = 0
    in_quote = False
    i = 0

    while i < len(values_str):
        c = values_str[i]

        if c == "'" and not in_quote:
            in_quote = True
            current.append(c)
        elif c == "'" and in_quote:
            # Check for escaped quote ''
            if i + 1 < len(values_str) and values_str[i + 1] == "'":
                current.append("''")
                i += 1
            else:
                in_quote = False
                current.append(c)
        elif not in_quote:
            if c == "(":
                depth += 1
                current.append(c)
            elif c == ")":
                depth -= 1
                current.append(c)
            elif c == "," and depth == 0:
                result.append("".join(current).strip())
                current = []
            else:
                current.append(c)
        else:
            current.append(c)

        i += 1

    if current:
        result.append("".join(current).strip())

    return result


def parse_insert_sql(sql_content: str):
    """Parse INSERT INTO places (...) VALUES (...), (...); statements."""
    rows = []

    # Find all INSERT statements
    # Pattern: INSERT INTO [public.]places (cols) VALUES (vals), (vals), ...;
    pattern = re.compile(
        r"INSERT\s+INTO\s+(?:public\.)?places\s*\((.*?)\)\s*VALUES\s*(.*?);",
        re.IGNORECASE | re.DOTALL,
    )

    for match in pattern.finditer(sql_content):
        columns_str = match.group(1)
        values_block = match.group(2)

        # Parse column names
        columns = [c.strip().strip('"') for c in columns_str.split(",")]

        # Split multi-row VALUES: (...), (...)
        # Find each (...) tuple
        tuples = []
        depth = 0
        current_start = None

        for i, c in enumerate(values_block):
            if c == "(" and depth == 0:
                current_start = i + 1
                depth = 1
            elif c == "(":
                depth += 1
            elif c == ")" and depth == 1:
                depth = 0
                if current_start is not None:
                    tuples.append(values_block[current_start:i])
                    current_start = None
            elif c == ")":
                depth -= 1

        for val_tuple in tuples:
            values = split_values(val_tuple)

            if len(values) != len(columns):
                # Try to handle edge cases
                continue

            row = {}
            for col, val in zip(columns, values):
                row[col] = parse_sql_value(val)

            rows.append(row)

    return rows


def post_places(places: list, batch_size: int = 200) -> int:
    """POST places to Supabase REST API in batches. Returns count of inserted rows."""
    url = f"{SUPABASE_URL}/rest/v1/places"
    total_inserted = 0

    # Ensure all rows have the same keys (Supabase REST requires uniform keys)
    all_keys = set()
    for p in places:
        all_keys.update(p.keys())
    # Don't include 'id' — let the DB generate it
    all_keys.discard("id")

    DEFAULT_VALUES = {
        "address": None,
        "description": None,
        "rating": 0,
        "review_count": 0,
        "images": [],
        "amenities": {},
        "contact_info": {},
        "opening_hours": {},
        "verified": False,
    }

    for p in places:
        for k in all_keys:
            if k not in p:
                p[k] = DEFAULT_VALUES.get(k, None)
        # Remove 'id' if present
        p.pop("id", None)

    for i in range(0, len(places), batch_size):
        batch = places[i : i + batch_size]
        data = json.dumps(batch).encode("utf-8")

        req = urllib.request.Request(url, data=data, headers=HEADERS)
        try:
            resp = urllib.request.urlopen(req)
            total_inserted += len(batch)
            if i % 1000 == 0 and i > 0:
                print(f"    ... {total_inserted}/{len(places)} inserted")
        except urllib.error.HTTPError as e:
            body = e.read().decode()[:300]
            print(f"    ERROR at batch offset {i}: {e.code} — {body}")
            # Try inserting one-by-one to skip bad rows
            for j, place in enumerate(batch):
                single_data = json.dumps([place]).encode("utf-8")
                single_req = urllib.request.Request(url, data=single_data, headers=HEADERS)
                try:
                    urllib.request.urlopen(single_req)
                    total_inserted += 1
                except urllib.error.HTTPError as e2:
                    err_body = e2.read().decode()[:150]
                    if total_inserted < 5 or j < 2:
                        print(f"    SKIP row '{place.get('name', '?')[:30]}': {err_body}")

    return total_inserted


def main():
    print("=" * 60)
    print("Supabase Seed Data Loader (REST API)")
    print("=" * 60)

    # First verify enum migration
    print("\nChecking enum migration...")
    test = json.dumps({"name": "__enum_test__", "category": "hotel", "latitude": 0, "longitude": 0}).encode()
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/places",
        data=test,
        headers=HEADERS,
    )
    try:
        urllib.request.urlopen(req)
        # Delete test row
        del_req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/places?name=eq.__enum_test__",
            method="DELETE",
            headers=HEADERS,
        )
        urllib.request.urlopen(del_req)
        print("  Enum migration OK — 'hotel' category accepted")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        if "invalid input value for enum" in body:
            print("  ERROR: Enum migration NOT applied!")
            print("  Please run the ALTER TYPE statements in the SQL Editor first.")
            sys.exit(1)
        else:
            print(f"  Warning: {body[:200]}")

    total_start = time.time()
    grand_total = 0

    for batch_file in BATCH_FILES:
        filepath = os.path.join(BATCHES_DIR, batch_file)
        if not os.path.exists(filepath):
            print(f"\nSKIP {batch_file} — not found")
            continue

        size_kb = os.path.getsize(filepath) / 1024
        print(f"\n{'='*60}")
        print(f"Processing {batch_file} ({size_kb:.1f} KB)...")
        start = time.time()

        with open(filepath, "r", encoding="utf-8") as f:
            sql = f.read()

        places = parse_insert_sql(sql)
        print(f"  Parsed {len(places)} rows")

        if not places:
            print("  No INSERT rows found, skipping")
            continue

        inserted = post_places(places)
        elapsed = time.time() - start
        grand_total += inserted
        print(f"  Inserted {inserted}/{len(places)} in {elapsed:.1f}s")

    # Final count
    print(f"\n{'='*60}")
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/places?select=category,count",
        headers={
            "apikey": SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
            "Prefer": "count=exact",
        },
    )
    # Get count per category using a different approach
    req2 = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/places?select=category",
        headers={
            "apikey": SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
            "Prefer": "count=exact",
        },
    )
    try:
        resp = urllib.request.urlopen(req2)
        count_header = resp.headers.get("content-range", "")
        body = json.loads(resp.read().decode())
        # Count by category
        cats = {}
        for row in body:
            c = row["category"]
            cats[c] = cats.get(c, 0) + 1
        
        print(f"\nPlaces by category ({count_header}):")
        for cat in sorted(cats, key=cats.get, reverse=True):
            print(f"  {cat:<20} {cats[cat]:>6}")
        print(f"  {'TOTAL':<20} {sum(cats.values()):>6}")
    except Exception as e:
        print(f"Count check: {e}")

    total_elapsed = time.time() - total_start
    print(f"\nDone! {grand_total} total rows inserted in {total_elapsed:.1f}s")


if __name__ == "__main__":
    main()
