/**
 * TripMap — Leaflet/OSM map with live route, transport overlay
 * Shows route polyline, alternate routes, duration/distance, zoom animation
 */

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import type { RouteData } from "@/hooks/useSmartTrip";

interface TripMapProps {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  routes: RouteData[];
  routeLoading: boolean;
  visible: boolean;
  onClose: () => void;
}

export default function TripMap({
  fromLat,
  fromLng,
  toLat,
  toLng,
  routes,
  routeLoading,
  visible,
  onClose,
}: TripMapProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [L, setL] = useState<any>(null);

  // Dynamic import Leaflet
  useEffect(() => {
    import("leaflet").then((mod) => {
      setL(mod.default || mod);
    });
  }, []);

  // Animate in/out
  useEffect(() => {
    if (!overlayRef.current) return;
    if (visible) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    }
  }, [visible]);

  // Initialize map
  useEffect(() => {
    if (!L || !mapContainerRef.current || !visible) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [(fromLat + toLat) / 2, (fromLng + toLng) / 2],
      zoom: 6,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 18,
    }).addTo(map);

    // From marker
    const fromIcon = L.divIcon({
      html: '<div style="font-size:24px;text-align:center;">📍</div>',
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      className: "",
    });
    L.marker([fromLat, fromLng], { icon: fromIcon })
      .addTo(map)
      .bindPopup("📍 Start");

    // To marker
    const toIcon = L.divIcon({
      html: '<div style="font-size:24px;text-align:center;">🎯</div>',
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      className: "",
    });
    L.marker([toLat, toLng], { icon: toIcon })
      .addTo(map)
      .bindPopup("🎯 Destination");

    // Draw routes
    if (routes.length > 0) {
      routes.forEach((r, i) => {
        if (r.coordinates && r.coordinates.length > 1) {
          const polyline = L.polyline(r.coordinates, {
            color: i === 0 ? "#8b5cf6" : "#94a3b8",
            weight: i === 0 ? 5 : 3,
            opacity: i === 0 ? 0.9 : 0.5,
            dashArray: i === 0 ? undefined : "8 6",
          }).addTo(map);

          // Popup on main route
          if (i === 0) {
            polyline.bindPopup(
              `<div style="text-align:center;font-size:13px;">
                <strong>${r.distance} km</strong><br/>
                ⏱ ${r.duration}
                ${r.isAlternate ? "<br/><em>Alternate route</em>" : ""}
              </div>`
            );
          }
        }
      });

      // Fit bounds to main route
      const mainCoords = routes[0].coordinates;
      if (mainCoords && mainCoords.length > 1) {
        const bounds = L.latLngBounds(mainCoords.map((c: [number, number]) => [c[0], c[1]]));
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    } else {
      // Straight line fallback
      L.polyline(
        [
          [fromLat, fromLng],
          [toLat, toLng],
        ],
        { color: "#8b5cf6", weight: 3, dashArray: "8 6", opacity: 0.6 }
      ).addTo(map);
      map.fitBounds(
        [
          [fromLat, fromLng],
          [toLat, toLng],
        ],
        { padding: [40, 40] }
      );
    }

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [L, visible, fromLat, fromLng, toLat, toLng, routes]);

  if (!visible) return null;

  const mainRoute = routes[0];

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="w-full sm:w-[90vw] sm:max-w-3xl h-[80vh] bg-background rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="text-lg">🗺</span>
            <div>
              <div className="text-sm font-semibold">Route Map</div>
              {mainRoute && (
                <div className="text-xs text-muted-foreground">
                  {mainRoute.distance} km • {mainRoute.duration}
                  {routes.length > 1 && ` • +${routes.length - 1} alternate`}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center text-sm hover:bg-muted transition"
          >
            ✕
          </button>
        </div>

        {/* Loading */}
        {routeLoading && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 bg-background/90 px-4 py-2 rounded-full shadow-lg">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Calculating route...
            </div>
          </div>
        )}

        {/* Map */}
        <div ref={mapContainerRef} className="flex-1" />

        {/* Route info bar */}
        {mainRoute && (
          <div className="px-4 py-3 border-t border-border bg-muted/30 flex items-center gap-4 text-sm">
            <span className="font-medium">{mainRoute.distance} km</span>
            <span>⏱ {mainRoute.duration}</span>
            {routes.length > 1 && (
              <span className="text-xs text-muted-foreground">
                Alt: {routes[1].distance} km ({routes[1].duration})
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
