/**
 * CategoryDetail — Dedicated page for each Explore Category.
 *
 * Route: /category/:slug
 * Displays a warm welcome header, search bar, and Overpass-powered results.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, Search, MapPin, Star, Navigation, Clock,
  LocateFixed, Loader2, X, Phone, Globe, ExternalLink,
  Building2, Stethoscope, Siren, Sparkles, Hotel, Car,
  AlertCircle,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import FloatingSOS from "@/components/FloatingSOS";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useNominatimAutocomplete, haversine, formatDist, hashStr } from "@/hooks/useExploreSearch";

// ── Types ──────────────────────────────────────────────────────────────────────

interface OSMPlace {
  id: number;
  name: string;
  lat: number;
  lon: number;
  tags: Record<string, string>;
  category: string;
  emoji: string;
  distanceKm: number;
  hours: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
}

// ── Category Metadata ──────────────────────────────────────────────────────────

type CategorySlug = "temples" | "hospitals" | "emergency" | "hidden-spots" | "hostels" | "transport";

interface CategoryMeta {
  slug: CategorySlug;
  welcomeEmoji: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  searchPlaceholder: string;
  color: string;
  bgGradient: string;
  iconBg: string;
  icon: typeof Building2;
  overpassFilter: string;
}

const CATEGORIES: Record<CategorySlug, CategoryMeta> = {
  temples: {
    slug: "temples",
    welcomeEmoji: "🙏",
    welcomeTitle: "Welcome, Explorer!",
    welcomeSubtitle: "Discover Sacred Temples Near You",
    searchPlaceholder: "Search Temples in...",
    color: "#f97316",
    bgGradient: "from-orange-500 to-amber-500",
    iconBg: "bg-orange-500",
    icon: Building2,
    overpassFilter: `
      node["amenity"="place_of_worship"](AREA);
      node["religion"](AREA);
      node["historic"~"temple|monastery|church|mosque|shrine"](AREA);
      way["amenity"="place_of_worship"](AREA);
      way["historic"~"temple|monastery"](AREA);`,
  },
  hospitals: {
    slug: "hospitals",
    welcomeEmoji: "💙",
    welcomeTitle: "Your Health Matters!",
    welcomeSubtitle: "Find Trusted Hospitals Nearby",
    searchPlaceholder: "Search Hospitals in...",
    color: "#3b82f6",
    bgGradient: "from-blue-500 to-cyan-500",
    iconBg: "bg-blue-500",
    icon: Stethoscope,
    overpassFilter: `
      node["amenity"~"hospital|clinic|pharmacy|dentist"](AREA);
      way["amenity"~"hospital|clinic"](AREA);`,
  },
  emergency: {
    slug: "emergency",
    welcomeEmoji: "🚨",
    welcomeTitle: "Stay Safe!",
    welcomeSubtitle: "Emergency Services At Your Fingertips",
    searchPlaceholder: "Search Emergency services in...",
    color: "#ef4444",
    bgGradient: "from-red-500 to-rose-500",
    iconBg: "bg-red-500",
    icon: Siren,
    overpassFilter: `
      node["amenity"~"hospital|clinic|pharmacy|police|fire_station|ambulance_station"](AREA);
      way["amenity"~"hospital|clinic|police|fire_station"](AREA);`,
  },
  "hidden-spots": {
    slug: "hidden-spots",
    welcomeEmoji: "✨",
    welcomeTitle: "Adventure Awaits!",
    welcomeSubtitle: "Uncover Hidden Gems Around You",
    searchPlaceholder: "Search Hidden Spots in...",
    color: "#10b981",
    bgGradient: "from-emerald-500 to-teal-500",
    iconBg: "bg-accent",
    icon: Sparkles,
    overpassFilter: `
      node["tourism"="attraction"](AREA);
      node["natural"~"peak|waterfall|cave_entrance|spring"](AREA);
      node["historic"~"ruins|archaeological_site|battlefield"](AREA);
      way["historic"~"ruins|archaeological_site"](AREA);`,
  },
  hostels: {
    slug: "hostels",
    welcomeEmoji: "🏨",
    welcomeTitle: "Rest Easy!",
    welcomeSubtitle: "Budget-Friendly Hostels Just For You",
    searchPlaceholder: "Search Hostels in...",
    color: "#22c55e",
    bgGradient: "from-green-500 to-emerald-500",
    iconBg: "bg-green-500",
    icon: Hotel,
    overpassFilter: `
      node["tourism"~"hotel|guest_house|hostel|motel|resort|lodge"](AREA);
      way["tourism"~"hotel|guest_house|hostel|resort"](AREA);`,
  },
  transport: {
    slug: "transport",
    welcomeEmoji: "🚗",
    welcomeTitle: "Let's Move!",
    welcomeSubtitle: "Find Transport Options Near You",
    searchPlaceholder: "Search Transport in...",
    color: "#8b5cf6",
    bgGradient: "from-purple-500 to-violet-500",
    iconBg: "bg-purple-500",
    icon: Car,
    overpassFilter: `
      node["amenity"~"bus_station|taxi|fuel|parking|car_rental"](AREA);
      node["highway"="bus_stop"](AREA);
      node["railway"~"station|halt|tram_stop"](AREA);
      way["amenity"~"bus_station|fuel|parking"](AREA);
      way["railway"="station"](AREA);`,
  },
};

// ── Overpass ────────────────────────────────────────────────────────────────────

const OVERPASS_SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

function buildQuery(lat: number, lon: number, filterTemplate: string): string {
  const area = `(around:5000,${lat},${lon})`;
  const filled = filterTemplate.replace(/\(AREA\)/g, area);
  return `[out:json][timeout:30];\n(\n${filled}\n);\nout body center 80;`;
}

async function fetchOverpass(query: string): Promise<any[]> {
  const body = "data=" + encodeURIComponent(query);
  for (const url of OVERPASS_SERVERS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json();
        return data.elements || [];
      }
    } catch { /* try next */ }
  }
  throw new Error("All Overpass servers failed");
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function placeEmoji(tags: Record<string, string>): string {
  const map: Record<string, string> = {
    restaurant: "🍽️", cafe: "☕", fast_food: "🍔", bar: "🍺", bakery: "🥖",
    hotel: "🏨", guest_house: "🏡", hostel: "🛏️", hospital: "🏥", pharmacy: "💊",
    clinic: "🏥", police: "👮", fire_station: "🚒", bus_station: "🚌",
    bus_stop: "🚌", fuel: "⛽", place_of_worship: "🛕", monument: "🗿",
    fort: "🏰", museum: "🏛️", attraction: "🎯", viewpoint: "🏔️",
    peak: "⛰️", waterfall: "💧", beach: "🏖️", park: "🌿", nature_reserve: "🌲",
  };
  for (const key of ["amenity", "tourism", "historic", "natural", "leisure", "highway", "railway"]) {
    if (tags[key] && map[tags[key]]) return map[tags[key]];
  }
  return "📍";
}

