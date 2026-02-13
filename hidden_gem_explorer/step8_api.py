"""
STEP 8 — FastAPI Server
3 API endpoints:
  GET /hidden-nearby     → recommend_hidden_places()
  GET /hidden-temples    → recommend_hidden_temples()
  GET /crowd-predict     → predict_crowd_level()
Plus bonus endpoints for the other recommendation functions.
"""

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import sys
import os
import math
import httpx

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from step7_recommendations import (
    recommend_hidden_places,
    recommend_hidden_temples,
    weekend_quiet_spots,
    budget_friendly_spots,
    predict_crowd_level,
)
from step10_trip_planner import generate_trip_plan, search_cities
from devotional import get_devotional_places
from stays import get_stay_options
from food import get_food_options
from itinerary import generate_devotional_itinerary
from ai_chat import chat_response
from transport.bus import get_bus_options
from transport.train import get_train_options
from transport.flight import check_flight_available, get_flight_options

app = FastAPI(
    title="Hidden Gem Explorer India",
    description="AI/ML-powered hidden tourist spot discovery API for India",
    version="1.0.0",
)

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "service": "Hidden Gem Explorer India",
        "version": "1.0.0",
        "endpoints": [
            "GET /hidden-nearby",
            "GET /hidden-temples",
            "GET /crowd-predict",
            "GET /weekend-spots",
            "GET /budget-spots",
            "GET /search-cities?q=...",
            "POST /plan-trip",
        ],
    }


# ── City autocomplete search ────────────────────────────────────────────────

@app.get("/search-cities")
async def search_cities_endpoint(
    q: str = Query(..., min_length=2, description="City search query"),
    limit: int = Query(8, ge=1, le=20),
):
    """Real-time city search using Photon + Supabase + local DB for Indian places."""
    results = await search_cities(q, limit)
    return {"query": q, "results": results}


@app.get("/hidden-nearby")
def hidden_nearby(
    lat: float = Query(..., description="User latitude"),
    lon: float = Query(..., description="User longitude"),
    radius_km: float = Query(50.0, description="Search radius in km"),
    top_n: int = Query(10, ge=1, le=50, description="Max results"),
):
    """Find top hidden gems near user location."""
    results = recommend_hidden_places(lat, lon, radius_km, top_n)
    return {"count": len(results), "results": results}


@app.get("/hidden-temples")
def hidden_temples(
    lat: float = Query(..., description="User latitude"),
    lon: float = Query(..., description="User longitude"),
    radius_km: float = Query(100.0, description="Search radius in km"),
    top_n: int = Query(10, ge=1, le=50, description="Max results"),
):
    """Find hidden temples and worship places nearby."""
    results = recommend_hidden_temples(lat, lon, radius_km, top_n)
    return {"count": len(results), "results": results}


@app.get("/crowd-predict")
def crowd_predict(
    lat: float = Query(..., description="Location latitude"),
    lon: float = Query(..., description="Location longitude"),
    month: int = Query(10, ge=1, le=12, description="Month (1-12)"),
):
    """Predict crowd level at a location for a given month."""
    return predict_crowd_level(lat, lon, month)


@app.get("/weekend-spots")
def weekend_spots_endpoint(
    lat: float = Query(..., description="User latitude"),
    lon: float = Query(..., description="User longitude"),
    max_km: float = Query(150.0, description="Max distance in km"),
    top_n: int = Query(10, ge=1, le=50, description="Max results"),
):
    """Find quiet weekend getaways nearby."""
    results = weekend_quiet_spots(lat, lon, max_km, top_n)
    return {"count": len(results), "results": results}


@app.get("/budget-spots")
def budget_spots_endpoint(
    lat: float = Query(..., description="User latitude"),
    lon: float = Query(..., description="User longitude"),
    radius_km: float = Query(100.0, description="Search radius in km"),
    top_n: int = Query(10, ge=1, le=50, description="Max results"),
):
    """Find budget-friendly hidden gems with good connectivity."""
    results = budget_friendly_spots(lat, lon, radius_km, top_n)
    return {"count": len(results), "results": results}


