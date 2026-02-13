"""
Fix category values in seed files to use proper categories.
The column names are already fixed, but many files use generic
'emergency' or 'hidden_spot' when they should use specific categories.
"""

import os

SUPABASE_DIR = r"d:\miniguide\supabase"

# (filename, old_category, new_category)
FIXES = [
    ("seed_osm_fire.sql", "'emergency'", "'fire_station'"),
    ("seed_osm_pharmacy.sql", "'emergency'", "'pharmacy'"),
    ("seed_osm_police.sql", "'emergency'", "'police'"),
    ("seed_osm_railway.sql", "'hidden_spot'", "'railway'"),
    ("seed_osm_tourist.sql", "'hidden_spot'", "'tourist'"),
    ("seed_ride_intelligence.sql", "'hidden_spot'", "'transport'"),
    # Health centres: fix both 'hospital' and 'emergency' to 'health_centre'
    ("seed_health_centres.sql", "'hospital'", "'health_centre'"),
    ("seed_health_centres.sql", "'emergency'", "'health_centre'"),
]


def main():
    for filename, old, new in FIXES:
        path = os.path.join(SUPABASE_DIR, filename)
        if not os.path.exists(path):
            print(f"  SKIP {filename}")
            continue
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        count = content.count(old)
        content = content.replace(old, new)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  {filename:<35} replaced {old:<16} → {new:<16} ({count}x)")


if __name__ == "__main__":
    main()
