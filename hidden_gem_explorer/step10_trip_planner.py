"""
step10_trip_planner.py — Smart Trip Planner using Real Data
===========================================================
Generates multi-day itineraries by combining:
  1. Supabase places DB (6,300+ curated POIs)
  2. Hidden Gem ML model (from step7)
  3. OSRM for distance/duration between stops
  4. Budget allocation logic

Serves as a FastAPI endpoint: POST /generate-trip
"""

import math
import random
import httpx
from datetime import datetime
from typing import Optional

# Import ML recommendation functions
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from step7_recommendations import (
    recommend_hidden_places,
    recommend_hidden_temples,
    weekend_quiet_spots,
    budget_friendly_spots,
    predict_crowd_level,
)

# ── Supabase config ─────────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://bqpkltznzkwvageimfic.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxcGtsdHpuemt3dmFnZWltZmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MzMxMDEsImV4cCI6MjA4NjAwOTEwMX0.uvVl1Y9R-eYmagm0EDKcd70iMoeMoAg3QSPdCTbScdg")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

# ── Helpers ──────────────────────────────────────────────────────────────────

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance in km between two coordinates."""
    R = 6371
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    Δφ = math.radians(lat2 - lat1)
    Δλ = math.radians(lon2 - lon1)
    a = math.sin(Δφ / 2) ** 2 + math.cos(φ1) * math.cos(φ2) * math.sin(Δλ / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ── Geocode destination name → lat/lng ───────────────────────────────────────

async def geocode(place_name: str) -> Optional[tuple[float, float]]:
    """
    Convert a place name to lat/lng.
    Tries Nominatim first, then falls back to a built-in dictionary
    of major Indian cities.
    """
    # Built-in fallback for common Indian destinations
    KNOWN_CITIES: dict[str, tuple[float, float]] = {
        "delhi": (28.6139, 77.2090),
        "new delhi": (28.6139, 77.2090),
        "mumbai": (19.0760, 72.8777),
        "bangalore": (12.9716, 77.5946),
        "bengaluru": (12.9716, 77.5946),
        "chennai": (13.0827, 80.2707),
        "kolkata": (22.5726, 88.3639),
        "hyderabad": (17.3850, 78.4867),
        "pune": (18.5204, 73.8567),
        "jaipur": (26.9124, 75.7873),
        "ahmedabad": (23.0225, 72.5714),
        "lucknow": (26.8467, 80.9462),
        "agra": (27.1767, 78.0081),
        "varanasi": (25.3176, 82.9739),
        "goa": (15.2993, 74.1240),
        "udaipur": (24.5854, 73.7125),
        "jodhpur": (26.2389, 73.0243),
        "amritsar": (31.6340, 74.8723),
        "shimla": (31.1048, 77.1734),
        "manali": (32.2396, 77.1887),
        "rishikesh": (30.0869, 78.2676),
        "kochi": (9.9312, 76.2673),
        "mysore": (12.2958, 76.6394),
        "mysuru": (12.2958, 76.6394),
        "darjeeling": (27.0360, 88.2627),
        "ooty": (11.4102, 76.6950),
        "srinagar": (34.0837, 74.7973),
        "coimbatore": (11.0168, 76.9558),
        "bhopal": (23.2599, 77.4126),
        "indore": (22.7196, 75.8577),
        "chandigarh": (30.7333, 76.7794),
        "thiruvananthapuram": (8.5241, 76.9366),
        "patna": (25.6093, 85.1376),
        "ranchi": (23.3441, 85.3096),
        "nagpur": (21.1458, 79.0882),
        "visakhapatnam": (17.6868, 83.2185),
        "madurai": (9.9252, 78.1198),
        "tiruchirappalli": (10.7905, 78.7047),
        "hampi": (15.3350, 76.4600),
        "khajuraho": (24.8318, 79.9199),
        "pushkar": (26.4897, 74.5511),
        "mount abu": (24.5926, 72.7156),
        "nainital": (29.3919, 79.4542),
        "mussoorie": (30.4598, 78.0644),
        "leh": (34.1526, 77.5771),
        "ladakh": (34.1526, 77.5771),
        "tirupati": (13.6288, 79.4192),
        "tirumala": (13.6833, 79.3472),
        "pondicherry": (11.9416, 79.8083),
        "puducherry": (11.9416, 79.8083),
        "aurangabad": (19.8762, 75.3433),
        "raipur": (21.2514, 81.6296),
        "guwahati": (26.1445, 91.7362),
        "shillong": (25.5788, 91.8933),
        "gangtok": (27.3389, 88.6065),
        "dehradun": (30.3165, 78.0322),
        "haridwar": (29.9457, 78.1642),
        "allahabad": (25.4358, 81.8463),
        "prayagraj": (25.4358, 81.8463),
        "kanpur": (26.4499, 80.3319),
        "surat": (21.1702, 72.8311),
        "rajkot": (22.3039, 70.8022),
        "vadodara": (22.3072, 73.1812),
        "nashik": (20.0063, 73.7898),
        "thane": (19.2183, 72.9781),
        "vijayawada": (16.5062, 80.6480),
        "warangal": (17.9784, 79.5941),
        "mangalore": (12.9141, 74.8560),
        "mangaluru": (12.9141, 74.8560),
        "trivandrum": (8.5241, 76.9366),
        "kozhikode": (11.2588, 75.7804),
        "thrissur": (10.5276, 76.2144),
        "hubli": (15.3647, 75.1240),
        "belgaum": (15.8497, 74.4977),
        "belagavi": (15.8497, 74.4977),
        "jammu": (32.7266, 74.8570),
        "mathura": (27.4924, 77.6737),
        "vrindavan": (27.5830, 77.6993),
        "bodh gaya": (24.6961, 84.9869),
        "bodhgaya": (24.6961, 84.9869),
        "ajmer": (26.4499, 74.6399),
        "bikaner": (28.0229, 73.3119),
        "jaisalmer": (26.9157, 70.9083),
        "kodaikanal": (10.2381, 77.4892),
        "munnar": (10.0889, 77.0595),
        "alleppey": (9.4981, 76.3388),
        "alappuzha": (9.4981, 76.3388),
        "kovalam": (8.3988, 76.9820),
        "varkala": (8.7379, 76.7163),
        "puri": (19.7983, 85.8249),
        "bhubaneswar": (20.2961, 85.8245),
        "cuttack": (20.4625, 85.8830),
        "rameswaram": (9.2876, 79.3129),
        "kanyakumari": (8.0883, 77.5385),
        "mahabalipuram": (12.6269, 80.1927),
        "konark": (19.8876, 86.0945),
        "sanchi": (23.4793, 77.7399),
        "ellora": (20.0258, 75.1780),
        "ajanta": (20.5519, 75.7033),
    }

    # Check built-in first
    key = place_name.strip().lower()
    if key in KNOWN_CITIES:
        return KNOWN_CITIES[key]

    # Try Nominatim
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": f"{place_name}, India",
            "format": "json",
            "limit": 1,
            "countrycodes": "in",
        }
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params, headers={"User-Agent": "MiniGuide/1.0"})
            if resp.status_code != 200:
                return None
            data = resp.json()
        if data:
            return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception:
        pass

    return None


# ── Relevant categories for trip planning ───────────────────────────────────
TRIP_RELEVANT_CATS = [
    "temple", "landmark", "destination", "tourist",
    "hidden_spot", "restaurant", "hotel", "hostel",
]

# ── Fetch places from Supabase near a location ──────────────────────────────

async def fetch_supabase_places(
    lat: float, lng: float, radius_km: float = 100, categories: list[str] | None = None
) -> list[dict]:
    """
    Fetch trip-relevant places from Supabase, then filter by distance.
    Uses server-side category filter + pagination to overcome the 1000-row limit.
    """
    cats_to_fetch = categories or TRIP_RELEVANT_CATS
    cat_filter = ",".join(cats_to_fetch)
    base_url = f"{SUPABASE_URL}/rest/v1/places?select=*&category=in.({cat_filter})&order=id.asc"

    all_places: list[dict] = []
    seen_ids: set = set()
    page_size = 1000
    offset = 0

    async with httpx.AsyncClient(timeout=15) as client:
        while True:
            url = f"{base_url}&limit={page_size}&offset={offset}"
            resp = await client.get(url, headers=HEADERS)
            resp.raise_for_status()
            page = resp.json()
            if not page:
                break
            for p in page:
                pid = p.get("id")
                if pid and pid not in seen_ids:
                    seen_ids.add(pid)
                    all_places.append(p)
            if len(page) < page_size:
                break
            offset += page_size

    # Client-side distance filter
    nearby = []
    for p in all_places:
        try:
            plat, plng = float(p["latitude"]), float(p["longitude"])
        except (TypeError, ValueError, KeyError):
            continue
        dist = haversine(lat, lng, plat, plng)
        if dist <= radius_km:
            p["_dist_km"] = round(dist, 1)
            nearby.append(p)

    # Sort by distance
    nearby.sort(key=lambda x: x["_dist_km"])
    return nearby


# ── Category buckets for trip slots ──────────────────────────────────────────

MORNING_CATS = ["temple", "landmark", "destination", "tourist"]
AFTERNOON_CATS = ["hidden_spot", "tourist", "destination", "landmark"]
EVENING_CATS = ["restaurant", "hidden_spot", "tourist"]
FOOD_CATS = ["restaurant"]
STAY_CATS = ["hotel", "hostel"]
TRANSPORT_CATS = ["bus_route", "transport", "metro", "railway"]

COST_ESTIMATES = {
    "temple": 0,
    "landmark": 50,
    "destination": 200,
    "tourist": 150,
    "hidden_spot": 50,
    "restaurant": 300,
    "hotel": 1500,
    "hostel": 500,
    "bus_route": 30,
    "transport": 50,
    "metro": 30,
    "railway": 100,
    "hospital": 0,
    "emergency": 0,
    "police": 0,
    "fire_station": 0,
    "pharmacy": 100,
    "health_centre": 0,
}


# ── Build the itinerary ─────────────────────────────────────────────────────

def _place_key(p: dict) -> str:
    """Unique key for a place — uses id if available, else name."""
    pid = p.get("id")
    if pid:
        return str(pid)
    return f"name:{p.get('name', '')}"


def _place_name_key(p: dict) -> str:
    """Normalized name key for deduplication."""
    return (p.get("name") or "").strip().lower()


def _dedup_by_name(places: list[dict]) -> list[dict]:
    """Remove duplicate places with the same name, keeping the highest-rated."""
    seen: dict[str, dict] = {}
    for p in places:
        key = _place_name_key(p)
        if not key:
            continue
        existing = seen.get(key)
        if not existing or float(p.get("rating") or 0) > float(existing.get("rating") or 0):
            seen[key] = p
    return list(seen.values())


def _pick(places: list[dict], cats: list[str], used: set, n: int = 1) -> list[dict]:
    """Pick n places from given categories that haven't been used yet."""
    pool = [
        p for p in places
        if p.get("category") in cats
        and _place_key(p) not in used
        and _place_name_key(p) not in used  # also check name to prevent duplicate names
    ]
    # Prefer higher-rated, then closer
    pool.sort(key=lambda x: (-float(x.get("rating") or 0), float(x.get("_dist_km") or 999)))
    picked = pool[:n]
    for p in picked:
        used.add(_place_key(p))
        used.add(_place_name_key(p))  # track name too
    return picked