# ── Trip Planner ─────────────────────────────────────────────────────────────

class TripRequest(BaseModel):
    from_location: str = "Current Location"
    destination: str
    budget_min: int = 5000
    budget_max: int = 25000
    days: int = 3
    transport_mode: str = "mixed"
    rating: float = 3.5
    hidden_spots: bool = True
    distance: float = 100


@app.post("/generate-trip")
async def generate_trip(req: TripRequest):
    """
    Generate a multi-day trip itinerary using real Supabase places
    and ML-powered hidden gem recommendations.
    """
    try:
        plan = await generate_trip_plan(
            from_name=req.from_location,
            destination=req.destination,
            budget_min=req.budget_min,
            budget_max=req.budget_max,
            days=req.days,
            transport_mode=req.transport_mode,
            rating=req.rating,
            include_hidden=req.hidden_spots,
            distance_km=req.distance,
        )
        return plan
    except ValueError as e:
        return {"error": str(e)}
    except Exception as e:
        return {"error": f"Trip generation failed: {e}"}


# ── Devotional Trip Planner Endpoints ────────────────────────────────────────

class StayRequest(BaseModel):
    budget: int = 5000
    number_of_persons: int = 1
    number_of_days: int = 1
    lat: float
    lng: float
    temple_lat: float = 0
    temple_lng: float = 0

class ItineraryRequest(BaseModel):
    budget: int = 10000
    days: int = 2
    persons: int = 1
    temple_name: str
    temple_lat: float
    temple_lng: float
    travel_mode: str = "mixed"
    include_hidden: bool = True

class ChatRequest(BaseModel):
    message: str
    context: dict = {}


@app.get("/devotional-places")
async def devotional_places(
    lat: float = Query(..., description="User latitude"),
    lng: float = Query(..., description="User longitude"),
    radius_km: float = Query(100.0),
    min_rating: float = Query(0),
    crowd_filter: str = Query("all", description="all, low, medium, high"),
    sort_by: str = Query("distance", description="distance, rating, crowd"),
):
    """Fetch devotional places with enriched data: timings, crowd, festivals, fees."""
    try:
        places = await get_devotional_places(lat, lng, radius_km, min_rating, crowd_filter, sort_by)
        return {"count": len(places), "results": places}
    except Exception as e:
        return {"error": str(e)}


@app.post("/stay-options")
async def stay_options(req: StayRequest):
    """Budget-based stay options near devotional sites."""
    try:
        stays = await get_stay_options(
            req.lat, req.lng, req.budget,
            req.number_of_persons, req.number_of_days,
            temple_lat=req.temple_lat, temple_lng=req.temple_lng,
        )
        return {"count": len(stays), "results": stays}
    except Exception as e:
        return {"error": str(e)}


@app.get("/food-options")
async def food_options(
    lat: float = Query(...),
    lng: float = Query(...),
    budget: int = Query(500),
    food_type: str = Query("all", description="all, veg, nonveg"),
):
    """Food options near a devotional location."""
    try:
        foods = await get_food_options(lat, lng, budget, food_type=food_type)
        return {"count": len(foods), "results": foods}
    except Exception as e:
        return {"error": str(e)}


@app.post("/generate-itinerary")
async def generate_itinerary(req: ItineraryRequest):
    """Generate a complete devotional trip itinerary."""
    try:
        plan = await generate_devotional_itinerary(
            req.temple_lat, req.temple_lng, req.temple_name,
            req.budget, req.days, req.persons, req.travel_mode, req.include_hidden,
        )
        return plan
    except Exception as e:
        return {"error": f"Itinerary generation failed: {e}"}


@app.post("/ai-chat")
async def ai_chat(req: ChatRequest):
    """Context-aware AI chat for devotional trip planning."""
    try:
        response = chat_response(req.message, req.context)
        return {"response": response}
    except Exception as e:
        return {"response": f"Sorry, I couldn't process that. Error: {e}"}


