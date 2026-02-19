/**
 * InteractiveMap
 *
 * Key fixes:
 *  - Uses L.circleMarker (not L.marker + divIcon) → no broken icon image URLs
 *  - Category-color coded circles with white border
 *  - Routing polyline drawn/cleared internally via drawRoute / clearRoute
 *  - onMarkerClick now passes the full marker object (including category, distance, hours)
 *  - Exposes mapRef imperatively via forwardRef so parent can pan/zoom
 */

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  type: string;
  category?: string;
  rating?: number;
  distance?: string;
  hours?: string;
  phone?: string;
}

export interface RouteResult {
  coordinates: [number, number][];
  distanceKm: number;
  durationMin: number;
}

export interface InteractiveMapHandle {
  setCenter: (lat: number, lon: number, zoom?: number) => void;
  drawRoute: (
    fromLat: number, fromLon: number,
    toLat: number, toLon: number,
    targetName: string
  ) => Promise<RouteResult>;
  clearRoute: () => void;
  fitBounds: (points: [number, number][]) => void;
}

interface InteractiveMapProps {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  onMarkerClick?: (marker: MapMarker) => void;
  className?: string;
  userLocation?: [number, number] | null;
  travelMode?: "driving" | "foot" | "bike";
}

// ─── Category → marker color ──────────────────────────────────────────────────

function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    food: "#f59e0b",  // amber
    temples: "#f97316",  // orange
    hotels: "#3b82f6",  // blue
    transport: "#6b7280",  // gray
    emergency: "#ef4444",  // red
    landmarks: "#8b5cf6",  // purple
    nature: "#22c55e",  // green
    hidden: "#10b981",  // teal
    other: "#64748b",  // slate
  };
  return map[category?.toLowerCase()] || map.other;
}

// ─── OSRM Route Fetcher ───────────────────────────────────────────────────────

