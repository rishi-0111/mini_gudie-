/**
 * useSmartTrip — React hooks for the upgraded AI Trip Planner
 *
 * Hooks for:
 *  - Full plan generation (POST /plan-trip)
 *  - Bus/Train/Flight options
 *  - Flight availability check
 *  - Route calculation
 *  - AI Chat (POST /ai-chat)
 *  - Devotional/Stays/Food  
 */

import { useState, useCallback } from "react";

const API_BASE =
  import.meta.env.VITE_HIDDEN_GEM_API_URL || "http://localhost:8000";

// ── Types ───────────────────────────────────────────────────────────────────

export interface BusOption {
  busNumber: string;
  operator: string;
  busType: string;
  comfortEmoji: string;
  comfort: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  durationMinutes: number;
  ticketPrice: number;
  seatsAvailable: number;
  distance: number;
  from: string;
  to: string;
  date: string;
  withinBudget: boolean;
  rating: number;
}

export interface TrainClass {
  code: string;
  name: string;
  emoji: string;
  price: number;
  seatsAvailable: number;
  withinBudget: boolean;
}

export interface TrainOption {
  trainNumber: string;
  trainName: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  durationMinutes: number;
  distance: number;
  classes: TrainClass[];
  cheapestPrice: number;
  cheapestClass: string;
  from: string;
  to: string;
  date: string;
  rating: number;
}

export interface FlightOption {
  airline: string;
  flightNumber: string;
  fromAirport: string;
  toAirport: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  durationMinutes: number;
  ticketPrice: number;
  distance: number;
  from: string;
  to: string;
  date: string;
  withinBudget: boolean;
  rating: number;
}

export interface RouteData {
  index: number;
  distance: number;
  duration: string;
  durationMinutes: number;
  coordinates: [number, number][];
  isAlternate: boolean;
}

export interface TransportData {
  recommended: string;
  buses: BusOption[];
  trains: TrainOption[];
  flights: FlightOption[];
  flightAvailable: boolean;
}

export interface BudgetBreakdown {
  transport: number;
  stay: number;
  food: number;
  activities: number;
  buffer: number;
  total: number;
}

export interface CrowdData {
  crowd_level: "low" | "medium" | "high";
  nearest_poi?: string;
  distance_km?: number;
}

export interface SmartTripPlan {
  plan: any; // Original trip plan from generate_trip_plan
  transport: TransportData;
  distance: number;
  distanceEmoji: string;
  distanceLabel: string;
  budgetEmoji: string;
  budgetLabel: string;
  budgetBreakdown: BudgetBreakdown;
  crowd: CrowdData;
  suggestion: string;
  meta: {
    from: string;
    to: string;
    fromLat: number;
    fromLng: number;
    toLat: number;
    toLng: number;
    days: number;
    persons: number;
    budget: number;
  };
}

export interface SmartTripRequest {
  from_city: string;
  to_city: string;
  from_lat?: number;
  from_lng?: number;
  to_lat?: number;
  to_lng?: number;
  budget: number;
  days: number;
  persons: number;
  date?: string;
  rating?: number;
  distance_km?: number;
  transport_mode?: string;
  hidden_gems?: boolean;
}

// ── Hooks ───────────────────────────────────────────────────────────────────

