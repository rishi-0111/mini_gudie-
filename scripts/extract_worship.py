"""
Extract places of worship from India OSM PBF → seed_worship.sql
Source: india-260211.osm.pbf (1.5GB, 252M nodes)
OSM scan found 36,631 amenity=place_of_worship nodes.

Strategy:
- Extract ALL named worship places with coordinates
- Classify by religion tag (hindu, muslim, christian, sikh, buddhist, jain)
- Keep top entries per city for manageable seed size
- Also extract from ways/relations for large temples/mosques/churches
"""

import osmium
import time
from collections import Counter

PBF = r"c:\Users\hp\Downloads\india-260211.osm.pbf"
OUT = r"D:\miniguide\supabase\seed_worship.sql"

# ── City bounding boxes ────────────────────────────────────
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
    "Varanasi": (25.25, 82.95, 25.40, 83.10),
    "Amritsar": (31.60, 74.83, 31.68, 74.90),
    "Agra": (27.10, 78.00, 27.25, 78.10),
    "Madurai": (9.88, 78.08, 9.95, 78.15),
    "Tirupati": (13.60, 79.38, 13.68, 79.45),
    "Haridwar": (29.93, 78.12, 29.98, 78.19),
    "Rishikesh": (30.06, 78.25, 30.12, 78.34),
    "Ujjain": (23.15, 75.74, 23.22, 75.82),
    "Puri": (19.78, 85.80, 19.84, 85.87),
    "Dwarka": (22.22, 68.94, 22.26, 69.00),
    "Bodh Gaya": (24.68, 84.98, 24.72, 85.02),
    "Mysore": (12.28, 76.60, 12.35, 76.68),
    "Thanjavur": (10.76, 79.12, 10.82, 79.18),
    "Rameshwaram": (9.27, 79.29, 9.30, 79.33),
    "Shirdi": (19.76, 74.46, 19.78, 74.48),
    "Pushkar": (26.48, 74.54, 26.52, 74.57),
    "Mathura": (27.48, 77.67, 27.52, 77.70),
    "Vrindavan": (27.55, 77.68, 27.60, 77.72),
    "Coimbatore": (10.95, 76.90, 11.05, 77.05),
    "Visakhapatnam": (17.65, 83.20, 17.80, 83.40),
    "Surat": (21.10, 72.75, 21.25, 72.90),
    "Indore": (22.65, 75.75, 22.85, 75.95),
    "Patna": (25.55, 85.05, 25.65, 85.25),
    "Goa": (15.35, 73.85, 15.65, 74.05),
    "Jodhpur": (26.26, 73.00, 26.35, 73.05),
    "Udaipur": (24.55, 73.65, 24.62, 73.73),
}

def detect_city(lat, lon):
    for city, (lat1, lon1, lat2, lon2) in CITY_BOXES.items():
        if lat1 <= lat <= lat2 and lon1 <= lon <= lon2:
            return city
    return ""

# ── Religion → label + image ──────────────────────────────
RELIGION_INFO = {
    "hindu": {
        "label": "Hindu Temple",
        "img": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800",
    },
    "muslim": {
        "label": "Mosque",
        "img": "https://images.unsplash.com/photo-1585036156171-384164a8c312?w=800",
    },
    "christian": {
        "label": "Church",
        "img": "https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=800",
    },
    "sikh": {
        "label": "Gurudwara",
        "img": "https://images.unsplash.com/photo-1609947017136-9dab1fbb64e0?w=800",
    },
    "buddhist": {
        "label": "Buddhist Temple",
        "img": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800",
    },
    "jain": {
        "label": "Jain Temple",
        "img": "https://images.unsplash.com/photo-1590077428593-a55bb07c4665?w=800",
    },
    "jewish": {
        "label": "Synagogue",
        "img": "https://images.unsplash.com/photo-1584912510096-b4b39a39db79?w=800",
    },
    "": {
        "label": "Place of Worship",
        "img": "https://images.unsplash.com/photo-1548013146-72479768bada?w=800",
    },
}