async function fetchOSRMRoute(
  fromLat: number, fromLon: number,
  toLat: number, toLon: number,
  mode: "driving" | "foot" | "bike" = "driving"
): Promise<RouteResult> {
  const url =
    `https://router.project-osrm.org/route/v1/${mode}/` +
    `${fromLon},${fromLat};${toLon},${toLat}` +
    `?overview=full&geometries=geojson&steps=true`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.code !== "Ok" || !data.routes?.[0]) {
    throw new Error(data.code ?? "No route found");
  }

  const route = data.routes[0];
  // OSRM returns [lon, lat] — swap to [lat, lon] for Leaflet
  const coordinates: [number, number][] = route.geometry.coordinates.map(
    ([lon, lat]: [number, number]) => [lat, lon]
  );

  return {
    coordinates,
    distanceKm: parseFloat((route.distance / 1000).toFixed(1)),
    durationMin: Math.round(route.duration / 60),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

const InteractiveMap = forwardRef<InteractiveMapHandle, InteractiveMapProps>(
  (
    {
      markers,
      center = [20.5937, 78.9629],
      zoom = 13,
      onMarkerClick,
      className = "",
      userLocation,
      travelMode = "driving",
    },
    ref
  ) => {
    const mapDivRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markersLayerRef = useRef<L.LayerGroup | null>(null);
    const userMarkerRef = useRef<L.CircleMarker | null>(null);
    const userPulseRef = useRef<L.CircleMarker | null>(null);
    const routePolylineRef = useRef<L.Polyline | null>(null);
    const routeOverlayRef = useRef<L.Polyline | null>(null);
    const routeEndpointsRef = useRef<L.CircleMarker[]>([]);

    // ── Expose imperative handles to parent ──────────────────────────────────
    useImperativeHandle(ref, () => ({
      setCenter(lat, lon, z = 14) {
        mapRef.current?.setView([lat, lon], z, { animate: true });
      },

      async drawRoute(fromLat, fromLon, toLat, toLon, targetName) {
        const map = mapRef.current;
        if (!map) throw new Error("Map not ready");

        // Clear existing route
        clearRouteInternal(map);

        const result = await fetchOSRMRoute(fromLat, fromLon, toLat, toLon, travelMode);

        // Solid route line
        routePolylineRef.current = L.polyline(result.coordinates, {
          color: "#7c3aed",
          weight: 5,
          opacity: 0.88,
          lineJoin: "round",
          lineCap: "round",
        }).addTo(map);

        // Animated dashed overlay
        routeOverlayRef.current = L.polyline(result.coordinates, {
          color: "#a855f7",
          weight: 3,
          opacity: 0.55,
          dashArray: "10, 18",
        }).addTo(map);

        // Start marker (blue)
        const startM = L.circleMarker([fromLat, fromLon], {
          radius: 10,
          fillColor: "#3b82f6",
          color: "#fff",
          weight: 3,
          fillOpacity: 1,
        }).bindPopup("📍 You are here").addTo(map);
        routeEndpointsRef.current.push(startM);

        // End marker (red)
        const endM = L.circleMarker([toLat, toLon], {
          radius: 10,
          fillColor: "#ef4444",
          color: "#fff",
          weight: 3,
          fillOpacity: 1,
        }).bindPopup(`📍 ${targetName}`).addTo(map);
        routeEndpointsRef.current.push(endM);

        // Fit entire route in view
        map.fitBounds(routePolylineRef.current.getBounds(), { padding: [60, 60] });

        return result;
      },

      clearRoute() {
        if (mapRef.current) clearRouteInternal(mapRef.current);
      },

      fitBounds(points) {
        if (!mapRef.current || !points.length) return;
        const bounds = L.latLngBounds(points);
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      },
    }));

    function clearRouteInternal(map: L.Map) {
      if (routePolylineRef.current) {
        map.removeLayer(routePolylineRef.current);
        routePolylineRef.current = null;
      }
      if (routeOverlayRef.current) {
        map.removeLayer(routeOverlayRef.current);
        routeOverlayRef.current = null;
      }
      routeEndpointsRef.current.forEach((m) => map.removeLayer(m));
      routeEndpointsRef.current = [];
    }

    // ── Init map ─────────────────────────────────────────────────────────────
    useEffect(() => {
      if (!mapDivRef.current || mapRef.current) return;

      const map = L.map(mapDivRef.current, { zoomControl: true }).setView(center, zoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      return () => {
        map.remove();
        mapRef.current = null;
        markersLayerRef.current = null;
      };
    }, []);

    // ── Pan/zoom when center/zoom prop changes ────────────────────────────────
    useEffect(() => {
      if (mapRef.current) {
        mapRef.current.setView(center, zoom, { animate: true });
      }
    }, [center, zoom]);

    // ── User location dot ─────────────────────────────────────────────────────
    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;

      if (userMarkerRef.current) { map.removeLayer(userMarkerRef.current); userMarkerRef.current = null; }
      if (userPulseRef.current) { map.removeLayer(userPulseRef.current); userPulseRef.current = null; }

      if (!userLocation) return;

      userPulseRef.current = L.circleMarker(userLocation, {
        radius: 22,
        color: "hsl(270,70%,50%)",
        fillColor: "hsl(270,70%,55%)",
        fillOpacity: 0.18,
        weight: 2,
        opacity: 0.4,
      }).addTo(map);

      userMarkerRef.current = L.circleMarker(userLocation, {
        radius: 8,
        color: "#ffffff",
        fillColor: "hsl(270,70%,50%)",
        fillOpacity: 1,
        weight: 3,
      })
        .bindPopup(
          `<div style="font-family:system-ui;text-align:center;">
            <p style="margin:0;font-weight:600;font-size:13px;">📍 You are here</p>
            <p style="margin:4px 0 0;font-size:11px;color:#6b7280;">${userLocation[0].toFixed(5)}, ${userLocation[1].toFixed(5)}</p>
          </div>`
        )
        .addTo(map);
    }, [userLocation]);

    // ── Place markers ─────────────────────────────────────────────────────────
    useEffect(() => {
      const layer = markersLayerRef.current;
      if (!layer) return;

      layer.clearLayers();

      markers.forEach((marker) => {
        const color = getCategoryColor(marker.category || marker.type);

        const cm = L.circleMarker([marker.lat, marker.lng], {
          radius: 9,
          fillColor: color,
          color: "#ffffff",
          weight: 2.5,
          opacity: 1,
          fillOpacity: 0.92,
        });

        cm.bindPopup(`
          <div style="min-width:160px;font-family:system-ui,sans-serif;padding:4px 2px;">
            <h3 style="margin:0 0 4px;font-size:14px;font-weight:700;color:#1e293b;">${marker.title}</h3>
            <p style="margin:0 0 3px;font-size:12px;color:#6b7280;text-transform:capitalize;">${marker.type}</p>
            ${marker.distance ? `<p style="margin:0 0 3px;font-size:12px;color:#64748b;">📍 ${marker.distance}</p>` : ""}
            ${marker.hours ? `<p style="margin:0;font-size:11px;color:#22c55e;">🕐 ${marker.hours}</p>` : ""}
            ${marker.rating ? `<p style="margin:3px 0 0;font-size:12px;color:#f59e0b;">⭐ ${marker.rating}</p>` : ""}
          </div>
        `);

        if (onMarkerClick) {
          cm.on("click", () => onMarkerClick(marker));
        }

        layer.addLayer(cm);
      });

      // Only auto-fit if we have multiple markers and no route is drawn
      if (markers.length > 1 && mapRef.current && !routePolylineRef.current) {
        const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
        // Only fit if bounds are meaningful (> 50m)
        if (bounds.isValid()) {
          try {
            mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
          } catch {/* ignore */ }
        }
      }
    }, [markers, onMarkerClick]);

    return (
      <div
        ref={mapDivRef}
        className={`w-full h-full rounded-2xl overflow-hidden ${className}`}
        style={{ minHeight: "300px" }}
      />
    );
  }
);

InteractiveMap.displayName = "InteractiveMap";

export default InteractiveMap;
