/**
 * useTripPlanner — Hook for the Trip Planner API
 *
 * Calls the FastAPI POST /generate-trip endpoint (step8_api.py + step10_trip_planner.py)
 * which generates itineraries from real Supabase places + ML hidden gem model.
 */

import { useState, useCallback } from "react";

const API_BASE =
  import.meta.env.VITE_HIDDEN_GEM_API_URL || "http://localhost:8000";

// ── Types ───────────────────────────────────────────────────────────────────

export interface TripSlot {
  place: string;
  description: string;
  time: string;
  cost: number;
  lat: number;
  lng: number;
  category: string;
}

export interface DayPlan {
  day: number;
  morning: TripSlot;
  afternoon: TripSlot;
  evening: TripSlot;
  travelDistance: number;
  dayCost: number;
}

export interface HiddenSpot {
  name: string;
  whySpecial: string;
  bestTime: string;
  distance: number;
  lat: number;
  lng: number;
}

export interface StayRec {
  name: string;
  distance: number;
  rating: number;
  pricePerNight: number;
  lat: number;
  lng: number;
}

export interface FoodSpot {
  name: string;
  specialty: string;
  budgetPerMeal: number;
  lat: number;
  lng: number;
}

export interface BudgetBreakdown {
  stay: number;
  food: number;
  transport: number;
  activities: number;
  buffer: number;
  total: number;
}

export interface CrowdPrediction {
  crowd_level: "low" | "medium" | "high";
  nearest_poi?: string;
  distance_km?: number;
}

export interface TripPlan {
  tripOverview: {
    from: string;
    to: string;
    days: number;
    transportMode: string;
    totalBudget: number;
    destLat: number;
    destLng: number;
  };
  dayWisePlan: DayPlan[];
  hiddenSpots: HiddenSpot[];
  stayRecommendations: StayRec[];
  foodSpots: FoodSpot[];
  budgetBreakdown: BudgetBreakdown;
  crowdPrediction?: CrowdPrediction | null;
  stats?: {
    total_places_found: number;
    rated_places: number;
    hidden_gems_found: number;
    data_source: string;
  };
}

export interface TripRequest {
  from_location: string;
  destination: string;
  budget_min: number;
  budget_max: number;
  days: number;
  transport_mode: string;
  rating: number;
  hidden_spots: boolean;
  distance: number;
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useTripPlanner() {
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateTrip = useCallback(async (req: TripRequest) => {
    setLoading(true);
    setError(null);
    setPlan(null);

    try {
      const resp = await fetch(`${API_BASE}/generate-trip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });

      if (!resp.ok) {
        throw new Error(`API error: ${resp.status}`);
      }

      const data = await resp.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setPlan(data as TripPlan);
      return data as TripPlan;
    } catch (err: any) {
      const msg = err.message || "Failed to generate trip";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPlan = useCallback(() => {
    setPlan(null);
    setError(null);
  }, []);

  return { plan, loading, error, generateTrip, resetPlan };
}
