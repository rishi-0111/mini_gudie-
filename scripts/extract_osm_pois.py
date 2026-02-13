"""
Extract POIs from India OSM PBF → multiple seed SQL files.
Extracts: metro stations, police, fire, pharmacies, tourist attractions, viewpoints, museums.

Processes 252M nodes in ~12 minutes.
"""

import osmium
import time
import math

PBF = r"c:\Users\hp\Downloads\india-260211.osm.pbf"

# ── Output paths ───────────────────────────────────────────
OUT_DIR = r"D:\miniguide\supabase"
OUT_METRO = f"{OUT_DIR}\\seed_osm_metro.sql"
OUT_POLICE = f"{OUT_DIR}\\seed_osm_police.sql"
OUT_FIRE = f"{OUT_DIR}\\seed_osm_fire.sql"
OUT_PHARMACY = f"{OUT_DIR}\\seed_osm_pharmacy.sql"
OUT_TOURIST = f"{OUT_DIR}\\seed_osm_tourist.sql"
OUT_RAILWAY = f"{OUT_DIR}\\seed_osm_railway.sql"

# ── City detection via bounding boxes ──────────────────────
CITY_BOXES = {
    "Delhi": (28.40, 77.00, 28.85, 77.35),
    "Mumbai": (18.85, 72.75, 19.30, 73.00),
    "Bangalore": (12.80, 77.45, 13.15, 77.80),
    "Chennai": (12.85, 80.10, 13.25, 80.35),
    "Hyderabad": (17.25, 78.30, 17.55, 78.60),
    "Kolkata": (22.40, 88.25, 22.70, 88.45),
    "Pune": (18.40, 73.75, 18.65, 73.95),
    "Ahmedabad": (22.95, 72.48, 23.10, 72.68),
    "Jaipur": (26.80, 75.70, 27.00, 75.90),
    "Lucknow": (26.75, 80.85, 26.95, 81.05),
    "Kochi": (9.90, 76.20, 10.10, 76.40),
    "Nagpur": (21.05, 79.00, 21.20, 79.15),
    "Bhopal": (23.15, 77.35, 23.35, 77.50),
    "Indore": (22.65, 75.75, 22.85, 75.95),
    "Surat": (21.10, 72.75, 21.25, 72.90),
    "Patna": (25.55, 85.05, 25.65, 85.25),
    "Agra": (27.10, 78.00, 27.25, 78.10),
    "Kanpur": (26.40, 80.25, 26.55, 80.45),
    "Noida": (28.50, 77.28, 28.65, 77.45),
    "Gurugram": (28.40, 76.95, 28.55, 77.10),
    "Thane": (19.15, 72.93, 19.28, 73.05),
    "Navi Mumbai": (18.95, 73.00, 19.12, 73.10),
    "Coimbatore": (10.95, 76.90, 11.05, 77.05),
    "Visakhapatnam": (17.65, 83.20, 17.80, 83.40),
    "Varanasi": (25.25, 82.95, 25.40, 83.10),
}

def detect_city(lat, lon):
    for city, (lat1, lon1, lat2, lon2) in CITY_BOXES.items():
        if lat1 <= lat <= lat2 and lon1 <= lon <= lon2:
            return city
    return ""