class WorshipExtractor(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.places = []
        self.n = 0

    def node(self, n):
        self.n += 1
        tags = n.tags
        if len(tags) == 0:
            return

        if tags.get("amenity") != "place_of_worship":
            return

        try:
            lat = n.location.lat
            lon = n.location.lon
        except:
            return

        # India bounds
        if not (6.5 < lat < 37.5 and 68.0 < lon < 97.5):
            return

        name = tags.get("name", "")
        name_en = tags.get("name:en", "")
        if not name and not name_en:
            return  # Skip unnamed

        religion = tags.get("religion", "").lower()
        denomination = tags.get("denomination", "")
        wikidata = tags.get("wikidata", "")
        wikipedia = tags.get("wikipedia", "")
        heritage = tags.get("heritage", "")
        tourism = tags.get("tourism", "")
        historic = tags.get("historic", "")
        opening_hours = tags.get("opening_hours", "")
        phone = tags.get("phone", tags.get("contact:phone", ""))
        website = tags.get("website", tags.get("contact:website", ""))
        addr_city = tags.get("addr:city", "")

        city = addr_city or detect_city(lat, lon)

        # Importance score: wikidata/wikipedia presence, heritage, tourism tag
        importance = 0
        if wikidata: importance += 3
        if wikipedia: importance += 3
        if heritage: importance += 5
        if tourism: importance += 2
        if historic: importance += 2
        if name_en: importance += 1  # English name = more notable

        self.places.append({
            "name": name_en if name_en else name,
            "name_local": name if name_en and name != name_en else "",
            "lat": lat,
            "lon": lon,
            "religion": religion,
            "denomination": denomination,
            "city": city,
            "wikidata": wikidata,
            "wikipedia": wikipedia,
            "heritage": heritage,
            "opening_hours": opening_hours,
            "phone": phone,
            "website": website,
            "importance": importance,
        })


# ── Extract ────────────────────────────────────────────────
ext = WorshipExtractor()
print(f"Extracting worship places from {PBF}...")
t0 = time.time()
ext.apply_file(PBF)
elapsed = time.time() - t0
print(f"Done in {elapsed:.0f}s — {ext.n:,} nodes scanned, {len(ext.places):,} named worship places found")

# ── Religion breakdown ─────────────────────────────────────
religions = Counter(p["religion"] for p in ext.places)
print(f"\nReligion breakdown:")
for r, c in religions.most_common(15):
    print(f"  {r or '(unknown)':20s} {c:>6,}")

# ── City breakdown ─────────────────────────────────────────
cities = Counter(p["city"] for p in ext.places)
print(f"\nCity breakdown (top 25):")
for c, cnt in cities.most_common(25):
    print(f"  {c or '(rural/unknown)':20s} {cnt:>6,}")

# ── Importance breakdown ───────────────────────────────────
notable = [p for p in ext.places if p["importance"] >= 3]
print(f"\nNotable places (importance >= 3): {len(notable)}")
heritage_count = sum(1 for p in ext.places if p["heritage"])
wiki_count = sum(1 for p in ext.places if p["wikidata"] or p["wikipedia"])
print(f"  With heritage tag: {heritage_count}")
print(f"  With wikidata/wikipedia: {wiki_count}")

# ── Selection strategy ─────────────────────────────────────
# 1. ALL notable places (importance >= 3) — these have Wikipedia/heritage/tourism tags
# 2. Top by city to fill geographic gaps — max 5 per city for non-notable
# 3. For rural/unknown: skip unless notable

selected = []

# Add all notable
notable_set = set()
for p in sorted(ext.places, key=lambda x: -x["importance"]):
    if p["importance"] >= 3:
        key = (p["name"], round(p["lat"], 4), round(p["lon"], 4))
        if key not in notable_set:
            notable_set.add(key)
            selected.append(p)

print(f"\nSelected notable: {len(selected)}")

# Add city fill (non-notable, max 5/city for cities only)
city_counts = Counter()
for p in sorted(ext.places, key=lambda x: -x["importance"]):
    if p["importance"] < 3 and p["city"]:
        if city_counts[p["city"]] < 5:
            key = (p["name"], round(p["lat"], 4), round(p["lon"], 4))
            if key not in notable_set:
                notable_set.add(key)
                selected.append(p)
                city_counts[p["city"]] += 1

print(f"After city fill: {len(selected)}")
print(f"Cities covered: {len(set(p['city'] for p in selected if p['city']))}")

# ── Stats ──────────────────────────────────────────────────
sel_religions = Counter(p["religion"] for p in selected)
print(f"\nSelected religion breakdown:")
for r, c in sel_religions.most_common(10):
    print(f"  {r or '(unknown)':20s} {c:>5}")

# ── Generate SQL ───────────────────────────────────────────
def esc(s):
    if not s:
        return ""
    return str(s).replace("'", "''").strip()[:500]

lines = []
lines.append(f"-- Places of Worship from OpenStreetMap India")
lines.append(f"-- Source: india-260211.osm.pbf ({len(ext.places):,} named → {len(selected)} selected)")
lines.append(f"-- {len(set(p['city'] for p in selected if p['city']))} cities, {len(sel_religions)} religions")
lines.append("")
lines.append("INSERT INTO places (name, description, latitude, longitude, place_category, address, rating, image_url, metadata)")
lines.append("VALUES")

values = []
for p in selected:
    religion = p["religion"]
    info = RELIGION_INFO.get(religion, RELIGION_INFO[""])
    label = info["label"]
    img = info["img"]

    name = esc(p["name"])
    local_name = esc(p["name_local"])
    city = esc(p["city"])
    denom = esc(p["denomination"])

    name_display = name
    if local_name and local_name != name:
        name_display = f"{name} ({local_name})"

    desc_parts = [f"{label}"]
    if city:
        desc_parts.append(f"in {city}")
    if denom:
        desc_parts.append(f"({denom})")
    desc_parts.append(".")
    if p["heritage"]:
        desc_parts.append(f"Heritage status: {esc(p['heritage'])}.")
    if p["opening_hours"]:
        desc_parts.append(f"Hours: {esc(p['opening_hours'])}.")
    if p["wikipedia"]:
        desc_parts.append(f"Wikipedia: {esc(p['wikipedia'])}.")
    desc = " ".join(desc_parts)

    addr = city if city else "India"
    rating = 4.5 if p["importance"] >= 5 else 4.2 if p["importance"] >= 3 else 4.0

    meta = (
        f'{{"source":"osm-india",'
        f'"type":"place_of_worship",'
        f'"religion":"{esc(religion)}",'
        f'"denomination":"{denom}",'
        f'"city":"{city}",'
        f'"wikidata":"{esc(p["wikidata"])}",'
        f'"wikipedia":"{esc(p["wikipedia"])}",'
        f'"heritage":"{esc(p["heritage"])}",'
        f'"opening_hours":"{esc(p["opening_hours"])}",'
        f'"phone":"{esc(p["phone"])}",'
        f'"website":"{esc(p["website"])}",'
        f'"importance":{p["importance"]}}}'
    )

    values.append(
        f"  ('{esc(name_display)}', '{esc(desc)}', {p['lat']:.6f}, {p['lon']:.6f}, "
        f"'temple', '{esc(addr)}', {rating}, '{img}', '{meta}'::jsonb)"
    )

lines.append(",\n".join(values) + ";")

sql = "\n".join(lines)
with open(OUT, "w", encoding="utf-8") as f:
    f.write(sql)

print(f"\n✅ Written {len(values)} worship places to {OUT}")
print(f"   File size: {len(sql):,} bytes")
