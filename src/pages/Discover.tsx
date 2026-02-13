import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowLeft,
  Sparkles,
  MapPin,
  Star,
  Clock,
  Users,
  Leaf,
  Shield,
  Loader2,
  Mountain,
  Wallet,
  BarChart3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import FloatingSOS from "@/components/FloatingSOS";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThreeScene, LazyParticleField } from "@/components/three/LazyThreeScenes";
import { useHiddenGems, type DiscoverSpot, type CrowdPrediction } from "@/hooks/useHiddenGems";

gsap.registerPlugin(ScrollTrigger);

type DiscoverMode = "nearby" | "temples" | "weekend" | "budget";

const MODE_CONFIG: Record<DiscoverMode, { label: string; icon: React.ReactNode; description: string }> = {
  nearby: { label: "Hidden Gems", icon: <Sparkles className="w-4 h-4" />, description: "AI-ranked hidden spots near you" },
  temples: { label: "Temples", icon: <span className="text-sm">🛕</span>, description: "Secret worship places off the beaten path" },
  weekend: { label: "Weekend", icon: <Mountain className="w-4 h-4" />, description: "Quiet weekend getaway escapes" },
  budget: { label: "Budget", icon: <Wallet className="w-4 h-4" />, description: "Budget-friendly hidden experiences" },
};

