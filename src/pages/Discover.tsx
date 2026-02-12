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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import FloatingSOS from "@/components/FloatingSOS";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThreeScene, LazyParticleField } from "@/components/three/LazyThreeScenes";

gsap.registerPlugin(ScrollTrigger);

interface HiddenSpot {
  id: string;
  name: string;
  description: string;
  rating: number;
  visitors: string;
  bestTime: string;
  safetyScore: number;
  image: string;
  tags: string[];
}

const Discover = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [destination, setDestination] = useState("");
  const [spots, setSpots] = useState<HiddenSpot[]>([]);

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

    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const mockSpots: HiddenSpot[] = [
      {
        id: "1",
        name: "Moonlight Lake",
        description: "A serene lake hidden in the mountains, perfect for stargazing and peaceful reflection away from tourist crowds.",
        rating: 4.9,
        visitors: "~50/day",
        bestTime: "Evening",
        safetyScore: 95,
        image: "🌙",
        tags: ["Nature", "Peaceful", "Photography"],
      },
      {
        id: "2",
        name: "Old Town Artisan Street",
        description: "A narrow alley with traditional craftsmen creating authentic local art, untouched by commercialization.",
        rating: 4.7,
        visitors: "~30/day",
        bestTime: "Morning",
        safetyScore: 98,
        image: "🎨",
        tags: ["Culture", "Local", "Shopping"],
      },
      {
        id: "3",
        name: "Forest Tea House",
        description: "A century-old tea house deep in the forest, serving traditional brews with ancient recipes.",
        rating: 4.8,
        visitors: "~20/day",
        bestTime: "Afternoon",
        safetyScore: 92,
        image: "🍵",
        tags: ["Food", "Traditional", "Relaxing"],
      },
    ];

    setSpots(mockSpots);
    setIsLoading(false);
    toast({
      title: t.hiddenSpots + " Found! 🎉",
      description: `Discovered ${mockSpots.length} AI-recommended hidden gems`,
    });
  };

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
          <div className="relative mb-4">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={t.destination}
              className="input-travel pl-12"
            />
          </div>
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
                {t.discover} {t.hiddenSpots}
              </>
            )}
          </button>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            AI considers {t.budget}, safety, season & local popularity
          </p>
        </div>

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
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Visitors</p>
                      <p className="text-sm font-medium">{spot.visitors}</p>
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
