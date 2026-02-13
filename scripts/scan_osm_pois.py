"""
Scan India OSM PBF for POI categories relevant to miniguide app.
Counts amenity/tourism/railway/shop tags to find extractable data.
"""

import osmium
from collections import Counter

PBF = r"c:\Users\hp\Downloads\india-260211.osm.pbf"

class POIScanner(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.amenity = Counter()
        self.tourism = Counter()
        self.railway = Counter()
        self.shop = Counter()
        self.emergency = Counter()
        self.healthcare = Counter()
        self.station_names = []  # collect metro/subway station names
        self.total_nodes = 0
    
    def node(self, n):
        self.total_nodes += 1
        tags = {t.k: t.v for t in n.tags}
        
        if "amenity" in tags:
            self.amenity[tags["amenity"]] += 1
        if "tourism" in tags:
            self.tourism[tags["tourism"]] += 1
        if "railway" in tags:
            self.railway[tags["railway"]] += 1
        if "shop" in tags:
            self.shop[tags["shop"]] += 1
        if "emergency" in tags:
            self.emergency[tags["emergency"]] += 1
        if "healthcare" in tags:
            self.healthcare[tags["healthcare"]] += 1
        
        # Collect metro/subway stations
        if tags.get("railway") in ("station", "halt") and tags.get("station") in ("subway", "light_rail"):
            name = tags.get("name", tags.get("name:en", "unnamed"))
            self.station_names.append(name)
        if tags.get("railway") == "subway_entrance":
            name = tags.get("name", tags.get("name:en", "unnamed"))
            self.station_names.append(f"[entrance] {name}")

scanner = POIScanner()
print(f"Scanning {PBF}...")
print("(This may take a few minutes for 1.5GB...)")
scanner.apply_file(PBF)

print(f"\nTotal nodes scanned: {scanner.total_nodes:,}")

print("\n=== AMENITY (top 30) ===")
for tag, count in scanner.amenity.most_common(30):
    print(f"  {tag:30s} {count:>8,}")

print("\n=== TOURISM (all) ===")
for tag, count in scanner.tourism.most_common():
    print(f"  {tag:30s} {count:>8,}")

print("\n=== RAILWAY (all) ===")
for tag, count in scanner.railway.most_common():
    print(f"  {tag:30s} {count:>8,}")

print("\n=== EMERGENCY (all) ===")
for tag, count in scanner.emergency.most_common():
    print(f"  {tag:30s} {count:>8,}")

print("\n=== HEALTHCARE (all) ===")
for tag, count in scanner.healthcare.most_common():
    print(f"  {tag:30s} {count:>8,}")

print("\n=== SHOP (top 15) ===")
for tag, count in scanner.shop.most_common(15):
    print(f"  {tag:30s} {count:>8,}")

print(f"\n=== METRO/SUBWAY STATIONS ({len(scanner.station_names)}) ===")
for name in sorted(set(scanner.station_names))[:50]:
    print(f"  {name}")