class POIExtractor(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.metro_stations = []
        self.police_stations = []
        self.fire_stations = []
        self.pharmacies = []
        self.tourist_pois = []
        self.railway_stations = []
        self.n = 0

    def node(self, n):
        self.n += 1
        tags = n.tags
        if len(tags) == 0:
            return

        try:
            lat = n.location.lat
            lon = n.location.lon
        except:
            return

        # India bounds check
        if not (6.5 < lat < 37.5 and 68.0 < lon < 97.5):
            return

        name = tags.get("name", tags.get("name:en", ""))

        # ── Metro/Subway stations ─────────────────────────
        r = tags.get("railway")
        if r in ("station", "halt"):
            station_type = tags.get("station", "")
            if station_type in ("subway", "light_rail"):
                if name:
                    city = tags.get("addr:city", detect_city(lat, lon))
                    line = tags.get("line", tags.get("colour", ""))
                    operator = tags.get("operator", tags.get("network", ""))
                    self.metro_stations.append({
                        "name": name, "lat": lat, "lon": lon,
                        "city": city, "line": line, "operator": operator,
                        "type": station_type,
                    })

        # ── Major railway stations ────────────────────────
        if r == "station" and tags.get("station") not in ("subway", "light_rail", "monorail"):
            if name and tags.get("usage") != "tourism":
                trains = tags.get("trains", "")
                operator = tags.get("operator", "Indian Railways")
                self.railway_stations.append({
                    "name": name, "lat": lat, "lon": lon,
                    "city": detect_city(lat, lon),
                    "operator": operator,
                })

        # ── Police stations ───────────────────────────────
        a = tags.get("amenity")
        if a == "police":
            if not name:
                name = "Police Station"
            city = detect_city(lat, lon)
            self.police_stations.append({
                "name": name, "lat": lat, "lon": lon, "city": city,
            })

        # ── Fire stations ─────────────────────────────────
        if a == "fire_station":
            if not name:
                name = "Fire Station"
            city = detect_city(lat, lon)
            self.fire_stations.append({
                "name": name, "lat": lat, "lon": lon, "city": city,
            })

        # ── Pharmacies (top cities only to keep manageable) ──
        if a == "pharmacy" and name:
            city = detect_city(lat, lon)
            if city:  # Only metro pharmacies
                self.pharmacies.append({
                    "name": name, "lat": lat, "lon": lon, "city": city,
                })

        # ── Tourist attractions ───────────────────────────
        t = tags.get("tourism")
        if t in ("attraction", "museum", "viewpoint", "zoo", "theme_park", "artwork"):
            if name:
                city = detect_city(lat, lon)
                desc = tags.get("description", "")
                wiki = tags.get("wikipedia", tags.get("wikidata", ""))
                self.tourist_pois.append({
                    "name": name, "lat": lat, "lon": lon,
                    "city": city, "type": t, "desc": desc, "wiki": wiki,
                })


# ── Run extraction ─────────────────────────────────────────
ext = POIExtractor()
print(f"Extracting POIs from {PBF}...")
t0 = time.time()
ext.apply_file(PBF)
elapsed = time.time() - t0
print(f"Done in {elapsed:.0f}s - {ext.n:,} nodes")
print(f"  Metro stations:   {len(ext.metro_stations):,}")
print(f"  Railway stations: {len(ext.railway_stations):,}")
print(f"  Police stations:  {len(ext.police_stations):,}")
print(f"  Fire stations:    {len(ext.fire_stations):,}")
print(f"  Pharmacies:       {len(ext.pharmacies):,}")
print(f"  Tourist POIs:     {len(ext.tourist_pois):,}")


# ── SQL generation helpers ─────────────────────────────────
def esc(s):
    if not s:
        return ""
    return str(s).replace("'", "''").strip()[:500]


def write_sql(filepath, header, items, row_fn):
    """Write SQL INSERT with values generated by row_fn for each item."""
    lines = [header, "",
             "INSERT INTO places (name, description, latitude, longitude, place_category, address, rating, image_url, metadata)",
             "VALUES"]
    values = []
    for item in items:
        val = row_fn(item)
        if val:
            values.append(val)
    if not values:
        print(f"  WARNING: No values for {filepath}")
        return 0
    lines.append(",\n".join(values) + ";")
    sql = "\n".join(lines)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(sql)
    print(f"  -> {filepath}: {len(values)} entries, {len(sql):,} bytes")
    return len(values)


# ── 1. METRO STATIONS ─────────────────────────────────────
# Deduplicate by name+city (many entrances map to same station)
seen_metro = set()
unique_metro = []
for m in ext.metro_stations:
    key = (m["name"].strip().lower(), m["city"])
    if key not in seen_metro:
        seen_metro.add(key)
        unique_metro.append(m)

print(f"\n=== METRO: {len(unique_metro)} unique stations ===")
# Show city breakdown
from collections import Counter
metro_cities = Counter(m["city"] for m in unique_metro)
for city, cnt in metro_cities.most_common(20):
    print(f"  {city or 'Unknown':20s} {cnt}")

def metro_row(m):
    name = esc(m["name"])
    city = esc(m["city"])
    operator = esc(m["operator"])
    line = esc(m["line"])
    desc = f"Metro station in {city or 'India'}. {f'Line: {line}. ' if line else ''}{f'Operator: {operator}.' if operator else ''}"
    addr = city if city else "India"
    img = "https://images.unsplash.com/photo-1565017778429-4bbb1a648cbc?w=800"
    meta = f'{{"source":"osm-india","type":"metro_station","city":"{city}","operator":"{operator}","line":"{line}"}}'
    return f"  ('{name}', '{esc(desc)}', {m['lat']:.6f}, {m['lon']:.6f}, 'hospital', '{esc(addr)}', 4.0, '{img}', '{meta}'::jsonb)"

# Note: using 'hospital' as placeholder since enum doesn't have 'transport' yet
# These should be recategorized when enum is expanded

total = 0
total += write_sql(OUT_METRO,
    f"-- Metro/Subway stations from OpenStreetMap India\n-- {len(unique_metro)} unique stations from {PBF}",
    unique_metro, metro_row)


# ── 2. POLICE STATIONS ────────────────────────────────────
print(f"\n=== POLICE: {len(ext.police_stations)} stations ===")

def police_row(p):
    name = esc(p["name"])
    city = esc(p["city"])
    desc = f"Police station{f' in {city}' if city else ''}. Emergency services: dial 100."
    addr = city if city else "India"
    img = "https://images.unsplash.com/photo-1589578228447-e1a4e481c6c8?w=800"
    meta = f'{{"source":"osm-india","type":"police_station","city":"{city}"}}'
    return f"  ('{name}', '{esc(desc)}', {p['lat']:.6f}, {p['lon']:.6f}, 'emergency', '{esc(addr)}', 3.5, '{img}', '{meta}'::jsonb)"

total += write_sql(OUT_POLICE,
    f"-- Police stations from OpenStreetMap India\n-- {len(ext.police_stations)} stations",
    ext.police_stations, police_row)


# ── 3. FIRE STATIONS ──────────────────────────────────────
print(f"\n=== FIRE: {len(ext.fire_stations)} stations ===")

def fire_row(f_item):
    name = esc(f_item["name"])
    city = esc(f_item["city"])
    desc = f"Fire station{f' in {city}' if city else ''}. Emergency services: dial 101."
    addr = city if city else "India"
    img = "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800"
    meta = f'{{"source":"osm-india","type":"fire_station","city":"{city}"}}'
    return f"  ('{name}', '{esc(desc)}', {f_item['lat']:.6f}, {f_item['lon']:.6f}, 'emergency', '{esc(addr)}', 3.5, '{img}', '{meta}'::jsonb)"

total += write_sql(OUT_FIRE,
    f"-- Fire stations from OpenStreetMap India\n-- {len(ext.fire_stations)} stations",
    ext.fire_stations, fire_row)


# ── 4. PHARMACIES (metro cities only) ─────────────────────
print(f"\n=== PHARMACIES: {len(ext.pharmacies)} (metro cities) ===")
# Cap per city: top 10
pharma_by_city = {}
for p in ext.pharmacies:
    c = p["city"]
    if c not in pharma_by_city:
        pharma_by_city[c] = []
    pharma_by_city[c].append(p)

capped_pharma = []
for city, items in pharma_by_city.items():
    capped_pharma.extend(items[:10])
print(f"  After cap (10/city): {len(capped_pharma)}")

def pharma_row(p):
    name = esc(p["name"])
    city = esc(p["city"])
    desc = f"Pharmacy in {city}. Medical supplies and prescriptions available."
    img = "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=800"
    meta = f'{{"source":"osm-india","type":"pharmacy","city":"{city}"}}'
    return f"  ('{name}', '{esc(desc)}', {p['lat']:.6f}, {p['lon']:.6f}, 'emergency', '{esc(city)}', 3.8, '{img}', '{meta}'::jsonb)"

total += write_sql(OUT_PHARMACY,
    f"-- Pharmacies from OpenStreetMap India (metro cities)\n-- {len(capped_pharma)} entries",
    capped_pharma, pharma_row)


# ── 5. TOURIST ATTRACTIONS ────────────────────────────────
print(f"\n=== TOURIST: {len(ext.tourist_pois)} POIs ===")
type_counts = Counter(t["type"] for t in ext.tourist_pois)
for t, c in type_counts.most_common():
    print(f"  {t:20s} {c}")

TYPE_IMAGES = {
    "attraction": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800",
    "museum": "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800",
    "viewpoint": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
    "zoo": "https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=800",
    "theme_park": "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800",
    "artwork": "https://images.unsplash.com/photo-1561839663-28dbb0f85f14?w=800",
}

def tourist_row(t):
    name = esc(t["name"])
    city = esc(t["city"])
    ttype = t["type"]
    wiki = esc(t["wiki"])
    extra_desc = esc(t["desc"])
    label = ttype.replace("_", " ").title()
    desc = f"{label}{f' in {city}' if city else ''}. {extra_desc}"
    addr = city if city else "India"
    img = TYPE_IMAGES.get(ttype, TYPE_IMAGES["attraction"])
    meta = f'{{"source":"osm-india","type":"{ttype}","city":"{city}","wikipedia":"{wiki}"}}'
    return f"  ('{name}', '{esc(desc)}', {t['lat']:.6f}, {t['lon']:.6f}, 'hidden_spot', '{esc(addr)}', 4.2, '{img}', '{meta}'::jsonb)"

total += write_sql(OUT_TOURIST,
    f"-- Tourist POIs from OpenStreetMap India\n-- {len(ext.tourist_pois)} attractions, museums, viewpoints",
    ext.tourist_pois, tourist_row)


# ── 6. RAILWAY STATIONS (top 200 by city presence) ────────
print(f"\n=== RAILWAY: {len(ext.railway_stations)} stations ===")
# Keep only named ones in/near cities, cap per city
rwy_with_city = [r for r in ext.railway_stations if r["city"]]
rwy_by_city = {}
for r in rwy_with_city:
    c = r["city"]
    if c not in rwy_by_city:
        rwy_by_city[c] = []
    rwy_by_city[c].append(r)

capped_rwy = []
for city, items in rwy_by_city.items():
    capped_rwy.extend(items[:5])
print(f"  In cities: {len(rwy_with_city)}, after cap (5/city): {len(capped_rwy)}")

def railway_row(r):
    name = esc(r["name"])
    city = esc(r["city"])
    operator = esc(r["operator"])
    desc = f"Railway station in {city}. {f'Operated by {operator}.' if operator else ''}"
    img = "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=800"
    meta = f'{{"source":"osm-india","type":"railway_station","city":"{city}","operator":"{operator}"}}'
    return f"  ('{name}', '{esc(desc)}', {r['lat']:.6f}, {r['lon']:.6f}, 'hidden_spot', '{esc(city)}', 3.8, '{img}', '{meta}'::jsonb)"

total += write_sql(OUT_RAILWAY,
    f"-- Railway stations from OpenStreetMap India (major cities)\n-- {len(capped_rwy)} stations",
    capped_rwy, railway_row)

print(f"\n{'='*60}")
print(f"TOTAL: {total} place entries across 6 seed files")