def _place_summary(p: dict, fallback_name: str = "Free exploration") -> dict:
    """Summarize a place for the itinerary."""
    if not p:
        return {
            "place": fallback_name,
            "description": "Explore the local area",
            "time": "Flexible",
            "cost": 0,
            "lat": 0,
            "lng": 0,
            "category": "",
        }
    cat = p.get("category", "")
    return {
        "place": p.get("name", fallback_name),
        "description": p.get("description", "") or f"Visit this {cat.replace('_', ' ')}",
        "time": (
            "8:00 AM - 11:00 AM" if cat in MORNING_CATS
            else "12:00 PM - 4:00 PM" if cat in AFTERNOON_CATS
            else "5:00 PM - 8:00 PM"
        ),
        "cost": COST_ESTIMATES.get(cat, 100),
        "lat": float(p.get("latitude") or 0),
        "lng": float(p.get("longitude") or 0),
        "category": cat,
    }


# ── Nominatim POI fallback (when Supabase has few results) ──────────────────

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

OSM_CATEGORY_MAP = {
    "tourism=attraction": "tourist",
    "tourism=viewpoint": "tourist",
    "tourism=museum": "landmark",
    "historic=monument": "landmark",
    "historic=memorial": "landmark",
    "historic=castle": "landmark",
    "historic=ruins": "landmark",
    "amenity=place_of_worship": "temple",
    "amenity=restaurant": "restaurant",
    "amenity=cafe": "restaurant",
    "tourism=hotel": "hotel",
    "tourism=hostel": "hostel",
    "tourism=guest_house": "hotel",
    "natural=peak": "destination",
    "natural=beach": "destination",
    "leisure=park": "destination",
    "leisure=garden": "destination",
}


