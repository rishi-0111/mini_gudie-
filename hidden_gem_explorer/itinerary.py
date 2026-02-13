"""
itinerary.py — Devotional Itinerary Generator
==============================================
Generates devotional-themed multi-day itineraries with
temple visits, darshan timings, food, stays, and hidden spots.
"""

import os
import sys
import math
import random
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))
from devotional import get_devotional_places, haversine, FESTIVALS, _safe_float
from stays import get_stay_options
from food import get_food_options
from step7_recommendations import predict_crowd_level, recommend_hidden_places


async def generate_devotional_itinerary(
    temple_lat: float,
    temple_lng: float,
    temple_name: str,
    budget: int,
    days: int,
    persons: int,
    travel_mode: str = "mixed",
    include_hidden: bool = True,
) -> dict:
    """
    Generate a complete devotional itinerary centered around a specific temple.
    """

    # 1. Get devotional places nearby
    places = await get_devotional_places(temple_lat, temple_lng, radius_km=80, min_rating=3.0)

    # 2. Get stay options
    stay_budget = int(budget * 0.35)
    stays = await get_stay_options(
        temple_lat, temple_lng,
        budget=stay_budget, persons=persons, days=days,
        radius_km=50, temple_lat=temple_lat, temple_lng=temple_lng,
    )

    # 3. Get food options
    food_budget = int(budget / (days * 3))  # per meal budget
    foods = await get_food_options(temple_lat, temple_lng, budget=food_budget, radius_km=30)

    # 4. Get hidden spots
    hidden_spots = []
    if include_hidden:
        try:
            raw = recommend_hidden_places(temple_lat, temple_lng, 80, top_n=8)
            for h in raw:
                score = h.get("hidden_gem_score", 0)
                score = score.item() if hasattr(score, "item") else score
                ud = h.get("user_dist", 0)
                ud = ud.item() if hasattr(ud, "item") else ud
                hidden_spots.append({
                    "name": h.get("name", "Hidden Spot"),
                    "type": h.get("type", "unknown"),
                    "score": round(score, 2),
                    "distance": round(ud, 1),
                    "lat": _safe_float(h.get("lat")),
                    "lng": _safe_float(h.get("lon")),
                    "bestTime": "Early morning or late evening",
                })
        except Exception:
            pass

    # 5. Build day-wise devotional plan
    used_places = set()
    day_plans = []
    total_cost = 0
    month = datetime.now().month
    active_festivals = FESTIVALS.get(month, [])

    # Pick the main temple as the first item
    main_temple = None
    for p in places:
        if p.get("name", "").lower() == temple_name.lower():
            main_temple = p
            break
    if not main_temple and places:
        main_temple = places[0]

    for d in range(1, days + 1):
        # Morning: Temple darshan
        if d == 1 and main_temple:
            morning_place = main_temple
            used_places.add(main_temple.get("id") or main_temple.get("name"))
        else:
            # Pick another temple/devotional place
            remaining = [p for p in places if (p.get("id") or p.get("name")) not in used_places]
            if remaining:
                morning_place = remaining[0]
                used_places.add(morning_place.get("id") or morning_place.get("name"))
            else:
                morning_place = main_temple or places[0] if places else None

        morning = {
            "activity": "🛕 Temple Visit & Morning Darshan",
            "place": morning_place.get("name", temple_name) if morning_place else temple_name,
            "time": "4:30 AM - 11:00 AM" if d == 1 else "6:00 AM - 11:00 AM",
            "description": f"Early morning darshan and pooja. {'🔥 ' + active_festivals[0] + ' celebrations!' if active_festivals else 'Peaceful morning prayers.'}",
            "cost": 0,
            "crowdLevel": morning_place.get("crowdLevel", "medium") if morning_place else "medium",
            "crowdEmoji": morning_place.get("crowdEmoji", "🟡") if morning_place else "🟡",
            "lat": morning_place.get("lat", temple_lat) if morning_place else temple_lat,
            "lng": morning_place.get("lng", temple_lng) if morning_place else temple_lng,
        }

        # Lunch
        lunch_spot = foods[d % len(foods)] if foods else None
        lunch = {
            "activity": "🍽 Lunch - Pure Veg",
            "place": lunch_spot.get("name", "Local Eatery") if lunch_spot else "Local Eatery",
            "time": "12:00 PM - 1:30 PM",
            "description": f"{lunch_spot.get('specialty', 'Simple vegetarian meals')}" if lunch_spot else "Simple vegetarian thali",
            "cost": lunch_spot.get("avgMealCost", 150) * persons if lunch_spot else 150 * persons,
            "lat": lunch_spot.get("lat", temple_lat) if lunch_spot else temple_lat,
            "lng": lunch_spot.get("lng", temple_lng) if lunch_spot else temple_lng,
        }

        # Afternoon: Nearby sightseeing or hidden spot
        afternoon_spot = None
        if include_hidden and hidden_spots and d <= len(hidden_spots):
            hs = hidden_spots[d - 1]
            afternoon = {
                "activity": "✨ Hidden Spot Discovery",
                "place": hs["name"],
                "time": "2:00 PM - 4:30 PM",
                "description": f"ML-discovered hidden gem (score: {hs['score']:.1f})",
                "cost": 50,
                "lat": hs["lat"],
                "lng": hs["lng"],
            }
        else:
            remaining = [p for p in places if (p.get("id") or p.get("name")) not in used_places]
            if remaining:
                afternoon_spot = remaining[0]
                used_places.add(afternoon_spot.get("id") or afternoon_spot.get("name"))
            afternoon = {
                "activity": "🏛 Nearby Sacred Site Visit",
                "place": afternoon_spot.get("name", "Local exploration") if afternoon_spot else "Local exploration",
                "time": "2:00 PM - 4:30 PM",
                "description": "Visit nearby devotional and heritage sites",
                "cost": 100 if afternoon_spot else 0,
                "lat": afternoon_spot.get("lat", temple_lat) if afternoon_spot else temple_lat,
                "lng": afternoon_spot.get("lng", temple_lng) if afternoon_spot else temple_lng,
            }

        # Evening: Evening darshan
        evening = {
            "activity": "🛕 Evening Darshan & Aarti",
            "place": main_temple.get("name", temple_name) if main_temple else temple_name,
            "time": "5:00 PM - 8:00 PM",
            "description": f"Evening aarti and darshan. {'🔥 Special ' + active_festivals[-1] + ' aarti!' if active_festivals else 'Beautiful evening prayers.'}",
            "cost": 0,
            "crowdLevel": "high" if active_festivals else "medium",
            "crowdEmoji": "🔴" if active_festivals else "🟡",
            "lat": main_temple.get("lat", temple_lat) if main_temple else temple_lat,
            "lng": main_temple.get("lng", temple_lng) if main_temple else temple_lng,
        }

        # Stay check-in
        stay = stays[0] if stays else None
        stay_checkin = {
            "activity": f"{stay.get('typeEmoji', '🏨') if stay else '🏨'} Stay Check-in",
            "place": stay.get("name", "Dharamshala") if stay else "Local dharamshala",
            "time": "8:30 PM",
            "description": f"{'🍛 Food included • ' if stay and stay.get('hasFood') else ''}{'❄ AC • ' if stay and stay.get('hasAC') else ''}Check-in and rest",
            "cost": stay.get("pricePerNight", 500) * persons if stay else 500 * persons,
            "lat": stay.get("lat", temple_lat) if stay else temple_lat,
            "lng": stay.get("lng", temple_lng) if stay else temple_lng,
        }

        day_cost = morning["cost"] + lunch["cost"] + afternoon["cost"] + evening["cost"] + stay_checkin["cost"]
        total_cost += day_cost

        day_plans.append({
            "day": d,
            "morning": morning,
            "lunch": lunch,
            "afternoon": afternoon,
            "evening": evening,
            "stayCheckin": stay_checkin,
            "dayCost": day_cost,
        })

    # 6. Budget breakdown
    stay_total = (stays[0]["pricePerNight"] * persons * days) if stays else 500 * persons * days
    food_total = 600 * persons * days
    transport_cost = {"walk": 0, "bike": 100, "bus": 200, "train": 300, "car": 500, "mixed": 350}.get(travel_mode, 350) * days
    activities_cost = total_cost - stay_total - food_total
    if activities_cost < 0:
        activities_cost = 0
    buffer = round((stay_total + food_total + transport_cost + activities_cost) * 0.1)
    grand_total = stay_total + food_total + transport_cost + activities_cost + buffer
    budget_remaining = max(0, budget - grand_total)

    # 7. Crowd prediction
    crowd = None
    try:
        raw = predict_crowd_level(temple_lat, temple_lng, month)
        crowd = {}
        for k, v in raw.items():
            crowd[k] = v.item() if hasattr(v, "item") else v
    except Exception:
        pass

    # 8. Travel time estimate (rough)
    travel_time_hrs = round(days * 3.5, 1)  # ~3.5 hrs travel per day

    return {
        "temple": temple_name,
        "templeLat": temple_lat,
        "templeLng": temple_lng,
        "days": days,
        "persons": persons,
        "travelMode": travel_mode,
        "dayPlans": day_plans,
        "stayOptions": stays[:5],
        "foodOptions": foods[:8],
        "hiddenSpots": hidden_spots[:5],
        "devotionalPlaces": [p for p in places[:10] if p.get("name") != temple_name],
        "budgetBreakdown": {
            "stay": stay_total,
            "food": food_total,
            "transport": transport_cost,
            "activities": activities_cost,
            "buffer": buffer,
            "total": grand_total,
        },
        "budgetRemaining": budget_remaining,
        "estimatedTravelTime": travel_time_hrs,
        "crowdPrediction": crowd,
        "festivals": active_festivals,
        "totalCost": grand_total,
    }
