/**
 * useDevotional — React hooks for the Devotional Trip Planner
 *
 * Provides hooks for:
 *  - Fetching devotional places
 *  - Stay options
 *  - Food options
 *  - Itinerary generation
 *  - AI chat
 */

import { useState, useCallback } from "react";

const API_BASE =
  import.meta.env.VITE_HIDDEN_GEM_API_URL || "http://localhost:8000";

// ── Types ───────────────────────────────────────────────────────────────────

export interface TempleTimings {
  open: string;
  close: string;
  darshan_morning: string;
  darshan_evening: string;
}

export interface EntryFee {
  indian: number;
  foreigner: number;
  camera: number;
}

export interface DevotionalPlace {
  id: string;
  name: string;
  description: string;
  category: string;
  lat: number;
  lng: number;
  distance: number;
  rating: number;
  crowdLevel: "low" | "medium" | "high";
  crowdEmoji: string;
  timings: TempleTimings;
  entryFee: EntryFee;
  festivals: string[];
  hasFestival: boolean;
  festivalEmoji: string;
  templeEmoji: string;
  image_url: string;
}

export interface StayOption {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  distance: number;
  templeDistance: number;
  rating: number;
  pricePerNight: number;
  totalCost: number;
  persons: number;
  days: number;
  withinBudget: boolean;
  amenities: string[];
  hasFood: boolean;
  hasAC: boolean;
  stayType: string;
  foodEmoji: string;
  acEmoji: string;
  typeEmoji: string;
}

export interface FoodOption {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  distance: number;
  rating: number;
  priceLow: number;
  priceHigh: number;
  avgMealCost: number;
  foodType: string;
  isVeg: boolean;
  specialty: string;
  vegEmoji: string;
  ratingEmoji: string;
  budgetEmoji: string;
}

export interface DayActivity {
  activity: string;
  place: string;
  time: string;
  description: string;
  cost: number;
  crowdLevel?: string;
  crowdEmoji?: string;
  lat: number;
  lng: number;
}

export interface DevotionalDayPlan {
  day: number;
  morning: DayActivity;
  lunch: DayActivity;
  afternoon: DayActivity;
  evening: DayActivity;
  stayCheckin: DayActivity;
  dayCost: number;
}

export interface HiddenSpotDev {
  name: string;
  type: string;
  score: number;
  distance: number;
  lat: number;
  lng: number;
  bestTime: string;
}

export interface DevotionalItinerary {
  temple: string;
  templeLat: number;
  templeLng: number;
  days: number;
  persons: number;
  travelMode: string;
  dayPlans: DevotionalDayPlan[];
  stayOptions: StayOption[];
  foodOptions: FoodOption[];
  hiddenSpots: HiddenSpotDev[];
  devotionalPlaces: DevotionalPlace[];
  budgetBreakdown: {
    stay: number;
    food: number;
    transport: number;
    activities: number;
    buffer: number;
    total: number;
  };
  budgetRemaining: number;
  estimatedTravelTime: number;
  crowdPrediction: {
    crowd_level: "low" | "medium" | "high";
    [key: string]: unknown;
  } | null;
  festivals: string[];
  totalCost: number;
}

// ── useDevotionalPlaces ─────────────────────────────────────────────────────

export function useDevotionalPlaces() {
  const [places, setPlaces] = useState<DevotionalPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaces = useCallback(
    async (params: {
      lat: number;
      lng: number;
      radius_km?: number;
      min_rating?: number;
      crowd_filter?: string;
      sort_by?: string;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          lat: String(params.lat),
          lng: String(params.lng),
          radius_km: String(params.radius_km ?? 100),
          min_rating: String(params.min_rating ?? 0),
          crowd_filter: params.crowd_filter ?? "all",
          sort_by: params.sort_by ?? "distance",
        });
        const resp = await fetch(`${API_BASE}/devotional-places?${qs}`);
        const data = await resp.json();
        if (data.error) throw new Error(data.error);
        setPlaces(data.results ?? []);
        return data.results as DevotionalPlace[];
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to fetch places";
        setError(msg);
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { places, loading, error, fetchPlaces };
}

// ── useStayOptions ──────────────────────────────────────────────────────────

export function useStayOptions() {
  const [stays, setStays] = useState<StayOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStays = useCallback(
    async (params: {
      budget: number;
      number_of_persons: number;
      number_of_days: number;
      lat: number;
      lng: number;
      temple_lat?: number;
      temple_lng?: number;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(`${API_BASE}/stay-options`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        const data = await resp.json();
        if (data.error) throw new Error(data.error);
        setStays(data.results ?? []);
        return data.results as StayOption[];
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to fetch stays";
        setError(msg);
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { stays, loading, error, fetchStays };
}

// ── useFoodOptions ──────────────────────────────────────────────────────────

export function useFoodOptions() {
  const [foods, setFoods] = useState<FoodOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFoods = useCallback(
    async (params: {
      lat: number;
      lng: number;
      budget?: number;
      food_type?: string;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          lat: String(params.lat),
          lng: String(params.lng),
          budget: String(params.budget ?? 500),
          food_type: params.food_type ?? "all",
        });
        const resp = await fetch(`${API_BASE}/food-options?${qs}`);
        const data = await resp.json();
        if (data.error) throw new Error(data.error);
        setFoods(data.results ?? []);
        return data.results as FoodOption[];
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to fetch food";
        setError(msg);
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { foods, loading, error, fetchFoods };
}

// ── useDevotionalItinerary ──────────────────────────────────────────────────

export function useDevotionalItinerary() {
  const [itinerary, setItinerary] = useState<DevotionalItinerary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateItinerary = useCallback(
    async (params: {
      budget: number;
      days: number;
      persons: number;
      temple_name: string;
      temple_lat: number;
      temple_lng: number;
      travel_mode?: string;
      include_hidden?: boolean;
    }) => {
      setLoading(true);
      setError(null);
      setItinerary(null);
      try {
        const resp = await fetch(`${API_BASE}/generate-itinerary`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        const data = await resp.json();
        if (data.error) throw new Error(data.error);
        setItinerary(data as DevotionalItinerary);
        return data as DevotionalItinerary;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to generate itinerary";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const resetItinerary = useCallback(() => {
    setItinerary(null);
    setError(null);
  }, []);

  return { itinerary, loading, error, generateItinerary, resetItinerary };
}

// ── useAIChat ───────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: number;
}

export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(
    async (message: string, context: Record<string, unknown> = {}) => {
      const userMsg: ChatMessage = {
        id: `user_${Date.now()}`,
        role: "user",
        content: message,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const resp = await fetch(`${API_BASE}/ai-chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, context }),
        });
        const data = await resp.json();
        const aiMsg: ChatMessage = {
          id: `ai_${Date.now()}`,
          role: "ai",
          content: data.response ?? "I'm not sure about that. Try asking about timings, crowds, or budget.",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        return aiMsg;
      } catch {
        const errMsg: ChatMessage = {
          id: `ai_${Date.now()}`,
          role: "ai",
          content: "Sorry, I couldn't connect to the server. Please try again.",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);
        return errMsg;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, loading, sendMessage, clearChat };
}
