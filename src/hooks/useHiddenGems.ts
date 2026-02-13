/**
 * useHiddenGems – Hook for the Hidden Gem Explorer FastAPI
 *
 * Connects to the Python ML-powered Hidden Gem API (step8_api.py)
 * running at http://localhost:8000.
 *
 * Endpoints:
 *  GET /hidden-nearby    → Top hidden gems near user
 *  GET /hidden-temples   → Hidden temples/worship places
 *  GET /weekend-spots    → Quiet weekend getaways
 *  GET /budget-spots     → Budget-friendly hidden gems
 *  GET /crowd-predict    → Crowd level prediction
 */

import { useState, useCallback } from "react";

// ── Configuration ───────────────────────────────────────────────────────────

const API_BASE =
  import.meta.env.VITE_HIDDEN_GEM_API_URL || "http://localhost:8000";

// ── Types ───────────────────────────────────────────────────────────────────

export interface HiddenGemResult {
  name: string;
  lat: number;
  lon: number;
  type: string;
  user_dist: number;
  hidden_gem_score: number;
  final_score?: number;
  ml_hidden_score?: number;
  connectivity_score?: number;
  hotel_count?: number;
  bus_stop_count?: number;
  metro_count?: number;
  distance_from_major_city?: number;
  simulated_review_count?: number;
  budget_score?: number;
}

export interface HiddenGemResponse {
  count: number;
  results: HiddenGemResult[];
}

export interface CrowdPrediction {
  crowd_level: "low" | "medium" | "high";
  nearest_poi: string;
  distance_km: number;
  hidden_gem_score: number;
  ml_hidden_score: number;
  review_count: number;
  effective_reviews: number;
  month: number;
  festival_multiplier: number;
  metro_nearby: number;
  hotels_nearby: number;
  bus_stops_nearby: number;
}

/** Normalised spot for UI display (used by Discover page). */
export interface DiscoverSpot {
  id: string;
  name: string;
  description: string;
  rating: number;
  visitors: string;
  bestTime: string;
  safetyScore: number;
  image: string;
  tags: string[];
  lat: number;
  lon: number;
  distance: string;
  type: string;
  hiddenGemScore: number;
  finalScore: number;
}

type EndpointType =
  | "hidden-nearby"
  | "hidden-temples"
  | "weekend-spots"
  | "budget-spots";

// ── Helpers ─────────────────────────────────────────────────────────────────