async def fetch_osm_pois(lat: float, lng: float, radius_m: int = 30000) -> list[dict]:
    """
    Fetch real POIs from OpenStreetMap Overpass API as a fallback.
    Returns places formatted like Supabase rows.
    """
    query = f"""
    [out:json][timeout:15];
    (
      node["tourism"~"attraction|viewpoint|museum|hotel|hostel|guest_house"](around:{radius_m},{lat},{lng});
      node["historic"~"monument|memorial|castle|ruins|fort"](around:{radius_m},{lat},{lng});
      node["amenity"="place_of_worship"](around:{radius_m},{lat},{lng});
      node["amenity"~"restaurant|cafe"](around:{radius_m},{lat},{lng});
      node["leisure"~"park|garden"](around:{radius_m},{lat},{lng});
    );
    out body 80;
    """
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(OVERPASS_URL, data={"data": query},
                                      headers={"User-Agent": "MiniGuide/1.0"})
            if resp.status_code != 200:
                return []
            data = resp.json()
    except Exception:
        return []

    places = []
    for el in data.get("elements", []):
        tags = el.get("tags", {})
        name = tags.get("name") or tags.get("name:en")
        if not name:
            continue

        # Determine category from OSM tags
        category = "tourist"  # default
        for osm_tag, cat in OSM_CATEGORY_MAP.items():
            key, val = osm_tag.split("=", 1)
            if tags.get(key) and (val in tags.get(key, "")):
                category = cat
                break

        places.append({
            "id": f"osm_{el['id']}",
            "name": name,
            "category": category,
            "latitude": el.get("lat", 0),
            "longitude": el.get("lon", 0),
            "rating": float(tags.get("stars", 4.0)),
            "description": tags.get("description")
                or tags.get("tourism")
                or tags.get("historic")
                or f"{category.replace('_', ' ').title()} in the area",
            "_source": "osm",
        })
    return places


# ── City search — local database + Nominatim fallback ────────────────────────

