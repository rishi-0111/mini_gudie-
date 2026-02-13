"""
Split the combined seed SQL into batches small enough for Supabase SQL Editor.
Batch 1: Migration + small seeds (seed.sql through seed_ride_intelligence.sql)
Batch 2: OSM metro + police + fire + pharmacy
Batch 3: OSM tourist + railway
Batch 4: Worship places
Batch 5: Hidden gems
"""

import os

SUPABASE_DIR = r"d:\miniguide\supabase"
OUT_DIR = os.path.join(SUPABASE_DIR, "batches")
os.makedirs(OUT_DIR, exist_ok=True)

ENUM_SQL = """-- Expand place_category enum (run this FIRST, in a SEPARATE query!)
ALTER TYPE place_category ADD VALUE IF NOT EXISTS 'hotel';
ALTER TYPE place_category ADD VALUE IF NOT EXISTS 'restaurant';
ALTER TYPE place_category ADD VALUE IF NOT EXISTS 'landmark';
ALTER TYPE place_category ADD VALUE IF NOT EXISTS 'destination';
ALTER TYPE place_category ADD VALUE IF NOT EXISTS 'bus_route';
ALTER TYPE place_category ADD VALUE IF NOT EXISTS 'transport';
ALTER TYPE place_category ADD VALUE IF NOT EXISTS 'tourist';
ALTER TYPE place_category ADD VALUE IF NOT EXISTS 'metro';
ALTER TYPE place_category ADD VALUE IF NOT EXISTS 'police';
ALTER TYPE place_category ADD VALUE IF NOT EXISTS 'fire_station';
ALTER TYPE place_category ADD VALUE IF NOT EXISTS 'pharmacy';
ALTER TYPE place_category ADD VALUE IF NOT EXISTS 'railway';
ALTER TYPE place_category ADD VALUE IF NOT EXISTS 'health_centre';
"""

BATCHES = {
    "batch_0_enum.sql": {
        "header": "-- Batch 0: Expand enum (MUST run first, separately!)\n",
        "files": [],
        "prefix": ENUM_SQL,
    },
    "batch_1_core.sql": {
        "header": "-- Batch 1: Core seed data (~700 rows)\n",
        "files": [
            "seed.sql", "seed_places.sql", "seed_temples.sql",
            "seed_hotels.sql", "seed_restaurants.sql", "seed_landmarks.sql",
            "seed_destinations.sql", "seed_transport.sql", "seed_rapido.sql",
            "seed_bus_routes.sql", "seed_bus_prices.sql",
        ],
    },
    "batch_2_kaggle.sql": {
        "header": "-- Batch 2: Kaggle datasets (~900 rows)\n",
        "files": [
            "seed_hospitals_india.sql", "seed_health_centres.sql",
            "seed_ride_intelligence.sql",
        ],
    },
    "batch_3_osm_infra.sql": {
        "header": "-- Batch 3: OSM infrastructure (~4,000 rows)\n",
        "files": [
            "seed_osm_metro.sql", "seed_osm_police.sql",
            "seed_osm_fire.sql", "seed_osm_pharmacy.sql",
            "seed_osm_railway.sql",
        ],
    },
    "batch_4_osm_tourist.sql": {
        "header": "-- Batch 4: OSM tourist attractions (~5,700 rows)\n",
        "files": ["seed_osm_tourist.sql"],
    },
    "batch_5_worship.sql": {
        "header": "-- Batch 5: Worship places (~3,800 rows)\n",
        "files": ["seed_worship.sql"],
    },
    "batch_6_hidden_gems.sql": {
        "header": "-- Batch 6: AI Hidden Gems (~500 rows)\n",
        "files": ["seed_hidden_gems.sql"],
    },
}


def main():
    for batch_name, config in BATCHES.items():
        parts = [config["header"]]
        if "prefix" in config:
            parts.append(config["prefix"])

        for filename in config.get("files", []):
            path = os.path.join(SUPABASE_DIR, filename)
            if not os.path.exists(path):
                continue
            with open(path, "r", encoding="utf-8") as f:
                content = f.read().strip()
            parts.append(f"\n-- {filename}\n")
            parts.append(content)
            parts.append("\n")

        out_path = os.path.join(OUT_DIR, batch_name)
        combined = "\n".join(parts)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(combined)

        size_kb = os.path.getsize(out_path) / 1024
        print(f"  {batch_name:<30} {size_kb:>8.0f} KB")

    print(f"\nAll batches saved to {OUT_DIR}/")
    print("\nExecution order in Supabase SQL Editor:")
    print("  1. batch_0_enum.sql        (run FIRST, then click Run again)")
    print("  2. batch_1_core.sql")
    print("  3. batch_2_kaggle.sql")
    print("  4. batch_3_osm_infra.sql")
    print("  5. batch_4_osm_tourist.sql")
    print("  6. batch_5_worship.sql")
    print("  7. batch_6_hidden_gems.sql")


if __name__ == "__main__":
    main()