# ── Transport Endpoints ──────────────────────────────────────────────────────

class TransportRequest(BaseModel):
    from_city: str
    to_city: str
    from_lat: float = 0
    from_lng: float = 0
    to_lat: float = 0
    to_lng: float = 0
    date: str = ""
    budget_per_person: int = 0

class RouteRequest(BaseModel):
    from_lat: float
    from_lng: float
    to_lat: float
    to_lng: float
    mode: str = "car"  # car, walk, bike


@app.get("/bus-options")
async def bus_options(
    from_city: str = Query(...),
    to_city: str = Query(...),
    from_lat: float = Query(0),
    from_lng: float = Query(0),
    to_lat: float = Query(0),
    to_lng: float = Query(0),
    date: str = Query(""),
    budget_per_person: int = Query(0),
):
    """Get bus options between two cities. Cities are required — no defaults."""
    try:
        # Geocode if lat/lng not provided
        from step10_trip_planner import geocode
        if from_lat == 0 and from_lng == 0:
            coords = await geocode(from_city)
            if coords: from_lat, from_lng = coords
        if to_lat == 0 and to_lng == 0:
            coords = await geocode(to_city)
            if coords: to_lat, to_lng = coords
        if from_lat == 0 or to_lat == 0:
            return {"error": "Could not geocode cities. Please provide valid city names."}
        buses = get_bus_options(from_city, to_city, from_lat, from_lng, to_lat, to_lng, date, budget_per_person)
        return {"count": len(buses), "results": buses, "mode": "bus"}
    except Exception as e:
        return {"error": str(e)}


@app.get("/train-options")
async def train_options(
    from_city: str = Query(...),
    to_city: str = Query(...),
    from_lat: float = Query(0),
    from_lng: float = Query(0),
    to_lat: float = Query(0),
    to_lng: float = Query(0),
    date: str = Query(""),
    budget_per_person: int = Query(0),
):
    """Get train options between two cities. Cities are required — no defaults."""
    try:
        from step10_trip_planner import geocode
        if from_lat == 0 and from_lng == 0:
            coords = await geocode(from_city)
            if coords: from_lat, from_lng = coords
        if to_lat == 0 and to_lng == 0:
            coords = await geocode(to_city)
            if coords: to_lat, to_lng = coords
        if from_lat == 0 or to_lat == 0:
            return {"error": "Could not geocode cities. Please provide valid city names."}
        trains = get_train_options(from_city, to_city, from_lat, from_lng, to_lat, to_lng, date, budget_per_person)
        return {"count": len(trains), "results": trains, "mode": "train"}
    except Exception as e:
        return {"error": str(e)}


@app.get("/city-distance")
async def city_distance(
    from_city: str = Query(...),
    to_city: str = Query(...),
    from_lat: float = Query(0),
    from_lng: float = Query(0),
    to_lat: float = Query(0),
    to_lng: float = Query(0),
):
    """Geocode two cities (or use provided coords) and return haversine distance + flight availability."""
    try:
        from step10_trip_planner import geocode

        # Use provided coordinates if available, else geocode
        if from_lat != 0 and from_lng != 0:
            pass
        else:
            from_coords = await geocode(from_city)
            if from_coords:
                from_lat, from_lng = from_coords

        if to_lat != 0 and to_lng != 0:
            pass
        else:
            to_coords = await geocode(to_city)
            if to_coords:
                to_lat, to_lng = to_coords

        if from_lat == 0 or to_lat == 0:
            return {"error": "Could not geocode one or both cities"}
        R = 6371
        p1, p2 = math.radians(from_lat), math.radians(to_lat)
        dp = math.radians(to_lat - from_lat)
        dl = math.radians(to_lng - from_lng)
        a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
        distance = R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        flight_info = check_flight_available(from_city, to_city)

        return {
            "distance": round(distance, 1),
            "flightAvailable": flight_info.get("flightAvailable", False),
            "fromLat": from_lat,
            "fromLng": from_lng,
            "toLat": to_lat,
            "toLng": to_lng,
        }
    except Exception as e:
        return {"error": str(e)}


