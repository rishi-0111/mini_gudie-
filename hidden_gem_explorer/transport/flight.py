"""
transport/flight.py — Flight availability and options
=======================================================
Checks flight availability between cities and generates
realistic flight options with airline pricing.
"""

import random
import math
from datetime import datetime, timedelta


# ── Indian airline data ──────────────────────────────────────────────────────

AIRLINES = [
    {"name": "IndiGo", "code": "6E", "multiplier": 1.0},
    {"name": "Air India", "code": "AI", "multiplier": 1.3},
    {"name": "SpiceJet", "code": "SG", "multiplier": 0.9},
    {"name": "Vistara", "code": "UK", "multiplier": 1.4},
    {"name": "GoFirst", "code": "G8", "multiplier": 0.85},
    {"name": "AirAsia India", "code": "I5", "multiplier": 0.88},
    {"name": "Akasa Air", "code": "QP", "multiplier": 0.92},
]

# Cities with major airports (IATA codes)
AIRPORT_CITIES = {
    "delhi": "DEL", "new delhi": "DEL", "mumbai": "BOM", "bangalore": "BLR",
    "bengaluru": "BLR", "chennai": "MAA", "kolkata": "CCU", "hyderabad": "HYD",
    "pune": "PNQ", "ahmedabad": "AMD", "jaipur": "JAI", "lucknow": "LKO",
    "goa": "GOI", "kochi": "COK", "thiruvananthapuram": "TRV",
    "bhopal": "BHO", "indore": "IDR", "chandigarh": "IXC", "patna": "PAT",
    "ranchi": "IXR", "nagpur": "NAG", "visakhapatnam": "VTZ",
    "coimbatore": "CJB", "madurai": "IXM", "srinagar": "SXR",
    "varanasi": "VNS", "amritsar": "ATQ", "udaipur": "UDR",
    "jodhpur": "JDH", "leh": "IXL", "agra": "AGR", "mangalore": "IXE",
    "mysore": "MYQ", "mysuru": "MYQ", "guwahati": "GAU",
    "bhubaneswar": "BBI", "imphal": "IMF", "agartala": "IXA",
    "dehradun": "DED", "raipur": "RPR", "jammu": "IXJ",
    "bagdogra": "IXB", "darjeeling": "IXB",
}

# Base fare per km (economy)
BASE_FARE_PER_KM = 4.5


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _get_iata(city: str) -> str | None:
    return AIRPORT_CITIES.get(city.strip().lower())


def _generate_flight_number(code: str) -> str:
    return f"{code}-{random.randint(100, 999)}"


def check_flight_available(from_city: str, to_city: str) -> dict:
    """
    Check if flight route exists between two cities.
    Returns availability status.
    """
    from_iata = _get_iata(from_city)
    to_iata = _get_iata(to_city)

    available = from_iata is not None and to_iata is not None and from_iata != to_iata

    return {
        "from": from_city,
        "to": to_city,
        "fromAirport": from_iata,
        "toAirport": to_iata,
        "flightAvailable": available,
        "reason": (
            "Both cities have airports with regular flights"
            if available
            else "No airport or same city" if from_iata == to_iata
            else f"{'Origin' if not from_iata else 'Destination'} city has no major airport"
        ),
    }


def get_flight_options(
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
    Generate flight options between two cities.
    Returns empty if no airports available.
    """
    from_iata = _get_iata(from_city)
    to_iata = _get_iata(to_city)

    if not from_iata or not to_iata or from_iata == to_iata:
        return []

    distance = _haversine(from_lat, from_lng, to_lat, to_lng)

    if distance < 150:
        return []  # No flights for very short distances

    try:
        travel_date = datetime.strptime(date, "%Y-%m-%d") if date else datetime.now() + timedelta(days=1)
    except ValueError:
        travel_date = datetime.now() + timedelta(days=1)

    is_weekend = travel_date.weekday() >= 5
    surge = 1.25 if is_weekend else 1.0

    # 3-6 flights
    count = random.randint(3, 6)
    options = []

    for i in range(count):
        airline = random.choice(AIRLINES)
        base_price = distance * BASE_FARE_PER_KM * airline["multiplier"] * surge

        # Add variance
        price = round(base_price * random.uniform(0.8, 1.3))
        price = max(1500, price)  # Min ₹1500

        # Flight duration: ~500-800 km/h
        flight_speed = random.uniform(500, 750)
        flight_hrs = distance / flight_speed
        # Add 45 min for taxi/takeoff/landing
        total_hrs = flight_hrs + 0.75
        dur_h = int(total_hrs)
        dur_m = int((total_hrs - dur_h) * 60)

        dep_hour = random.randint(5, 22)
        dep_min = random.choice([0, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55])
        departure = travel_date.replace(hour=dep_hour, minute=dep_min, second=0)
        arrival = departure + timedelta(hours=total_hrs)

        option = {
            "airline": airline["name"],
            "flightNumber": _generate_flight_number(airline["code"]),
            "fromAirport": from_iata,
            "toAirport": to_iata,
            "departureTime": departure.strftime("%I:%M %p"),
            "arrivalTime": arrival.strftime("%I:%M %p"),
            "duration": f"{dur_h}h {dur_m}m",
            "durationMinutes": dur_h * 60 + dur_m,
            "ticketPrice": price,
            "distance": round(distance, 1),
            "from": from_city,
            "to": to_city,
            "date": travel_date.strftime("%Y-%m-%d"),
            "withinBudget": budget_per_person <= 0 or price <= budget_per_person,
            "rating": round(random.uniform(3.5, 4.8), 1),
        }
        options.append(option)

    options.sort(key=lambda x: x["ticketPrice"])
    return options