# Comprehensive Indian city list with state and coordinates
INDIAN_CITIES = [
    ("Delhi", "Delhi", 28.6139, 77.2090),
    ("New Delhi", "Delhi", 28.6139, 77.2090),
    ("Mumbai", "Maharashtra", 19.0760, 72.8777),
    ("Bangalore", "Karnataka", 12.9716, 77.5946),
    ("Bengaluru", "Karnataka", 12.9716, 77.5946),
    ("Hyderabad", "Telangana", 17.3850, 78.4867),
    ("Chennai", "Tamil Nadu", 13.0827, 80.2707),
    ("Kolkata", "West Bengal", 22.5726, 88.3639),
    ("Pune", "Maharashtra", 18.5204, 73.8567),
    ("Jaipur", "Rajasthan", 26.9124, 75.7873),
    ("Ahmedabad", "Gujarat", 23.0225, 72.5714),
    ("Lucknow", "Uttar Pradesh", 26.8467, 80.9462),
    ("Agra", "Uttar Pradesh", 27.1767, 78.0081),
    ("Varanasi", "Uttar Pradesh", 25.3176, 82.9739),
    ("Goa", "Goa", 15.2993, 74.1240),
    ("Panaji", "Goa", 15.4909, 73.8278),
    ("Udaipur", "Rajasthan", 24.5854, 73.7125),
    ("Jodhpur", "Rajasthan", 26.2389, 73.0243),
    ("Jaisalmer", "Rajasthan", 26.9157, 70.9083),
    ("Amritsar", "Punjab", 31.6340, 74.8723),
    ("Shimla", "Himachal Pradesh", 31.1048, 77.1734),
    ("Manali", "Himachal Pradesh", 32.2396, 77.1887),
    ("Dharamshala", "Himachal Pradesh", 32.2190, 76.3234),
    ("Rishikesh", "Uttarakhand", 30.0869, 78.2676),
    ("Haridwar", "Uttarakhand", 29.9457, 78.1642),
    ("Kochi", "Kerala", 9.9312, 76.2673),
    ("Thiruvananthapuram", "Kerala", 8.5241, 76.9366),
    ("Munnar", "Kerala", 10.0889, 77.0595),
    ("Alleppey", "Kerala", 9.4981, 76.3388),
    ("Alappuzha", "Kerala", 9.4981, 76.3388),
    ("Mysore", "Karnataka", 12.2958, 76.6394),
    ("Mysuru", "Karnataka", 12.2958, 76.6394),
    ("Hampi", "Karnataka", 15.3350, 76.4600),
    ("Gokarna", "Karnataka", 14.5479, 74.3188),
    ("Darjeeling", "West Bengal", 27.0360, 88.2627),
    ("Gangtok", "Sikkim", 27.3389, 88.6065),
    ("Ooty", "Tamil Nadu", 11.4102, 76.6950),
    ("Kodaikanal", "Tamil Nadu", 10.2381, 77.4892),
    ("Madurai", "Tamil Nadu", 9.9252, 78.1198),
    ("Pondicherry", "Puducherry", 11.9416, 79.8083),
    ("Puducherry", "Puducherry", 11.9416, 79.8083),
    ("Srinagar", "Jammu & Kashmir", 34.0837, 74.7973),
    ("Leh", "Ladakh", 34.1526, 77.5771),
    ("Ladakh", "Ladakh", 34.1526, 77.5771),
    ("Coimbatore", "Tamil Nadu", 11.0168, 76.9558),
    ("Tirupati", "Andhra Pradesh", 13.6288, 79.4192),
    ("Visakhapatnam", "Andhra Pradesh", 17.6868, 83.2185),
    ("Vizag", "Andhra Pradesh", 17.6868, 83.2185),
    ("Bhopal", "Madhya Pradesh", 23.2599, 77.4126),
    ("Khajuraho", "Madhya Pradesh", 24.8318, 79.9199),
    ("Indore", "Madhya Pradesh", 22.7196, 75.8577),
    ("Ujjain", "Madhya Pradesh", 23.1765, 75.7885),
    ("Chandigarh", "Chandigarh", 30.7333, 76.7794),
    ("Patna", "Bihar", 25.6093, 85.1376),
    ("Bodh Gaya", "Bihar", 24.6961, 84.9869),
    ("Ranchi", "Jharkhand", 23.3441, 85.3096),
    ("Nagpur", "Maharashtra", 21.1458, 79.0882),
    ("Aurangabad", "Maharashtra", 19.8762, 75.3433),
    ("Ajanta", "Maharashtra", 20.5519, 75.7033),
    ("Ellora", "Maharashtra", 20.0258, 75.1780),
    ("Nashik", "Maharashtra", 20.0063, 73.7898),
    ("Lonavala", "Maharashtra", 18.7481, 73.4072),
    ("Mahabaleshwar", "Maharashtra", 17.9237, 73.6580),
    ("Pushkar", "Rajasthan", 26.4897, 74.5511),
    ("Mount Abu", "Rajasthan", 24.5926, 72.7156),
    ("Bikaner", "Rajasthan", 28.0229, 73.3119),
    ("Nainital", "Uttarakhand", 29.3919, 79.4542),
    ("Mussoorie", "Uttarakhand", 30.4598, 78.0644),
    ("Dehradun", "Uttarakhand", 30.3165, 78.0322),
    ("Almora", "Uttarakhand", 29.5971, 79.6591),
    ("Jim Corbett", "Uttarakhand", 29.5300, 78.7747),
    ("Ranthambore", "Rajasthan", 26.0173, 76.5026),
    ("Mathura", "Uttar Pradesh", 27.4924, 77.6737),
    ("Vrindavan", "Uttar Pradesh", 27.5799, 77.6980),
    ("Allahabad", "Uttar Pradesh", 25.4358, 81.8463),
    ("Prayagraj", "Uttar Pradesh", 25.4358, 81.8463),
    ("Dwarka", "Gujarat", 22.2442, 68.9685),
    ("Somnath", "Gujarat", 20.8880, 70.4014),
    ("Kutch", "Gujarat", 23.7337, 69.8597),
    ("Rann of Kutch", "Gujarat", 23.7337, 69.8597),
    ("Shirdi", "Maharashtra", 19.7672, 74.4774),
    ("Madurai", "Tamil Nadu", 9.9252, 78.1198),
    ("Rameshwaram", "Tamil Nadu", 9.2881, 79.3174),
    ("Kanyakumari", "Tamil Nadu", 8.0883, 77.5385),
    ("Thanjavur", "Tamil Nadu", 10.7870, 79.1378),
    ("Mamallapuram", "Tamil Nadu", 12.6269, 80.1927),
    ("Kovalam", "Kerala", 8.3988, 76.9820),
    ("Wayanad", "Kerala", 11.6854, 76.1320),
    ("Varkala", "Kerala", 8.7379, 76.7163),
    ("Shillong", "Meghalaya", 25.5788, 91.8933),
    ("Cherrapunji", "Meghalaya", 25.2843, 91.7159),
    ("Tawang", "Arunachal Pradesh", 27.5860, 91.8691),
    ("Kaziranga", "Assam", 26.5775, 93.1711),
    ("Guwahati", "Assam", 26.1445, 91.7362),
    ("Imphal", "Manipur", 24.8170, 93.9368),
    ("Aizawl", "Mizoram", 23.7271, 92.7176),
    ("Kohima", "Nagaland", 25.6751, 94.1086),
    ("Agartala", "Tripura", 23.8315, 91.2868),
    ("Port Blair", "Andaman & Nicobar", 11.6234, 92.7265),
    ("Havelock Island", "Andaman & Nicobar", 12.0199, 93.0018),
    ("Coorg", "Karnataka", 12.3375, 75.8069),
    ("Madikeri", "Karnataka", 12.4244, 75.7382),
    ("Udupi", "Karnataka", 13.3409, 74.7421),
    ("Mangalore", "Karnataka", 12.9141, 74.8560),
    ("Puri", "Odisha", 19.8135, 85.8312),
    ("Bhubaneswar", "Odisha", 20.2961, 85.8245),
    ("Konark", "Odisha", 19.8876, 86.0945),
    ("Surat", "Gujarat", 21.1702, 72.8311),
    ("Vadodara", "Gujarat", 22.3072, 73.1812),
    ("Rajkot", "Gujarat", 22.3039, 70.8022),
    ("Jabalpur", "Madhya Pradesh", 23.1815, 79.9864),
    ("Gwalior", "Madhya Pradesh", 26.2183, 78.1828),
    ("Orchha", "Madhya Pradesh", 25.3519, 78.6408),
    ("Mandu", "Madhya Pradesh", 22.3356, 75.3939),
    ("Sanchi", "Madhya Pradesh", 23.4793, 77.7397),
    ("Amravati", "Maharashtra", 20.9374, 77.7796),
    ("Kolhapur", "Maharashtra", 16.7050, 74.2433),
    ("Alibaug", "Maharashtra", 18.6414, 72.8722),
    ("Vijaywada", "Andhra Pradesh", 16.5062, 80.6480),
    ("Tiruchirappalli", "Tamil Nadu", 10.7905, 78.7047),
    ("Trichy", "Tamil Nadu", 10.7905, 78.7047),
    ("Coorg", "Karnataka", 12.3375, 75.8069),
]


