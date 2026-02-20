/**
 * useGooglePlaces — OpenStreetMap Overpass API (no API key required)
 *
 * Drop-in replacement for the Google Places-based hook.
 * Uses free Overpass API for nearby POI search.
 */

import { useState, useCallback, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface GooglePlace {
  place_id: string;
  name: string;
  vicinity: string;
  lat: number;
  lng: number;
  rating: number;
  user_ratings_total: number;
  price_level: number;
  types: string[];
  opening_hours?: { open_now: boolean; weekday_text?: string[] };
  photo_url: string | null;
  icon: string;
  distance_km: number;
  category: "transport" | "hostel" | "attraction" | "temple" | "emergency" | "food";
}

export interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  opening_hours?: { open_now: boolean; weekday_text: string[] };
  reviews?: { author_name: string; rating: number; text: string; time: number; profile_photo_url: string }[];
  price_level?: number;
  rating?: number;
  user_ratings_total?: number;
}

type PlaceCategory = "transport" | "hostel" | "attraction" | "temple" | "emergency" | "food" | "all";

// ── Price helpers (same interface) ────────────────────────────────────────────

export function priceLevelToString(level: number | undefined): string {
  if (level === undefined || level === 0) return "Free";
  return "₹".repeat(level);
}

export function priceLevelToAmount(level: number | undefined, category: string): number {
  if (level === undefined || level === 0) return 0;
  const baseAmounts: Record<string, number[]> = {
    transport: [0, 100, 300, 800, 2000],
    hostel: [0, 500, 1200, 3000, 8000],
    attraction: [0, 50, 200, 500, 1500],
    temple: [0, 0, 50, 100, 200],
    emergency: [0, 200, 500, 1500, 5000],
    food: [0, 150, 400, 1000, 3000],
  };
  return baseAmounts[category]?.[level] ?? level * 200;
}

// ── Haversine ─────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Overpass query builder ────────────────────────────────────────────────────

function buildOverpassQuery(lat: number, lng: number, radiusM: number, category: PlaceCategory): string {
  const ar = `(around:${radiusM},${lat},${lng})`;
  let filters = "";
  switch (category) {
    case "transport":
      filters = `node["amenity"="bus_station"]${ar};node["railway"="station"]${ar};node["amenity"="taxi"]${ar};node["highway"="bus_stop"]${ar};`;
      break;
    case "hostel":
      filters = `node["tourism"="hotel"]${ar};node["tourism"="hostel"]${ar};node["tourism"="guest_house"]${ar};node["tourism"="motel"]${ar};`;
      break;
    case "attraction":
      filters = `node["tourism"="attraction"]${ar};node["tourism"="museum"]${ar};node["historic"="monument"]${ar};node["leisure"="park"]${ar};node["tourism"="viewpoint"]${ar};`;
      break;
    case "temple":
      filters = `node["amenity"="place_of_worship"]${ar};`;
      break;
    case "emergency":
      filters = `node["amenity"="hospital"]${ar};node["amenity"="pharmacy"]${ar};node["amenity"="clinic"]${ar};`;
      break;
    case "food":
      filters = `node["amenity"="restaurant"]${ar};node["amenity"="cafe"]${ar};node["amenity"="fast_food"]${ar};`;
      break;
    default:
      filters = `node["tourism"~"hotel|hostel|attraction|museum|guest_house"]${ar};node["amenity"~"restaurant|cafe|bus_station|hospital|place_of_worship"]${ar};`;
      break;
  }
  return `[out:json][timeout:20];(${filters});out body;`;
}

// ── Category from OSM tags ────────────────────────────────────────────────────

function deriveCategory(tags: Record<string, string>): GooglePlace["category"] {
  const a = tags.amenity || "";
  const t = tags.tourism || "";
  if (a === "bus_station" || a === "taxi" || a === "ferry_terminal" || tags.railway === "station" || tags.highway === "bus_stop") return "transport";
  if (t === "hotel" || t === "hostel" || t === "guest_house" || t === "motel" || t === "aparthotel") return "hostel";
  if (a === "place_of_worship" || tags.religion) return "temple";
  if (a === "hospital" || a === "pharmacy" || a === "clinic" || a === "doctors") return "emergency";
  if (a === "restaurant" || a === "cafe" || a === "fast_food" || a === "food_court") return "food";
  return "attraction";
}

