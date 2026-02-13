# 🧭 MiniGuide Navigation System

Real-time navigation with OSRM routing, live GPS tracking, traffic-aware ETA, and turn-by-turn directions — built on OpenStreetMap.

## Architecture

```
navigation/
├── backend/
│   ├── __init__.py
│   ├── main.py          # FastAPI entry — CORS, routing, static files
│   ├── routing.py        # OSRM integration, traffic simulation, deviation detection
│   └── websocket.py      # WebSocket manager + navigation session
├── frontend/
│   ├── index.html        # Dark-themed Leaflet map UI
│   └── script.js         # Map logic, WS client, GPS sim, route rendering
├── requirements.txt
└── README.md
```

## Quick Start

```bash
cd d:\miniguide

# Activate venv
.venv\Scripts\activate

# Start the navigation server (port 8001)
python -m uvicorn navigation.backend.main:app --host 0.0.0.0 --port 8001 --reload

# Open browser
# http://localhost:8001
```

## Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Serves the Leaflet frontend |
| `/route` | GET | OSRM driving route with traffic ETA |
| `/route/enriched` | GET | Route + hidden spots, temples, crowd prediction |
| `/ws/location` | WS | Real-time GPS tracking & auto rerouting |
| `/health` | GET | Health check + connected clients |
| `/docs` | GET | Swagger UI |

## Features

- **OSRM routing** with alternatives, turn-by-turn steps
- **Traffic simulation** — adjusts ETA based on time of day
- **Live GPS** via WebSocket with multi-client broadcast
- **Auto reroute** when vehicle deviates >50m from path
- **Map click** to set start/end points
- **Drive simulation** animates vehicle along route
- **Dark UI** matching the MiniGuide theme

## Self-Hosting OSRM (Production)

```bash
# 1. Download India OSM data
wget https://download.geofabrik.de/asia/india-latest.osm.pbf

# 2. Pre-process
docker run -t -v $(pwd):/data osrm/osrm-backend osrm-extract -p /opt/car.lua /data/india-latest.osm.pbf
docker run -t -v $(pwd):/data osrm/osrm-backend osrm-partition /data/india-latest.osrm
docker run -t -v $(pwd):/data osrm/osrm-backend osrm-customize /data/india-latest.osrm

# 3. Run
docker run -p 5000:5000 -v $(pwd):/data osrm/osrm-backend osrm-routed --algorithm mld /data/india-latest.osrm

# 4. Update routing.py
OSRM_BASE = "http://localhost:5000"
```

## Traffic Multipliers

| Time | Multiplier | Label |
|---|---|---|
| 08:00–10:00 | 0.6 | Heavy |
| 17:00–20:00 | 0.5 | Heavy |
| 22:00–05:00 | 1.2 | Free-flow |
| Other | 1.0 | Normal |

## WebSocket Protocol

### Client → Server
```json
{ "type": "location", "lat": 28.61, "lng": 77.20 }
{ "type": "start_nav", "lat": 28.61, "lng": 77.20, "dest_lat": 28.53, "dest_lng": 77.39 }
{ "type": "stop_nav" }
```

### Server → Client
```json
{ "type": "location", "lat": 28.61, "lng": 77.20 }
{ "type": "route_update", "route": { ... } }
{ "type": "reroute", "reason": "off_route", "route": { ... } }
{ "type": "nav_stopped" }
```

## Bonus Placeholders

- `hidden_spots_along_route()` — query Hidden Gem API for spots near polyline
- `temples_along_route()` — fetch temples from Supabase near route
- `crowd_prediction_for_route()` — predict crowd at destination via ML model
- `/route/enriched` endpoint combines all three with routing
