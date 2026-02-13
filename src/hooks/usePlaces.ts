/**
 * usePlaces – Supabase-backed hook for the Explore map
 *
 * Features:
 *  1. Fetches curated places from the `places` table on mount.
 *  2. Supports category / search / radius filtering.
 *  3. Subscribes to Supabase Realtime so the list updates live
 *     when any place is inserted, updated, or deleted.
 *  4. Exposes a `nearby` query that merges Supabase places with
 *     Overpass OSM results when a live user location is provided.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPlaces, getNearbyPlaces, searchPlaces as dbSearchPlaces } from "@/integrations/supabase/database";

// ── Types ──────────────────────────────────────────────────────────────────

export interface SupabasePlace {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  address: string | null;
  description: string | null;
  rating: number;
  review_count: number;
  images: string[];
  amenities: Record<string, any>;
  contact_info: Record<string, any>;
  opening_hours: Record<string, any>;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

/** Normalised place used by the Explore page (same shape everywhere). */
export interface ExplorePlace {
  id: string;
  name: string;
  type: string;
  rating: number;
  distance: string;
  image: string;
  isHiddenGem: boolean;
  lat: number;
  lng: number;
  source: "supabase" | "overpass";
  // Extra Supabase fields (optional)
  description?: string | null;
  images?: string[];
  verified?: boolean;
  address?: string | null;
  contact_info?: Record<string, any>;
  opening_hours?: Record<string, any>;
  amenities?: Record<string, any>;
}

interface UsePlacesOptions {
  /** Auto-fetch on mount? Default true */
  autoFetch?: boolean;
  /** Category filter (supabase enum value) */
  category?: string;
  /** Only verified places? */
  verified?: boolean;
  /** Minimum average rating */
  minRating?: number;
  /** Max results */
  limit?: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceLabel(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

const CATEGORY_EMOJI: Record<string, string> = {
  // Original 5 categories
  temple: "🛕",
  hospital: "🏥",
  emergency: "🚨",
  hidden_spot: "✨",
  hostel: "🏡",
  // New 13 categories
  hotel: "🏨",
  restaurant: "🍽️",
  landmark: "🏛️",
  destination: "✈️",
  bus_route: "🚌",
  transport: "🚗",
  tourist: "🎯",
  metro: "🚇",
  police: "👮",
  fire_station: "🚒",
  pharmacy: "💊",
  railway: "🚂",
  health_centre: "🏥",
  // Overpass / OSM types
  cafe: "☕",
  bank: "🏦",
  place_of_worship: "🛕",
  museum: "🏛️",
  attraction: "🎯",
  viewpoint: "🏔️",
  artwork: "🎨",
  guest_house: "🏡",
  shop: "🛍️",
  supermarket: "🛒",
  historic: "🏰",
  monument: "🗿",
  nature: "🌿",
};

function emojiFor(cat: string): string {
  return CATEGORY_EMOJI[cat.toLowerCase()] ?? "📍";
}

/** Convert a Supabase place row into the normalised ExplorePlace shape. */
function toExplorePlace(
  p: SupabasePlace,
  userLat?: number,
  userLng?: number
): ExplorePlace {
  const dist =
    userLat !== undefined && userLng !== undefined
      ? haversineKm(userLat, userLng, p.latitude, p.longitude)
      : null;

  return {
    id: p.id,
    name: p.name,
    type: p.category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    rating: Number(p.rating) || 0,
    distance: dist !== null ? distanceLabel(dist) : "—",
    image: emojiFor(p.category),
    isHiddenGem: p.category === "hidden_spot",
    lat: Number(p.latitude),
    lng: Number(p.longitude),
    source: "supabase",
    description: p.description,
    images: p.images,
    verified: p.verified,
    address: p.address,
    contact_info: p.contact_info,
    opening_hours: p.opening_hours,
    amenities: p.amenities,
  };
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function usePlaces(opts: UsePlacesOptions = {}) {
  const { autoFetch = true, category, verified, minRating, limit } = opts;

  const [places, setPlaces] = useState<ExplorePlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Fetch ──

  const fetchPlaces = useCallback(
    async (userLat?: number, userLng?: number) => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: err } = await getPlaces({
          category: category || undefined,
          verified,
          minRating,
          limit,
        });

        if (err) {
          setError(err.message);
          setPlaces([]);
          return;
        }

        const mapped = ((data || []) as unknown as SupabasePlace[]).map((p) =>
          toExplorePlace(p, userLat, userLng)
        );
        setPlaces(mapped);
      } catch (e: any) {
        setError(e.message ?? "Unknown error");
        setPlaces([]);
      } finally {
        setLoading(false);
      }
    },
    [category, verified, minRating, limit]
  );

  /** Fetch places within a radius (km) of a point. */
  const fetchNearby = useCallback(
    async (lat: number, lng: number, radiusKm: number = 10) => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: err } = await getNearbyPlaces(
          lat,
          lng,
          radiusKm,
          category || undefined
        );

        if (err) {
          setError(err.message);
          return;
        }

        const rows = (data || []) as unknown as SupabasePlace[];
        setPlaces(rows.map((p) => toExplorePlace(p, lat, lng)));
      } catch (e: any) {
        setError(e.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [category]
  );

  /** Search places by name/description text. */
  const searchPlaces = useCallback(
    async (term: string, userLat?: number, userLng?: number) => {
      if (!term.trim()) {
        fetchPlaces(userLat, userLng);
        return;
      }
      setLoading(true);
      setError(null);

      try {
        const { data, error: err } = await dbSearchPlaces(term);

        if (err) {
          setError(err.message);
          return;
        }

        setPlaces(
          ((data || []) as unknown as SupabasePlace[]).map((p) =>
            toExplorePlace(p, userLat, userLng)
          )
        );
      } catch (e: any) {
        setError(e.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [fetchPlaces]
  );

  // ── Realtime Subscription ──

  useEffect(() => {
    // Subscribe to INSERT / UPDATE / DELETE on `places`
    const channel = supabase
      .channel("places-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "places" },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;

          setPlaces((prev) => {
            if (eventType === "INSERT" && newRow) {
              const p = newRow as unknown as SupabasePlace;
              return [...prev, toExplorePlace(p)];
            }

            if (eventType === "UPDATE" && newRow) {
              const p = newRow as unknown as SupabasePlace;
              return prev.map((existing) =>
                existing.id === p.id ? toExplorePlace(p) : existing
              );
            }

            if (eventType === "DELETE" && oldRow) {
              return prev.filter((existing) => existing.id !== (oldRow as any).id);
            }

            return prev;
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // ── Auto-fetch on mount ──

  useEffect(() => {
    if (autoFetch) fetchPlaces();
  }, [autoFetch, fetchPlaces]);

  return {
    /** Normalised places from Supabase */
    places,
    /** Manually set / merge places (useful when combining with Overpass) */
    setPlaces,
    loading,
    error,
    /** Re-fetch all (optionally with user coords for distance calc) */
    fetchPlaces,
    /** Fetch within radius */
    fetchNearby,
    /** Search by text */
    searchPlaces,
  };
}

export default usePlaces;
