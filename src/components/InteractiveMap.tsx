import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  type: string;
  price?: string;
  rating?: number;
}

interface InteractiveMapProps {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  onMarkerClick?: (marker: MapMarker) => void;
  className?: string;
}

const InteractiveMap = ({
  markers,
  center = [20.5937, 78.9629], // Default to India center
  zoom = 5,
  onMarkerClick,
  className = "",
}: InteractiveMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView(center, zoom);

    // Add OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Create markers layer group
    markersLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update center when it changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(center, zoom);
    }
  }, [center, zoom]);

  // Update markers when they change
  useEffect(() => {
    if (!markersLayerRef.current) return;

    // Clear existing markers
    markersLayerRef.current.clearLayers();

    // Add new markers
    markers.forEach((marker) => {
      const getMarkerColor = (type: string) => {
        switch (type.toLowerCase()) {
          case "transport":
            return "#3B82F6"; // blue
          case "hostel":
            return "#8B5CF6"; // purple
          case "attraction":
            return "#F59E0B"; // amber
          case "temple":
            return "#F97316"; // orange
          case "hidden":
            return "#10B981"; // green
          default:
            return "#6366F1"; // indigo
        }
      };

      const color = getMarkerColor(marker.type);
      
      const customIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="
            background: ${color};
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            border: 2px solid white;
          ">
            <span style="transform: rotate(45deg); color: white; font-size: 12px; font-weight: bold;">
              ${marker.type.charAt(0).toUpperCase()}
            </span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      const leafletMarker = L.marker([marker.lat, marker.lng], { icon: customIcon });

      // Create popup content
      const popupContent = `
        <div style="min-width: 150px; font-family: system-ui, sans-serif;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1f2937;">${marker.title}</h3>
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280; text-transform: capitalize;">${marker.type}</p>
          ${marker.price ? `<p style="margin: 0 0 4px 0; font-size: 12px; color: #059669; font-weight: 500;">${marker.price}</p>` : ""}
          ${marker.rating ? `<p style="margin: 0; font-size: 12px; color: #f59e0b;">⭐ ${marker.rating}</p>` : ""}
        </div>
      `;

      leafletMarker.bindPopup(popupContent);

      if (onMarkerClick) {
        leafletMarker.on("click", () => onMarkerClick(marker));
      }

      markersLayerRef.current?.addLayer(leafletMarker);
    });

    // Fit bounds if there are markers
    if (markers.length > 0 && mapInstanceRef.current) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [markers, onMarkerClick]);

  return (
    <div
      ref={mapRef}
      className={`w-full h-full rounded-2xl overflow-hidden ${className}`}
      style={{ minHeight: "300px" }}
    />
  );
};

export default InteractiveMap;