# ── In-memory search cache (LRU-style, max 500 entries) ─────────────
_search_cache: dict[str, tuple[float, list[dict]]] = {}
_CACHE_TTL = 300  # 5 minutes
_CACHE_MAX = 500


def _cache_get(key: str) -> list[dict] | None:
    import time
    entry = _search_cache.get(key)
    if entry and (time.time() - entry[0]) < _CACHE_TTL:
        return entry[1]
    return None


def _cache_set(key: str, results: list[dict]):
    import time
    if len(_search_cache) >= _CACHE_MAX:
        # Evict oldest 100 entries
        sorted_keys = sorted(_search_cache, key=lambda k: _search_cache[k][0])
        for k in sorted_keys[:100]:
            _search_cache.pop(k, None)
    _search_cache[key] = (time.time(), results)


async def search_cities(query: str, limit: int = 10) -> list[dict]:
    """
    Real-time place search for ANY place in India — works like Google Maps.
    
    Strategy (all run in parallel):
      1. Instant local matches from INDIAN_CITIES (fast, offline)
      2. Photon geocoder (OSM-based, lenient rate limits, designed for autocomplete)
      3. Supabase POI database (15K+ places)
    Falls back to Nominatim if Photon fails.
    Results are cached for 5 minutes.
    """
    import asyncio

    q = query.strip().lower()
    if len(q) < 2:
        return []

    # Check cache first
    cached = _cache_get(f"search:{q}")
    if cached is not None:
        return cached[:limit]

    # ── Source 1: Local city database (instant, no I/O) ──────────────────
    local_results = []
    for name, state, lat, lng in INDIAN_CITIES:
        nl = name.lower()
        if nl.startswith(q) or q in nl:
            priority = 0 if nl.startswith(q) else 1
            local_results.append({
                "name": name,
                "state": state,
                "displayName": f"{name}, {state}",
                "lat": lat,
                "lng": lng,
                "type": "city",
                "_priority": priority,
                "_src": "local",
            })

    # ── Source 2: Photon geocoder (primary) + Nominatim (fallback) ───────
    async def _fetch_photon() -> list[dict]:
        """Query Photon (komoot) — OSM-based, no strict rate limits."""
        try:
            # Use raw URL to ensure bbox format is correct
            bbox = "68.0,6.0,98.0,36.0"
            url = f"https://photon.komoot.io/api/?q={query}&limit={limit}&lang=en&bbox={bbox}"
            async with httpx.AsyncClient(timeout=6) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    return []
                data = resp.json()
                features = data.get("features", [])
                out = []
                for feat in features:
                    props = feat.get("properties", {})
                    coords = feat.get("geometry", {}).get("coordinates", [0, 0])
                    # Filter to only India results
                    country = props.get("country", "")
                    if country and "India" not in country and "india" not in country.lower():
                        continue
                    name = (
                        props.get("name")
                        or props.get("city")
                        or props.get("county")
                        or ""
                    )
                    if not name:
                        continue
                    state = props.get("state", "")
                    city = props.get("city", "")
                    osm_type = props.get("osm_value", props.get("type", "place"))
                    # Build display name
                    parts = [name]
                    if city and city != name:
                        parts.append(city)
                    if state:
                        parts.append(state)
                    display = ", ".join(parts)
                    out.append({
                        "name": name,
                        "state": state,
                        "displayName": display,
                        "lat": float(coords[1]),
                        "lng": float(coords[0]),
                        "type": osm_type,
                        "_priority": 0,
                        "_src": "photon",
                    })
                return out
        except Exception:
            return []

    async def _fetch_nominatim_fallback() -> list[dict]:
        """Nominatim fallback — only used when Photon returns nothing."""
        try:
            url = "https://nominatim.openstreetmap.org/search"
            params = {
                "q": f"{query}, India",
                "format": "json",
                "limit": min(limit, 5),
                "countrycodes": "in",
                "addressdetails": 1,
                "dedupe": 1,
            }
            async with httpx.AsyncClient(timeout=8) as client:
                resp = await client.get(url, params=params,
                                         headers={"User-Agent": "MiniGuide-TravelApp/1.0 (miniguide@travel.app)"})
                if resp.status_code != 200:
                    return []
                data = resp.json()
                out = []
                for item in data:
                    addr = item.get("address", {})
                    city = (
                        addr.get("city")
                        or addr.get("town")
                        or addr.get("village")
                        or addr.get("suburb")
                        or addr.get("county")
                        or addr.get("state_district")
                        or item.get("display_name", "").split(",")[0]
                    )
                    state = addr.get("state", "")
                    display = item.get("display_name", "")
                    parts = [p.strip() for p in display.split(",")]
                    short_display = ", ".join(parts[:3]) if len(parts) > 3 else display
                    out.append({
                        "name": city,
                        "state": state,
                        "displayName": short_display,
                        "lat": float(item.get("lat", 0)),
                        "lng": float(item.get("lon", 0)),
                        "type": item.get("type", "place"),
                        "_priority": 0,
                        "_src": "nominatim",
                    })
                return out
        except Exception:
            return []

    # ── Source 3: Supabase POI search ────────────────────────────────────
    async def _fetch_supabase() -> list[dict]:
        """Search 15K+ places in Supabase."""
        try:
            search_url = (
                f"{SUPABASE_URL}/rest/v1/places"
                f"?select=name,category,address,latitude,longitude"
                f"&name=ilike.*{q}*&limit=5&order=rating.desc"
            )
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(search_url, headers=HEADERS)
                if resp.status_code != 200:
                    return []
                data = resp.json()
                out = []
                for item in data:
                    name = item.get("name", "")
                    addr = item.get("address", "")
                    cat = item.get("category", "")
                    out.append({
                        "name": name,
                        "state": addr or cat,
                        "displayName": f"{name}" + (f", {addr}" if addr else ""),
                        "lat": float(item.get("latitude", 0)),
                        "lng": float(item.get("longitude", 0)),
                        "type": cat or "place",
                        "_priority": 2,
                        "_src": "supabase",
                    })
                return out
        except Exception:
            return []

    # ── Run Photon + Supabase in parallel ────────────────────────────────
    photon_results, supabase_results = await asyncio.gather(
        _fetch_photon(), _fetch_supabase()
    )

    # If Photon returned nothing, try Nominatim as fallback
    geocoder_results = photon_results
    if not geocoder_results and len(local_results) < 3:
        geocoder_results = await _fetch_nominatim_fallback()

    # ── Merge + deduplicate all sources ──────────────────────────────────
    seen = set()
    all_results = []

    # Process in priority order: Geocoder > Local > Supabase
    for r in geocoder_results + local_results + supabase_results:
        key = f"{r['name']}|{r.get('state', '')}".lower().strip()
        if key not in seen:
            seen.add(key)
            all_results.append(r)

    # Sort by priority, then prefix match, then name length
    all_results.sort(key=lambda r: (
        r.get("_priority", 9),
        0 if r["name"].lower().startswith(q) else 1,
        len(r["name"]),
    ))

    # Clean up internal fields
    for r in all_results:
        r.pop("_priority", None)
        r.pop("_src", None)

    final = all_results[:limit]

    # Cache the results
    _cache_set(f"search:{q}", final)

    return final


