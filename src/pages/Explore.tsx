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
import { ThreeScene, LazyFloatingIconsScene } from "@/components/three/LazyThreeScenes";

gsap.registerPlugin(ScrollTrigger);

interface Place {
  id: string;
  name: string;
  type: string;
  rating: number;
  distance: string;
  image: string;
  isHiddenGem: boolean;
  lat: number;
  lng: number;
}

const Explore = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");

  // Live location state
  const [liveLocationOn, setLiveLocationOn] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<Place[]>([]);
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
    { id: "hidden", label: t.hiddenSpots },
    { id: "temples", label: t.temples },
    { id: "food", label: "Food" },
    { id: "nature", label: "Nature" },
  ];

  const places: Place[] = [
    {
      id: "1",
      name: "Secret Garden Cafe",
      type: "Cafe",
      rating: 4.8,
      distance: "2.5 km",
      image: "🌿",
      isHiddenGem: true,
      lat: 28.6139,
      lng: 77.2090,
    },
    {
      id: "2",
      name: "Ancient Sun Temple",
      type: "Temple",
      rating: 4.9,
      distance: "5.2 km",
      image: "🛕",
      isHiddenGem: false,
      lat: 28.6280,
      lng: 77.2197,
    },
    {
      id: "3",
      name: "Hidden Valley Viewpoint",
      type: "Nature",
      rating: 4.7,
      distance: "8.1 km",
      image: "🏔️",
      isHiddenGem: true,
      lat: 28.6500,
      lng: 77.2300,
    },
    {
      id: "4",
      name: "Local Street Food Market",
      type: "Food",
      rating: 4.6,
      distance: "1.2 km",
      image: "🍜",
      isHiddenGem: true,
      lat: 28.6350,
      lng: 77.2150,
    },
    {
      id: "5",
      name: "Riverside Meditation Center",
      type: "Wellness",
      rating: 4.9,
      distance: "6.8 km",
      image: "🧘",
      isHiddenGem: false,
      lat: 28.6400,
      lng: 77.2400,
    },
    {
      id: "6",
      name: "Underground Art Gallery",
      type: "Culture",
      rating: 4.5,
      distance: "3.4 km",
      image: "🎨",
      isHiddenGem: true,
      lat: 28.6200,
      lng: 77.2250,
    },
  ];

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
    setNearbyPlaces([]);
  }, []);

  // Toggle handler
  const handleLiveToggle = () => {
    const enabling = !liveLocationOn;
    setLiveLocationOn(enabling);
    if (enabling) {
      setViewMode("map"); // auto-switch to map view
      startLiveLocation();
    } else {
      stopLiveLocation();
    }
  };

  // Fetch nearby POIs from Overpass when user location is acquired
  useEffect(() => {
    if (!userLocation || !liveLocationOn) return;
    let cancelled = false;
    const [lat, lng] = userLocation;
    const radius = 2000; // 2 km

    const query = `
      [out:json][timeout:15];
      (
        node["tourism"](around:${radius},${lat},${lng});
        node["amenity"~"restaurant|cafe|hospital|pharmacy|bank|place_of_worship"](around:${radius},${lat},${lng});
        node["shop"](around:${radius},${lat},${lng});
        node["historic"](around:${radius},${lat},${lng});
      );
      out body 40;
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
        const mapped: Place[] = (data.elements || []).filter((e: any) => e.tags?.name).map((e: any, i: number) => {
          const tags = e.tags || {};
          const type = tags.tourism || tags.amenity || tags.shop || tags.historic || "place";
          const emoji = getTypeEmoji(type);
          return {
            id: `overpass-${e.id || i}`,
            name: tags.name,
            type: type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " "),
            rating: 4.0 + Math.round(Math.random() * 10) / 10, // placeholder
            distance: distanceStr(lat, lng, e.lat, e.lon),
            image: emoji,
            isHiddenGem: !!tags.historic || type === "viewpoint",
            lat: e.lat,
            lng: e.lon,
          };
        });
        setNearbyPlaces(mapped);
      })
      .catch(() => { if (!cancelled) setNearbyPlaces([]); })
      .finally(() => { if (!cancelled) setLoadingNearby(false); });

    return () => { cancelled = true; };
  }, [userLocation, liveLocationOn]);

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

  // Choose which places to show: nearby (live) or static
  const activePlaces = liveLocationOn && nearbyPlaces.length > 0 ? nearbyPlaces : places;

  const filteredPlaces = activePlaces.filter((place) => {
    const matchesSearch = !searchQuery || place.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedFilter === "hidden") return place.isHiddenGem;
    if (selectedFilter === "all") return true;
    return place.type.toLowerCase().includes(selectedFilter);
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
            {filteredPlaces.map((place) => (
              <div
                key={place.id}
                className="travel-card flex gap-4"
              >
                {/* Place Image/Emoji */}
                <div className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center text-4xl">
                  {place.image}
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
                      </div>
                      <p className="text-sm text-muted-foreground">{place.type}</p>
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

            {/* Loading nearby spinner */}
            {loadingNearby && (
              <div className="absolute top-3 right-3 z-[1000] bg-white/90 dark:bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <span className="text-xs font-medium text-foreground">Finding places…</span>
              </div>
            )}

            {/* Nearby places count */}
            {liveLocationOn && nearbyPlaces.length > 0 && !loadingNearby && (
              <div className="absolute top-3 right-3 z-[1000] bg-white/90 dark:bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md">
                <span className="text-xs font-semibold text-foreground">{nearbyPlaces.length} places nearby</span>
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
