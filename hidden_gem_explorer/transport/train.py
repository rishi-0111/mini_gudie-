"""
transport/train.py — Train options between cities
===================================================
Generates realistic Indian Railways train options with
class-wise pricing, seat availability, and timing.
"""

import random
import math
from datetime import datetime, timedelta


# ── Indian Railways data ─────────────────────────────────────────────────────

TRAIN_NAMES = [
    "Rajdhani Express", "Shatabdi Express", "Duronto Express",
    "Garib Rath Express", "Humsafar Express", "Tejas Express",
    "Vande Bharat Express", "Superfast Express", "Jan Shatabdi Express",
    "Sampark Kranti Express", "Express Mail", "Intercity Express",
    "AC Express", "Vivek Express", "Karnataka Express",
    "Tamil Nadu Express", "Kerala Express", "Deccan Queen",
    "Punjab Mail", "Grand Trunk Express", "Konkan Kanya Express",
    "Mysore Express", "Godavari Express", "Gitanjali Express",
]

CLASSES = [
    {"code": "1A", "name": "First AC", "emoji": "🏆", "multiplier": 4.0, "seats_max": 18},
    {"code": "2A", "name": "AC 2-Tier", "emoji": "❄", "multiplier": 2.5, "seats_max": 48},
    {"code": "3A", "name": "AC 3-Tier", "emoji": "❄", "multiplier": 1.8, "seats_max": 64},
    {"code": "SL", "name": "Sleeper", "emoji": "🛏", "multiplier": 1.0, "seats_max": 72},
    {"code": "GN", "name": "General", "emoji": "🎫", "multiplier": 0.5, "seats_max": 90},
    {"code": "CC", "name": "AC Chair Car", "emoji": "❄", "multiplier": 2.0, "seats_max": 60},
]

# Base sleeper fare ₹/km
BASE_FARE_PER_KM = 0.55


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _generate_train_number() -> str:
    return str(random.randint(10001, 29999))


def get_train_options(
    from_city: str,
    to_city: str,
    from_lat: float,
    from_lng: float,
    to_lat: float,
    to_lng: float,
    date: str = "",
    budget_per_person: int = 0,
) -> list[dict]:
    """
    Generate train options between two cities.
    Returns list of trains with class-wise pricing.
    """
    distance = _haversine(from_lat, from_lng, to_lat, to_lng)

    # Trains practical up to ~3000 km
    if distance > 3000:
        return []

    rail_km = round(distance * 1.15, 1)  # Rail distance ~ 1.15x aerial

    try:
        travel_date = datetime.strptime(date, "%Y-%m-%d") if date else datetime.now() + timedelta(days=1)
    except ValueError:
        travel_date = datetime.now() + timedelta(days=1)

    # 3-8 trains depending on distance
    if distance < 200:
        count = random.randint(4, 7)
        speed_range = (60, 100)
    elif distance < 500:
        count = random.randint(3, 6)
        speed_range = (50, 80)
    else:
        count = random.randint(2, 5)
        speed_range = (45, 70)

    options = []
    used_names = set()

    for i in range(count):
        # Pick unique train name
        name = random.choice(TRAIN_NAMES)
        while name in used_names and len(used_names) < len(TRAIN_NAMES):
            name = random.choice(TRAIN_NAMES)
        used_names.add(name)

        speed = random.uniform(*speed_range)
        duration_hrs = rail_km / speed
        dur_h = int(duration_hrs)
        dur_m = int((duration_hrs - dur_h) * 60)

        dep_hour = random.randint(4, 22)
        dep_min = random.choice([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55])
        departure = travel_date.replace(hour=dep_hour, minute=dep_min, second=0)
        arrival = departure + timedelta(hours=duration_hrs)

        # Class-wise availability and pricing
        # Short distance: skip sleeper/1A, add CC
        available_classes = []
        for cls in CLASSES:
            # Skip sleeper classes for short distance day trains
            if distance < 200 and cls["code"] in ("SL", "1A"):
                continue
            # Skip GN for premium trains
            if "Rajdhani" in name and cls["code"] == "GN":
                continue
            if "Shatabdi" in name and cls["code"] in ("SL", "GN"):
                continue

            base_price = rail_km * BASE_FARE_PER_KM * cls["multiplier"]
            price = round(base_price * random.uniform(0.9, 1.1))
            price = max(50, price)
            seats = random.randint(0, cls["seats_max"])

            available_classes.append({
                "code": cls["code"],
                "name": cls["name"],
                "emoji": cls["emoji"],
                "price": price,
                "seatsAvailable": seats,
                "withinBudget": budget_per_person <= 0 or price <= budget_per_person,
            })

        # Find cheapest within-budget class
        cheapest = min(available_classes, key=lambda x: x["price"])

        option = {
            "trainNumber": _generate_train_number(),
            "trainName": name,
            "departureTime": departure.strftime("%I:%M %p"),
            "arrivalTime": arrival.strftime("%I:%M %p"),
            "duration": f"{dur_h}h {dur_m}m",
            "durationMinutes": dur_h * 60 + dur_m,
            "distance": rail_km,
            "classes": available_classes,
            "cheapestPrice": cheapest["price"],
            "cheapestClass": cheapest["code"],
            "from": from_city,
            "to": to_city,
            "date": travel_date.strftime("%Y-%m-%d"),
            "rating": round(random.uniform(3.5, 4.9), 1),
        }
        options.append(option)

    options.sort(key=lambda x: x["departureTime"])
    return options