const Discover = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [destination, setDestination] = useState("");
  const [mode, setMode] = useState<DiscoverMode>("nearby");
  const [crowdInfo, setCrowdInfo] = useState<CrowdPrediction | null>(null);

  // Hidden Gem API hook
  const {
    spots,
    loading: isLoading,
    error: apiError,
    discoverNearby,
    discoverTemples,
    discoverWeekend,
    discoverBudget,
    predictCrowd,
  } = useHiddenGems();

  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const searchCardRef = useRef<HTMLDivElement>(null);
  const spotsListRef = useRef<HTMLDivElement>(null);

  // GSAP entrance animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(heroRef.current, { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 });
      tl.fromTo(
        searchCardRef.current,
        { y: 40, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.2)" },
        "-=0.3"
      );
    }, pageRef);
    return () => ctx.revert();
  }, []);

  // Animate spots when they appear with scrub scroll timeline
  useEffect(() => {
    if (spots.length > 0 && spotsListRef.current) {
      const spotsTl = gsap.timeline({
        scrollTrigger: {
          scrub: 1,
          trigger: spotsListRef.current,
          start: "top 90%",
          end: "bottom 30%",
        },
      });
      spotsTl.fromTo(
        spotsListRef.current.children,
        { y: 30, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.12, ease: "back.out(1.2)" }
      );

      return () => {
        spotsTl.scrollTrigger?.kill();
        spotsTl.kill();
      };
    }
  }, [spots]);

  const handleDiscover = async () => {
    if (!destination) {
      toast({
        title: t.destination,
        description: "Please enter where you want to discover hidden spots",
        variant: "destructive",
      });
      return;
    }

    // Geocode destination using Nominatim
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}&limit=1&countrycodes=in`
      );
      const geoData = await geoRes.json();
      if (!geoData.length) {
        toast({
          title: "Location not found",
          description: "Could not find that destination. Try a city name like 'Rishikesh' or 'Jaipur'.",
          variant: "destructive",
        });
        return;
      }

      const lat = parseFloat(geoData[0].lat);
      const lon = parseFloat(geoData[0].lon);

      // Call appropriate endpoint based on mode
      let results: DiscoverSpot[] = [];
      switch (mode) {
        case "nearby":
          results = await discoverNearby(lat, lon, 50, 10);
          break;
        case "temples":
          results = await discoverTemples(lat, lon, 100, 10);
          break;
        case "weekend":
          results = await discoverWeekend(lat, lon, 150, 10);
          break;
        case "budget":
          results = await discoverBudget(lat, lon, 100, 10);
          break;
      }

      // Also fetch crowd prediction for the location
      const crowd = await predictCrowd(lat, lon, new Date().getMonth() + 1);
      setCrowdInfo(crowd);

      if (results.length > 0) {
        toast({
          title: t.hiddenSpots + " Found! 🎉",
          description: `Discovered ${results.length} AI-recommended hidden gems near ${destination}`,
        });
      } else {
        toast({
          title: "No hidden gems found",
          description: `Try a larger area or different mode. The ML model has ${mode === "temples" ? "temple" : "hidden spot"} data mainly near major cities.`,
        });
      }
    } catch (e: any) {
      toast({
        title: "Discovery failed",
        description: e.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  // Show API error as toast
  useEffect(() => {
    if (apiError) {
      toast({
        title: "Hidden Gem API Error",
        description: apiError,
        variant: "destructive",
      });
    }
  }, [apiError, toast]);

  const getSafetyColor = (score: number) => {
    if (score >= 90) return "text-success";
    if (score >= 70) return "text-warning";
    return "text-destructive";
  };

  return (
    <div ref={pageRef} className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div ref={heroRef} className="bg-gradient-hero px-6 pt-8 pb-16 rounded-b-[2rem] relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <ThreeScene className="absolute inset-0">
            <LazyParticleField particleCount={40} color="#f97316" speed={0.15} />
          </ThreeScene>
        </div>
        <div className="flex items-center gap-4 mb-6 relative z-10">
          <Link
            to="/home"
            className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center backdrop-blur-sm"
          >
            <ArrowLeft className="w-5 h-5 text-primary-foreground" />
          </Link>
          <h1 className="text-xl font-bold text-primary-foreground">{t.discover}</h1>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <Sparkles className="w-6 h-6 text-accent" />
          <div>
            <p className="text-primary-foreground font-medium">
              AI-Powered {t.hiddenSpots}
            </p>
            <p className="text-primary-foreground/70 text-sm">
              Find places locals love, tourists miss
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 -mt-8">
        {/* Search Card */}
        <div ref={searchCardRef} className="travel-card mb-6">
          <h3 className="font-semibold mb-4">{t.search} {t.hiddenSpots}</h3>

          {/* Mode Selector */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
            {(Object.entries(MODE_CONFIG) as [DiscoverMode, typeof MODE_CONFIG[DiscoverMode]][]).map(
              ([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    mode === key
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {cfg.icon}
                  {cfg.label}
                </button>
              )
            )}
          </div>

          <div className="relative mb-4">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={`${t.destination} (e.g. Rishikesh, Jaipur, Goa)`}
              className="input-travel pl-12"
              onKeyDown={(e) => e.key === "Enter" && handleDiscover()}
            />
          </div>

          <p className="text-xs text-muted-foreground mb-3">
            {MODE_CONFIG[mode].description}
          </p>

          <button
            onClick={handleDiscover}
            disabled={isLoading}
            className="btn-accent w-full flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t.loading}
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                {t.discover} {MODE_CONFIG[mode].label}
              </>
            )}
          </button>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Powered by ML · RandomForest model · 49K+ POIs analyzed
          </p>
        </div>

        {/* Crowd Prediction Banner */}
        {crowdInfo && (
          <div className="travel-card mb-4 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
              crowdInfo.crowd_level === "low"
                ? "bg-green-100 dark:bg-green-900/30"
                : crowdInfo.crowd_level === "medium"
                ? "bg-yellow-100 dark:bg-yellow-900/30"
                : "bg-red-100 dark:bg-red-900/30"
            }`}>
              <BarChart3 className={`w-6 h-6 ${
                crowdInfo.crowd_level === "low"
                  ? "text-green-600"
                  : crowdInfo.crowd_level === "medium"
                  ? "text-yellow-600"
                  : "text-red-600"
              }`} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">
                Crowd Level: <span className={`uppercase ${
                  crowdInfo.crowd_level === "low"
                    ? "text-green-600"
                    : crowdInfo.crowd_level === "medium"
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}>{crowdInfo.crowd_level}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Near {crowdInfo.nearest_poi} · {crowdInfo.hotels_nearby} hotels · {crowdInfo.metro_nearby} metro · Season ×{crowdInfo.festival_multiplier}
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {spots.length > 0 && (
          <div ref={spotsListRef} className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              AI Recommendations
            </h3>

            {spots.map((spot) => (
              <div
                key={spot.id}
                className="travel-card"
              >
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center text-3xl">
                    {spot.image}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{spot.name}</h4>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-warning fill-warning" />
                        <span className="font-medium text-sm">{spot.rating}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {spot.description}
                    </p>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {spot.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Distance</p>
                      <p className="text-sm font-medium">{spot.distance}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Best Time</p>
                      <p className="text-sm font-medium">{spot.bestTime}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className={`w-4 h-4 ${getSafetyColor(spot.safetyScore)}`} />
                    <div>
                      <p className="text-xs text-muted-foreground">Safety</p>
                      <p className={`text-sm font-medium ${getSafetyColor(spot.safetyScore)}`}>
                        {spot.safetyScore}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Hidden Gem Score bar */}
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Hidden Gem Score</span>
                    <span className="font-semibold text-accent">{spot.hiddenGemScore.toFixed(0)}/100</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-primary transition-all"
                      style={{ width: `${spot.hiddenGemScore}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {spots.length === 0 && !isLoading && (
          <div className="travel-card text-center py-12">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Leaf className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">{t.discover} {t.hiddenSpots}</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Enter a destination above and let our AI find the best local spots that tourists usually miss
            </p>
          </div>
        )}
      </div>

      {/* Floating SOS Button */}
      <FloatingSOS />

      <BottomNav />
    </div>
  );
};

export default Discover;