async def generate_trip_plan(
    from_name: str,
    destination: str,
    budget_min: int,
    budget_max: int,
    days: int,
    transport_mode: str,
    rating: float,
    include_hidden: bool,
    distance_km: float,
) -> dict:
    """
    Generate a complete trip plan using real data.

    Steps:
      1. Geocode destination → lat/lng
      2. Fetch places from Supabase within radius
      3. Fetch hidden gems from ML model
      4. Build day-wise itinerary picking morning/afternoon/evening activities
      5. Add food spots, stay recommendations, hidden spots
      6. Calculate budget breakdown
    """

    # 1. Geocode destination
    dest_coords = await geocode(destination)
    if not dest_coords:
        raise ValueError(f"Could not find location: {destination}")

    dest_lat, dest_lng = dest_coords

    # 2. Fetch Supabase places nearby
    all_places = await fetch_supabase_places(dest_lat, dest_lng, distance_km)

    # 2b. If Supabase has < 10 tourist/temple/landmark places, supplement with OSM
    tourist_cats = {"temple", "landmark", "destination", "tourist"}
    tourist_count = sum(1 for p in all_places if p.get("category") in tourist_cats)
    if tourist_count < 10:
        osm_pois = await fetch_osm_pois(dest_lat, dest_lng, radius_m=int(min(distance_km, 50) * 1000))
        # Merge without duplicates (by name similarity)
        existing_names = {p.get("name", "").lower().strip() for p in all_places}
        for poi in osm_pois:
            if poi["name"].lower().strip() not in existing_names:
                poi["_dist_km"] = round(haversine(dest_lat, dest_lng,
                                                   float(poi["latitude"]),
                                                   float(poi["longitude"])), 1)
                all_places.append(poi)
                existing_names.add(poi["name"].lower().strip())

    # 2c. Deduplicate by name (some places exist as multiple DB rows)
    all_places = _dedup_by_name(all_places)

    # Filter by rating
    rated_places = [p for p in all_places if float(p.get("rating") or 0) >= rating]
    if not rated_places:
        rated_places = all_places  # fallback to all if filter is too strict

    # 3. Fetch hidden gems from ML model
    hidden_gems_raw = []
    if include_hidden:
        try:
            hidden_gems_raw = recommend_hidden_places(dest_lat, dest_lng, distance_km, top_n=15)
        except Exception:
            pass

    hidden_temples_raw = []
    try:
        hidden_temples_raw = recommend_hidden_temples(dest_lat, dest_lng, distance_km, top_n=10)
    except Exception:
        pass

    # 4. Build day-wise plan
    used_ids: set = set()
    day_plans = []
    total_cost = 0

    for d in range(1, days + 1):
        # Morning: temple / landmark / destination
        morning_picks = _pick(rated_places, MORNING_CATS, used_ids, 1)
        morning = _place_summary(morning_picks[0] if morning_picks else None, "Morning exploration")

        # Afternoon: tourist / hidden spot / destination
        if include_hidden:
            afternoon_picks = _pick(rated_places, ["hidden_spot", "tourist", "destination"], used_ids, 1)
        else:
            afternoon_picks = _pick(rated_places, AFTERNOON_CATS, used_ids, 1)
        afternoon = _place_summary(afternoon_picks[0] if afternoon_picks else None, "Afternoon discovery")

        # Evening: restaurant / hidden / tourist
        evening_picks = _pick(rated_places, EVENING_CATS, used_ids, 1)
        evening = _place_summary(evening_picks[0] if evening_picks else None, "Evening stroll & dinner")

        # Calculate day travel distance
        points = [s for s in [morning, afternoon, evening] if s["lat"] != 0]
        day_dist = 0
        for i in range(len(points) - 1):
            day_dist += haversine(points[i]["lat"], points[i]["lng"], points[i + 1]["lat"], points[i + 1]["lng"])

        day_cost = morning["cost"] + afternoon["cost"] + evening["cost"]
        total_cost += day_cost

        day_plans.append({
            "day": d,
            "morning": morning,
            "afternoon": afternoon,
            "evening": evening,
            "travelDistance": round(day_dist, 1),
            "dayCost": day_cost,
        })

    # 5. Hidden spots along the trip
    hidden_spots = []
    for gem in hidden_gems_raw[:5]:
        score = gem.get("hidden_gem_score", 0)
        score = score.item() if hasattr(score, "item") else score
        user_dist = gem.get("user_dist", 0)
        user_dist = user_dist.item() if hasattr(user_dist, "item") else user_dist
        hidden_spots.append({
            "name": gem.get("name", "Hidden Spot"),
            "whySpecial": f"ML hidden gem score: {score:.2f} — Type: {gem.get('type', 'unknown')}",
            "bestTime": "Early morning or late evening",
            "distance": round(user_dist, 1),
            "lat": float(gem.get("lat", 0)),
            "lng": float(gem.get("lon", 0)),
        })

    # Hidden temples
    for t in hidden_temples_raw[:3]:
        score = t.get("hidden_gem_score", 0)
        score = score.item() if hasattr(score, "item") else score
        user_dist = t.get("user_dist", 0)
        user_dist = user_dist.item() if hasattr(user_dist, "item") else user_dist
        hidden_spots.append({
            "name": t.get("name", "Hidden Temple"),
            "whySpecial": f"Sacred hidden temple — score: {score:.2f}",
            "bestTime": "Dawn or dusk",
            "distance": round(user_dist, 1),
            "lat": float(t.get("lat", 0)),
            "lng": float(t.get("lon", 0)),
        })

    # 6. Stay recommendations
    stay_places = [p for p in all_places if p.get("category") in STAY_CATS]
    stay_places.sort(key=lambda x: float(x.get("rating") or 0), reverse=True)
    stay_recs = []
    for s in stay_places[:5]:
        cat = s.get("category", "hotel")
        price = COST_ESTIMATES.get(cat, 1000) + random.randint(0, 800)
        stay_recs.append({
            "name": s.get("name", "Stay"),
            "distance": s.get("_dist_km", 0),
            "rating": float(s.get("rating") or 4.0),
            "pricePerNight": price,
            "lat": float(s.get("latitude") or 0),
            "lng": float(s.get("longitude") or 0),
        })

    # 7. Food spots
    food_places = [p for p in all_places if p.get("category") in FOOD_CATS]
    food_places.sort(key=lambda x: float(x.get("rating") or 0), reverse=True)
    food_spots = []
    for f in food_places[:6]:
        food_spots.append({
            "name": f.get("name", "Local Restaurant"),
            "specialty": f.get("description", "Local cuisine") or "Local cuisine",
            "budgetPerMeal": 150 + random.randint(0, 200),
            "lat": float(f.get("latitude") or 0),
            "lng": float(f.get("longitude") or 0),
        })

    # 8. Budget breakdown
    stay_cost = sum(s["pricePerNight"] for s in stay_recs[:1]) * days if stay_recs else 1500 * days
    food_cost = 600 * days  # 3 meals × 200/meal avg
    transport_cost = {
        "walk": 0, "bike": 100 * days, "bus": 200 * days,
        "train": 300 * days, "car": 500 * days, "mixed": 350 * days,
    }.get(transport_mode, 350 * days)
    activities_cost = total_cost
    buffer = round((stay_cost + food_cost + transport_cost + activities_cost) * 0.1)
    grand_total = stay_cost + food_cost + transport_cost + activities_cost + buffer

    # Crowd prediction at destination
    month = datetime.now().month
    crowd = None
    try:
        raw_crowd = predict_crowd_level(dest_lat, dest_lng, month)
        # Convert numpy types to native Python for JSON serialization
        crowd = {}
        for k, v in raw_crowd.items():
            if hasattr(v, "item"):  # numpy scalar
                crowd[k] = v.item()
            else:
                crowd[k] = v
    except Exception:
        pass

    return {
        "tripOverview": {
            "from": from_name,
            "to": destination,
            "days": days,
            "transportMode": transport_mode,
            "totalBudget": grand_total,
            "destLat": dest_lat,
            "destLng": dest_lng,
        },
        "dayWisePlan": day_plans,
        "hiddenSpots": hidden_spots,
        "stayRecommendations": stay_recs,
        "foodSpots": food_spots,
        "budgetBreakdown": {
            "stay": stay_cost,
            "food": food_cost,
            "transport": transport_cost,
            "activities": activities_cost,
            "buffer": buffer,
            "total": grand_total,
        },
        "crowdPrediction": crowd,
        "stats": {
            "total_places_found": len(all_places),
            "rated_places": len(rated_places),
            "hidden_gems_found": len(hidden_gems_raw),
            "data_source": "supabase+ml",
        },
    }
