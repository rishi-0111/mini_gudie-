"""
routing.py — OSRM Routing Engine Integration
=============================================
Handles route calculation via the OSRM public demo server (or self-hosted instance).
Includes traffic simulation, route deviation detection, and POI placeholders.
"""

import httpx
import math
from datetime import datetime
from typing import Optional

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
# Public OSRM demo — swap with your self-hosted URL for production
OSRM_BASE = "https://router.project-osrm.org"

# Deviation threshold in metres — triggers re-routing
DEVIATION_THRESHOLD_M = 50.0


# ---------------------------------------------------------------------------
# Traffic simulation multipliers
# ---------------------------------------------------------------------------
def _traffic_multiplier() -> float:
    """
    Returns a speed multiplier based on current hour (IST-like logic).
    < 1.0 means slower (congestion), > 1.0 means faster (free-flow).

    Schedule:
        08:00–10:00  →  0.6  (morning rush)
        17:00–20:00  →  0.5  (evening rush)
        22:00–05:00  →  1.2  (night free-flow)
        otherwise    →  1.0  (normal)
    """
    hour = datetime.now().hour
    if 8 <= hour < 10:
        return 0.6
    elif 17 <= hour < 20:
        return 0.5
    elif hour >= 22 or hour < 5:
        return 1.2
    return 1.0


def _apply_traffic(duration_s: float) -> dict:
    """Adjust raw OSRM duration using the traffic multiplier."""
    mult = _traffic_multiplier()
    adjusted = duration_s / mult  # slower mult → higher ETA
    return {
        "raw_duration_s": round(duration_s, 1),
        "adjusted_duration_s": round(adjusted, 1),
        "traffic_multiplier": mult,
        "traffic_label": (
            "heavy" if mult < 0.6
            else "moderate" if mult < 1.0
            else "light" if mult <= 1.0
            else "free-flow"
        ),
    }


# ---------------------------------------------------------------------------
# Haversine distance (metres)
# ---------------------------------------------------------------------------
def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two GPS points in metres."""
    R = 6_371_000  # Earth radius in metres
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    Δφ = math.radians(lat2 - lat1)
    Δλ = math.radians(lon2 - lon1)
    a = math.sin(Δφ / 2) ** 2 + math.cos(φ1) * math.cos(φ2) * math.sin(Δλ / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ---------------------------------------------------------------------------
# Point-to-polyline distance (for deviation detection)
# ---------------------------------------------------------------------------
def _point_to_segment(px: float, py: float, ax: float, ay: float, bx: float, by: float) -> float:
    """Euclidean distance from point P to segment AB (in coordinate space)."""
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    proj_x, proj_y = ax + t * dx, ay + t * dy
    return math.hypot(px - proj_x, py - proj_y)


def min_distance_to_route(lat: float, lng: float, geometry_coords: list[list[float]]) -> float:
    """
    Minimum haversine distance (metres) from a point to a GeoJSON LineString.
    geometry_coords = [[lon, lat], [lon, lat], ...]
    """
    best = float("inf")
    for i in range(len(geometry_coords) - 1):
        a_lon, a_lat = geometry_coords[i]
        b_lon, b_lat = geometry_coords[i + 1]
        # Approximate: use haversine to midpoint of nearest segment
        d = _point_to_segment(lng, lat, a_lon, a_lat, b_lon, b_lat)
        # Convert rough degree-distance to metres (1° ≈ 111 km at equator)
        d_m = d * 111_000
        best = min(best, d_m)
    return best


def is_off_route(lat: float, lng: float, geometry_coords: list[list[float]]) -> bool:
    """True when the user has deviated > DEVIATION_THRESHOLD_M from the route."""
    return min_distance_to_route(lat, lng, geometry_coords) > DEVIATION_THRESHOLD_M


# ---------------------------------------------------------------------------
# OSRM route fetcher
# ---------------------------------------------------------------------------
async def fetch_route(
    start_lat: float,
    start_lng: float,
    end_lat: float,
    end_lng: float,
    alternatives: bool = True,
) -> dict:
    """
    Call the OSRM /route endpoint and return a structured response.

    Returns:
        {
            "routes": [
                {
                    "geometry": { GeoJSON LineString },
                    "distance_m": float,
                    "duration_s": float,
                    "traffic": { ... },
                    "steps": [ ... ],
                    "is_alternative": bool,
                }
            ],
            "waypoints": [ ... ],
        }
    """
    url = (
        f"{OSRM_BASE}/route/v1/driving/"
        f"{start_lng},{start_lat};{end_lng},{end_lat}"
        f"?overview=full&geometries=geojson&steps=true"
        f"&alternatives={'true' if alternatives else 'false'}"
    )

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

    if data.get("code") != "Ok":
        raise ValueError(f"OSRM error: {data.get('code')} — {data.get('message', '')}")

    routes = []
    for idx, r in enumerate(data["routes"]):
        traffic = _apply_traffic(r["duration"])
        steps = []
        for leg in r["legs"]:
            for s in leg["steps"]:
                steps.append({
                    "instruction": s["maneuver"].get("modifier", s["maneuver"]["type"]),
                    "name": s.get("name", ""),
                    "distance_m": round(s["distance"], 1),
                    "duration_s": round(s["duration"], 1),
                    "maneuver": s["maneuver"],
                })
        routes.append({
            "geometry": r["geometry"],
            "distance_m": round(r["distance"], 1),
            "duration_s": round(r["duration"], 1),
            "traffic": traffic,
            "steps": steps,
            "is_alternative": idx > 0,
        })

    return {"routes": routes, "waypoints": data.get("waypoints", [])}


# ---------------------------------------------------------------------------
# Bonus placeholders — POI enrichment along route
# ---------------------------------------------------------------------------
async def hidden_spots_along_route(geometry_coords: list[list[float]], radius_m: float = 500) -> list[dict]:
    """
    Placeholder: query your hidden_gem_explorer API for spots near the route.
    Would sample points every ~5 km along the polyline and call /hidden-nearby.
    """
    # TODO: integrate with step8_api.py /hidden-nearby endpoint
    return []


async def temples_along_route(geometry_coords: list[list[float]], radius_m: float = 1000) -> list[dict]:
    """
    Placeholder: fetch temple POIs near the route.
    Could use Overpass API or your Supabase places table (category='temple').
    """
    # TODO: query Supabase for temples within buffer of route
    return []


async def crowd_prediction_for_route(end_lat: float, end_lng: float) -> Optional[dict]:
    """
    Placeholder: predict crowd at destination using your ML model.
    Would call step8_api.py /crowd-predict.
    """
    # TODO: call http://localhost:8000/crowd-predict
    return None