function distanceLabel(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

const TYPE_EMOJI: Record<string, string> = {
  hidden_spot: "✨",
  temple: "🛕",
  hindu: "🛕",
  buddhist: "☸️",
  jain: "🕉️",
  sikh: "🪯",
  christian: "⛪",
  muslim: "🕌",
  place_of_worship: "🛕",
  viewpoint: "🏔️",
  historic: "🏰",
  monument: "🗿",
  nature: "🌿",
  artwork: "🎨",
  museum: "🏛️",
  attraction: "🎯",
};

function emojiFor(type: string): string {
  return TYPE_EMOJI[type.toLowerCase()] ?? "✨";
}

function bestTimeFromType(type: string): string {
  const t = type.toLowerCase();
  if (["temple", "hindu", "buddhist", "jain", "sikh", "place_of_worship"].includes(t))
    return "Morning";
  if (["viewpoint", "nature"].includes(t)) return "Sunrise/Sunset";
  return "Anytime";
}

function tagsFromResult(r: HiddenGemResult): string[] {
  const tags: string[] = [];
  tags.push(r.type.charAt(0).toUpperCase() + r.type.slice(1).replace(/_/g, " "));
  if ((r.hidden_gem_score ?? 0) > 70) tags.push("Off the beaten path");
  if ((r.bus_stop_count ?? 0) > 0) tags.push("Accessible");
  if ((r.metro_count ?? 0) > 0) tags.push("Metro nearby");
  if ((r.hotel_count ?? 0) < 3) tags.push("Uncrowded");
  if ((r.distance_from_major_city ?? 0) > 20) tags.push("Remote");
  if ((r.budget_score ?? 0) > 60) tags.push("Budget friendly");
  return tags.slice(0, 4);
}

/** Convert a raw API result to a DiscoverSpot for UI rendering. */
function toDiscoverSpot(r: HiddenGemResult, idx: number): DiscoverSpot {
  // Safety score: derived from hidden_gem_score (higher = safer because less crowded)
  const safety = Math.min(99, Math.round(50 + (r.hidden_gem_score ?? 50) * 0.5));
  // Simulated visitor count
  const visitors =
    (r.simulated_review_count ?? 0) > 1000
      ? `~${Math.round((r.simulated_review_count ?? 500) / 10)}/day`
      : `~${Math.max(10, Math.round(50 - (r.hidden_gem_score ?? 50) * 0.4))}/day`;

  return {
    id: `hg-${idx}-${r.lat.toFixed(4)}`,
    name: r.name,
    description: `A ${r.type.replace(/_/g, " ")} hidden gem ${distanceLabel(r.user_dist)} away. Hidden Gem Score: ${r.hidden_gem_score.toFixed(0)}/100.`,
    rating: Math.min(5, 3.5 + (r.hidden_gem_score ?? 50) / 100 * 1.5),
    visitors,
    bestTime: bestTimeFromType(r.type),
    safetyScore: safety,
    image: emojiFor(r.type),
    tags: tagsFromResult(r),
    lat: r.lat,
    lon: r.lon,
    distance: distanceLabel(r.user_dist),
    type: r.type,
    hiddenGemScore: r.hidden_gem_score,
    finalScore: r.final_score ?? r.hidden_gem_score,
  };
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useHiddenGems() {
  const [spots, setSpots] = useState<DiscoverSpot[]>([]);
  const [crowdPrediction, setCrowdPrediction] = useState<CrowdPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Fetch hidden gems from a specific endpoint. */
  const fetchSpots = useCallback(
    async (
      endpoint: EndpointType,
      lat: number,
      lon: number,
      opts?: { radiusKm?: number; topN?: number; maxKm?: number }
    ) => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
      });

      if (endpoint === "weekend-spots" && opts?.maxKm) {
        params.set("max_km", opts.maxKm.toString());
      } else if (opts?.radiusKm) {
        params.set("radius_km", opts.radiusKm.toString());
      }
      if (opts?.topN) params.set("top_n", opts.topN.toString());

      try {
        const res = await fetch(`${API_BASE}/${endpoint}?${params}`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`API ${res.status}: ${text}`);
        }
        const data: HiddenGemResponse = await res.json();
        const mapped = data.results.map((r, i) => toDiscoverSpot(r, i));
        setSpots(mapped);
        return mapped;
      } catch (e: any) {
        const msg = e.message?.includes("Failed to fetch")
          ? "Hidden Gem API is not running. Start it with: python step8_api.py"
          : e.message ?? "Unknown error";
        setError(msg);
        setSpots([]);
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /** Convenience: fetch hidden places near a location. */
  const discoverNearby = useCallback(
    (lat: number, lon: number, radiusKm = 50, topN = 10) =>
      fetchSpots("hidden-nearby", lat, lon, { radiusKm, topN }),
    [fetchSpots]
  );

  /** Convenience: fetch hidden temples near a location. */
  const discoverTemples = useCallback(
    (lat: number, lon: number, radiusKm = 100, topN = 10) =>
      fetchSpots("hidden-temples", lat, lon, { radiusKm, topN }),
    [fetchSpots]
  );

  /** Convenience: quiet weekend spots. */
  const discoverWeekend = useCallback(
    (lat: number, lon: number, maxKm = 150, topN = 10) =>
      fetchSpots("weekend-spots", lat, lon, { maxKm, topN }),
    [fetchSpots]
  );

  /** Convenience: budget-friendly hidden gems. */
  const discoverBudget = useCallback(
    (lat: number, lon: number, radiusKm = 100, topN = 10) =>
      fetchSpots("budget-spots", lat, lon, { radiusKm, topN }),
    [fetchSpots]
  );

  /** Predict crowd level at a location. */
  const predictCrowd = useCallback(
    async (lat: number, lon: number, month?: number) => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
      });
      if (month) params.set("month", month.toString());

      try {
        const res = await fetch(`${API_BASE}/crowd-predict?${params}`);
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data: CrowdPrediction = await res.json();
        setCrowdPrediction(data);
        return data;
      } catch (e: any) {
        const msg = e.message?.includes("Failed to fetch")
          ? "Hidden Gem API is not running"
          : e.message ?? "Unknown error";
        setError(msg);
        setCrowdPrediction(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    /** Current discovered spots */
    spots,
    /** Crowd prediction result */
    crowdPrediction,
    loading,
    error,
    /** Generic fetch for any endpoint */
    fetchSpots,
    /** Discover hidden places nearby */
    discoverNearby,
    /** Discover hidden temples */
    discoverTemples,
    /** Discover weekend quiet spots */
    discoverWeekend,
    /** Discover budget-friendly spots */
    discoverBudget,
    /** Predict crowd level */
    predictCrowd,
    /** Clear results */
    clearSpots: () => setSpots([]),
  };
}

export default useHiddenGems;