function buildAddress(tags: Record<string, string>): string | null {
  const parts = [tags["addr:housenumber"], tags["addr:street"], tags["addr:suburb"],
    tags["addr:village"] || tags["addr:city"], tags["addr:state"]].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function deriveCategory(tags: Record<string, string>): string {
  const a = tags.amenity || "", t = tags.tourism || "", h = tags.historic || "";
  const n = tags.natural || "", l = tags.leisure || "";
  if (["restaurant", "cafe", "fast_food", "food_court", "bar", "bakery", "dhaba", "pub"].includes(a)) return "food";
  if (a === "place_of_worship" || tags.religion || ["temple", "monastery", "church", "shrine", "mosque"].includes(h)) return "temples";
  if (["hotel", "guest_house", "hostel", "motel", "resort", "lodge"].includes(t) || a === "lodging") return "hotels";
  if (["bus_station", "fuel", "taxi", "parking"].includes(a) || tags.highway === "bus_stop" || tags.railway) return "transport";
  if (["hospital", "clinic", "pharmacy", "police", "fire_station", "dentist"].includes(a)) return "emergency";
  if (h || ["attraction", "museum", "viewpoint", "gallery", "zoo"].includes(t)) return "landmarks";
  if (n || ["park", "nature_reserve", "garden"].includes(l)) return "nature";
  return "other";
}

function parseElements(elements: any[], refLat: number, refLon: number): OSMPlace[] {
  const seen = new Set<string>();
  const result: OSMPlace[] = [];

  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!lat || !lon) continue;

    const tags: Record<string, string> = el.tags || {};
    const name = tags.name || tags["name:en"] || tags["name:ta"] ||
      tags.amenity || tags.tourism || tags.historic || tags.natural || null;
    if (!name || name.length < 2) continue;

    const key = `${name.toLowerCase()}_${lat.toFixed(3)}_${lon.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    result.push({
      id: el.id,
      name,
      lat,
      lon,
      tags,
      category: deriveCategory(tags),
      emoji: placeEmoji(tags),
      distanceKm: haversine(refLat, refLon, lat, lon),
      hours: tags.opening_hours || null,
      phone: tags.phone || tags["contact:phone"] || null,
      website: tags.website || tags["contact:website"] || null,
      address: buildAddress(tags),
    });
  }

  return result.sort((a, b) => a.distanceKm - b.distanceKm);
}

function deterministicRating(name: string, lat: number, lon: number): number {
  const h = hashStr(`${name}${lat.toFixed(3)}${lon.toFixed(3)}`);
  return parseFloat((3.7 + (h % 13) / 10).toFixed(1));
}

function isOpenNow(hours: string | null): "open" | "closed" | "unknown" {
  if (!hours) return "unknown";
  // Simple heuristic: check if "24/7" or try basic parsing
  if (hours.includes("24/7")) return "open";
  try {
    const now = new Date();
    const currentHour = now.getHours();
    // Basic heuristic for common formats like "09:00-21:00"
    const match = hours.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (match) {
      const openHour = parseInt(match[1]);
      const closeHour = parseInt(match[3]);
      if (currentHour >= openHour && currentHour < closeHour) return "open";
      return "closed";
    }
  } catch { /* fallback */ }
  return "unknown";
}

// ── Component ──────────────────────────────────────────────────────────────────

const CategoryDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useLanguage();
  const { toast } = useToast();

  const meta = CATEGORIES[slug as CategorySlug];

  // ── Location state ────────────────────────────────────────────────────────
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [searchLocation, setSearchLocation] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [places, setPlaces] = useState<OSMPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchSubmitted, setSearchSubmitted] = useState(false);

  const activeLat = searchLocation?.lat ?? liveLocation?.lat ?? null;
  const activeLon = searchLocation?.lon ?? liveLocation?.lon ?? null;
  const activeLocationName = searchLocation?.name ?? "Your Location";

  const lastFetchRef = useRef<{ lat: number | null; lon: number | null }>({ lat: null, lon: null });
  const searchContainerRef = useRef<HTMLFormElement>(null);

  const { suggestions, open: suggestOpen, search: searchSuggest, close: closeSuggest } = useNominatimAutocomplete();

  // ── GPS on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setLiveLocation((prev) => {
          if (prev && haversine(prev.lat, prev.lon, pos.coords.latitude, pos.coords.longitude) < 0.1) return prev;
          return { lat: pos.coords.latitude, lon: pos.coords.longitude };
        });
      },
      (err) => console.warn("GPS:", err.message),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // ── Fetch when location available ─────────────────────────────────────────
  useEffect(() => {
    if (!meta || activeLat === null || activeLon === null) return;
    const last = lastFetchRef.current;
    if (last.lat === activeLat && last.lon === activeLon) return;
    lastFetchRef.current = { lat: activeLat, lon: activeLon };

    let cancelled = false;
    setLoading(true);
    setFetchError(null);

    const query = buildQuery(activeLat, activeLon, meta.overpassFilter);
    fetchOverpass(query)
      .then((elements) => {
        if (cancelled) return;
        setPlaces(parseElements(elements, activeLat!, activeLon!));
      })
      .catch(() => {
        if (!cancelled) setFetchError("Could not load places. Check your connection.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [activeLat, activeLon, meta]);

  // ── Search handlers ───────────────────────────────────────────────────────
  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    searchSuggest(val);
    if (!val.trim()) {
      setSearchLocation(null);
      lastFetchRef.current = { lat: null, lon: null };
    }
  };

  const handleSuggestionSelect = (s: typeof suggestions[0]) => {
    closeSuggest();
    setSearchInput(s.shortName);
    setSearchLocation({ lat: s.lat, lon: s.lon, name: s.shortName });
    lastFetchRef.current = { lat: null, lon: null };
    setSearchSubmitted(true);
  };

  const handleSearchClear = () => {
    setSearchInput("");
    setSearchLocation(null);
    lastFetchRef.current = { lat: null, lon: null };
    setSearchSubmitted(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      searchSuggest(searchInput);
      setSearchSubmitted(true);
    }
  };

  // ── Outside click ─────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) closeSuggest();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [closeSuggest]);

  // ── Navigate externally ───────────────────────────────────────────────────
  const openNavigation = useCallback((place: OSMPlace) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`;
    window.open(url, "_blank");
  }, []);

  const openDetails = useCallback((place: OSMPlace) => {
    const url = `https://www.openstreetmap.org/${place.tags?.type === "way" ? "way" : "node"}/${place.id}`;
    window.open(url, "_blank");
  }, []);

  // ── Fallback for unknown slug ─────────────────────────────────────────────
  if (!meta) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-lg font-semibold text-muted-foreground">Category not found</p>
        <Link to="/home" className="text-primary font-medium underline">Go back home</Link>
      </div>
    );
  }

  const IconComp = meta.icon;

  return (
    <div className="min-h-screen bg-background page-scroll pb-24">

      {/* ── Warm Welcome Header ── */}
      <div className={`bg-gradient-to-br ${meta.bgGradient} px-6 pt-8 pb-8 rounded-b-[2rem] relative overflow-hidden`}>
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/10" />

        {/* Back button + title */}
        <div className="flex items-center gap-3 mb-5 relative z-10">
          <Link to="/home" className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <div className={`w-10 h-10 rounded-xl ${meta.iconBg} flex items-center justify-center shadow-lg`}>
            <IconComp className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Welcome message */}
        <div className="relative z-10 mb-6">
          <h1 className="text-2xl font-extrabold text-white leading-tight">
            {meta.welcomeEmoji} {meta.welcomeTitle}
          </h1>
          <p className="text-white/80 mt-1 text-sm font-medium">
            {meta.welcomeSubtitle}
          </p>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} ref={searchContainerRef} className="relative z-10">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder={meta.searchPlaceholder}
              className="w-full pl-10 pr-9 py-3.5 rounded-2xl bg-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 backdrop-blur-sm text-sm font-medium"
              autoComplete="off"
            />
            {searchInput ? (
              <button type="button" onClick={handleSearchClear} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-white/70" />
              </button>
            ) : (
              <button type="button" onClick={() => {
                if (liveLocation) {
                  setSearchLocation(null);
                  lastFetchRef.current = { lat: null, lon: null };
                } else {
                  toast({ title: "Enable Location", description: "Allow location access to find nearby places." });
                }
              }} className="absolute right-3 top-1/2 -translate-y-1/2">
                <LocateFixed className="w-4 h-4 text-white/70" />
              </button>
            )}
          </div>

          {/* Nominatim Suggestions */}
          {suggestOpen && suggestions.length > 0 && (
            <div className="absolute mt-2 w-full bg-background border border-border rounded-xl shadow-2xl overflow-hidden z-[9999] max-h-64 overflow-y-auto">
              {suggestions.map((s, i) => (
                <button key={i} type="button" onClick={() => handleSuggestionSelect(s)}
                  className="w-full text-left px-4 py-3 border-b border-border/30 last:border-0 hover:bg-primary/10 flex items-start gap-3 transition-colors">
                  <MapPin className="w-4 h-4 text-primary/60 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{s.shortName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{s.displayName}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Location indicator */}
        {!loading && places.length > 0 && (
          <p className="mt-3 text-xs text-white/70 flex items-center gap-1 relative z-10">
            <MapPin className="w-3 h-3 shrink-0" />
            {places.length} places near <strong className="text-white">{activeLocationName}</strong>
          </p>
        )}
      </div>

      {/* ── Content Area ── */}
      <div className="px-4 pt-5">

        {/* Error banner */}
        {fetchError && (
          <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />{fetchError}
          </div>
        )}

        {/* Waiting for location */}
        {!activeLat && !loading && (
          <div className="flex flex-col items-center py-20 gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <LocateFixed className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-bold text-lg">Waiting for location…</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Allow location access or search a city above to discover {meta.slug.replace("-", " ")}.
            </p>
          </div>
        )}

        {/* Skeleton loaders */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 p-4 rounded-2xl bg-card border border-border/50 animate-pulse">
                <div className="w-16 h-16 rounded-xl bg-muted shrink-0" />
                <div className="flex-1 space-y-2.5 pt-1">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No results */}
        {!loading && activeLat && places.length === 0 && !fetchError && (
          <div className="flex flex-col items-center py-16 gap-4 text-center">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
              <div className="text-5xl">{meta.welcomeEmoji}</div>
            </div>
            <h3 className="font-bold text-lg text-foreground">No results found</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              We couldn't find any {meta.slug.replace("-", " ")} nearby. Try searching a different area.
            </p>
          </div>
        )}

        {/* Results list */}
        {!loading && places.length > 0 && (
          <div className="space-y-3">
            {places.map((place) => {
              const rating = deterministicRating(place.name, place.lat, place.lon);
              const openStatus = isOpenNow(place.hours);
              const starsFull = Math.floor(rating);
              const starsHalf = rating - starsFull >= 0.5;

              return (
                <div key={place.id}
                  className="p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/20 hover:shadow-lg transition-all">

                  {/* Top row: icon + info */}
                  <div className="flex gap-3.5">
                    {/* Category-colored icon */}
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0 relative"
                      style={{ backgroundColor: `${meta.color}15` }}
                    >
                      {place.emoji}
                      <div
                        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background"
                        style={{ background: meta.color }}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm line-clamp-1 text-foreground">{place.name}</h3>

                      {/* Address */}
                      {place.address && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{place.address}</p>
                      )}

                      {/* Rating */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: starsFull }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          ))}
                          {starsHalf && (
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500/50" />
                          )}
                        </div>
                        <span className="text-xs font-semibold text-foreground">{rating}</span>
                      </div>

                      {/* Distance + Open status */}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Navigation className="w-3 h-3" />
                          {formatDist(place.distanceKm)}
                        </span>
                        {openStatus !== "unknown" && (
                          <span className={`flex items-center gap-1 text-xs font-semibold ${openStatus === "open" ? "text-green-500" : "text-red-500"}`}>
                            <Clock className="w-3 h-3" />
                            {openStatus === "open" ? "Open" : "Closed"}
                          </span>
                        )}
                        {place.hours && openStatus === "unknown" && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {place.hours}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-3.5 pt-3 border-t border-border/30">
                    <button
                      onClick={() => openDetails(place)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                      style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Details
                    </button>
                    <button
                      onClick={() => openNavigation(place)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-white transition-colors"
                      style={{ backgroundColor: meta.color }}
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Navigate
                    </button>
                    {place.phone && (
                      <a
                        href={`tel:${place.phone}`}
                        className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0"
                      >
                        <Phone className="w-4 h-4 text-green-600" />
                      </a>
                    )}
                    {place.website && (
                      <a
                        href={place.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0"
                      >
                        <Globe className="w-4 h-4 text-blue-600" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <FloatingSOS />
      <BottomNav />
    </div>
  );
};

export default CategoryDetail;
