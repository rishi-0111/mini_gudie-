import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import FloatingSOS from "@/components/FloatingSOS";
import { useLanguage } from "@/contexts/LanguageContext";
import TripFilters, { TripFilterValues } from "@/components/trip/TripFilters";
import TripItinerary from "@/components/trip/TripItinerary";
import { supabase } from "@/integrations/supabase/client";
import { ThreeScene, LazyFloatingIconsScene } from "@/components/three/LazyThreeScenes";

gsap.registerPlugin(ScrollTrigger);

interface TripPlan {
  tripOverview: {
    from: string;
    to: string;
    days: number;
    transportMode: string;
    totalBudget: number;
  };
  dayWisePlan: Array<{
    day: number;
    morning: { place: string; description: string; time: string; cost: number };
    afternoon: { place: string; description: string; time: string; cost: number };
    evening: { place: string; description: string; time: string; cost: number };
    travelDistance: number;
    dayCost: number;
  }>;
  hiddenSpots: Array<{
    name: string;
    whySpecial: string;
    bestTime: string;
    distance: number;
  }>;
  stayRecommendations: Array<{
    name: string;
    distance: number;
    rating: number;
    pricePerNight: number;
  }>;
  foodSpots: Array<{
    name: string;
    specialty: string;
    budgetPerMeal: number;
  }>;
  budgetBreakdown: {
    stay: number;
    food: number;
    transport: number;
    activities: number;
    buffer: number;
    total: number;
  };
}

const TripPlanner = () => {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<TripPlan | null>(null);

  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero entrance (immediate)
      gsap.fromTo(heroRef.current, { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" });

      // Content area with scrub scroll timeline
      gsap.timeline({
        scrollTrigger: {
          scrub: 1,
          trigger: contentRef.current,
          start: "top 90%",
          end: "bottom 30%",
        },
      }).fromTo(
        contentRef.current,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 }
      );
    }, pageRef);
    return () => ctx.revert();
  }, []);

  const [filterValues, setFilterValues] = useState<TripFilterValues>({
    from: "",
    destination: "",
    budgetMin: 5000,
    budgetMax: 25000,
    days: 3,
    transportMode: "mixed",
    rating: 4,
    hiddenSpots: false,
    distance: 100,
    useCurrentLocation: true,
  });

  // Get current location on mount
  useEffect(() => {
    if (filterValues.useCurrentLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // In a real app, you'd reverse geocode this to get city name
          setFilterValues((prev) => ({
            ...prev,
            from: "Current Location",
          }));
        },
        (error) => {
          console.log("Location error:", error);
          setFilterValues((prev) => ({
            ...prev,
            useCurrentLocation: false,
          }));
        }
      );
    }
  }, []);

  const handleGeneratePlan = async () => {
    if (!filterValues.destination) {
      toast({
        title: t.destination,
        description: "Please enter where you want to go",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-trip", {
        body: {
          from: filterValues.useCurrentLocation ? "Current Location" : filterValues.from,
          destination: filterValues.destination,
          budget: { min: filterValues.budgetMin, max: filterValues.budgetMax },
          days: filterValues.days,
          transportMode: filterValues.transportMode,
          rating: filterValues.rating,
          hiddenSpots: filterValues.hiddenSpots,
          distance: filterValues.distance,
          language: language,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedPlan(data);
      setShowPlan(true);

      toast({
        title: "Trip Plan Generated! ✨",
        description: "Your personalized AI itinerary is ready",
      });
    } catch (err: any) {
      console.error("Trip generation error:", err);
      setError(err.message || "Failed to generate trip plan");
      toast({
        title: "Generation Failed",
        description: err.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFilterChange = (newValues: TripFilterValues) => {
    setFilterValues(newValues);
    // Reset plan when filters change significantly
    if (showPlan) {
      setShowPlan(false);
      setGeneratedPlan(null);
    }
  };

  return (
    <div ref={pageRef} className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div ref={heroRef} className="bg-gradient-hero px-6 pt-8 pb-16 rounded-b-[2rem] relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <ThreeScene className="absolute inset-0">
            <LazyFloatingIconsScene />
          </ThreeScene>
        </div>
        <div className="flex items-center gap-4 mb-6 relative z-10">
          <Link
            to="/home"
            className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center backdrop-blur-sm"
          >
            <ArrowLeft className="w-5 h-5 text-primary-foreground" />
          </Link>
          <h1 className="text-xl font-bold text-primary-foreground">{t.tripPlanner}</h1>
        </div>
        <p className="text-primary-foreground/80 relative z-10">{t.generateItinerary}</p>
      </div>

      <div ref={contentRef} className="px-6 -mt-8">
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {!showPlan ? (
          <TripFilters
            values={filterValues}
            onChange={handleFilterChange}
            onGenerate={handleGeneratePlan}
            isGenerating={isGenerating}
          />
        ) : (
          generatedPlan && (
            <TripItinerary plan={generatedPlan} onEdit={() => setShowPlan(false)} />
          )
        )}
      </div>

      <FloatingSOS />
      <BottomNav />
    </div>
  );
};

export default TripPlanner;
