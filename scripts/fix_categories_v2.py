"""
Fix categories in the 'correct' seed files that use wrong generic categories.
"""
import os

SUPABASE_DIR = r"d:\miniguide\supabase"

# Per-file replacements: (filename, find_str, replace_str)
# We use the full pattern to avoid accidental replacements in descriptions
FIXES = [
    # Bus routes/prices: hidden_spot → bus_route
    ("seed_bus_prices.sql", ", 'hidden_spot',", ", 'bus_route',"),
    ("seed_bus_routes.sql", ", 'hidden_spot',", ", 'bus_route',"),
    # Destinations: hidden_spot → destination
    ("seed_destinations.sql", ", 'hidden_spot',", ", 'destination',"),
    # Hotels: hostel → hotel
    ("seed_hotels.sql", ", 'hostel',", ", 'hotel',"),
    # Restaurants: hidden_spot → restaurant
    ("seed_restaurants.sql", ", 'hidden_spot',", ", 'restaurant',"),
    # Transport services: hidden_spot → transport
    ("seed_rapido.sql", ", 'hidden_spot',", ", 'transport',"),
    ("seed_transport.sql", ", 'hidden_spot',", ", 'transport',"),
    # Landmarks: hidden_spot → landmark  (some are temple, keep those)
    ("seed_landmarks.sql", ", 'hidden_spot',", ", 'landmark',"),
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
        print(f"  {filename:<35} {old.strip(', '):<16} → {new.strip(', '):<16} ({count}x)")


if __name__ == "__main__":
    main()
