/**
 * Booking — Real-time listings from Google Places API
 * 
 * Shows Transport, Hotels/Hostels, Attractions with real data.
 * "Book Now" navigates to /payment with place details.
 */

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import gsap from "gsap";
import {
  ArrowLeft,
  Search,
  Filter,
  Star,
  MapPin,
  Clock,
  Car,
  Hotel,
  Landmark,
  List,
  Map as MapIcon,
  ChevronDown,
  Loader2,
  LocateFixed,
  Navigation,
  X,
  RefreshCw,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import FloatingSOS from "@/components/FloatingSOS";
import InteractiveMap from "@/components/InteractiveMap";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  useGooglePlaces,
  useGeolocation,
  GooglePlace,
  priceLevelToString,
  priceLevelToAmount,
} from "@/hooks/useGooglePlaces";

type Category = "all" | "transport" | "hostel" | "attraction";
type SortOption = "bestMatch" | "nearest" | "rating" | "price";

// ── Category emoji fallbacks ───────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  transport: "🚌",
  hostel: "🏨",
  attraction: "🎯",
  temple: "🛕",
  emergency: "🏥",
  food: "🍽️",
  taxi_stand: "🚕",
  bus_station: "🚌",
  train_station: "🚂",
  lodging: "🏨",
  tourist_attraction: "📸",
  museum: "🏛️",
  park: "🌳",
  hindu_temple: "🛕",
  church: "⛪",
  mosque: "🕌",
};

function getPlaceEmoji(place: GooglePlace): string {
  for (const type of place.types) {
    if (CATEGORY_EMOJI[type]) return CATEGORY_EMOJI[type];
  }
  return CATEGORY_EMOJI[place.category] || "📍";
}

// ── Component ──────────────────────────────────────────────────────────────────

