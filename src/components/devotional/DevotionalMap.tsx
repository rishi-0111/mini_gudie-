/**
 * DevotionalMap — Leaflet/OSM map showing devotional places, stays, food, route
 */
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { MapPin, Layers, X } from "lucide-react";
import type { DevotionalPlace, StayOption, FoodOption } from "@/hooks/useDevotional";

interface Props {
  center: { lat: number; lng: number };
  places: DevotionalPlace[];
  stays: StayOption[];
  foods: FoodOption[];
  selectedPlace: DevotionalPlace | null;
  isOpen: boolean;
  onClose: () => void;
}

const DevotionalMap = ({ center, places, stays, foods, selectedPlace, isOpen, onClose }: Props) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [layers, setLayers] = useState({ temples: true, stays: true, food: true });

  // Slide-in animation
  useEffect(() => {
    if (!panelRef.current) return;
    if (isOpen) {
      gsap.fromTo(
        panelRef.current,
        { y: "100%", opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }
      );
    }
  }, [isOpen]);

  // Initialize map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current || mapRef.current) return;

    const loadLeaflet = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      const map = L.map(mapContainerRef.current!, {
        center: [center.lat, center.lng],
        zoom: 13,
        zoomControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      L.control.zoom({ position: "topright" }).addTo(map);

      markersRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      // Force resize
      setTimeout(() => map.invalidateSize(), 300);
    };

    loadLeaflet();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isOpen, center.lat, center.lng]);

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;

    const loadLeaflet = async () => {
      const L = await import("leaflet");
      markersRef.current!.clearLayers();

      const createIcon = (emoji: string, color: string) =>
        L.divIcon({
          html: `<div style="background:${color};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${emoji}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          className: "",
        });

      // Temple markers
      if (layers.temples) {
        places.forEach((p) => {
          if (!p.lat || !p.lng) return;
          const icon = createIcon(
            p.hasFestival ? "🔥" : "🛕",
            p.crowdLevel === "low" ? "#22c55e" : p.crowdLevel === "high" ? "#ef4444" : "#f59e0b"
          );
          const marker = L.marker([p.lat, p.lng], { icon });
          marker.bindPopup(`
            <div style="min-width:180px">
              <strong>🛕 ${p.name}</strong><br/>
              <span>⭐ ${p.rating} • ${p.crowdEmoji} ${p.crowdLevel}</span><br/>
              <span>📍 ${p.distance} km</span><br/>
              <span>⏰ ${p.timings.open} - ${p.timings.close}</span>
              ${p.festivals.length > 0 ? `<br/><span>🔥 ${p.festivals.join(", ")}</span>` : ""}
            </div>
          `);
          markersRef.current!.addLayer(marker);
        });
      }

      // Stay markers
      if (layers.stays) {
        stays.forEach((s) => {
          if (!s.lat || !s.lng) return;
          const icon = createIcon(s.typeEmoji || "🏨", "#6366f1");
          const marker = L.marker([s.lat, s.lng], { icon });
          marker.bindPopup(`
            <div style="min-width:150px">
              <strong>${s.typeEmoji} ${s.name}</strong><br/>
              <span>₹${s.pricePerNight}/night • ⭐ ${s.rating}</span><br/>
              <span>${s.foodEmoji ? "🍛 Food" : ""} ${s.acEmoji ? "❄ AC" : ""}</span>
            </div>
          `);
          markersRef.current!.addLayer(marker);
        });
      }

      // Food markers
      if (layers.food) {
        foods.forEach((f) => {
          if (!f.lat || !f.lng) return;
          const icon = createIcon(f.vegEmoji || "🍽", "#16a34a");
          const marker = L.marker([f.lat, f.lng], { icon });
          marker.bindPopup(`
            <div style="min-width:150px">
              <strong>${f.vegEmoji} ${f.name}</strong><br/>
              <span>₹${f.priceLow}-${f.priceHigh} • ⭐ ${f.rating}</span><br/>
              <span>${f.foodType}</span>
            </div>
          `);
          markersRef.current!.addLayer(marker);
        });
      }

      // Animate route if we have selected place
      if (selectedPlace && selectedPlace.lat && selectedPlace.lng) {
        const routeCoords: L.LatLngExpression[] = [
          [center.lat, center.lng],
          [selectedPlace.lat, selectedPlace.lng],
        ];
        const routeLine = L.polyline(routeCoords, {
          color: "#f97316",
          weight: 3,
          dashArray: "8, 8",
          opacity: 0.8,
        });
        markersRef.current!.addLayer(routeLine);

        // Fit bounds
        mapRef.current!.fitBounds(L.latLngBounds(routeCoords).pad(0.2));
      }
    };

    loadLeaflet();
  }, [places, stays, foods, layers, selectedPlace, center]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="fixed inset-0 z-50 bg-background"
      style={{ opacity: 0, transform: "translateY(100%)" }}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-background/90 backdrop-blur-sm px-4 py-3 flex items-center justify-between border-b">
        <h3 className="font-bold flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" /> Devotional Map
        </h3>
        <div className="flex items-center gap-2">
          {/* Layer toggles */}
          <div className="flex gap-1">
            {[
              { key: "temples" as const, emoji: "🛕", label: "Temples" },
              { key: "stays" as const, emoji: "🏨", label: "Stays" },
              { key: "food" as const, emoji: "🍽", label: "Food" },
            ].map((l) => (
              <button
                key={l.key}
                onClick={() => setLayers((prev) => ({ ...prev, [l.key]: !prev[l.key] }))}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                  layers[l.key]
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {l.emoji}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Map */}
      <div ref={mapContainerRef} className="w-full h-full pt-14" />
    </div>
  );
};

export default DevotionalMap;