@app.get("/flight-check")
async def flight_check(
    from_city: str = Query(...),
    to_city: str = Query(...),
):
    """Check if flight route exists between two cities."""
    try:
        return check_flight_available(from_city, to_city)
    except Exception as e:
        return {"flightAvailable": False, "error": str(e)}


@app.get("/flight-options")
async def flight_options(
    from_city: str = Query(...),
    to_city: str = Query(...),
    from_lat: float = Query(0),
    from_lng: float = Query(0),
    to_lat: float = Query(0),
    to_lng: float = Query(0),
    date: str = Query(""),
    budget_per_person: int = Query(0),
):
    """Get flight options between two cities. Cities are required — no defaults."""
    try:
        from step10_trip_planner import geocode
        if from_lat == 0 and from_lng == 0:
            coords = await geocode(from_city)
            if coords: from_lat, from_lng = coords
        if to_lat == 0 and to_lng == 0:
            coords = await geocode(to_city)
            if coords: to_lat, to_lng = coords
        if from_lat == 0 or to_lat == 0:
            return {"error": "Could not geocode cities. Please provide valid city names."}
        flights = get_flight_options(from_city, to_city, from_lat, from_lng, to_lat, to_lng, date, budget_per_person)
        return {"count": len(flights), "results": flights, "mode": "flight"}
    except Exception as e:
        return {"error": str(e)}


@app.post("/route")
async def get_route(req: RouteRequest):
    """
    Get route between two points using OSRM.
    Falls back to straight-line calculation if OSRM unavailable.
    """
    import math
    try:
        profile = {"car": "driving", "walk": "foot", "bike": "cycling"}.get(req.mode, "driving")
        osrm_url = f"http://router.project-osrm.org/route/v1/{profile}/{req.from_lng},{req.from_lat};{req.to_lng},{req.to_lat}?overview=full&geometries=geojson&alternatives=true"

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(osrm_url)

        if resp.status_code == 200:
            data = resp.json()
            routes = []
            for i, route in enumerate(data.get("routes", [])):
                dist_km = round(route["distance"] / 1000, 1)
                dur_min = round(route["duration"] / 60)
                dur_h = dur_min // 60
                dur_m = dur_min % 60
                coords = route["geometry"]["coordinates"]
                # Convert [lng, lat] to [lat, lng] for Leaflet
                latlngs = [[c[1], c[0]] for c in coords]

                routes.append({
                    "index": i,
                    "distance": dist_km,
                    "duration": f"{dur_h}h {dur_m}m" if dur_h else f"{dur_m}m",
                    "durationMinutes": dur_min,
                    "coordinates": latlngs,
                    "isAlternate": i > 0,
                })
            return {"routes": routes, "source": "osrm"}

        raise Exception("OSRM unavailable")

    except Exception:
        # Fallback: straight-line distance
        R = 6371
        p1, p2 = math.radians(req.from_lat), math.radians(req.to_lat)
        dp = math.radians(req.to_lat - req.from_lat)
        dl = math.radians(req.to_lng - req.from_lng)
        a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
        dist = R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        speed = {"car": 60, "walk": 5, "bike": 20}.get(req.mode, 60)
        dur_min = round((dist / speed) * 60)
        dur_h = dur_min // 60
        dur_m = dur_min % 60

        return {
            "routes": [{
                "index": 0,
                "distance": round(dist * 1.3, 1),
                "duration": f"{dur_h}h {dur_m}m" if dur_h else f"{dur_m}m",
                "durationMinutes": dur_min,
                "coordinates": [[req.from_lat, req.from_lng], [req.to_lat, req.to_lng]],
                "isAlternate": False,
            }],
            "source": "fallback",
        }


# ── AI Plan Trip (enhanced) ─────────────────────────────────────────────────

