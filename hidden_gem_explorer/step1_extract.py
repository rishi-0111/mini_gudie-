"""
STEP 1 — Extract POIs from India OSM PBF
Extracts: tourism spots, temples, hotels, bus stops, metro stations
Uses pyosmium for speed (252M nodes in ~12 min) + osmnx for enrichment.
"""

import osmium
import pandas as pd
import numpy as np
import time
import os

PBF = r"c:\Users\hp\Downloads\india-260211.osm.pbf"
OUT_DIR = r"d:\miniguide\hidden_gem_explorer\data"
os.makedirs(OUT_DIR, exist_ok=True)

# ── Major Indian cities for distance calculations ──────────
MAJOR_CITIES = {
    "Delhi": (28.6139, 77.2090),
    "Mumbai": (19.0760, 72.8777),
    "Bangalore": (12.9716, 77.5946),
    "Chennai": (13.0827, 80.2707),
    "Hyderabad": (17.3850, 78.4867),
    "Kolkata": (22.5726, 88.3639),
    "Pune": (18.5204, 73.8567),
    "Ahmedabad": (23.0225, 72.5714),
    "Jaipur": (26.9124, 75.7873),
    "Lucknow": (26.8467, 80.9462),
    "Kochi": (9.9312, 76.2673),
    "Varanasi": (25.3176, 82.9739),
    "Agra": (27.1767, 78.0081),
    "Chandigarh": (30.7333, 76.7794),
    "Bhopal": (23.2599, 77.4126),
    "Goa": (15.4909, 73.8278),
    "Mysore": (12.2958, 76.6394),
    "Udaipur": (24.5854, 73.7125),
    "Jodhpur": (26.2389, 73.0243),
    "Amritsar": (31.6340, 74.8723),
    "Shimla": (31.1048, 77.1734),
    "Darjeeling": (27.0360, 88.2627),
    "Rishikesh": (30.0869, 78.2676),
    "Madurai": (9.9252, 78.1198),
    "Coimbatore": (11.0168, 76.9558),
    "Visakhapatnam": (17.6868, 83.2185),
    "Indore": (22.7196, 75.8577),
    "Nagpur": (21.1458, 79.0882),
    "Patna": (25.6093, 85.1376),
    "Surat": (21.1702, 72.8311),
}


class POIExtractor(osmium.SimpleHandler):
    """Extract all POI categories in a single pass."""

    def __init__(self):
        super().__init__()
        self.hidden_spots = []     # tourism viewpoint/attraction + natural water/peak/cave
        self.temples = []          # amenity=place_of_worship
        self.hotels = []           # tourism=hotel
        self.bus_stops = []        # highway=bus_stop
        self.metro_stations = []   # railway=station
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

        # India bounds
        if not (6.5 < lat < 37.5 and 68.0 < lon < 97.5):
            return

        name = tags.get("name", tags.get("name:en", ""))

        # ── 1. Hidden-Type Tourism + Natural Spots ────────
        tourism = tags.get("tourism", "")
        natural = tags.get("natural", "")

        if tourism in ("viewpoint", "attraction") or natural in ("water", "peak", "cave"):
            wikipedia = tags.get("wikipedia", "")
            wikidata = tags.get("wikidata", "")
            self.hidden_spots.append({
                "name": name or f"{tourism or natural} spot",
                "lat": lat, "lon": lon,
                "type": tourism or natural,
                "has_wikipedia": 1 if (wikipedia or wikidata) else 0,
                "wikipedia": wikipedia,
                "wikidata": wikidata,
            })

        # We also capture waterfall from the "waterway" tag
        waterway = tags.get("waterway", "")
        if waterway == "waterfall" or natural == "waterfall":
            wikipedia = tags.get("wikipedia", "")
            wikidata = tags.get("wikidata", "")
            self.hidden_spots.append({
                "name": name or "Waterfall",
                "lat": lat, "lon": lon,
                "type": "waterfall",
                "has_wikipedia": 1 if (wikipedia or wikidata) else 0,
                "wikipedia": wikipedia,
                "wikidata": wikidata,
            })

        # ── 2. Temples / Places of Worship ────────────────
        amenity = tags.get("amenity", "")
        if amenity == "place_of_worship":
            religion = tags.get("religion", "")
            wikipedia = tags.get("wikipedia", "")
            wikidata = tags.get("wikidata", "")
            self.temples.append({
                "name": name or "Temple",
                "lat": lat, "lon": lon,
                "religion": religion,
                "has_wikipedia": 1 if (wikipedia or wikidata) else 0,
                "wikipedia": wikipedia,
            })

        # ── 3. Hotels ─────────────────────────────────────
        if tourism == "hotel":
            stars = tags.get("stars", "")
            self.hotels.append({
                "name": name or "Hotel",
                "lat": lat, "lon": lon,
                "stars": stars,
            })

        # ── 4. Bus Stops ──────────────────────────────────
        highway = tags.get("highway", "")
        if highway == "bus_stop":
            self.bus_stops.append({
                "name": name or "Bus Stop",
                "lat": lat, "lon": lon,
            })

        # ── 5. Metro/Railway Stations ─────────────────────
        railway = tags.get("railway", "")
        if railway == "station":
            station_type = tags.get("station", "")
            self.metro_stations.append({
                "name": name or "Station",
                "lat": lat, "lon": lon,
                "station_type": station_type,
            })


def extract_all():
    ext = POIExtractor()
    print(f"Extracting POIs from {PBF}...")
    t0 = time.time()
    ext.apply_file(PBF)
    elapsed = time.time() - t0

    print(f"Done in {elapsed:.0f}s — {ext.n:,} nodes scanned")
    print(f"  Hidden spots:    {len(ext.hidden_spots):,}")
    print(f"  Temples:         {len(ext.temples):,}")
    print(f"  Hotels:          {len(ext.hotels):,}")
    print(f"  Bus stops:       {len(ext.bus_stops):,}")
    print(f"  Metro stations:  {len(ext.metro_stations):,}")

    # Save to parquet for fast reloading
    for name, data in [
        ("hidden_spots", ext.hidden_spots),
        ("temples", ext.temples),
        ("hotels", ext.hotels),
        ("bus_stops", ext.bus_stops),
        ("metro_stations", ext.metro_stations),
    ]:
        df = pd.DataFrame(data)
        path = os.path.join(OUT_DIR, f"{name}.parquet")
        df.to_parquet(path, index=False)
        print(f"  Saved {path} ({len(df):,} rows)")

    return ext


if __name__ == "__main__":
    extract_all()
