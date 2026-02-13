import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  MapPin,
  User,
  Bell,
  Phone,
  Building2,
  Stethoscope,
  Siren,
  Mountain,
  Car,
  Hotel,
  Mic,
  Navigation,
  Map,
  Calendar,
  Compass,
  ShoppingBag,
  Search,
  X,
  Route,
  Clock,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CategoryCard from "@/components/CategoryCard";
import BottomNav from "@/components/BottomNav";
import FloatingSOS from "@/components/FloatingSOS";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";
import { ThreeScene, LazyParticleField } from "@/components/three/LazyThreeScenes";
import LiveLocationMap, { type RouteInfo } from "@/components/LiveLocationMap";

gsap.registerPlugin(ScrollTrigger);

const Home = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { name: userName, avatar } = useUser();
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [destQuery, setDestQuery] = useState("");
  const [destSuggestions, setDestSuggestions] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
  const [destination, setDestination] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [searchingDest, setSearchingDest] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const liveMapRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // GSAP Refs
  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const greetingRef = useRef<HTMLDivElement>(null);
  const locationBarRef = useRef<HTMLDivElement>(null);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const categoriesTitleRef = useRef<HTMLDivElement>(null);
  const voiceBtnRef = useRef<HTMLButtonElement>(null);

  // Set greeting based on time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting(t.goodMorning);
    } else if (hour < 17) {
      setGreeting(t.goodAfternoon);
    } else {
      setGreeting(t.goodEvening);
    }
  }, [t]);

  // GSAP entrance animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      // Hero section slides down
      tl.fromTo(heroRef.current, { y: -80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 });

      // Pin hero + scrub parallax — hero stays pinned while user scrolls past
      gsap.timeline({
        scrollTrigger: {
          scrub: 1,
          pin: true,
          trigger: heroRef.current,
          start: "50% 50%",
          endTrigger: quickActionsRef.current,
          end: "bottom 50%",
        },
      }).to(heroRef.current, {
        backgroundPositionY: "40%",
        opacity: 0.85,
        scale: 0.97,
      });

      // Header icons fade in from sides
      if (headerRef.current) {
        const children = headerRef.current.children;
        tl.fromTo(
          children[0],
          { x: -30, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.5 },
          "-=0.4"
        );
        tl.fromTo(
          children[1],
          { x: 30, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.5 },
          "-=0.4"
        );
      }

      // Greeting text with clip-path reveal
      tl.fromTo(
        greetingRef.current,
        { y: 30, opacity: 0, clipPath: "inset(100% 0% 0% 0%)" },
        { y: 0, opacity: 1, clipPath: "inset(0% 0% 0% 0%)", duration: 0.7 },
        "-=0.3"
      );

      // Location bar slides in
      tl.fromTo(
        locationBarRef.current,
        { y: 20, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.6 },
        "-=0.3"
      );

      // Quick Actions stagger in with scale
      if (quickActionsRef.current) {
        tl.fromTo(
          quickActionsRef.current.children,
          { y: 40, opacity: 0, scale: 0.8 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.5,
            stagger: 0.1,
            ease: "back.out(1.4)",
          },
          "-=0.2"
        );
      }

      // Categories section with scrub scroll timeline
      if (categoriesTitleRef.current) {
        gsap.timeline({
          scrollTrigger: {
            scrub: 1,
            trigger: categoriesTitleRef.current,
            start: "top 90%",
            end: "bottom 30%",
          },
        }).fromTo(
          categoriesTitleRef.current,
          { x: -30, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.6 }
        );
      }

      if (categoriesRef.current) {
        const catTl = gsap.timeline({
          scrollTrigger: {
            scrub: 1,
            trigger: categoriesRef.current,
            start: "top 90%",
            end: "bottom 30%",
          },
        });
        catTl.fromTo(
          categoriesRef.current.children,
          { y: 30, opacity: 0, scale: 0.85 },
          { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.08, ease: "back.out(1.2)" }
        );
      }

      // Voice button
      gsap.fromTo(
        voiceBtnRef.current,
        { scale: 0, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.6,
          delay: 1.5,
          ease: "back.out(2)",
        }
      );
    }, pageRef);

    return () => {
      ScrollTrigger.getAll().forEach((st) => st.kill());
      ctx.revert();
    };
  }, []);

  // Start / stop GPS watching
  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", description: "Your browser doesn't support GPS." });
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      (err) => {
        console.error(err);
        toast({ title: "Location error", description: err.message });
        setLocationEnabled(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    watchIdRef.current = id;
  }, [toast]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setUserLocation(null);
  }, []);

  // Animate map in/out when location changes
  useEffect(() => {
    if (!liveMapRef.current) return;
    if (locationEnabled && userLocation) {
      gsap.fromTo(
        liveMapRef.current,
        { height: 0, opacity: 0, scale: 0.95, marginTop: 0, marginBottom: 0 },
        { height: 400, opacity: 1, scale: 1, marginTop: 16, marginBottom: 8, duration: 0.6, ease: "power3.out" }
      );
    } else if (!locationEnabled) {
      gsap.to(liveMapRef.current, {
        height: 0, opacity: 0, scale: 0.95, marginTop: 0, marginBottom: 0, duration: 0.4, ease: "power3.in",
      });
    }
  }, [locationEnabled, userLocation]);

  // Cleanup watcher on unmount
  useEffect(() => {
    return () => { stopWatching(); };
  }, [stopWatching]);

  // Nominatim geocode search with debounce
  const handleDestSearch = (query: string) => {
    setDestQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (query.trim().length < 3) {
      setDestSuggestions([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setSearchingDest(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=0`
        );
        const data = await res.json();
        setDestSuggestions(data);
      } catch {
        setDestSuggestions([]);
      } finally {
        setSearchingDest(false);
      }
    }, 400);
  };

  const selectDestination = (item: { display_name: string; lat: string; lon: string }) => {
    setDestination({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      label: item.display_name.split(",")[0],
    });
    setDestQuery(item.display_name.split(",").slice(0, 2).join(","));
    setDestSuggestions([]);
  };

  const clearDestination = () => {
    setDestination(null);
    setDestQuery("");
    setDestSuggestions([]);
    setRouteInfo(null);
  };

  const handleLocationToggle = () => {
    // GSAP toggle animation
    if (locationBarRef.current) {
      gsap.fromTo(
        locationBarRef.current,
        { scale: 0.97 },
        { scale: 1, duration: 0.3, ease: "elastic.out(1, 0.5)" }
      );
    }
    const enabling = !locationEnabled;
    setLocationEnabled(enabling);
    if (enabling) {
      startWatching();
    } else {
      stopWatching();
    }
    toast({
      title: enabling ? t.liveLocation : t.locationOff,
      description: enabling ? t.sharingLocation : t.locationOff,
    });
  };

  const handleVoiceAssistant = () => {
    // GSAP pulse animation on click
    if (voiceBtnRef.current) {
      gsap.fromTo(
        voiceBtnRef.current,
        { scale: 1.2 },
        { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.4)" }
      );
    }
    setIsVoiceActive(!isVoiceActive);
    toast({
      title: isVoiceActive ? t.voiceAssistant : t.voiceAssistant,
      description: isVoiceActive
        ? t.cancel
        : t.listeningCommands,
    });
  };

  const categories = [
    { icon: Building2, label: t.temples, color: "bg-orange-500", to: "/devotional" },
    { icon: Stethoscope, label: t.hospitals, color: "bg-blue-500", to: "/explore?cat=hospital" },
    { icon: Siren, label: t.emergency, color: "bg-red-500", to: "/explore?cat=emergency" },
    { icon: Sparkles, label: t.hiddenSpots, color: "bg-accent", to: "/discover" },
    { icon: Hotel, label: t.hostels, color: "bg-green-500", to: "/explore?cat=hostel" },
    { icon: Car, label: t.transport, color: "bg-purple-500", to: "/explore?cat=transport" },
  ];

  const quickActions = [
    { icon: Map, label: t.exploreMap, href: "/explore" },
    { icon: Calendar, label: t.planTrip, href: "/smart-trip" },
    { icon: ShoppingBag, label: t.booking, href: "/booking" },
  ];

  return (
    <div ref={pageRef} className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div ref={heroRef} className="bg-gradient-hero px-6 pt-8 pb-20 rounded-b-[2rem] relative overflow-hidden">
        {/* Three.js Particle Background in Hero */}
        <div className="absolute inset-0 opacity-40">
          <ThreeScene className="absolute inset-0">
            <LazyParticleField particleCount={60} color="#ffffff" speed={0.2} />
          </ThreeScene>
        </div>

        <div ref={headerRef} className="flex items-center justify-between mb-6 relative z-10">
          <Link to="/profile" className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center backdrop-blur-sm text-2xl">
            {avatar}
          </Link>
          <button className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center relative backdrop-blur-sm">
            <Bell className="w-6 h-6 text-primary-foreground" />
            <span className="absolute top-2 right-2 w-3 h-3 bg-accent rounded-full" />
          </button>
        </div>

        <div ref={greetingRef} className="relative z-10">
          <h1 className="text-2xl font-bold text-primary-foreground">
            {greeting}, {userName}! 🌍
          </h1>
          <p className="text-primary-foreground/80 mt-1">
            {t.whereExplore}
          </p>
        </div>

        {/* Location Toggle */}
        <div ref={locationBarRef} className="mt-6 flex items-center justify-between bg-primary-foreground/10 rounded-2xl p-4 backdrop-blur-sm relative z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${locationEnabled ? 'bg-success' : 'bg-primary-foreground/20'}`}>
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-primary-foreground font-medium">{t.liveLocation}</p>
              <p className="text-primary-foreground/70 text-sm">
                {locationEnabled ? t.sharingLocation : t.locationOff}
              </p>
            </div>
          </div>
          <button
            onClick={handleLocationToggle}
            className={`w-14 h-8 rounded-full transition-all duration-300 ${locationEnabled ? "bg-success" : "bg-primary-foreground/30"
              }`}
          >
            <div
              className={`w-6 h-6 rounded-full bg-primary-foreground transition-transform duration-300 ${locationEnabled ? "translate-x-7" : "translate-x-1"
                }`}
            />
          </button>
        </div>
      </div>

      {/* Live Location Map + Destination */}
      <div
        ref={liveMapRef}
        className="mx-6 overflow-hidden rounded-2xl shadow-lg"
        style={{ height: 0, opacity: 0 }}
      >
        {locationEnabled && userLocation && (
          <>
            {/* Destination search bar */}
            <div className="relative z-10 bg-card dark:bg-card rounded-t-2xl px-4 pt-4 pb-2">
              <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  value={destQuery}
                  onChange={(e) => handleDestSearch(e.target.value)}
                  placeholder="Enter destination…"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                {searchingDest && <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />}
                {destQuery && (
                  <button onClick={clearDestination}>
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Suggestions dropdown */}
              {destSuggestions.length > 0 && (
                <ul className="absolute left-4 right-4 top-full mt-1 bg-card dark:bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
                  {destSuggestions.map((s, i) => (
                    <li key={i}>
                      <button
                        onClick={() => selectDestination(s)}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors flex items-start gap-2"
                      >
                        <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2 text-foreground">{s.display_name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Route info badge */}
              {routeInfo && destination && (
                <div className="flex items-center gap-3 mt-2 px-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Route className="w-3.5 h-3.5" />
                    {routeInfo.distance}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    {routeInfo.duration}
                  </div>
                  <span className="text-xs text-muted-foreground">to {destination.label}</span>
                </div>
              )}
            </div>

            {/* Map */}
            <LiveLocationMap
              lat={userLocation[0]}
              lng={userLocation[1]}
              destination={destination}
              onRouteInfo={setRouteInfo}
              className="h-full"
            />
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="px-6 -mt-8">
        {/* Quick Actions */}
        <div ref={quickActionsRef} className="grid grid-cols-3 gap-4 mb-8">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.href}
              className="travel-card flex flex-col items-center py-4"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-2">
                <action.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground">{action.label}</span>
            </Link>
          ))}
        </div>

        {/* Categories */}
        <div className="mb-8">
          <div ref={categoriesTitleRef} className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{t.exploreCategories}</h2>
            <button className="text-sm text-primary font-medium">{t.viewAll}</button>
          </div>
          <div ref={categoriesRef} className="grid grid-cols-3 gap-4">
            {categories.map((category) => (
              <CategoryCard
                key={category.label}
                icon={category.icon}
                label={category.label}
                colorClass={category.color}
              />
            ))}
          </div>
        </div>

        {/* Hidden Gems Discovery Banner */}
        <Link
          to="/discover"
          className="block mb-8 travel-card bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-glow">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                Discover Hidden Gems
                <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full font-bold">AI</span>
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                ML-powered hidden spots, temples & weekend escapes
              </p>
            </div>
            <Compass className="w-5 h-5 text-accent" />
          </div>
        </Link>

        {/* Voice Assistant FAB */}
        <button
          ref={voiceBtnRef}
          onClick={handleVoiceAssistant}
          className={`fixed left-6 bottom-28 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors duration-300 ${isVoiceActive
            ? "bg-accent shadow-sos"
            : "bg-gradient-primary shadow-glow"
            }`}
        >
          <Mic className={`w-6 h-6 text-primary-foreground ${isVoiceActive ? "animate-pulse" : ""}`} />
        </button>
      </div>

      {/* Floating SOS Button - Bottom Right */}
      <FloatingSOS />

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Home;
