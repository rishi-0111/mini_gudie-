import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowLeft,
  Search,
  MapPin,
  Star,
  Filter,
  Map as MapIcon,
  List,
  Navigation,
  Clock,
  Sparkles,
  LocateFixed,
  Loader2,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import FloatingSOS from "@/components/FloatingSOS";
import InteractiveMap from "@/components/InteractiveMap";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { usePlaces, type ExplorePlace } from "@/hooks/usePlaces";
import { ThreeScene, LazyFloatingIconsScene } from "@/components/three/LazyThreeScenes";

gsap.registerPlugin(ScrollTrigger);

const Explore = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");

  // Supabase places hook (auto-fetches + realtime subscriptions)
  const {
    places: supabasePlaces,
    loading: supabaseLoading,
    error: supabaseError,
    fetchPlaces,
    fetchNearby,
    searchPlaces: searchSupabase,
  } = usePlaces();

  // Live location state
  const [liveLocationOn, setLiveLocationOn] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [overpassPlaces, setOverpassPlaces] = useState<ExplorePlace[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const mapBlockRef = useRef<HTMLDivElement>(null);

  // GSAP refs
  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const placesListRef = useRef<HTMLDivElement>(null);

  const filters = [
    { id: "all", label: t.viewAll },
    { id: "hidden", label: "✨ " + t.hiddenSpots },
    { id: "temples", label: "🛕 " + t.temples },
    { id: "food", label: "🍽️ Food" },
    { id: "hotels", label: "🏨 Hotels" },
    { id: "transport", label: "🚌 Transport" },
    { id: "emergency", label: "🚨 Emergency" },
    { id: "landmarks", label: "🏛️ Landmarks" },
    { id: "nature", label: "🌿 Nature" },
  ];

  // Filter-to-category mapping for Supabase queries
  const FILTER_CATEGORY_MAP: Record<string, string | string[] | undefined> = {
    all: undefined,
    hidden: "hidden_spot",
    temples: "temple",
    food: "restaurant",
    hotels: "hotel",
    transport: undefined, // handled client-side for multi-category
    emergency: undefined, // handled client-side for multi-category
    landmarks: "landmark",
    nature: "hidden_spot",
  };

  // Multi-category filters resolved client-side
  const FILTER_MULTI: Record<string, string[]> = {
    transport: ["bus_route", "transport", "metro", "railway"],
    emergency: ["emergency", "hospital", "police", "fire_station", "pharmacy", "health_centre"],
  };

  // --- Live Location helpers ---
  const startLiveLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", description: "Your browser doesn't support GPS." });
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      (err) => {
        console.error(err);
        toast({ title: "Location error", description: err.message });
        setLiveLocationOn(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    watchIdRef.current = id;
  }, [toast]);

  const stopLiveLocation = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setUserLocation(null);
    setOverpassPlaces([]);
  }, []);

  // Toggle handler — only starts GPS tracking, does NOT switch to map view.
  // The user must click the Map icon explicitly to see the map.
  const handleLiveToggle = () => {
    const enabling = !liveLocationOn;
    setLiveLocationOn(enabling);
    if (enabling) {
      startLiveLocation();
    } else {
      stopLiveLocation();
    }
  };

  // Fetch nearby POIs from Overpass + Supabase when user location is acquired
  useEffect(() => {
    if (!userLocation || !liveLocationOn) return;
    let cancelled = false;
    const [lat, lng] = userLocation;
    const radius = 2000; // 2 km

    // 1. Fetch from Supabase (curated places within radius)
    fetchNearby(lat, lng, radius / 1000);

    // 2. Fetch from Overpass (OSM community data)
    const query = `
      [out:json][timeout:15];
      (
        node["tourism"](around:${radius},${lat},${lng});
        node["amenity"~"restaurant|cafe|hospital|pharmacy|bank|place_of_worship|police|fire_station"](around:${radius},${lat},${lng});
        node["shop"](around:${radius},${lat},${lng});
        node["historic"](around:${radius},${lat},${lng});
        node["railway"="station"](around:${radius},${lat},${lng});
        node["station"="subway"](around:${radius},${lat},${lng});
      );
      out body 60;
    `;

    setLoadingNearby(true);
    fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const mapped: ExplorePlace[] = (data.elements || []).filter((e: any) => e.tags?.name).map((e: any, i: number) => {
          const tags = e.tags || {};
          const type = tags.tourism || tags.amenity || tags.shop || tags.historic || "place";
          const emoji = getTypeEmoji(type);
          return {
            id: `overpass-${e.id || i}`,
            name: tags.name,
            type: type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " "),
            rating: 4.0 + Math.round(Math.random() * 10) / 10,
            distance: distanceStr(lat, lng, e.lat, e.lon),
            image: emoji,
            isHiddenGem: !!tags.historic || type === "viewpoint",
            lat: e.lat,
            lng: e.lon,
            source: "overpass" as const,
          };
        });
        setOverpassPlaces(mapped);
      })
      .catch(() => { if (!cancelled) setOverpassPlaces([]); })
      .finally(() => { if (!cancelled) setLoadingNearby(false); });

    return () => { cancelled = true; };
  }, [userLocation, liveLocationOn, fetchNearby]);

  // GSAP animate map block in/out
  useEffect(() => {
    if (!mapBlockRef.current) return;
    if (liveLocationOn && userLocation && viewMode === "map") {
      gsap.fromTo(
        mapBlockRef.current,
        { opacity: 0, y: 20, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out" }
      );
    }
  }, [liveLocationOn, userLocation, viewMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopLiveLocation(); };
  }, [stopLiveLocation]);

  // Re-fetch Supabase places when search query changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchSupabase(
          searchQuery,
          userLocation?.[0],
          userLocation?.[1]
        );
      } else {
        fetchPlaces(userLocation?.[0], userLocation?.[1]);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, searchSupabase, fetchPlaces, userLocation]);

  // Merge Supabase + Overpass places, deduplicating by name
  const mergedPlaces: ExplorePlace[] = (() => {
    if (liveLocationOn && userLocation) {
      // Combine both sources, Supabase places first (higher trust)
      const seen = new Set<string>();
      const result: ExplorePlace[] = [];
      for (const p of supabasePlaces) {
        const key = p.name.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          result.push(p);
        }
      }
      for (const p of overpassPlaces) {
        const key = p.name.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          result.push(p);
        }
      }
      return result;
    }
    // When not live, show Supabase places only
    return supabasePlaces;
  })();

  const filteredPlaces = mergedPlaces.filter((place) => {
    const matchesSearch = !searchQuery || place.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedFilter === "all") return true;
    if (selectedFilter === "hidden") return place.isHiddenGem;

    // Multi-category filters (transport, emergency)
    if (FILTER_MULTI[selectedFilter]) {
      const cats = FILTER_MULTI[selectedFilter];
      const placeType = place.type.toLowerCase().replace(/ /g, "_");
      return cats.some((c) => placeType.includes(c));
    }

    // Single-category filter
    return place.type.toLowerCase().includes(selectedFilter.replace(/s$/, ""));
  });

  const mapMarkers = filteredPlaces.map((place) => ({
    id: place.id,
    lat: place.lat,
    lng: place.lng,
    title: place.name,
    type: place.type.toLowerCase(),
    rating: place.rating,
  }));

  // GSAP entrance animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      // Hero slides down
      tl.fromTo(heroRef.current, { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 });

      // Search bar scales in
      tl.fromTo(
        searchBarRef.current,
        { scaleX: 0.7, opacity: 0 },
        { scaleX: 1, opacity: 1, duration: 0.5, ease: "back.out(1.2)" },
        "-=0.3"
      );

      // Filter pills stagger in
      if (filtersRef.current) {
        tl.fromTo(
          filtersRef.current.children,
          { y: 20, opacity: 0, scale: 0.8 },
          { y: 0, opacity: 1, scale: 1, duration: 0.4, stagger: 0.06, ease: "back.out(1.4)" },
          "-=0.2"
        );
      }
    }, pageRef);

    return () => ctx.revert();
  }, []);

  // Animate place cards on filter/view change with scrub scroll timeline
  useEffect(() => {
    if (viewMode === "list" && placesListRef.current) {
      const cardsTl = gsap.timeline({
        scrollTrigger: {
          scrub: 1,
          trigger: placesListRef.current,
          start: "top 90%",
          end: "bottom 30%",
        },
      });
      cardsTl.fromTo(
        placesListRef.current.children,
        { y: 25, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.45, stagger: 0.07, ease: "power2.out" }
      );

      return () => {
        cardsTl.scrollTrigger?.kill();
        cardsTl.kill();
      };
    }
  }, [viewMode, selectedFilter]);

  return (
    <div ref={pageRef} className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div ref={heroRef} className="bg-gradient-hero px-6 pt-8 pb-6 rounded-b-[2rem] relative overflow-hidden">
        {/* Three.js Floating Icons Background */}
        <div className="absolute inset-0 opacity-30">
          <ThreeScene className="absolute inset-0">
            <LazyFloatingIconsScene />
          </ThreeScene>
        </div>

        <div className="flex items-center gap-4 mb-4 relative z-10">
          <Link
            to="/home"
            className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center backdrop-blur-sm"
          >
            <ArrowLeft className="w-5 h-5 text-primary-foreground" />
          </Link>
          <h1 className="text-xl font-bold text-primary-foreground">{t.explore}</h1>
        </div>

        {/* Search Bar */}
        <div ref={searchBarRef} className="relative z-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaces}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary-foreground/30 backdrop-blur-sm"
          />
        </div>
      </div>

      <div className="px-6 pt-4">
        {/* Filter Pills & View Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div ref={filtersRef} className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedFilter === filter.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 ml-4">
            {/* Live location toggle */}
            <button
              onClick={handleLiveToggle}
              className={`p-2 rounded-lg transition-all relative ${
                liveLocationOn ? "bg-success text-white" : "bg-secondary"
              }`}
              title={liveLocationOn ? "Turn off live location" : "Turn on live location"}
            >
              <LocateFixed className="w-5 h-5" />
              {liveLocationOn && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-success border border-white" />
                </span>
              )}
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`p-2 rounded-lg transition-all ${viewMode === "map" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
            >
              <MapIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {viewMode === "list" ? (
          <div ref={placesListRef} className="space-y-4">
            {/* Loading state */}
            {supabaseLoading && filteredPlaces.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm">Loading places from database…</p>
              </div>
            )}

            {/* Empty state */}
            {!supabaseLoading && filteredPlaces.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <MapPin className="w-12 h-12 opacity-30" />
                <p className="text-sm font-medium">No places found</p>
                <p className="text-xs text-center max-w-[240px]">
                  {searchQuery
                    ? "Try a different search term or clear filters"
                    : "Turn on live location to discover nearby spots, or add places to your database"}
                </p>
              </div>
            )}

            {filteredPlaces.map((place) => (
              <div
                key={place.id}
                className="travel-card flex gap-4"
              >
                {/* Place Image/Emoji */}
                <div className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center text-4xl relative">
                  {place.image}
                  {/* Source indicator */}
                  {place.source === "supabase" && (
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[9px] text-primary-foreground font-bold shadow" title="Curated place">
                      ✓
                    </span>
                  )}
                </div>

                {/* Place Details */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{place.name}</h3>
                        {place.isHiddenGem && (
                          <span className="flex items-center gap-1 text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                            <Sparkles className="w-3 h-3" />
                            Hidden
                          </span>
                        )}
                        {place.verified && (
                          <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full" title="Verified">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{place.type}</p>
                      {place.description && (
                        <p className="text-xs text-muted-foreground/70 line-clamp-1 mt-0.5">{place.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 text-warning fill-warning" />
                      <span className="font-medium">{place.rating}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Navigation className="w-4 h-4" />
                      {place.distance}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Open now
                    </span>
                    {place.source === "supabase" && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        Curated
                      </span>
                    )}
                    {place.source === "overpass" && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                        OSM
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div ref={mapBlockRef} className="travel-card overflow-hidden relative" style={{ height: "65vh", minHeight: 400 }}>
            {/* Live location badge */}
            {liveLocationOn && userLocation && (
              <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 bg-white/90 dark:bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
                </span>
                <span className="text-xs font-semibold text-foreground">LIVE</span>
              </div>
            )}

            {/* Loading spinner */}
            {(loadingNearby || supabaseLoading) && (
              <div className="absolute top-3 right-3 z-[1000] bg-white/90 dark:bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <span className="text-xs font-medium text-foreground">Finding places…</span>
              </div>
            )}

            {/* Supabase error notice */}
            {supabaseError && (
              <div className="absolute top-14 right-3 z-[1000] bg-destructive/90 text-destructive-foreground backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md">
                <span className="text-xs font-medium">DB: {supabaseError}</span>
              </div>
            )}

            {/* Nearby places count */}
            {liveLocationOn && filteredPlaces.length > 0 && !loadingNearby && !supabaseLoading && (
              <div className="absolute top-3 right-3 z-[1000] bg-white/90 dark:bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                <span className="text-xs font-semibold text-foreground">{filteredPlaces.length} places nearby</span>
                {supabasePlaces.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    ({supabasePlaces.length} curated)
                  </span>
                )}
              </div>
            )}

            <InteractiveMap
              markers={mapMarkers}
              center={userLocation || [28.6139, 77.2090]}
              zoom={liveLocationOn && userLocation ? 15 : 13}
              userLocation={liveLocationOn ? userLocation : null}
            />

            {/* "Recenter" button */}
            {liveLocationOn && userLocation && (
              <button
                onClick={() => {
                  /* map will re-render with center = userLocation */
                  setUserLocation([...userLocation]);
                }}
                className="absolute bottom-4 right-4 z-[1000] w-10 h-10 rounded-full bg-white dark:bg-card shadow-lg flex items-center justify-center"
              >
                <LocateFixed className="w-5 h-5 text-primary" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Floating SOS Button */}
      <FloatingSOS />

      <BottomNav />
    </div>
  );
};

// --- Helpers ---
function getTypeEmoji(type: string): string {
  const map: Record<string, string> = {
    restaurant: "🍽️", cafe: "☕", hospital: "🏥", pharmacy: "💊",
    bank: "🏦", place_of_worship: "🛕", hotel: "🏨", museum: "🏛️",
    attraction: "🎯", viewpoint: "🏔️", artwork: "🎨", guest_house: "🏡",
    shop: "🛍️", supermarket: "🛒", historic: "🏰", monument: "🗿",
    police: "👮", fire_station: "🚒", station: "🚂", subway: "🚇",
    bus_stop: "🚌", railway: "🚂", metro: "🚇",
  };
  return map[type.toLowerCase()] || "📍";
}

function distanceStr(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`;
}

export default Explore;