class SmartPlanRequest(BaseModel):
    from_city: str  # Required — user must provide starting city
    to_city: str    # Required — user must provide destination city
    from_lat: float = 0
    from_lng: float = 0
    to_lat: float = 0
    to_lng: float = 0
    budget: int = 5000
    days: int = 2
    persons: int = 1
    date: str = ""
    rating: float = 3.5
    distance_km: float = 500
    transport_mode: str = "auto"
    hidden_gems: bool = False


@app.post("/plan-trip")
async def plan_trip(req: SmartPlanRequest):
    """
    Comprehensive AI trip plan with transport, route, budget, and suggestions.
    All data is based on user's actual from/to cities — NO defaults.
    """
    import math

    # Validate: both cities must be provided by user
    if not req.from_city.strip():
        return {"error": "Starting city (From) is required. Please enter where you're starting from."}
    if not req.to_city.strip():
        return {"error": "Destination city (To) is required. Please enter where you want to go."}

    try:
        from step10_trip_planner import geocode

        # Geocode FROM city — no defaults, user must provide a valid city
        from_lat, from_lng = req.from_lat, req.from_lng
        if from_lat == 0 and from_lng == 0:
            if req.from_city.strip():
                from_coords = await geocode(req.from_city)
                if from_coords:
                    from_lat, from_lng = from_coords
            if from_lat == 0 and from_lng == 0:
                return {"error": f"Could not find '{req.from_city}' on map. Please enter a valid starting city."}

        # Geocode TO city if coordinates not provided
        to_lat, to_lng = req.to_lat, req.to_lng
        if to_lat == 0 and to_lng == 0:
            coords = await geocode(req.to_city)
            if coords:
                to_lat, to_lng = coords
            else:
                return {"error": f"Could not find '{req.to_city}' on map"}

        # Calculate distance using geocoded coordinates
        R = 6371
        p1, p2 = math.radians(from_lat), math.radians(to_lat)
        dp = math.radians(to_lat - from_lat)
        dl = math.radians(to_lng - from_lng)
        a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
        distance = R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        # Distance emoji
        if distance < 10:
            dist_emoji = "🚶"
            dist_label = "Quick Escape"
        elif distance < 50:
            dist_emoji = "🚗"
            dist_label = "Short Trip"
        elif distance < 200:
            dist_emoji = "🏞"
            dist_label = "Weekend Trip"
        else:
            dist_emoji = "✈"
            dist_label = "Adventure Mode"

        # Budget emoji
        budget_per_person = req.budget // max(1, req.persons)
        if budget_per_person < 1500:
            budget_emoji = "💸"
            budget_label = "Budget Explorer"
        elif budget_per_person < 5000:
            budget_emoji = "🌍"
            budget_label = "Smart Traveler"
        else:
            budget_emoji = "✨"
            budget_label = "Premium Escape"

        # Smart transport recommendation
        transport_budget = round(req.budget * 0.3)  # 30% for transport
        per_person_transport = transport_budget // max(1, req.persons)

        recommended_mode = req.transport_mode
        if req.transport_mode == "auto":
            if distance < 10:
                recommended_mode = "walk"
            elif distance < 100:
                recommended_mode = "bus"
            elif distance < 500:
                recommended_mode = "train"
            else:
                recommended_mode = "flight"

        # Fetch transport options using geocoded coordinates
        buses = get_bus_options(req.from_city, req.to_city, from_lat, from_lng, to_lat, to_lng, req.date, per_person_transport) if distance < 1500 else []
        trains = get_train_options(req.from_city, req.to_city, from_lat, from_lng, to_lat, to_lng, req.date, per_person_transport) if distance < 3000 else []
        flight_avail = check_flight_available(req.from_city, req.to_city)
        flights = get_flight_options(req.from_city, req.to_city, from_lat, from_lng, to_lat, to_lng, req.date, per_person_transport) if flight_avail.get("flightAvailable") else []

        # Generate trip plan from original planner
        plan = await generate_trip_plan(
            from_name=req.from_city,
            destination=req.to_city,
            budget_min=req.budget // 2,
            budget_max=req.budget,
            days=req.days,
            transport_mode=recommended_mode,
            rating=req.rating,
            include_hidden=req.hidden_gems,
            distance_km=req.distance_km,
        )

        # Crowd prediction
        crowd = predict_crowd_level(to_lat, to_lng, datetime.now().month if not req.date else int(req.date.split("-")[1]))

        # Budget breakdown
        transport_cost = 0
        if recommended_mode == "bus" and buses:
            transport_cost = buses[0]["ticketPrice"] * req.persons
        elif recommended_mode == "train" and trains:
            transport_cost = trains[0]["cheapestPrice"] * req.persons
        elif recommended_mode == "flight" and flights:
            transport_cost = flights[0]["ticketPrice"] * req.persons

        stay_budget = round((req.budget - transport_cost) * 0.4)
        food_budget = round((req.budget - transport_cost) * 0.3)
        activity_budget = round((req.budget - transport_cost) * 0.2)
        buffer = req.budget - transport_cost - stay_budget - food_budget - activity_budget

        # AI suggestion text
        best_transport = ""
        if recommended_mode == "flight" and flights:
            f = flights[0]
            best_transport = f"✈ {f['airline']} {f['flightNumber']} at {f['departureTime']} — ₹{f['ticketPrice']}/person ({f['duration']})"
        elif recommended_mode == "train" and trains:
            t = trains[0]
            best_transport = f"🚆 {t['trainName']} at {t['departureTime']} — ₹{t['cheapestPrice']}/person ({t['duration']})"
        elif buses:
            b = buses[0]
            best_transport = f"🚌 {b['operator']} {b['busType']} at {b['departureTime']} — ₹{b['ticketPrice']}/person ({b['duration']})"

        suggestion = (
            f"{dist_emoji} {req.to_city} is {round(distance)}km away — {dist_label}!\n"
            f"{budget_emoji} Your budget: ₹{req.budget:,} ({budget_label})\n"
            f"👥 {req.persons} person{'s' if req.persons > 1 else ''} × {req.days} day{'s' if req.days > 1 else ''}\n\n"
        )
        if best_transport:
            suggestion += f"🎫 Best transport: {best_transport}\n"
        suggestion += f"🏨 Stay budget: ₹{stay_budget:,}\n"
        suggestion += f"🍽 Food budget: ₹{food_budget:,}\n"
        suggestion += f"📊 Crowd: {crowd.get('crowd_level', 'unknown').title()} {_crowd_emoji(crowd.get('crowd_level', ''))}\n"

        if req.hidden_gems:
            suggestion += f"🔮 Includes hidden gems from ML model!\n"

        return {
            "plan": plan,
            "transport": {
                "recommended": recommended_mode,
                "buses": buses[:5],
                "trains": trains[:5],
                "flights": flights[:5],
                "flightAvailable": flight_avail.get("flightAvailable", False),
            },
            "distance": round(distance, 1),
            "distanceEmoji": dist_emoji,
            "distanceLabel": dist_label,
            "budgetEmoji": budget_emoji,
            "budgetLabel": budget_label,
            "budgetBreakdown": {
                "transport": transport_cost,
                "stay": stay_budget,
                "food": food_budget,
                "activities": activity_budget,
                "buffer": buffer,
                "total": req.budget,
            },
            "crowd": crowd,
            "suggestion": suggestion,
            "meta": {
                "from": req.from_city,
                "to": req.to_city,
                "fromLat": from_lat,
                "fromLng": from_lng,
                "toLat": to_lat,
                "toLng": to_lng,
                "days": req.days,
                "persons": req.persons,
                "budget": req.budget,
            },
        }

    except Exception as e:
        return {"error": f"Plan generation failed: {e}"}


def _crowd_emoji(level: str) -> str:
    return {"low": "🟢", "medium": "🟡", "high": "🔴"}.get(level, "⚪")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("step8_api:app", host="0.0.0.0", port=8000, reload=True)
