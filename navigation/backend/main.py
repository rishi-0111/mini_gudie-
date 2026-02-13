"""
main.py — FastAPI Navigation Server
====================================
Entry point for the real-time navigation backend.

Endpoints:
    GET  /route           — Fetch OSRM driving route
    GET  /health          — Health check
    WS   /ws/location     — Real-time GPS tracking

Run:
    cd navigation/backend
    uvicorn main:app --host 0.0.0.0 --port 8001 --reload
"""

from fastapi import FastAPI, Query, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from .routing import fetch_route, hidden_spots_along_route, temples_along_route, crowd_prediction_for_route
from .websocket import handle_location_ws, manager

# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------
app = FastAPI(
    title="MiniGuide Navigation API",
    version="1.0.0",
    description="Real-time navigation system with OSRM routing, live GPS tracking, and traffic-aware ETA.",
)

# ---------------------------------------------------------------------------
# CORS — allow the Leaflet frontend (and the Vite dev server) to connect
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Serve the frontend as static files
# ---------------------------------------------------------------------------
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.isdir(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="frontend")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/")
async def root():
    """Serve the navigation frontend."""
    index = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.isfile(index):
        return FileResponse(index)
    return {"message": "MiniGuide Navigation API", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "ok", "ws_clients": manager.count}


@app.get("/route")
async def get_route(
    start_lat: float = Query(..., description="Start latitude"),
    start_lng: float = Query(..., description="Start longitude"),
    end_lat: float = Query(..., description="End latitude"),
    end_lng: float = Query(..., description="End longitude"),
    alternatives: bool = Query(True, description="Include alternative routes"),
):
    """
    Fetch a driving route from OSRM.

    Returns route geometry (GeoJSON), distance, duration,
    traffic-adjusted ETA, turn-by-turn steps, and alternative routes.
    """
    try:
        result = await fetch_route(start_lat, start_lng, end_lat, end_lng, alternatives)
        return result
    except ValueError as e:
        return {"error": str(e)}
    except Exception as e:
        return {"error": f"Routing failed: {e}"}


@app.get("/route/enriched")
async def get_enriched_route(
    start_lat: float = Query(...),
    start_lng: float = Query(...),
    end_lat: float = Query(...),
    end_lng: float = Query(...),
):
    """
    Route + bonus POIs along the path (hidden spots, temples, crowd prediction).
    """
    try:
        result = await fetch_route(start_lat, start_lng, end_lat, end_lng)
        coords = result["routes"][0]["geometry"]["coordinates"] if result["routes"] else []

        result["hidden_spots"] = await hidden_spots_along_route(coords)
        result["temples"] = await temples_along_route(coords)
        result["crowd_prediction"] = await crowd_prediction_for_route(end_lat, end_lng)

        return result
    except Exception as e:
        return {"error": f"Enriched routing failed: {e}"}


# ---------------------------------------------------------------------------
# WebSocket
# ---------------------------------------------------------------------------
@app.websocket("/ws/location")
async def websocket_endpoint(ws: WebSocket):
    """
    Real-time GPS tracking.

    Send JSON messages:
        { "type": "location", "lat": 28.61, "lng": 77.20 }
        { "type": "start_nav", "lat": 28.61, "lng": 77.20, "dest_lat": 28.53, "dest_lng": 77.39 }
        { "type": "stop_nav" }
    """
    await handle_location_ws(ws)


# ---------------------------------------------------------------------------
# Scalability notes (printed at startup)
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def _startup_notes():
    print("=" * 60)
    print("  MiniGuide Navigation API — started")
    print("  Docs:      http://localhost:8001/docs")
    print("  Frontend:  http://localhost:8001/")
    print("  WebSocket: ws://localhost:8001/ws/location")
    print("=" * 60)
    print()
    print("  PRODUCTION NOTES:")
    print("  • Self-host OSRM with Docker for lower latency:")
    print("      docker pull osrm/osrm-backend")
    print("      wget https://download.geofabrik.de/asia/india-latest.osm.pbf")
    print("      docker run -t -v $(pwd):/data osrm/osrm-backend osrm-extract -p /opt/car.lua /data/india-latest.osm.pbf")
    print("      docker run -t -v $(pwd):/data osrm/osrm-backend osrm-partition /data/india-latest.osrm")
    print("      docker run -t -v $(pwd):/data osrm/osrm-backend osrm-customize /data/india-latest.osrm")
    print("      docker run -p 5000:5000 -v $(pwd):/data osrm/osrm-backend osrm-routed --algorithm mld /data/india-latest.osrm")
    print("    Then set OSRM_BASE='http://localhost:5000' in routing.py")
    print()
    print("  • Use Redis for multi-vehicle live storage:")
    print("      pip install redis")
    print("      Store vehicle locations as Redis GeoSets for O(log N) proximity queries")
    print()
    print("  • For horizontal scaling, use pub/sub (Redis or NATS)")
    print("    to fan-out WebSocket broadcasts across multiple workers.")
    print("=" * 60)
