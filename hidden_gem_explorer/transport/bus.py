"""
transport/bus.py — Bus route options between cities
====================================================
Generates realistic bus options using Indian route data heuristics.
Returns bus schedules with pricing, seat availability, comfort class.
"""

import random
import math
from datetime import datetime, timedelta


# ── Indian bus operators by region ───────────────────────────────────────────

OPERATORS = {
    "north": ["HRTC", "UPSRTC", "RSRTC", "DTC", "Punjab Roadways", "RedBus Express", "VRL Travels", "Zing Bus"],
    "south": ["KSRTC", "APSRTC", "TNSTC", "TSRTC", "Orange Travels", "SRS Travels", "KPN Travels", "IntrCity"],
    "west": ["GSRTC", "MSRTC", "Neeta Travels", "Paulo Travels", "VRL Travels", "RedBus Express"],
    "east": ["NBSTC", "BSRTC", "OSRTC", "SB Express", "Royal Cruiser", "Jabbar Travels"],
    "central": ["MPSRTC", "UPSRTC", "CSRTC", "Shyamoli Paribahan", "VRL Travels"],
}

BUS_TYPES = [
    {"type": "Non-AC Seater", "emoji": "🌡", "comfort": "basic", "multiplier": 1.0},
    {"type": "AC Seater", "emoji": "❄", "comfort": "standard", "multiplier": 1.6},
    {"type": "AC Sleeper", "emoji": "🛏", "comfort": "premium", "multiplier": 2.2},
    {"type": "Volvo AC", "emoji": "❄", "comfort": "luxury", "multiplier": 2.8},
    {"type": "Non-AC Sleeper", "emoji": "🛏", "comfort": "economy", "multiplier": 1.5},
]

# Base fare ₹/km
BASE_FARE_PER_KM = 1.2


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _detect_region(lat: float, lng: float) -> str:
    if lat > 26:
        return "north"
    elif lat < 15:
        return "south"
    elif lng < 76:
        return "west"
    elif lng > 85:
        return "east"
    return "central"


def _generate_bus_number() -> str:
    prefix = random.choice(["KA", "MH", "DL", "TN", "UP", "RJ", "GJ", "AP", "TS", "KL"])
    num = random.randint(1, 99)
    suffix = random.randint(1000, 9999)
    return f"{prefix}-{num:02d}-{suffix}"


def get_bus_options(
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
    Generate bus options between two cities.
    Returns list of bus options with pricing, timing, availability.
    """
    distance = _haversine(from_lat, from_lng, to_lat, to_lng)

    # Bus only practical for < 1500 km
    if distance > 1500:
        return []

    # Road distance ~1.3x aerial
    road_km = round(distance * 1.3, 1)

    region = _detect_region(from_lat, from_lng)
    operators = OPERATORS.get(region, OPERATORS["central"])

    # Parse date
    try:
        travel_date = datetime.strptime(date, "%Y-%m-%d") if date else datetime.now() + timedelta(days=1)
    except ValueError:
        travel_date = datetime.now() + timedelta(days=1)

    is_weekend = travel_date.weekday() >= 5
    surge = 1.3 if is_weekend else 1.0

    # Generate 4-8 bus options
    count = min(8, max(4, int(distance / 80)))
    options = []

    for i in range(count):
        bus_type = random.choice(BUS_TYPES)
        operator = random.choice(operators)
        base_price = road_km * BASE_FARE_PER_KM * bus_type["multiplier"] * surge

        # Add some variance
        price = round(base_price * random.uniform(0.85, 1.15))
        price = max(80, price)  # Minimum ₹80

        # Duration: average 40-55 km/h for buses
        speed = random.uniform(35, 55)
        duration_hrs = road_km / speed
        dur_h = int(duration_hrs)
        dur_m = int((duration_hrs - dur_h) * 60)

        # Random departure between 5 AM and 11 PM
        dep_hour = random.randint(5, 23)
        dep_min = random.choice([0, 15, 30, 45])
        departure = travel_date.replace(hour=dep_hour, minute=dep_min, second=0)
        arrival = departure + timedelta(hours=duration_hrs)

        seats = random.randint(0, 40)

        option = {
            "busNumber": _generate_bus_number(),
            "operator": operator,
            "busType": bus_type["type"],
            "comfortEmoji": bus_type["emoji"],
            "comfort": bus_type["comfort"],
            "departureTime": departure.strftime("%I:%M %p"),
            "arrivalTime": arrival.strftime("%I:%M %p"),
            "duration": f"{dur_h}h {dur_m}m",
            "durationMinutes": dur_h * 60 + dur_m,
            "ticketPrice": price,
            "seatsAvailable": seats,
            "distance": road_km,
            "from": from_city,
            "to": to_city,
            "date": travel_date.strftime("%Y-%m-%d"),
            "withinBudget": budget_per_person <= 0 or price <= budget_per_person,
            "rating": round(random.uniform(3.2, 4.8), 1),
        }
        options.append(option)

    # Sort by departure time
    options.sort(key=lambda x: x["durationMinutes"])
    return options
