import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowLeft, AlertCircle, Database, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import FloatingSOS from "@/components/FloatingSOS";
import { useLanguage } from "@/contexts/LanguageContext";
import TripFilters, { TripFilterValues } from "@/components/trip/TripFilters";
import TripItinerary from "@/components/trip/TripItinerary";
import { useTripPlanner } from "@/hooks/useTripPlanner";
import { ThreeScene, LazyFloatingIconsScene } from "@/components/three/LazyThreeScenes";

gsap.registerPlugin(ScrollTrigger);

const TripPlanner = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { plan, loading, error: apiError, generateTrip, resetPlan } = useTripPlanner();
  const [showPlan, setShowPlan] = useState(false);

  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(heroRef.current, { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" });

      gsap.timeline({
        scrollTrigger: {
          scrub: 1,
          trigger: contentRef.current,
          start: "top 90%",
          end: "bottom 30%",
        },
      }).fromTo(contentRef.current, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 });
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
        () => {
          setFilterValues((prev) => ({ ...prev, from: "Current Location" }));
        },
        () => {
          setFilterValues((prev) => ({ ...prev, useCurrentLocation: false }));
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

    try {
      await generateTrip({
        from_location: filterValues.useCurrentLocation ? "Current Location" : filterValues.from,
        destination: filterValues.destination,
        budget_min: filterValues.budgetMin,
        budget_max: filterValues.budgetMax,
        days: filterValues.days,
        transport_mode: filterValues.transportMode,
        rating: filterValues.rating,
        hidden_spots: filterValues.hiddenSpots,
        distance: filterValues.distance,
      });

      setShowPlan(true);
      toast({
        title: "Trip Plan Generated! ✨",
        description: "Your personalized itinerary is ready — powered by real data & ML",
      });
    } catch (err: any) {
      toast({
        title: "Generation Failed",
        description: err.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleFilterChange = (newValues: TripFilterValues) => {
    setFilterValues(newValues);
    if (showPlan) {
      setShowPlan(false);
      resetPlan();
    }
  };

  const handleEdit = () => {
    setShowPlan(false);
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
        {/* Data source badges */}
        <div className="flex items-center gap-2 mt-3 relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-foreground/10 text-primary-foreground/90 text-xs font-medium backdrop-blur-sm">
            <Database className="w-3 h-3" /> 6,300+ real places
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-foreground/10 text-primary-foreground/90 text-xs font-medium backdrop-blur-sm">
            <Sparkles className="w-3 h-3" /> ML-powered
          </span>
        </div>
      </div>

      <div ref={contentRef} className="px-6 -mt-8">
        {apiError && (
          <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-sm text-destructive">{apiError}</p>
          </div>
        )}

        {!showPlan ? (
          <TripFilters
            values={filterValues}
            onChange={handleFilterChange}
            onGenerate={handleGeneratePlan}
            isGenerating={loading}
          />
        ) : (
          plan && <TripItinerary plan={plan} onEdit={handleEdit} />
        )}
      </div>

      <FloatingSOS />
      <BottomNav />
    </div>
  );
};

export default TripPlanner;