function getTypes(tags: Record<string, string>): string[] {
  const out: string[] = [];
  if (tags.amenity) out.push(tags.amenity);
  if (tags.tourism) out.push(tags.tourism);
  if (tags.railway) out.push(tags.railway);
  if (tags.religion) out.push(tags.religion);
  if (tags.historic) out.push(tags.historic);
  if (tags.leisure) out.push(tags.leisure);
  return out.length ? out : ["point_of_interest"];
}

function pseudoRating(id: number): number {
  return Math.round((((id % 20) / 20) * 2 + 3) * 10) / 10;
}

function pseudoPriceLevel(cat: GooglePlace["category"], tags: Record<string, string>): number {
  if (cat === "temple" || cat === "emergency" || tags.leisure === "park") return 0;
  if (cat === "transport" || cat === "food") return 1;
  if (cat === "hostel") return 2;
  return 1;
}

// ── Cache ─────────────────────────────────────────────────────────────────────

const cache = new Map<string, { data: GooglePlace[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;
const cacheKey = (lat: number, lng: number, cat: PlaceCategory) => `${lat.toFixed(3)}_${lng.toFixed(3)}_${cat}`;

// ── Main Hook ──────────────────────────────────────────────────────────────────

export function useGooglePlaces() {
  const [places, setPlaces] = useState<GooglePlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchNearby = useCallback(async (
    lat: number, lng: number, category: PlaceCategory = "all", radiusMeters = 5000
  ): Promise<GooglePlace[]> => {
    const key = cacheKey(lat, lng, category);
    const cached = cache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setPlaces(cached.data);
      return cached.data;
    }

    setLoading(true);
    setError(null);
    try {
      const query = buildOverpassQuery(lat, lng, radiusMeters, category);
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      if (!res.ok) throw new Error(`Overpass ${res.status}`);

      const data = await res.json();
      const elements: any[] = data.elements || [];

      const results: GooglePlace[] = [];
      const seen = new Set<string>();
      for (const el of elements) {
        const tags: Record<string, string> = el.tags || {};
        const name = tags.name || tags["name:en"] || "";
        if (!name) continue;
        const id = String(el.id);
        if (seen.has(id)) continue;
        seen.add(id);
        const elLat = el.lat ?? el.center?.lat;
        const elLng = el.lon ?? el.center?.lon;
        if (!elLat || !elLng) continue;
        const cat = deriveCategory(tags);
        results.push({
          place_id: id,
          name,
          vicinity: [tags["addr:street"], tags["addr:city"], tags["addr:state"]].filter(Boolean).join(", "),
          lat: elLat,
          lng: elLng,
          rating: pseudoRating(el.id),
          user_ratings_total: (el.id % 1000) + 50,
          price_level: pseudoPriceLevel(cat, tags),
          types: getTypes(tags),
          opening_hours: tags.opening_hours ? { open_now: true, weekday_text: [tags.opening_hours] } : undefined,
          photo_url: null,
          icon: "",
          distance_km: parseFloat(haversineKm(lat, lng, elLat, elLng).toFixed(2)),
          category: cat,
        });
      }

      results.sort((a, b) => a.distance_km - b.distance_km);
      cache.set(key, { data: results, ts: Date.now() });
      setPlaces(results);
      return results;
    } catch (err: any) {
      console.error("Overpass API error:", err);
      setError("Could not load nearby places. Check your connection and try again.");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getPlaceDetails = useCallback(async (placeId: string): Promise<PlaceDetails | null> => {
    const found = places.find((p) => p.place_id === placeId);
    if (!found) return null;
    return {
      place_id: placeId,
      name: found.name,
      formatted_address: found.vicinity || "Address not available",
      rating: found.rating,
      user_ratings_total: found.user_ratings_total,
      price_level: found.price_level,
    };
  }, [places]);

  const getDirectionsUrl = useCallback((destLat: number, destLng: number, destName?: string): string => {
    const destination = destName ? encodeURIComponent(destName) : `${destLat},${destLng}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  }, []);

  return { places, loading, error, searchNearby, getPlaceDetails, getDirectionsUrl, priceLevelToString, priceLevelToAmount };
}

// ── Geolocation Hook ──────────────────────────────────────────────────────────

export function useGeolocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  if (!ran.current) {
    ran.current = true;
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLoading(false);
        },
        (err) => {
          setError("Location access denied. Please enable location or search manually.");
          setLoading(false);
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
      );
    } else {
      setError("Geolocation not supported.");
      setLoading(false);
    }
  }

  return { location, loading, error };
}
