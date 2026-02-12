import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Destination {
  lat: number;
  lng: number;
  label: string;
}

export interface RouteInfo {
  distance: string;
  duration: string;
}

interface LiveLocationMapProps {
  lat: number;
  lng: number;
  destination?: Destination | null;
  className?: string;
  onRouteInfo?: (info: RouteInfo | null) => void;
}

const LiveLocationMap = ({
  lat,
  lng,
  destination,
  className = "",
  onRouteInfo,
}: LiveLocationMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const pulseRef = useRef<L.CircleMarker | null>(null);
  const accuracyRef = useRef<L.Circle | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const [routing, setRouting] = useState(false);

  const destIcon = L.divIcon({
    className: "dest-marker",
    html: `<div style="
      width:32px;height:32px;border-radius:50% 50% 50% 0;
      background:hsl(24,95%,53%);transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 8px rgba(0,0,0,.3);border:2px solid #fff;
    "><span style="transform:rotate(45deg);font-size:14px;">📍</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
  });

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([lat, lng], 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control
      .attribution({ position: "bottomleft" })
      .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>')
      .addTo(map);

    accuracyRef.current = L.circle([lat, lng], {
      radius: 50,
      color: "hsl(270, 70%, 50%)",
      fillColor: "hsl(270, 70%, 50%)",
      fillOpacity: 0.08,
      weight: 1,
      opacity: 0.3,
    }).addTo(map);

    pulseRef.current = L.circleMarker([lat, lng], {
      radius: 18,
      color: "hsl(270, 70%, 50%)",
      fillColor: "hsl(270, 70%, 55%)",
      fillOpacity: 0.2,
      weight: 2,
      opacity: 0.5,
      className: "live-pulse",
    }).addTo(map);

    markerRef.current = L.circleMarker([lat, lng], {
      radius: 8,
      color: "#ffffff",
      fillColor: "hsl(270, 70%, 50%)",
      fillOpacity: 1,
      weight: 3,
    })
      .bindPopup(popupHtml(lat, lng))
      .addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update user position
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const pos: L.LatLngExpression = [lat, lng];
    if (!destination) {
      mapInstanceRef.current.panTo(pos, { animate: true, duration: 0.8 });
    }
    markerRef.current?.setLatLng(pos);
    pulseRef.current?.setLatLng(pos);
    accuracyRef.current?.setLatLng(pos);
    markerRef.current?.setPopupContent(popupHtml(lat, lng));
  }, [lat, lng, destination]);

  // Handle destination marker + route
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (destMarkerRef.current) {
      map.removeLayer(destMarkerRef.current);
      destMarkerRef.current = null;
    }
    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    if (!destination) {
      onRouteInfo?.(null);
      return;
    }

    destMarkerRef.current = L.marker([destination.lat, destination.lng], {
      icon: destIcon,
    })
      .bindPopup(
        `<div style="font-family:system-ui;text-align:center;">
          <p style="margin:0;font-weight:600;font-size:13px;">🏁 ${destination.label}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#6b7280;">${destination.lat.toFixed(5)}, ${destination.lng.toFixed(5)}</p>
        </div>`
      )
      .addTo(map);

    const bounds = L.latLngBounds([lat, lng], [destination.lat, destination.lng]);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });

    fetchRoute(lat, lng, destination.lat, destination.lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination?.lat, destination?.lng, lat, lng]);

  async function fetchRoute(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number
  ) {
    setRouting(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.code !== "Ok" || !data.routes?.length) {
        onRouteInfo?.(null);
        return;
      }

      const route = data.routes[0];
      const coords: L.LatLngExpression[] = route.geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]] as L.LatLngExpression
      );

      if (routeLineRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(routeLineRef.current);
      }

      routeLineRef.current = L.polyline(coords, {
        color: "hsl(270, 70%, 50%)",
        weight: 5,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
        dashArray: "12 8",
        className: "route-line-animated",
      }).addTo(mapInstanceRef.current!);

      mapInstanceRef.current!.fitBounds(routeLineRef.current.getBounds(), {
        padding: [50, 50],
      });

      const distKm = (route.distance / 1000).toFixed(1);
      const durMin = Math.ceil(route.duration / 60);
      onRouteInfo?.({ distance: `${distKm} km`, duration: `${durMin} min` });
    } catch (err) {
      console.error("Routing error:", err);
      onRouteInfo?.(null);
    } finally {
      setRouting(false);
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div
        ref={mapRef}
        className="w-full h-full rounded-2xl overflow-hidden"
        style={{ minHeight: "280px" }}
      />

      {/* Live indicator badge */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 bg-white/90 dark:bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
        </span>
        <span className="text-xs font-semibold text-foreground">LIVE</span>
      </div>

      {/* Routing spinner */}
      {routing && (
        <div className="absolute top-3 right-3 z-[1000] bg-white/90 dark:bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-foreground">Routing…</span>
        </div>
      )}
    </div>
  );
};

function popupHtml(lat: number, lng: number) {
  return `<div style="font-family:system-ui;text-align:center;">
    <p style="margin:0;font-weight:600;font-size:13px;">📍 You are here</p>
    <p style="margin:4px 0 0;font-size:11px;color:#6b7280;">${lat.toFixed(5)}, ${lng.toFixed(5)}</p>
  </div>`;
}

export default LiveLocationMap;
