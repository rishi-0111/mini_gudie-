/**
 * useGooglePlaces — Optimized hook for Google Places API
 * 
 * Features:
 * - Parallel API calls for faster loading
 * - Result caching to avoid redundant fetches
 * - Immediate service initialization
 */

import { useState, useCallback, useRef, useEffect } from "react";

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
  opening_hours?: {
    open_now: boolean;
    weekday_text?: string[];
  };
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
  opening_hours?: {
    open_now: boolean;
    weekday_text: string[];
  };
  reviews?: {
    author_name: string;
    rating: number;
    text: string;
    time: number;
    profile_photo_url: string;
  }[];
  price_level?: number;
  rating?: number;
  user_ratings_total?: number;
  photos?: google.maps.places.PlacePhoto[];
}

type PlaceCategory = "transport" | "hostel" | "attraction" | "temple" | "emergency" | "food" | "all";

// ── Category to Google Place Types mapping (optimized - fewer types) ───────────

const CATEGORY_TYPES: Record<PlaceCategory, string[]> = {
  transport: ["transit_station", "bus_station"],
  hostel: ["lodging"],
  attraction: ["tourist_attraction", "museum"],
  temple: ["hindu_temple", "place_of_worship"],
  emergency: ["hospital", "pharmacy"],
  food: ["restaurant", "cafe"],
  all: ["tourist_attraction", "lodging", "restaurant"],
};

// ── Cache for results ──────────────────────────────────────────────────────────

const cache = new Map<string, { data: GooglePlace[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(lat: number, lng: number, category: PlaceCategory): string {
  return `${lat.toFixed(3)}_${lng.toFixed(3)}_${category}`;
}

// ── Haversine distance calculation ─────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Derive category from Google types ──────────────────────────────────────────

function deriveCategory(types: string[]): GooglePlace["category"] {
  const typeSet = new Set(types);
  if (typeSet.has("taxi_stand") || typeSet.has("bus_station") || typeSet.has("transit_station") || 
      typeSet.has("train_station") || typeSet.has("subway_station") || typeSet.has("car_rental")) {
    return "transport";
  }
  if (typeSet.has("lodging") || typeSet.has("hotel") || typeSet.has("hostel")) {
    return "hostel";
  }
  if (typeSet.has("hindu_temple") || typeSet.has("church") || typeSet.has("mosque") || 
      typeSet.has("synagogue") || typeSet.has("place_of_worship")) {
    return "temple";
  }
  if (typeSet.has("hospital") || typeSet.has("pharmacy") || typeSet.has("police") || 
      typeSet.has("fire_station") || typeSet.has("doctor")) {
    return "emergency";
  }
  if (typeSet.has("restaurant") || typeSet.has("cafe") || typeSet.has("bakery") || typeSet.has("bar")) {
    return "food";
  }
  return "attraction";
}

// ── Price level helpers ────────────────────────────────────────────────────────

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

// ── Shared PlacesService instance ──────────────────────────────────────────────

let sharedService: google.maps.places.PlacesService | null = null;
let servicePromise: Promise<google.maps.places.PlacesService> | null = null;

function getPlacesService(): Promise<google.maps.places.PlacesService> {
  if (sharedService) return Promise.resolve(sharedService);
  
  if (servicePromise) return servicePromise;

  servicePromise = new Promise((resolve) => {
    const tryInit = () => {
      if (typeof google !== "undefined" && google.maps?.places) {
        const div = document.createElement("div");
        const map = new google.maps.Map(div, { center: { lat: 0, lng: 0 }, zoom: 1 });
        sharedService = new google.maps.places.PlacesService(map);
        resolve(sharedService);
      } else {
        setTimeout(tryInit, 50);
      }
    };
    tryInit();
  });

  return servicePromise;
}

// ── Single place type search ───────────────────────────────────────────────────

async function searchOneType(
  service: google.maps.places.PlacesService,
  lat: number,
  lng: number,
  type: string,
  radius: number
): Promise<google.maps.places.PlaceResult[]> {
  return new Promise((resolve) => {
    const request: google.maps.places.PlaceSearchRequest = {
      location: new google.maps.LatLng(lat, lng),
      radius,
      type,
    };

    service.nearbySearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        resolve(results);
      } else {
        resolve([]);
      }
    });
  });
}

// ── Transform PlaceResult to GooglePlace ───────────────────────────────────────

