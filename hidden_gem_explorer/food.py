"""
food.py — Food Options Backend Module
======================================
Returns restaurants/food spots from Supabase filtered by location and budget.
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


# ── Food type heuristics ────────────────────────────────────────────────────
FOOD_TYPES = ["Pure Veg", "Veg & Non-Veg", "South Indian", "North Indian", "Street Food", "Sattvic"]
FOOD_SPECIALTIES = [
    "Thali meals", "Dosas & Idli", "Chole Bhature", "Poori Sabzi",
    "Rajasthani Thali", "Prasadam meals", "South Indian breakfast",
    "Temple locality meals", "Budget thali", "Paneer specials",
    "Rice & Sambar", "Pav Bhaji", "Chaat & Snacks", "Sweets & Mithai",
]


async def get_food_options(
    lat: float, lng: float, budget: int = 500,
    radius_km: float = 30, food_type: str = "all",
) -> list[dict]:
    """
    Return food options near the location within the given budget.
    """
    url = f"{SUPABASE_URL}/rest/v1/places?select=*&category=eq.restaurant&limit=500"
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url, headers=HEADERS)
        resp.raise_for_status()
        restaurants = resp.json()

    results = []
    for p in restaurants:
        try:
            plat = _safe_float(p.get("latitude"))
            plng = _safe_float(p.get("longitude"))
            dist = round(haversine(lat, lng, plat, plng), 1)
            if dist > radius_km:
                continue

            rating = _safe_float(p.get("rating") or 3.5)

            # Simulate pricing tiers
            price_low = random.choice([50, 80, 100, 120, 150])
            price_high = price_low + random.choice([50, 100, 150, 200, 300])
            avg_meal = (price_low + price_high) // 2

            if avg_meal > budget:
                continue

            # Assign food type
            ftype = random.choice(FOOD_TYPES)
            is_veg = ftype in ["Pure Veg", "South Indian", "Sattvic"]

            # Near temple = more likely pure veg
            near_temple = dist < 5
            if near_temple and random.random() > 0.3:
                ftype = random.choice(["Pure Veg", "Sattvic", "South Indian"])
                is_veg = True

            if food_type == "veg" and not is_veg:
                continue
            if food_type == "nonveg" and is_veg:
                continue

            results.append({
                "id": p.get("id"),
                "name": p.get("name", "Restaurant"),
                "description": p.get("description", "") or random.choice(FOOD_SPECIALTIES),
                "lat": plat,
                "lng": plng,
                "distance": dist,
                "rating": round(rating, 1),
                "priceLow": price_low,
                "priceHigh": price_high,
                "avgMealCost": avg_meal,
                "foodType": ftype,
                "isVeg": is_veg,
                "specialty": random.choice(FOOD_SPECIALTIES),
                "vegEmoji": "🍽" if is_veg else "🥗",
                "ratingEmoji": "⭐" if rating >= 4.0 else "",
                "budgetEmoji": "🥗" if avg_meal < 200 else "",
            })
        except Exception:
            continue

    results.sort(key=lambda x: x["distance"])

    # If we have few restaurant results, generate some temple-area food spots
    if len(results) < 5:
        for i in range(5 - len(results)):
            price_low = random.choice([30, 50, 80])
            price_high = price_low + random.choice([30, 50, 80])
            results.append({
                "id": f"local_food_{i}",
                "name": f"Temple Area Eatery {i + 1}",
                "description": "Simple vegetarian meals near temple",
                "lat": lat + random.uniform(-0.01, 0.01),
                "lng": lng + random.uniform(-0.01, 0.01),
                "distance": round(random.uniform(0.2, 3.0), 1),
                "rating": round(random.uniform(3.5, 4.5), 1),
                "priceLow": price_low,
                "priceHigh": price_high,
                "avgMealCost": (price_low + price_high) // 2,
                "foodType": "Pure Veg",
                "isVeg": True,
                "specialty": random.choice(["Prasadam meals", "Simple thali", "Temple area snacks"]),
                "vegEmoji": "🍽",
                "ratingEmoji": "⭐",
                "budgetEmoji": "🥗",
            })

    return results[:20]
