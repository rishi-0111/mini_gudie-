"""
websocket.py — Real-Time GPS Tracking via WebSockets
=====================================================
Manages multiple connected clients, broadcasts location updates,
and triggers auto route recalculation when the vehicle drifts off-route.
"""

import json
import asyncio
import time
from typing import Optional
from fastapi import WebSocket, WebSocketDisconnect

from .routing import fetch_route, is_off_route


# ---------------------------------------------------------------------------
# Connection Manager — handles multi-client broadcasting
# ---------------------------------------------------------------------------
class ConnectionManager:
    """
    Keeps track of all active WebSocket clients.
    Any location update is broadcast to every connected client so that
    multiple dashboards / phones can watch the same vehicle.
    """

    def __init__(self) -> None:
        self._active: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._active.append(ws)
        print(f"[ws] +client  total={len(self._active)}")

    def disconnect(self, ws: WebSocket) -> None:
        self._active.remove(ws)
        print(f"[ws] -client  total={len(self._active)}")

    async def broadcast(self, message: dict) -> None:
        """Send JSON payload to every connected client."""
        payload = json.dumps(message)
        dead: list[WebSocket] = []
        for ws in self._active:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._active.remove(ws)

    @property
    def count(self) -> int:
        return len(self._active)


# Singleton — shared across the app
manager = ConnectionManager()


# ---------------------------------------------------------------------------
# Session state per vehicle / trip
# ---------------------------------------------------------------------------
class NavigationSession:
    """
    Holds the current route and destination for one navigation session.
    Used to detect off-route deviation and trigger recalculation.
    """

    def __init__(self) -> None:
        self.destination: Optional[tuple[float, float]] = None  # (lat, lng)
        self.route_geometry: Optional[list[list[float]]] = None  # GeoJSON coords
        self.route_data: Optional[dict] = None
        self.last_recalc: float = 0  # timestamp — debounce recalcs

    def set_route(self, route_data: dict) -> None:
        """Store the primary route from an OSRM response."""
        self.route_data = route_data
        if route_data and route_data.get("routes"):
            self.route_geometry = route_data["routes"][0]["geometry"]["coordinates"]
        self.last_recalc = time.time()

    def clear(self) -> None:
        self.destination = None
        self.route_geometry = None
        self.route_data = None


# Singleton session — extend to dict[vehicle_id → session] for multi-vehicle
nav_session = NavigationSession()

# Minimum seconds between automatic recalculations (debounce)
RECALC_COOLDOWN_S = 5


# ---------------------------------------------------------------------------
# WebSocket message handler
# ---------------------------------------------------------------------------
async def handle_location_ws(ws: WebSocket) -> None:
    """
    Main WebSocket handler.  Expected incoming JSON messages:

    1. Location update:
       { "type": "location", "lat": 28.6139, "lng": 77.2090 }

    2. Start navigation:
       { "type": "start_nav", "dest_lat": 28.5355, "dest_lng": 77.3910 }

    3. Stop navigation:
       { "type": "stop_nav" }

    Outgoing messages (broadcast to all clients):

    - { "type": "location", "lat": ..., "lng": ... }
    - { "type": "route_update", "route": { ... } }
    - { "type": "reroute", "reason": "off_route", "route": { ... } }
    - { "type": "nav_stopped" }
    """
    await manager.connect(ws)
    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_text(json.dumps({"type": "error", "detail": "invalid JSON"}))
                continue

            msg_type = msg.get("type")

            # --- Location update -------------------------------------------
            if msg_type == "location":
                lat, lng = msg.get("lat"), msg.get("lng")
                if lat is None or lng is None:
                    continue

                # Broadcast current position to all watchers
                await manager.broadcast({"type": "location", "lat": lat, "lng": lng})

                # Check deviation if navigation is active
                if (
                    nav_session.route_geometry
                    and nav_session.destination
                    and is_off_route(lat, lng, nav_session.route_geometry)
                    and (time.time() - nav_session.last_recalc) > RECALC_COOLDOWN_S
                ):
                    # Auto-recalculate route from current position
                    dest_lat, dest_lng = nav_session.destination
                    try:
                        new_route = await fetch_route(lat, lng, dest_lat, dest_lng, alternatives=False)
                        nav_session.set_route(new_route)
                        await manager.broadcast({
                            "type": "reroute",
                            "reason": "off_route",
                            "route": new_route,
                        })
                        print(f"[ws] rerouted from ({lat},{lng})")
                    except Exception as e:
                        print(f"[ws] reroute failed: {e}")

            # --- Start navigation ------------------------------------------
            elif msg_type == "start_nav":
                dest_lat = msg.get("dest_lat")
                dest_lng = msg.get("dest_lng")
                start_lat = msg.get("lat", msg.get("start_lat"))
                start_lng = msg.get("lng", msg.get("start_lng"))
                if None in (dest_lat, dest_lng, start_lat, start_lng):
                    await ws.send_text(json.dumps({"type": "error", "detail": "missing coordinates"}))
                    continue
                nav_session.destination = (dest_lat, dest_lng)
                try:
                    route = await fetch_route(start_lat, start_lng, dest_lat, dest_lng)
                    nav_session.set_route(route)
                    await manager.broadcast({"type": "route_update", "route": route})
                except Exception as e:
                    await ws.send_text(json.dumps({"type": "error", "detail": str(e)}))

            # --- Stop navigation -------------------------------------------
            elif msg_type == "stop_nav":
                nav_session.clear()
                await manager.broadcast({"type": "nav_stopped"})

            else:
                await ws.send_text(json.dumps({"type": "error", "detail": f"unknown type: {msg_type}"}))

    except WebSocketDisconnect:
        manager.disconnect(ws)
