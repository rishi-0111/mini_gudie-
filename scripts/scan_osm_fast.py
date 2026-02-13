"""
Fast scan of India OSM PBF — only check relevant tags without dict creation.
"""

import osmium
from collections import Counter
import time

PBF = r"c:\Users\hp\Downloads\india-260211.osm.pbf"

class FastPOIScanner(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.amenity = Counter()
        self.tourism = Counter()
        self.railway = Counter()
        self.emergency = Counter()
        self.healthcare = Counter()
        self.metro_stations = []
        self.police_stations = 0
        self.fire_stations = 0
        self.pharmacies = 0
        self.atms = 0
        self.n = 0
    
    def node(self, n):
        self.n += 1
        tags = n.tags
        
        # Quick check — skip nodes with no tags (vast majority)
        if len(tags) == 0:
            return
        
        a = tags.get("amenity")
        if a:
            self.amenity[a] += 1
            if a == "police":
                self.police_stations += 1
            elif a == "fire_station":
                self.fire_stations += 1
            elif a == "pharmacy":
                self.pharmacies += 1
            elif a == "atm":
                self.atms += 1
        
        t = tags.get("tourism")
        if t:
            self.tourism[t] += 1
        
        r = tags.get("railway")
        if r:
            self.railway[r] += 1
            # Collect metro/subway stations
            if r in ("station", "halt"):
                st = tags.get("station")
                if st in ("subway", "light_rail"):
                    name = tags.get("name", tags.get("name:en", "?"))
                    city = tags.get("addr:city", "")
                    lat = n.location.lat
                    lon = n.location.lon
                    self.metro_stations.append((name, city, lat, lon, st))
        
        e = tags.get("emergency")
        if e:
            self.emergency[e] += 1
        
        h = tags.get("healthcare")
        if h:
            self.healthcare[h] += 1

scanner = FastPOIScanner()
print(f"Scanning {PBF}...")
t0 = time.time()
scanner.apply_file(PBF)
elapsed = time.time() - t0
print(f"Done in {elapsed:.0f}s — {scanner.n:,} nodes")

print(f"\n=== AMENITY (top 30) ===")
for tag, count in scanner.amenity.most_common(30):
    print(f"  {tag:30s} {count:>8,}")

print(f"\n=== TOURISM ===")
for tag, count in scanner.tourism.most_common():
    print(f"  {tag:30s} {count:>8,}")

print(f"\n=== RAILWAY ===")
for tag, count in scanner.railway.most_common():
    print(f"  {tag:30s} {count:>8,}")

print(f"\n=== EMERGENCY ===")
for tag, count in scanner.emergency.most_common():
    print(f"  {tag:30s} {count:>8,}")

print(f"\n=== HEALTHCARE ===")
for tag, count in scanner.healthcare.most_common():
    print(f"  {tag:30s} {count:>8,}")

print(f"\n=== KEY COUNTS ===")
print(f"  Police stations: {scanner.police_stations:,}")
print(f"  Fire stations:   {scanner.fire_stations:,}")
print(f"  Pharmacies:      {scanner.pharmacies:,}")
print(f"  ATMs:            {scanner.atms:,}")

print(f"\n=== METRO/SUBWAY STATIONS ({len(scanner.metro_stations)}) ===")
for name, city, lat, lon, stype in sorted(scanner.metro_stations, key=lambda x: x[0]):
    print(f"  {name:40s} {city:20s} {lat:10.6f} {lon:10.6f} ({stype})")