const Booking = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Google Places
  const { places, loading: placesLoading, error: placesError, searchNearby } = useGooglePlaces();
  const { location, loading: geoLoading, error: geoError } = useGeolocation();

  // UI state
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");
  const [sortBy, setSortBy] = useState<SortOption>("bestMatch");
  const [showFilters, setShowFilters] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [manualLocation, setManualLocation] = useState("");
  const [fromCity, setFromCity] = useState("");
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [customLocation, setCustomLocation] = useState<{ lat: number; lng: number } | null>(null);

  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const itemsListRef = useRef<HTMLDivElement>(null);
  const hasFetchedRef = useRef(false);

  // Active location (custom search or GPS)
  const activeLocation = customLocation || location;

  // Categories
  const categories: { id: Category; label: string; icon: typeof Car }[] = [
    { id: "all", label: t.viewAll || "View All", icon: Filter },
    { id: "transport", label: t.transport || "Transport", icon: Car },
    { id: "hostel", label: t.hostels || "Hotels", icon: Hotel },
    { id: "attraction", label: t.attractions || "Attractions", icon: Landmark },
  ];

  const sortOptions: { id: SortOption; label: string }[] = [
    { id: "bestMatch", label: t.bestMatch || "Best Match" },
    { id: "nearest", label: t.nearestFirst || "Nearest" },
    { id: "rating", label: "Top Rated" },
    { id: "price", label: t.cheapest || "Price: Low-High" },
  ];

  // GSAP entrance animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(heroRef.current, { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  // Fetch places when location available
  useEffect(() => {
    if (activeLocation && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchPlaces();
    }
  }, [activeLocation]);

  // Re-fetch when category changes
  useEffect(() => {
    if (activeLocation) {
      fetchPlaces();
    }
  }, [selectedCategory]);

  // Auto-populate fromCity from GPS
  useEffect(() => {
    if (location && !fromCity) {
      setFromCity("Your Location");
    }
  }, [location]);

  const fetchPlaces = async () => {
    if (!activeLocation) return;

    const categoryMap: Record<Category, "all" | "transport" | "hostel" | "attraction"> = {
      all: "all",
      transport: "transport",
      hostel: "hostel",
      attraction: "attraction",
    };

    await searchNearby(activeLocation.lat, activeLocation.lng, categoryMap[selectedCategory], 5000);
  };

  // Search for manual location using Nominatim
  const searchLocation = async () => {
    if (!manualLocation.trim()) return;
    setIsSearchingLocation(true);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(manualLocation)}&format=json&limit=1`
      );
      const data = await res.json();
      if (data.length > 0) {
        const newLoc = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        setCustomLocation(newLoc);
        hasFetchedRef.current = false;
        toast({ title: "Location set", description: `Searching near ${data[0].display_name.split(",")[0]}` });
      } else {
        toast({ title: "Location not found", description: "Try a different search term." });
      }
    } catch {
      toast({ title: "Search failed", description: "Please try again." });
    } finally {
      setIsSearchingLocation(false);
    }
  };

  // Filter and sort places
  const filteredAndSortedItems = useMemo(() => {
    let items = [...places];

    // Category filter (if "all", show everything)
    if (selectedCategory !== "all") {
      items = items.filter((p) => {
        if (selectedCategory === "transport") return p.category === "transport";
        if (selectedCategory === "hostel") return p.category === "hostel";
        if (selectedCategory === "attraction") return ["attraction", "temple", "food"].includes(p.category);
        return true;
      });
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((p) => p.name.toLowerCase().includes(q) || p.vicinity.toLowerCase().includes(q));
    }

    // Rating filter
    if (minRating > 0) {
      items = items.filter((p) => p.rating >= minRating);
    }

    // Open now filter
    if (openNowOnly) {
      items = items.filter((p) => p.opening_hours?.open_now !== false);
    }

    // Sort
    switch (sortBy) {
      case "nearest":
        items.sort((a, b) => a.distance_km - b.distance_km);
        break;
      case "rating":
        items.sort((a, b) => b.rating - a.rating);
        break;
      case "price":
        items.sort((a, b) => a.price_level - b.price_level);
        break;
      default:
        // Best match: rating * log(reviews) / distance
        items.sort((a, b) => {
          const scoreA = (a.rating * Math.log10(a.user_ratings_total + 1)) / (a.distance_km + 0.1);
          const scoreB = (b.rating * Math.log10(b.user_ratings_total + 1)) / (b.distance_km + 0.1);
          return scoreB - scoreA;
        });
    }

    return items;
  }, [places, selectedCategory, searchQuery, sortBy, minRating, openNowOnly]);

  // Map markers
  const mapMarkers = filteredAndSortedItems.map((item) => ({
    id: item.place_id,
    lat: item.lat,
    lng: item.lng,
    title: item.name,
    type: item.category,
    price: priceLevelToString(item.price_level),
    rating: item.rating,
  }));

  // Handle Book Now
  const handleBookNow = useCallback((place: GooglePlace) => {
    if (place.opening_hours?.open_now === false) {
      toast({ title: "Place is closed", description: "This place is currently closed. Try again later." });
      return;
    }

    navigate("/payment", {
      state: {
        place_id: place.place_id,
        name: place.name,
        category: place.category,
        price_level: place.price_level,
        photo_url: place.photo_url,
        vicinity: place.vicinity,
        rating: place.rating,
        estimated_price: priceLevelToAmount(place.price_level, place.category),
      },
    });
  }, [navigate, toast]);

  // Open directions
  const openDirections = useCallback((place: GooglePlace) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&destination_place_id=${place.place_id}`;
    window.open(url, "_blank");
  }, []);

  const isLoading = placesLoading || geoLoading;

  return (
    <div ref={pageRef} className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div ref={heroRef} className="bg-gradient-hero px-6 pt-8 pb-6 rounded-b-[2rem]">
        <div className="flex items-center gap-4 mb-4">
          <Link
            to="/home"
            className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-primary-foreground" />
          </Link>
          <h1 className="text-xl font-bold text-primary-foreground">{t.booking || "Book & Explore"}</h1>
          {activeLocation && (
            <button
              onClick={() => { hasFetchedRef.current = false; fetchPlaces(); }}
              className="ml-auto w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center"
              disabled={isLoading}
            >
              <RefreshCw className={`w-5 h-5 text-primary-foreground ${isLoading ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaces || "Search places..."}
            className="w-full pl-12 pr-10 py-3 rounded-xl bg-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary-foreground/30"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-5 h-5 text-white/50" />
            </button>
          )}
        </div>

        {/* From / To location inputs — always visible */}
        <div className="space-y-2">
          {/* From */}
          <div className="flex gap-2 items-center">
            <div className="w-8 flex-shrink-0 flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
              <div className="w-0.5 h-4 bg-white/30" />
            </div>
            <input
              type="text"
              value={fromCity}
              onChange={(e) => setFromCity(e.target.value)}
              placeholder={geoLoading ? "Detecting location…" : "From — your start point"}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 focus:outline-none text-sm"
            />
          </div>

          {/* To + Search button */}
          <div className="flex gap-2 items-center">
            <div className="w-8 flex-shrink-0 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-red-400 border-2 border-white" />
            </div>
            <input
              type="text"
              value={manualLocation}
              onChange={(e) => setManualLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchLocation()}
              placeholder="To — destination city or area"
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 focus:outline-none text-sm"
            />
            <button
              onClick={searchLocation}
              disabled={isSearchingLocation || !manualLocation.trim()}
              className="px-3 py-2.5 rounded-xl bg-white text-primary font-semibold flex items-center gap-1 text-sm disabled:opacity-50"
            >
              {isSearchingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Active location indicator */}
        {activeLocation && (
          <p className="text-xs text-white/70 flex items-center gap-1 mt-1">
            <Navigation className="w-3 h-3" />
            {fromCity && manualLocation
              ? `${fromCity} → ${manualLocation}`
              : manualLocation
              ? `Searching near ${manualLocation}`
              : "Searching near your location"}
          </p>
        )}
      </div>

      <div className="px-6 pt-4">
        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-4">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === category.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <category.icon className="w-4 h-4" />
              {category.label}
            </button>
          ))}
        </div>

        {/* Filters Row */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground"
          >
            <Filter className="w-4 h-4" />
            {t.filter || "Filters"}
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>

          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm"
            >
              {sortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* View Toggle */}
            <div className="flex gap-1 bg-secondary rounded-xl p-1">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : ""}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`p-2 rounded-lg transition-colors ${viewMode === "map" ? "bg-primary text-primary-foreground" : ""}`}
              >
                <MapIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="travel-card mb-4 animate-fade-in">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Min Rating: {minRating}+ ⭐</label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="openNow"
                  checked={openNowOnly}
                  onChange={(e) => setOpenNowOnly(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded"
                />
                <label htmlFor="openNow" className="text-sm font-medium">Open Now Only</label>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="travel-card flex gap-4 animate-pulse">
                <div className="w-20 h-20 rounded-xl bg-muted shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {placesError && !isLoading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <X className="w-8 h-8 text-destructive" />
            </div>
            <p className="text-muted-foreground mb-4">{placesError}</p>
            <button
              onClick={() => { hasFetchedRef.current = false; fetchPlaces(); }}
              className="btn-primary px-6 py-2"
            >
              Retry
            </button>
          </div>
        )}

        {/* No Location State */}
        {!activeLocation && !isLoading && !showLocationInput && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <LocateFixed className="w-8 h-8 text-primary" />
            </div>
            <p className="text-muted-foreground">Waiting for location access...</p>
          </div>
        )}

        {/* Results List */}
        {viewMode === "list" && !isLoading && !placesError && activeLocation && (
          <div ref={itemsListRef} className="space-y-4">
            {filteredAndSortedItems.map((place) => {
              const isOpen = place.opening_hours?.open_now !== false;
              const priceStr = priceLevelToString(place.price_level);
              const estimatedPrice = priceLevelToAmount(place.price_level, place.category);

              return (
                <div key={place.place_id} className="travel-card flex gap-4">
                  {/* Photo or Emoji */}
                  <div className="w-20 h-20 rounded-xl bg-secondary overflow-hidden shrink-0 relative">
                    {place.photo_url ? (
                      <img
                        src={place.photo_url}
                        alt={place.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                        }}
                      />
                    ) : null}
                    <div className={`absolute inset-0 flex items-center justify-center text-4xl ${place.photo_url ? "hidden" : ""}`}>
                      {getPlaceEmoji(place)}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold line-clamp-1">{place.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">{place.vicinity}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-4 h-4 text-warning fill-warning" />
                          <span className="font-medium">{place.rating.toFixed(1)}</span>
                          <span className="text-muted-foreground text-xs">({place.user_ratings_total})</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Navigation className="w-3.5 h-3.5" />
                        {place.distance_km.toFixed(1)} km
                      </span>
                      <span
                        className={`flex items-center gap-1 font-medium ${isOpen ? "text-success" : "text-destructive"}`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        {isOpen ? "Open" : "Closed"}
                      </span>
                      {priceStr !== "Free" && (
                        <span className="text-primary font-semibold">{priceStr}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <span className="text-lg font-bold text-primary">
                        {estimatedPrice > 0 ? `₹${estimatedPrice}` : "Free Entry"}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openDirections(place)}
                          className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                          title="Get Directions"
                        >
                          <Navigation className="w-4 h-4 text-primary" />
                        </button>
                        <button
                          onClick={() => handleBookNow(place)}
                          disabled={!isOpen}
                          className={`btn-primary py-2 px-4 text-sm ${!isOpen ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          {t.bookNow || "Book Now"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredAndSortedItems.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center text-3xl">
                  🔍
                </div>
                <p className="text-muted-foreground font-medium">No places found</p>
                <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search a different area.</p>
              </div>
            )}
          </div>
        )}

        {/* Map View */}
        {viewMode === "map" && activeLocation && (
          <div className="travel-card h-[500px] overflow-hidden">
            <InteractiveMap
              markers={mapMarkers}
              center={[activeLocation.lat, activeLocation.lng]}
              zoom={13}
            />
          </div>
        )}
      </div>

      <FloatingSOS />
      <BottomNav />
    </div>
  );
};

export default Booking;