export function useSmartTrip() {
  const [plan, setPlan] = useState<SmartTripPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = useCallback(async (req: SmartTripRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/plan-trip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPlan(data);
      return data;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPlan = useCallback(() => {
    setPlan(null);
    setError(null);
  }, []);

  return { plan, loading, error, generatePlan, resetPlan };
}

export function useBusOptions() {
  const [buses, setBuses] = useState<BusOption[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBuses = useCallback(
    async (params: {
      from_city: string;
      to_city: string;
      from_lat: number;
      from_lng: number;
      to_lat: number;
      to_lng: number;
      date?: string;
      budget_per_person?: number;
    }) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          from_city: params.from_city,
          to_city: params.to_city,
          from_lat: String(params.from_lat),
          from_lng: String(params.from_lng),
          to_lat: String(params.to_lat),
          to_lng: String(params.to_lng),
          ...(params.date ? { date: params.date } : {}),
          ...(params.budget_per_person
            ? { budget_per_person: String(params.budget_per_person) }
            : {}),
        });
        const res = await fetch(`${API_BASE}/bus-options?${qs}`);
        const data = await res.json();
        setBuses(data.results || []);
        return data.results || [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { buses, loading, fetchBuses };
}

export function useTrainOptions() {
  const [trains, setTrains] = useState<TrainOption[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTrains = useCallback(
    async (params: {
      from_city: string;
      to_city: string;
      from_lat: number;
      from_lng: number;
      to_lat: number;
      to_lng: number;
      date?: string;
      budget_per_person?: number;
    }) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          from_city: params.from_city,
          to_city: params.to_city,
          from_lat: String(params.from_lat),
          from_lng: String(params.from_lng),
          to_lat: String(params.to_lat),
          to_lng: String(params.to_lng),
          ...(params.date ? { date: params.date } : {}),
          ...(params.budget_per_person
            ? { budget_per_person: String(params.budget_per_person) }
            : {}),
        });
        const res = await fetch(`${API_BASE}/train-options?${qs}`);
        const data = await res.json();
        setTrains(data.results || []);
        return data.results || [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { trains, loading, fetchTrains };
}

export function useFlightOptions() {
  const [flights, setFlights] = useState<FlightOption[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const checkAvailability = useCallback(
    async (from_city: string, to_city: string) => {
      try {
        const qs = new URLSearchParams({ from_city, to_city });
        const res = await fetch(`${API_BASE}/flight-check?${qs}`);
        const data = await res.json();
        setAvailable(data.flightAvailable ?? false);
        return data.flightAvailable ?? false;
      } catch {
        setAvailable(false);
        return false;
      }
    },
    []
  );

  const fetchFlights = useCallback(
    async (params: {
      from_city: string;
      to_city: string;
      from_lat: number;
      from_lng: number;
      to_lat: number;
      to_lng: number;
      date?: string;
      budget_per_person?: number;
    }) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          from_city: params.from_city,
          to_city: params.to_city,
          from_lat: String(params.from_lat),
          from_lng: String(params.from_lng),
          to_lat: String(params.to_lat),
          to_lng: String(params.to_lng),
          ...(params.date ? { date: params.date } : {}),
          ...(params.budget_per_person
            ? { budget_per_person: String(params.budget_per_person) }
            : {}),
        });
        const res = await fetch(`${API_BASE}/flight-options?${qs}`);
        const data = await res.json();
        setFlights(data.results || []);
        return data.results || [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { flights, available, loading, checkAvailability, fetchFlights };
}

export function useRoute() {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRoute = useCallback(
    async (
      from_lat: number,
      from_lng: number,
      to_lat: number,
      to_lng: number,
      mode: string = "car"
    ) => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/route`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from_lat, from_lng, to_lat, to_lng, mode }),
        });
        const data = await res.json();
        setRoutes(data.routes || []);
        return data.routes || [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { routes, loading, fetchRoute };
}

// ── AI Chat Hook ────────────────────────────────────────────────────────────

export function useAIChat() {
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(
    async (message: string, context?: Record<string, any>): Promise<string> => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/ai-chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, context: context || {} }),
        });
        const data = await res.json();
        return data.response || "No response";
      } catch {
        return "Sorry, AI is unavailable right now 😅";
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { loading, sendMessage };
}

// ── Devotional Places Hook ──────────────────────────────────────────────────

export interface DevotionalPlace {
  name: string;
  type: string;
  rating: number;
  distance_km: number;
  crowd_prediction: string;
  entry_fee: number;
  timings: string;
  festivals?: string[];
}

export function useDevotionalPlaces() {
  const [places, setPlaces] = useState<DevotionalPlace[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPlaces = useCallback(
    async (lat: number, lng: number, radius_km: number = 50) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          lat: String(lat),
          lng: String(lng),
          radius_km: String(radius_km),
        });
        const res = await fetch(`${API_BASE}/devotional-places?${qs}`);
        const data = await res.json();
        setPlaces(data.results || []);
        return data.results || [];
      } catch {
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { places, loading, fetchPlaces };
}

// ── Stays Hook ──────────────────────────────────────────────────────────────

export interface StayOption {
  name: string;
  type: string;
  category?: string;
  pricePerNight: number;
  rating: number;
  distance_km: number;
  distance?: number;
  amenities: string[];
  withinBudget: boolean;
}

export function useStayOptions() {
  const [stays, setStays] = useState<StayOption[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStays = useCallback(
    async (lat: number, lng: number, budget: number, persons: number, days: number) => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/stay-options`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng, budget, number_of_persons: persons, number_of_days: days }),
        });
        const data = await res.json();
        // Normalize fields from API
        const normalized = (data.results || []).map((s: any) => ({
          ...s,
          type: s.category || s.type || "hotel",
          distance_km: s.distance ?? s.distance_km ?? 0,
          amenities: s.amenities || [],
        }));
        setStays(normalized);
        return normalized;
      } catch {
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { stays, loading, fetchStays };
}

// ── Food Options Hook ───────────────────────────────────────────────────────

export interface FoodOption {
  name: string;
  type: string;
  cuisine: string;
  priceRange: string;
  rating: number;
  distance_km: number;
  isVeg: boolean;
  withinBudget: boolean;
}

export function useFoodOptions() {
  const [foods, setFoods] = useState<FoodOption[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFoods = useCallback(
    async (lat: number, lng: number, budget: number) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          lat: String(lat),
          lng: String(lng),
          budget: String(budget),
        });
        const res = await fetch(`${API_BASE}/food-options?${qs}`);
        const data = await res.json();
        // Normalize from API
        const normalized = (data.results || []).map((f: any) => ({
          ...f,
          type: f.type || f.category || "restaurant",
          cuisine: f.cuisine || f.specialty || "Local",
          priceRange: f.priceRange || `₹${f.pricePerMeal || f.budgetPerMeal || 0}`,
          distance_km: f.distance_km ?? f.distance ?? 0,
          isVeg: f.isVeg ?? f.foodType === "veg" ?? true,
          withinBudget: f.withinBudget ?? true,
        }));
        setFoods(normalized);
        return normalized;
      } catch {
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { foods, loading, fetchFoods };
}
