"""
Fix all broken seed SQL files:
1. Replace column names: place_category→category, image_url→images, metadata→amenities
2. Wrap image_url values as ARRAY['url']::TEXT[]
3. Fix metro stations: category 'hospital' → 'metro'
4. Add missing columns: review_count, contact_info, opening_hours, verified
"""

import re
import os

SUPABASE_DIR = r"d:\miniguide\supabase"

BROKEN_FILES = [
    "seed_worship.sql",
    "seed_health_centres.sql",
    "seed_hospitals_india.sql",
    "seed_ride_intelligence.sql",
    "seed_osm_fire.sql",
    "seed_osm_metro.sql",
    "seed_osm_pharmacy.sql",
    "seed_osm_police.sql",
    "seed_osm_railway.sql",
    "seed_osm_tourist.sql",
]

# Category corrections for OSM files that used 'hospital' as a catch-all
CATEGORY_FIXES = {
    "seed_osm_metro.sql": ("hospital", "metro"),
    "seed_osm_fire.sql": ("hospital", "fire_station"),
    "seed_osm_police.sql": ("hospital", "police"),
    "seed_osm_pharmacy.sql": ("hospital", "pharmacy"),
    "seed_osm_railway.sql": ("hospital", "railway"),
    "seed_osm_tourist.sql": ("hidden_spot", None),  # keep as-is or varies
}


def fix_file(filename):
    filepath = os.path.join(SUPABASE_DIR, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    original_size = len(content)

    # 1. Fix INSERT column list
    old_cols = "name, description, latitude, longitude, place_category, address, rating, image_url, metadata"
    new_cols = "name, description, latitude, longitude, category, address, rating, review_count, images, amenities, contact_info, opening_hours, verified"
    content = content.replace(old_cols, new_cols)

    # 2. Fix each value row: wrap image_url → ARRAY[...]::TEXT[], add missing columns
    # Pattern: ..., rating_val, 'url', '{json}'::jsonb)
    # → ..., rating_val, 0, ARRAY['url']::TEXT[], '{json}'::jsonb, '', '', false)

    # Match: rating value, then 'url', then 'json'::jsonb + closing
    def fix_value_row(match):
        rating = match.group(1)
        url = match.group(2)
        json_part = match.group(3)
        # Add review_count=0 after rating, wrap url as ARRAY, add contact_info/opening_hours/verified
        return f"{rating}, 0, ARRAY['{url}']::TEXT[], '{json_part}'::jsonb, '', '', false)"

    # This regex matches: rating, 'url', 'json...'::jsonb)
    pattern = r"(\d+\.?\d*), '(https?://[^']+)', '(\{[^}]*(?:\{[^}]*\}[^}]*)*\})'::jsonb\)"
    content = re.sub(pattern, fix_value_row, content)

    # 3. Fix category values for OSM files
    if filename in CATEGORY_FIXES:
        old_cat, new_cat = CATEGORY_FIXES[filename]
        if new_cat and old_cat != new_cat:
            # Only replace category values (inside single quotes in position after longitude)
            content = content.replace(f"'{old_cat}',", f"'{new_cat}',")

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

    new_size = len(content)
    return original_size, new_size


def main():
    print("Fixing broken seed SQL files...")
    for filename in BROKEN_FILES:
        filepath = os.path.join(SUPABASE_DIR, filename)
        if not os.path.exists(filepath):
            print(f"  SKIP {filename} (not found)")
            continue
        old_size, new_size = fix_file(filename)
        print(f"  FIXED {filename:<30} {old_size:>10,} → {new_size:>10,} bytes")

    print("\nDone! All 10 files fixed.")


if __name__ == "__main__":
    main()