function transformPlace(place: google.maps.places.PlaceResult, refLat: number, refLng: number): GooglePlace | null {
  if (!place.place_id || !place.name || !place.geometry?.location) return null;

  const placeLat = place.geometry.location.lat();
  const placeLng = place.geometry.location.lng();

  let photoUrl: string | null = null;
  if (place.photos && place.photos.length > 0) {
    try {
      photoUrl = place.photos[0].getUrl({ maxWidth: 400, maxHeight: 300 });
    } catch {
      photoUrl = null;
    }
  }

  return {
    place_id: place.place_id,
    name: place.name,
    vicinity: place.vicinity || "",
    lat: placeLat,
    lng: placeLng,
    rating: place.rating || 0,
    user_ratings_total: place.user_ratings_total || 0,
    price_level: place.price_level ?? 0,
    types: place.types || [],
    opening_hours: place.opening_hours
      ? { open_now: place.opening_hours.open_now ?? true }
      : undefined,
    photo_url: photoUrl,
    icon: place.icon || "",
    distance_km: parseFloat(haversineKm(refLat, refLng, placeLat, placeLng).toFixed(2)),
    category: deriveCategory(place.types || []),
  };
}

// ── Main Hook ──────────────────────────────────────────────────────────────────

export function useGooglePlaces() {
  const [places, setPlaces] = useState<GooglePlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchNearby = useCallback(
    async (lat: number, lng: number, category: PlaceCategory = "all", radiusMeters: number = 5000): Promise<GooglePlace[]> => {
      // Check cache first
      const cacheKey = getCacheKey(lat, lng, category);
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setPlaces(cached.data);
        return cached.data;
      }

      setLoading(true);
      setError(null);

      try {
        const service = await getPlacesService();
        const types = CATEGORY_TYPES[category] || CATEGORY_TYPES.all;

        // Parallel fetch for all types at once
        const resultsArrays = await Promise.all(
          types.map((type) => searchOneType(service, lat, lng, type, radiusMeters))
        );

        // Flatten and transform
        const allResults: GooglePlace[] = [];
        for (const results of resultsArrays) {
          for (const place of results) {
            const transformed = transformPlace(place, lat, lng);
            if (transformed) allResults.push(transformed);
          }
        }

        // Deduplicate
        const seen = new Set<string>();
        const unique = allResults.filter((p) => {
          if (seen.has(p.place_id)) return false;
          seen.add(p.place_id);
          return true;
        });

        // Sort by distance
        unique.sort((a, b) => a.distance_km - b.distance_km);

        // Cache results
        cache.set(cacheKey, { data: unique, timestamp: Date.now() });

        setPlaces(unique);
        return unique;
      } catch (err) {
        console.error("Places API error:", err);
        setError("Failed to fetch places. Please try again.");
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getPlaceDetails = useCallback(
    async (placeId: string): Promise<PlaceDetails | null> => {
      try {
        const service = await getPlacesService();

        return new Promise((resolve) => {
          const request: google.maps.places.PlaceDetailsRequest = {
            placeId,
            fields: [
              "place_id",
              "name",
              "formatted_address",
              "formatted_phone_number",
              "website",
              "opening_hours",
              "reviews",
              "price_level",
              "rating",
              "user_ratings_total",
              "photos",
            ],
          };

          service.getDetails(request, (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && place) {
              resolve({
                place_id: place.place_id || placeId,
                name: place.name || "",
                formatted_address: place.formatted_address || "",
                formatted_phone_number: place.formatted_phone_number,
                website: place.website,
                opening_hours: place.opening_hours
                  ? {
                      open_now: place.opening_hours.isOpen?.() ?? true,
                      weekday_text: place.opening_hours.weekday_text || [],
                    }
                  : undefined,
                reviews: place.reviews?.map((r) => ({
                  author_name: r.author_name || "Anonymous",
                  rating: r.rating || 0,
                  text: r.text || "",
                  time: r.time || Date.now() / 1000,
                  profile_photo_url: r.profile_photo_url || "",
                })),
                price_level: place.price_level,
                rating: place.rating,
                user_ratings_total: place.user_ratings_total,
                photos: place.photos,
              });
            } else {
              resolve(null);
            }
          });
        });
      } catch {
        return null;
      }
    },
    []
  );

  const getDirectionsUrl = useCallback((destLat: number, destLng: number, destName?: string): string => {
    const destination = destName
      ? encodeURIComponent(destName)
      : `${destLat},${destLng}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  }, []);

  return {
    places,
    loading,
    error,
    searchNearby,
    getPlaceDetails,
    getDirectionsUrl,
    priceLevelToString,
    priceLevelToAmount,
  };
}

// ── Geolocation Hook (optimized) ───────────────────────────────────────────────

export function useGeolocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }

    // Get position once first (faster), then watch
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.warn("Geolocation error:", err.message);
        setError("Location access denied. Please enable location or search manually.");
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );

    // Then set up watch for updates
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {}, // Ignore errors on watch
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { location, loading, error };
}
