/**
 * DevotionalTripPlanner — Full devotional trip planning page
 *
 * Integrates: devotional places, stays, food, itinerary generation,
 * AI chat, Leaflet map, and GSAP animations.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowLeft, Map as MapIcon, Wallet, Calendar, Users as UsersIcon,
  Car, Train, Bus, Bike, Footprints, Navigation, AlertCircle,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import FloatingSOS from "@/components/FloatingSOS";
import DevotionalPlaces from "@/components/devotional/DevotionalPlaces";
import StayOptions from "@/components/devotional/StayOptions";
import FoodOptions from "@/components/devotional/FoodOptions";
import GenerateItineraryButton from "@/components/devotional/GenerateItineraryButton";
import MiniPlanPreview from "@/components/devotional/MiniPlanPreview";
import AIChatPanel from "@/components/devotional/AIChatPanel";
import DevotionalMap from "@/components/devotional/DevotionalMap";
import {
  useDevotionalPlaces,
  useStayOptions,
  useFoodOptions,
  useDevotionalItinerary,
  useAIChat,
  type DevotionalPlace,
} from "@/hooks/useDevotional";

gsap.registerPlugin(ScrollTrigger);

const transportModes = [
  { id: "walk", icon: Footprints, label: "Walk" },
  { id: "bike", icon: Bike, label: "Bike" },
  { id: "car", icon: Car, label: "Car" },
  { id: "bus", icon: Bus, label: "Bus" },
  { id: "train", icon: Train, label: "Train" },
  { id: "mixed", icon: Navigation, label: "Mixed" },
];

type ViewTab = "places" | "stays" | "food";

const DevotionalTripPlanner = () => {
  const { toast } = useToast();

  // ── State ──────────────────────────────────────────────────────────────
  const [userLocation, setUserLocation] = useState({ lat: 28.6139, lng: 77.209 }); // Default Delhi
  const [selectedPlace, setSelectedPlace] = useState<DevotionalPlace | null>(null);
  const [devotionalMode, setDevotionalMode] = useState(true);
  const [hiddenToggle, setHiddenToggle] = useState(true);
  const [showItinerary, setShowItinerary] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>("places");

  // Filters
  const [filters, setFilters] = useState({
    rating: 3.5,
    distance: 100,
    crowd: "all",
    budget: 10000,
    days: 2,
    persons: 1,
    transportMode: "mixed",
    foodType: "all",
  });

  // Hooks
  const { places, loading: placesLoading, fetchPlaces } = useDevotionalPlaces();
  const { stays, loading: staysLoading, fetchStays } = useStayOptions();
  const { foods, loading: foodsLoading, fetchFoods } = useFoodOptions();
  const { itinerary, loading: itinLoading, error: itinError, generateItinerary, resetItinerary } = useDevotionalItinerary();
  const { messages, loading: chatLoading, sendMessage, clearChat } = useAIChat();

  // Refs
  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // ── Animations ─────────────────────────────────────────────────────────
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        heroRef.current,
        { y: -60, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" }
      );
      gsap.timeline({
        scrollTrigger: {
          trigger: contentRef.current,
          start: "top 90%",
          end: "bottom 30%",
          scrub: 1,
        },
      }).fromTo(contentRef.current, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  // ── Get user location ──────────────────────────────────────────────────
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // Keep default Delhi
      );
    }
  }, []);

  // ── Fetch places on mount + filter change ──────────────────────────────
  useEffect(() => {
    if (!devotionalMode) return;
    fetchPlaces({
      lat: userLocation.lat,
      lng: userLocation.lng,
      radius_km: filters.distance,
      min_rating: filters.rating,
      crowd_filter: filters.crowd,
      sort_by: "distance",
    });
  }, [devotionalMode, userLocation, filters.distance, filters.rating, filters.crowd]);

  // ── Fetch stays when a place is selected ───────────────────────────────
  useEffect(() => {
    if (!selectedPlace) return;
    fetchStays({
      budget: Math.round(filters.budget * 0.35),
      number_of_persons: filters.persons,
      number_of_days: filters.days,
      lat: userLocation.lat,
      lng: userLocation.lng,
      temple_lat: selectedPlace.lat,
      temple_lng: selectedPlace.lng,
    });
    fetchFoods({
      lat: selectedPlace.lat,
      lng: selectedPlace.lng,
      budget: Math.round(filters.budget / (filters.days * 3)),
      food_type: filters.foodType,
    });
  }, [selectedPlace, filters.budget, filters.persons, filters.days, filters.foodType]);

  // ── handlers ───────────────────────────────────────────────────────────
  const handleSelectPlace = useCallback((place: DevotionalPlace) => {
    setSelectedPlace(place);
    setActiveTab("places");
    toast({
      title: `🛕 ${place.name}`,
      description: `${place.crowdEmoji} ${place.crowdLevel} crowd • ⭐ ${place.rating} • ${place.distance} km`,
    });
  }, [toast]);

  const handleFilterChange = useCallback((key: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    if (showItinerary) {
      setShowItinerary(false);
      resetItinerary();
    }
  }, [showItinerary, resetItinerary]);

  const handleGenerateItinerary = useCallback(async () => {
    if (!selectedPlace) {
      toast({
        title: "Select a temple",
        description: "Please select a devotional place first",
        variant: "destructive",
      });
      return;
    }

    try {
      await generateItinerary({
        budget: filters.budget,
        days: filters.days,
        persons: filters.persons,
        temple_name: selectedPlace.name,
        temple_lat: selectedPlace.lat,
        temple_lng: selectedPlace.lng,
        travel_mode: filters.transportMode,
        include_hidden: hiddenToggle,
      });
      setShowItinerary(true);
      toast({ title: "🧭 Itinerary Generated!", description: "Your devotional trip plan is ready" });
    } catch {
      toast({ title: "Generation Failed", description: "Please try again", variant: "destructive" });
    }
  }, [selectedPlace, filters, hiddenToggle, generateItinerary, toast]);

  const handleChatMessage = useCallback(
    (message: string) => {
      const ctx: Record<string, unknown> = {
        temple: selectedPlace?.name ?? "",
        budget: filters.budget,
        days: filters.days,
        persons: filters.persons,
        crowdPrediction: itinerary?.crowdPrediction ?? null,
      };
      sendMessage(message, ctx);
    },
    [selectedPlace, filters, itinerary, sendMessage]
  );

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div ref={pageRef} className="min-h-screen bg-background pb-24">
      {/* Hero Header */}
      <div
        ref={heroRef}
        className="bg-gradient-to-br from-orange-600 via-amber-500 to-orange-600 px-6 pt-8 pb-16 rounded-b-[2rem] relative overflow-hidden"
      >
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-6 text-6xl">🛕</div>
          <div className="absolute bottom-8 left-8 text-4xl">🔥</div>
          <div className="absolute top-16 left-1/2 text-3xl">🙏</div>
        </div>

        <div className="flex items-center gap-4 mb-6 relative z-10">
          <Link
            to="/home"
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <h1 className="text-xl font-bold text-white">🛕 Devotional Trip Planner</h1>
        </div>
        <p className="text-white/80 relative z-10">
          Plan your sacred journey with AI-powered recommendations
        </p>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mt-3 relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-medium backdrop-blur-sm">
            🛕 Temples & Sacred Sites
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-medium backdrop-blur-sm">
            ✨ ML-Powered Hidden Gems
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-medium backdrop-blur-sm">
            💬 AI Trip Assistant
          </span>
        </div>
      </div>

      {/* Content */}
      <div ref={contentRef} className="px-4 -mt-8 space-y-4">
        {itinError && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-sm text-destructive">{itinError}</p>
          </div>
        )}

        {/* Show itinerary or planning UI */}
        {showItinerary && itinerary ? (
          <MiniPlanPreview
            itinerary={itinerary}
            onEdit={() => {
              setShowItinerary(false);
              resetItinerary();
            }}
          />
        ) : (
          <>
            {/* Devotional Mode Toggle */}
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🛕</span>
                  <span className="font-bold">Devotional Mode</span>
                </div>
                <Switch checked={devotionalMode} onCheckedChange={setDevotionalMode} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✨</span>
                  <span className="font-medium text-sm">Hidden Temples</span>
                </div>
                <Switch checked={hiddenToggle} onCheckedChange={setHiddenToggle} />
              </div>
            </div>

            {/* Planning Controls */}
            <div className="glass-card p-4 space-y-4">
              {/* Budget */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-primary" /> Budget
                  </label>
                  <span className="text-sm font-bold text-primary">
                    ₹{filters.budget.toLocaleString()}
                  </span>
                </div>
                <Slider
                  value={[filters.budget]}
                  onValueChange={([val]) => handleFilterChange("budget", val)}
                  min={1000}
                  max={100000}
                  step={500}
                />
              </div>

              {/* Days & Persons */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" /> Days
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleFilterChange("days", Math.max(1, filters.days - 1))}
                      className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center font-bold active:bg-primary active:text-primary-foreground"
                    >
                      -
                    </button>
                    <span className="text-xl font-bold text-primary w-8 text-center">
                      {filters.days}
                    </span>
                    <button
                      onClick={() => handleFilterChange("days", Math.min(15, filters.days + 1))}
                      className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center font-bold active:bg-primary active:text-primary-foreground"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <UsersIcon className="w-4 h-4 text-primary" /> Persons
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleFilterChange("persons", Math.max(1, filters.persons - 1))}
                      className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center font-bold active:bg-primary active:text-primary-foreground"
                    >
                      -
                    </button>
                    <span className="text-xl font-bold text-primary w-8 text-center">
                      {filters.persons}
                    </span>
                    <button
                      onClick={() => handleFilterChange("persons", Math.min(10, filters.persons + 1))}
                      className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center font-bold active:bg-primary active:text-primary-foreground"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Transport Mode */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Transport</label>
                <div className="grid grid-cols-3 gap-2">
                  {transportModes.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => handleFilterChange("transportMode", mode.id)}
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all text-xs ${
                        filters.transportMode === mode.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary hover:bg-primary/10"
                      }`}
                    >
                      <mode.icon className="w-4 h-4" />
                      <span className="font-medium">{mode.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Selected Temple Banner */}
            {selectedPlace && (
              <div className="glass-card p-4 border-l-4 border-l-orange-500">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                      🛕 {selectedPlace.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>⭐ {selectedPlace.rating}</span>
                      <span>{selectedPlace.crowdEmoji} {selectedPlace.crowdLevel}</span>
                      <span>📍 {selectedPlace.distance} km</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPlace(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}

            {/* Tab Switcher */}
            {devotionalMode && (
              <div className="flex gap-1 p-1 rounded-xl bg-secondary">
                {(["places", "stays", "food"] as ViewTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                      activeTab === tab
                        ? "bg-background shadow text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab === "places" ? "🛕 Temples" : tab === "stays" ? "🏨 Stays" : "🍽 Food"}
                  </button>
                ))}
              </div>
            )}

            {/* Tab Content */}
            {devotionalMode && activeTab === "places" && (
              <DevotionalPlaces
                places={places}
                loading={placesLoading}
                onSelectPlace={handleSelectPlace}
                filters={{ rating: filters.rating, distance: filters.distance, crowd: filters.crowd }}
                onFilterChange={handleFilterChange}
              />
            )}

            {activeTab === "stays" && selectedPlace && (
              <StayOptions
                stays={stays}
                loading={staysLoading}
                budget={Math.round(filters.budget * 0.35)}
                persons={filters.persons}
                days={filters.days}
              />
            )}

            {activeTab === "food" && selectedPlace && (
              <FoodOptions
                foods={foods}
                loading={foodsLoading}
                budget={Math.round(filters.budget / (filters.days * 3))}
                foodTypeFilter={filters.foodType}
                onFilterChange={(type) => handleFilterChange("foodType", type)}
              />
            )}

            {(activeTab === "stays" || activeTab === "food") && !selectedPlace && (
              <div className="text-center py-10 text-muted-foreground">
                <span className="text-3xl block mb-2">👆</span>
                <p className="text-sm">Select a temple first to see {activeTab} options.</p>
              </div>
            )}

            {/* Generate Itinerary Button */}
            {selectedPlace && (
              <GenerateItineraryButton
                onClick={handleGenerateItinerary}
                loading={itinLoading}
                disabled={!selectedPlace}
              />
            )}

            {/* Map Button */}
            <button
              onClick={() => setMapOpen(true)}
              className="w-full py-3 rounded-xl bg-secondary text-foreground font-medium flex items-center justify-center gap-2 hover:bg-primary/10 transition-all"
            >
              <MapIcon className="w-5 h-5" />
              View on Map
            </button>
          </>
        )}
      </div>

      {/* Map Overlay */}
      <DevotionalMap
        center={selectedPlace ? { lat: selectedPlace.lat, lng: selectedPlace.lng } : userLocation}
        places={places}
        stays={stays}
        foods={foods}
        selectedPlace={selectedPlace}
        isOpen={mapOpen}
        onClose={() => setMapOpen(false)}
      />

      {/* AI Chat */}
      <AIChatPanel
        messages={messages}
        loading={chatLoading}
        onSendMessage={handleChatMessage}
        onClear={clearChat}
        isOpen={chatOpen}
        onToggle={() => setChatOpen(!chatOpen)}
        templeName={selectedPlace?.name}
      />

      <FloatingSOS />
      <BottomNav />
    </div>
  );
};

export default DevotionalTripPlanner;
