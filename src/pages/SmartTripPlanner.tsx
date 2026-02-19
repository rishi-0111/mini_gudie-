/**
 * SmartTripPlanner — Full-featured AI Trip Planner page
 *
 * Integrates: BudgetSlider (input+drag), TripControls (transport w/ duration),
 * TransportOptions (conditional flight), PlanActions, AISuggestion (with chat),
 * TripMap, PlanPreview (devotional+stays+food), GenerateButton
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowLeft, Database, Sparkles, Map as MapIcon, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import BottomNav from "@/components/BottomNav";
import FloatingSOS from "@/components/FloatingSOS";

import TripControlsPanel, { type TripInputs } from "@/components/smart-trip/TripControlsPanel";
import GenerateButton from "@/components/smart-trip/GenerateButton";
import PlanPreview from "@/components/smart-trip/PlanPreview";
import TransportOptions from "@/components/smart-trip/TransportOptions";
import PlanActions from "@/components/smart-trip/PlanActions";
import AISuggestion from "@/components/smart-trip/AISuggestion";
import TripMap from "@/components/smart-trip/TripMap";

import {
  useSmartTrip,
  useRoute,
  useAIChat,
  useDevotionalPlaces,
  useStayOptions,
  useFoodOptions,
  type SmartTripPlan,
} from "@/hooks/useSmartTrip";

gsap.registerPlugin(ScrollTrigger);

export default function SmartTripPlanner() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { plan, loading, error, generatePlan, resetPlan } = useSmartTrip();
  const { routes, loading: routeLoading, fetchRoute } = useRoute();
  const { loading: chatLoading, sendMessage } = useAIChat();
  const { places: devotionalPlaces, fetchPlaces: fetchDevotional } = useDevotionalPlaces();
  const { stays, fetchStays } = useStayOptions();
  const { foods, fetchFoods } = useFoodOptions();

  const [showPlan, setShowPlan] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showTransport, setShowTransport] = useState(false);
  const [transportTab, setTransportTab] = useState("bus");
  const [flightAvailable, setFlightAvailable] = useState<boolean | undefined>(undefined);
  const [actualDistance, setActualDistance] = useState<number | undefined>(undefined);
  const [actualDuration, setActualDuration] = useState<number | undefined>(undefined);
  const [distanceLoading, setDistanceLoading] = useState(false);

  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [inputs, setInputs] = useState<TripInputs>({
    fromCity: "",
    toCity: "",
    fromLat: 0,
    fromLng: 0,
    toLat: 0,
    toLng: 0,
    budget: 5000,
    days: 2,
    date: "",
    persons: 2,
    rating: 3,
    distance: 200,
    transportMode: "auto",
    hiddenGems: false,
  });

  // Hero animation
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (prefersReduced) return; // CSS shows everything by default
      gsap.from(heroRef.current, {
        y: -40, opacity: 0, duration: 0.6, ease: "power3.out", clearProps: "all",
      });
      gsap.from(contentRef.current, {
        y: 32, opacity: 0, duration: 0.5, delay: 0.18, ease: "power3.out", clearProps: "all",
      });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  // Check distance and duration via OSRM when both cities are selected
  useEffect(() => {
    const { fromLat, fromLng, toLat, toLng, fromCity, toCity } = inputs;

    if (!fromLat || !fromLng || !toLat || !toLng || !fromCity || !toCity) {
      setActualDistance(undefined);
      setActualDuration(undefined);
      setFlightAvailable(undefined);
      setDistanceLoading(false);
      return;
    }

    let cancelled = false;
    setDistanceLoading(true);

    const timer = setTimeout(async () => {
      try {
        // OSRM URL uses {fromLon},{fromLat};{toLon},{toLat}
        const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`;

        const res = await fetch(url);
        if (cancelled) return;

        const data = await res.json();
        if (!cancelled && data.code === "Ok" && data.routes?.[0]) {
          const route = data.routes[0];
          // Extracted distance is in meters, convert to km
          const km = route.distance / 1000;
          const mins = route.duration / 60;
          setActualDistance(km);
          setActualDuration(mins);

          // Heuristic for flight availability
          setFlightAvailable(km > 600);
        } else {
          setActualDistance(undefined);
          setActualDuration(undefined);
        }
      } catch (err) {
        console.error("OSM Routing Error:", err);
      } finally {
        if (!cancelled) setDistanceLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [inputs.fromLat, inputs.fromLng, inputs.toLat, inputs.toLng, inputs.fromCity, inputs.toCity]);


  // Generate plan handler
  const handleGenerate = useCallback(async () => {
    if (!inputs.fromCity.trim()) {
      toast({ title: "Where from?", description: "Please enter your starting city", variant: "destructive" });
      return;
    }
    if (!inputs.toCity.trim()) {
      toast({ title: "Where to?", description: "Please enter a destination", variant: "destructive" });
      return;
    }

    try {
      const result = await generatePlan({
        from_city: inputs.fromCity,
        to_city: inputs.toCity,
        from_lat: inputs.fromLat || undefined,
        from_lng: inputs.fromLng || undefined,
        to_lat: inputs.toLat || undefined,
        to_lng: inputs.toLng || undefined,
        budget: inputs.budget,
        days: inputs.days,
        persons: inputs.persons,
        date: inputs.date,
        rating: inputs.rating,
        distance_km: actualDistance || inputs.distance,
        transport_mode: inputs.transportMode,
        hidden_gems: inputs.hiddenGems,
      });

      setShowPlan(true);
      toast({ title: "Trip Plan Generated! ✨", description: "AI-powered itinerary ready" });

      // Auto-select transport tab based on recommendation
      if (result?.transport?.recommended) {
        setTransportTab(result.transport.recommended === "walk" ? "bus" : result.transport.recommended);
      }

      // Fetch devotional places, stays, and food for destination
      if (result?.meta?.toLat && result?.meta?.toLng) {
        const lat = result.meta.toLat;
        const lng = result.meta.toLng;
        fetchDevotional(lat, lng, 50);
        const stayBudget = result.budgetBreakdown?.stay || Math.round(inputs.budget * 0.3);
        fetchStays(lat, lng, stayBudget, inputs.persons, inputs.days);
        const foodBudget = result.budgetBreakdown?.food || Math.round(inputs.budget * 0.2);
        fetchFoods(lat, lng, foodBudget);
      }
    } catch (err: any) {
      toast({ title: "Generation Failed", description: err.message, variant: "destructive" });
    }
  }, [inputs, generatePlan, toast, fetchDevotional, fetchStays, fetchFoods]);

  // AI chat handler — sends context of current plan
  const handleAIChat = useCallback(async (message: string) => {
    const context: Record<string, any> = {
      destination: inputs.toCity,
      from: inputs.fromCity,
      budget: inputs.budget,
      days: inputs.days,
      persons: inputs.persons,
    };
    if (plan) {
      context.distance = plan.distance;
      context.budgetBreakdown = plan.budgetBreakdown;
      context.transportRecommended = plan.transport?.recommended;
    }
    return sendMessage(message, context);
  }, [inputs, plan, sendMessage]);

  // View route handler
  const handleViewRoute = useCallback(async () => {
    if (!plan) return;
    // Use geocoded from coordinates from the API response
    const fromLat = plan.meta.fromLat;
    const fromLng = plan.meta.fromLng;
    const mode = inputs.transportMode === "auto" ? "car" : inputs.transportMode === "flight" ? "car" : inputs.transportMode;
    await fetchRoute(
      fromLat,
      fromLng,
      plan.meta.toLat,
      plan.meta.toLng,
      mode === "bus" || mode === "train" ? "car" : mode
    );
    setShowMap(true);
  }, [plan, inputs.transportMode, fetchRoute]);

  // Edit / reset
  const handleEdit = () => {
    setShowPlan(false);
    setShowTransport(false);
    resetPlan();
  };

  // Regenerate
  const handleRegenerate = () => {
    setShowPlan(false);
    setShowTransport(false);
    resetPlan();
    setTimeout(() => handleGenerate(), 100);
  };

  return (
    <div ref={pageRef} className="min-h-screen bg-background page-scroll">
      {/* Hero Header */}
      <div
        ref={heroRef}
        className="bg-gradient-to-b from-purple-600 via-purple-500 to-primary px-6 pt-8 pb-16 rounded-b-[2rem] relative overflow-hidden"
      >
        {/* Decorative blobs */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-accent/10 rounded-full blur-xl" />

        <div className="flex items-center gap-4 mb-4 relative z-10">
          <Link
            to="/home"
            className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-sm"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <h1 className="text-xl font-bold text-white">Smart Trip Planner</h1>
        </div>
        <p className="text-white/80 text-sm relative z-10">
          AI-powered itinerary with transport, budget, stays, food & hidden gems
        </p>
        <div className="flex items-center gap-2 mt-3 relative z-10 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-medium backdrop-blur-sm">
            <Database className="w-3 h-3" /> 6,300+ places
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-medium backdrop-blur-sm">
            <Sparkles className="w-3 h-3" /> ML-powered
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-medium backdrop-blur-sm">
            <MapIcon className="w-3 h-3" /> OSRM routing
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-medium backdrop-blur-sm">
            <MessageCircle className="w-3 h-3" /> AI Chat
          </span>
        </div>
      </div>

      {/* Content */}
      <div ref={contentRef} className="px-4 sm:px-6 mt-4 space-y-5 max-w-2xl mx-auto">
        {/* Error banner */}
        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive">
            ⚠️ {error}
          </div>
        )}

        {!showPlan ? (
          <>
            {/* Controls */}
            <TripControlsPanel
              values={inputs}
              onChange={setInputs}
              flightAvailable={flightAvailable}
              actualDistance={actualDistance}
              actualDuration={actualDuration}
              distanceLoading={distanceLoading}
            />


            {/* Generate Button */}
            <GenerateButton onClick={handleGenerate} loading={loading} disabled={!inputs.toCity.trim() || !inputs.fromCity.trim()} />
          </>
        ) : (
          plan && (
            <>
              {/* AI Suggestion with Chat */}
              <AISuggestion
                suggestion={plan.suggestion}
                isVisible={!!plan.suggestion}
                onChat={handleAIChat}
                chatLoading={chatLoading}
              />

              {/* Plan Preview with Devotional/Stays/Food */}
              <PlanPreview
                plan={plan}
                onEdit={handleEdit}
                devotionalPlaces={devotionalPlaces}
                stays={stays}
                foods={foods}
              />

              {/* Transport toggle */}
              <button
                onClick={() => setShowTransport(!showTransport)}
                className="w-full glass-card p-3 rounded-xl text-sm font-medium flex items-center justify-between hover:bg-muted/50 transition"
              >
                <span>🚀 Transport Options</span>
                <span className="text-xs text-muted-foreground">
                  {(plan.transport.buses?.length || 0) +
                    (plan.transport.trains?.length || 0) +
                    (plan.transport.flights?.length || 0)}{" "}
                  options
                </span>
              </button>

              {showTransport && (
                <TransportOptions
                  data={plan.transport}
                  budget={inputs.budget}
                  persons={inputs.persons}
                  distance={plan.distance}
                  loading={false}
                  activeTab={transportTab}
                  onTabChange={setTransportTab}
                />
              )}

              {/* Plan Actions CTA */}
              <PlanActions
                hasPlan={true}
                hasTransport={showTransport}
                loading={loading}
                onViewTransport={() => setShowTransport(true)}
                onViewRoute={handleViewRoute}
                onRegenerate={handleRegenerate}
                onBookNow={() =>
                  toast({ title: "🎉 Redirecting to booking partner...", description: "Coming soon!" })
                }
              />
            </>
          )
        )}
      </div>

      {/* Map Overlay */}
      {plan && (
        <TripMap
          fromLat={plan.meta.fromLat}
          fromLng={plan.meta.fromLng}
          toLat={plan.meta.toLat}
          toLng={plan.meta.toLng}
          routes={routes}
          routeLoading={routeLoading}
          visible={showMap}
          onClose={() => setShowMap(false)}
        />
      )}

      <FloatingSOS />
      <BottomNav />
    </div>
  );
}
