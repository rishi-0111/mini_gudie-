"""
stays.py — Budget-Based Stay Options Module
============================================
Returns hostels/hotels from Supabase filtered by budget, persons, days.
"""

import os
import math
import random
import httpx

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://bqpkltznzkwvageimfic.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxcGtsdHpuemt3dmFnZWltZmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MzMxMDEsImV4cCI6MjA4NjAwOTEwMX0.uvVl1Y9R-eYmagm0EDKcd70iMoeMoAg3QSPdCTbScdg")
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}


def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _safe_float(v):
    if hasattr(v, "item"):
        return v.item()
    return float(v) if v is not None else 0.0


# ── Amenity heuristics based on price tier ──────────────────────────────────
def _derive_amenities(price: int, cat: str) -> dict:
    """Derive amenities based on price and category."""
    amenities = []
    has_food = False
    has_ac = False
    stay_type = "dorm"

    if cat == "hostel" or price < 600:
        amenities = ["Wifi", "Common bathroom", "Locker"]
        stay_type = "dorm"
    elif price < 1200:
        amenities = ["Wifi", "Attached bath", "Fan"]
        stay_type = "budget_room"
        has_food = random.random() > 0.5
    elif price < 2500:
        amenities = ["Wifi", "AC", "Attached bath", "TV"]
        stay_type = "standard"
        has_ac = True
        has_food = True
    else:
        amenities = ["Wifi", "AC", "Room service", "Attached bath", "TV", "Parking"]
        stay_type = "premium"
        has_ac = True
        has_food = True

    return {
        "amenities": amenities,
        "hasFood": has_food,
        "hasAC": has_ac,
        "stayType": stay_type,
        "foodEmoji": "🍛" if has_food else "",
        "acEmoji": "❄" if has_ac else "",
        "typeEmoji": "🛏" if stay_type == "dorm" else "🏨",
    }


# ── Price simulation per category ──────────────────────────────────────────
PRICE_RANGES = {
    "hostel": (200, 800),
    "hotel": (800, 5000),
    "dharamshala": (100, 500),  # virtual category for temples
}


async def get_stay_options(
    lat: float, lng: float, budget: int,
    persons: int = 1, days: int = 1,
    radius_km: float = 50,
    temple_lat: float = 0, temple_lng: float = 0,
) -> list[dict]:
    """
    Return stay options within budget. Fetches from Supabase hotels/hostels
    and generates realistic options.
    """
    url = f"{SUPABASE_URL}/rest/v1/places?select=*&limit=2000"
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url, headers=HEADERS)
        resp.raise_for_status()
        all_places = resp.json()

    stay_cats = ["hotel", "hostel"]
    stay_places = [p for p in all_places if p.get("category") in stay_cats]

    max_per_night = budget / max(days, 1) / max(persons, 1)

    results = []
    for p in stay_places:
        try:
            plat = _safe_float(p.get("latitude"))
            plng = _safe_float(p.get("longitude"))
            dist = round(haversine(lat, lng, plat, plng), 1)
            if dist > radius_km:
                continue

            cat = p.get("category", "hotel")
            lo, hi = PRICE_RANGES.get(cat, (500, 3000))
            # Generate price per person per night
            base_price = random.randint(lo, hi)
            price_per_night = base_price
            total_cost = price_per_night * persons * days

            if price_per_night > max_per_night * 1.3:
                continue  # over budget

            temple_dist = 0
            if temple_lat and temple_lng:
                temple_dist = round(haversine(plat, plng, temple_lat, temple_lng), 1)

            amen = _derive_amenities(price_per_night, cat)
            rating = _safe_float(p.get("rating") or 3.5)

            results.append({
                "id": p.get("id"),
                "name": p.get("name", "Stay"),
                "category": cat,
                "lat": plat,
                "lng": plng,
                "distance": dist,
                "templeDistance": temple_dist,
                "rating": round(rating, 1),
                "pricePerNight": price_per_night,
                "totalCost": total_cost,
                "persons": persons,
                "days": days,
                "withinBudget": total_cost <= budget,
                **amen,
            })
        except Exception:
            continue

    # Sort by price
    results.sort(key=lambda x: x["pricePerNight"])

    # Also generate dharamshala options near temples
    if temple_lat and temple_lng:
        for i in range(2):
            price = random.randint(100, 400)
            total = price * persons * days
            if total <= budget:
                results.insert(0, {
                    "id": f"dharamshala_{i}",
                    "name": f"Temple Dharamshala {i + 1}",
                    "category": "dharamshala",
                    "lat": temple_lat + random.uniform(-0.005, 0.005),
                    "lng": temple_lng + random.uniform(-0.005, 0.005),
                    "distance": round(random.uniform(0.1, 2.0), 1),
                    "templeDistance": round(random.uniform(0.1, 0.5), 1),
                    "rating": round(random.uniform(3.0, 4.5), 1),
                    "pricePerNight": price,
                    "totalCost": total,
                    "persons": persons,
                    "days": days,
                    "withinBudget": True,
                    "amenities": ["Basic room", "Common bathroom", "Prasad available"],
                    "hasFood": True,
                    "hasAC": False,
                    "stayType": "dharamshala",
                    "foodEmoji": "🍛",
                    "acEmoji": "",
                    "typeEmoji": "🛕",
                })

    return results[:20]
