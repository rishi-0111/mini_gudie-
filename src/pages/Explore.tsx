/**
 * Explore — Single source of truth rebuild
 *
 * Data flow:
 *  activeLat/activeLon = searchLocation ?? liveLocation
 *  One useEffect(activeLat, activeLon, activeFilter) drives ALL fetches.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Search, MapPin, Star, Map as MapIcon, List,
  Navigation, Clock, LocateFixed, Loader2, X, Phone, Globe,
  Car, Footprints, Bike, Bus, ChevronDown, ChevronUp, Share2, Bookmark, AlertCircle,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import FloatingSOS from "@/components/FloatingSOS";
import InteractiveMap, { type MapMarker, type InteractiveMapHandle } from "@/components/InteractiveMap";
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

interface RouteInfo {
  distanceKm: number;
  durationMin: number;
  steps: string[];
  coordinates: [number, number][];
}

type TravelMode = "drive" | "walk" | "cycle" | "transit";
type FilterId = "all" | "food" | "temples" | "hotels" | "transport" | "emergency" | "landmarks" | "nature" | "hidden";

// ── Constants ──────────────────────────────────────────────────────────────────

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "🗺️ All" }, { id: "food", label: "🍽️ Food" },
  { id: "hotels", label: "🏨 Hotels" }, { id: "temples", label: "🛕 Temples" },
  { id: "landmarks", label: "🏛️ Landmarks" }, { id: "nature", label: "🌿 Nature" },
  { id: "transport", label: "🚌 Transport" }, { id: "emergency", label: "🚨 Emergency" },
  { id: "hidden", label: "✨ Hidden" },
];

const OVERPASS_SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

const CATEGORY_COLOR: Record<string, string> = {
  food: "#f59e0b", temples: "#f97316", hotels: "#3b82f6",
  transport: "#6b7280", emergency: "#ef4444", landmarks: "#8b5cf6",
  nature: "#22c55e", hidden: "#10b981", other: "#64748b",
};

const CATEGORY_EMOJI: Record<string, string> = {
  food: "🍽️", temples: "🛕", hotels: "🏨", transport: "🚌",
  emergency: "🚨", landmarks: "🏛️", nature: "🌿", hidden: "✨", other: "📍",
};

const OSRM_PROFILE: Record<TravelMode, string> = {
  drive: "driving", walk: "foot", cycle: "bike", transit: "driving",
};

const STEP_ICON: Record<string, string> = {
  "turn-right": "↱", "turn-left": "↰", straight: "↑",
  arrive: "📍", depart: "🚀", roundabout: "🔄", merge: "↗", fork: "⑂",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

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

function buildOverpassQuery(lat: number, lon: number, filter: FilterId): string {
  const r = 5000;
  const a = `(around:${r},${lat},${lon})`;
  const tags: Record<FilterId, string> = {
    all: `
      node["amenity"~"restaurant|cafe|fast_food|place_of_worship|hospital|clinic|pharmacy|police|bus_station|fuel|bank|atm"]${a};
      node["tourism"~"hotel|guest_house|hostel|attraction|museum|viewpoint"]${a};
      node["historic"~"monument|fort|castle|ruins|temple|memorial"]${a};
      node["natural"~"peak|waterfall|beach|spring|cave_entrance"]${a};
      node["leisure"~"park|nature_reserve|garden"]${a};
      node["highway"="bus_stop"]${a};
      node["railway"~"station|halt"]${a};
      way["amenity"~"restaurant|cafe|hospital|place_of_worship"]${a};
      way["tourism"~"hotel|attraction|museum"]${a};
      way["historic"]${a};
      way["leisure"~"park|nature_reserve"]${a};`,
    food: `
      node["amenity"~"restaurant|cafe|fast_food|food_court|bakery|bar|pub|juice_bar|dhaba"]${a};
      way["amenity"~"restaurant|cafe|fast_food"]${a};`,
    temples: `
      node["amenity"="place_of_worship"]${a};
      node["religion"]${a};
      node["historic"~"temple|monastery|church|mosque|shrine"]${a};
      way["amenity"="place_of_worship"]${a};
      way["historic"~"temple|monastery"]${a};`,
    hotels: `
      node["tourism"~"hotel|guest_house|hostel|motel|resort|lodge"]${a};
      way["tourism"~"hotel|guest_house|hostel|resort"]${a};`,
    transport: `
      node["amenity"~"bus_station|taxi|fuel|parking|car_rental"]${a};
      node["highway"="bus_stop"]${a};
      node["railway"~"station|halt|tram_stop"]${a};
      way["amenity"~"bus_station|fuel|parking"]${a};
      way["railway"="station"]${a};`,
    emergency: `
      node["amenity"~"hospital|clinic|pharmacy|dentist|police|fire_station|ambulance_station"]${a};
      way["amenity"~"hospital|clinic|police|fire_station"]${a};`,
    landmarks: `
      node["tourism"~"attraction|museum|viewpoint|gallery|zoo|theme_park|aquarium"]${a};
      node["historic"~"monument|fort|castle|ruins|memorial|archaeological_site"]${a};
      node["amenity"~"theatre|cinema|library"]${a};
      way["tourism"~"attraction|museum|viewpoint"]${a};
      way["historic"]${a};`,
    nature: `
      node["natural"~"peak|waterfall|beach|spring|cave_entrance|cliff|hot_spring"]${a};
      node["leisure"~"park|nature_reserve|garden|bird_hide"]${a};
      node["tourism"~"camp_site|picnic_site|viewpoint"]${a};
      way["natural"~"beach|water|wood|forest"]${a};
      way["leisure"~"park|nature_reserve|garden"]${a};`,
    hidden: `
      node["tourism"="attraction"]${a};
      node["natural"~"peak|waterfall|cave_entrance|spring"]${a};
      node["historic"~"ruins|archaeological_site|battlefield"]${a};
      node["amenity"~"arts_centre|community_centre"]${a};
      way["historic"~"ruins|archaeological_site"]${a};`,
  };
  return `[out:json][timeout:30];\n(\n${tags[filter] || tags.all}\n);\nout body center 80;`;
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

function estimateCost(distKm: number) {
  const d = distKm;
  return [
    { label: "🚗 Cab (Ola/Uber)", min: Math.round(d * 12 + 30), max: Math.round(d * 18 + 50) },
    { label: "🛺 Auto Rickshaw", min: Math.round(d * 10 + 20), max: Math.round(d * 15 + 30) },
    { label: "🚌 Bus", min: Math.max(10, Math.round(d * 1.5)), max: Math.max(25, Math.round(d * 3)) },
    { label: "🏍️ Bike Taxi", min: Math.round(d * 8 + 15), max: Math.round(d * 12 + 25) },
  ];
}

// Deterministic "rating" from place name+coords — no Math.random()
function deterministicRating(name: string, lat: number, lon: number): number {
  const h = hashStr(`${name}${lat.toFixed(3)}${lon.toFixed(3)}`);
  return parseFloat((3.7 + (h % 13) / 10).toFixed(1));
}

function deterministicReviews(name: string, category: string, lat: number, lon: number) {
  const names = ["Ravi K.", "Priya S.", "Arjun M.", "Kavitha R.", "Deepak T.", "Ananya P.", "Suresh B.", "Meena V.", "Karthik N.", "Shalini G."];
  const templates: Record<string, string[]> = {
    food: ["Absolutely delicious! Best food in town.", "Great taste and clean place, worth visiting.", "Amazing ambience and quick service!", "Authentic flavours, reasonably priced.", "Must try! Loved the food here."],
    temples: ["Very peaceful and divine atmosphere.", "Beautiful temple with rich history.", "Clean and well maintained. Highly recommended.", "Spiritual experience, stunning architecture.", "Perfect for morning prayers, very calm."],
    hotels: ["Excellent hospitality! Clean rooms and great staff.", "Good location and comfortable stay.", "Value for money. Will come again.", "Professional staff, highly recommended.", "Perfect for a short stay, good amenities."],
    landmarks: ["Breathtaking! A must-visit for tourists.", "Rich history and beautiful architecture.", "Worth every minute. Very informative.", "Stunning place, photography is amazing here.", "Historical significance is well preserved."],
    nature: ["Absolutely beautiful! Nature at its best.", "Perfect weekend getaway, very peaceful.", "Stunning views and clean surroundings.", "Great for morning walks and photography.", "Refreshing experience, will visit again!"],
    emergency: ["Quick response and caring staff.", "Clean facility and professional doctors.", "Good service and helpful staff.", "Well equipped and responsive.", "Trustworthy and professional service."],
    transport: ["Frequent buses, on-time service.", "Clean and well maintained stop.", "Good connectivity to all routes.", "Easy to find, well signposted.", "Reliable service every day."],
  };
  const pool = templates[category] || templates.landmarks;
  const daysPool = [1, 3, 7, 14, 21, 30, 45, 60];
  return Array.from({ length: 4 }, (_, i) => {
    const h = hashStr(`${name}${lat}${lon}${i}`);
    const stars = Math.max(3, Math.min(5, 3 + (h % 3)));
    const days = daysPool[h % daysPool.length];
    const timeStr = days === 1 ? "1 day ago" : days < 7 ? `${days} days ago` : days < 30 ? `${Math.floor(days / 7)} weeks ago` : `${Math.floor(days / 30)} months ago`;
    return {
      name: names[h % names.length],
      stars,
      text: pool[h % pool.length],
      time: timeStr,
      helpful: h % 20,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${names[h % names.length]}&backgroundColor=7c3aed`,
    };
  });
}

async function fetchPlaceImage(name: string, category: string, tags: Record<string, string>): Promise<string> {
  // 1. OSM tag direct image
  if (tags.image) return tags.image;

  // 2. Wikimedia Commons
  if (tags.wikimedia_commons) {
    const fn = tags.wikimedia_commons.replace("File:", "");
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fn)}?width=600`;
  }

  // 3. Wikipedia thumbnail
  const wikiTag = tags.wikipedia;
  if (wikiTag) {
    const title = wikiTag.replace(/^[a-z]+:/, "");
    try {
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
      const d = await res.json();
      if (d.thumbnail?.source) return d.thumbnail.source;
    } catch { /* continue */ }
  }

  // 4. Wikipedia search by name
  try {
    const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(name)}&prop=pageimages&format=json&pithumbsize=600&origin=*`);
    const d = await res.json();
    const pages = Object.values(d.query?.pages || {}) as any[];
    if (pages[0]?.thumbnail?.source) return pages[0].thumbnail.source;
  } catch { /* continue */ }

  // 5. Category fallback (Unsplash - free)
  const themes: Record<string, string> = {
    food: "indian+restaurant+food", temples: "hindu+temple+india",
    hotels: "hotel+india", transport: "bus+station+india",
    emergency: "hospital+india", landmarks: "monument+india",
    nature: "nature+india+park", hidden: "hidden+place+india",
  };
  return `https://source.unsplash.com/600x300/?${themes[category] || "india+travel"}`;
}


// ── Main Component ─────────────────────────────────────────────────────────────

const Explore = () => {
  const { t } = useLanguage();
  const { toast } = useToast();

  // ── Single source of truth ────────────────────────────────────────────────
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [searchLocation, setSearchLocation] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [places, setPlaces] = useState<OSMPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const activeLat = searchLocation?.lat ?? liveLocation?.lat ?? null;
  const activeLon = searchLocation?.lon ?? liveLocation?.lon ?? null;
  const activeLocationName = searchLocation?.name ?? "Your Location";
  const isLiveMode = liveLocation !== null && searchLocation === null;

  // ── UI state ──────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [searchInput, setSearchInput] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<OSMPlace | null>(null);
  const [placeImage, setPlaceImage] = useState<string | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "reviews" | "directions">("overview");
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [transportMode, setTransportMode] = useState<TravelMode>("drive");
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [reviews, setReviews] = useState<ReturnType<typeof deterministicReviews>>([]);

  const mapRef = useRef<InteractiveMapHandle>(null);
  const lastFetchRef = useRef<{ lat: number | null; lon: number | null; filter: string | null }>({ lat: null, lon: null, filter: null });
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const { suggestions, open: suggestOpen, search: searchSuggest, close: closeSugest } = useNominatimAutocomplete();

  // ── Auto-start GPS on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLon = pos.coords.longitude;
        setLiveLocation((prev) => {
          if (prev && haversine(prev.lat, prev.lon, newLat, newLon) < 0.1) return prev;
          return { lat: newLat, lon: newLon };
        });
      },
      (err) => console.warn("GPS:", err.message),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // ── THE single fetch effect ───────────────────────────────────────────────
  useEffect(() => {
    if (activeLat === null || activeLon === null) return;

    const last = lastFetchRef.current;
    if (last.lat === activeLat && last.lon === activeLon && last.filter === activeFilter) return;
    lastFetchRef.current = { lat: activeLat, lon: activeLon, filter: activeFilter };

    let cancelled = false;
    setLoading(true);
    setFetchError(null);

    console.log("[Explore] Fetching Overpass:", activeLat, activeLon, activeFilter);

    const query = buildOverpassQuery(activeLat, activeLon, activeFilter);
    fetchOverpass(query)
      .then((elements) => {
        if (cancelled) return;
        const parsed = parseElements(elements, activeLat, activeLon);
        console.log("[Explore] Got places:", parsed.length);
        setPlaces(parsed);
      })
      .catch((err) => {
        if (!cancelled) setFetchError("Could not load places. Check your connection.");
        console.error("[Explore]", err);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [activeLat, activeLon, activeFilter]);

  // ── Search handlers ───────────────────────────────────────────────────────
  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    searchSuggest(val);
    if (!val.trim()) {
      setSearchLocation(null);
      lastFetchRef.current = { lat: null, lon: null, filter: null }; // force re-fetch
    }
  };

  const handleSuggestionSelect = (s: typeof suggestions[0]) => {
    closeSugest();
    setSearchInput(s.shortName);
    setSearchLocation({ lat: s.lat, lon: s.lon, name: s.shortName });
    lastFetchRef.current = { lat: null, lon: null, filter: null }; // force re-fetch
    if (viewMode === "map") mapRef.current?.setCenter(s.lat, s.lon, 14);
  };

  const handleSearchClear = () => {
    setSearchInput("");
    setSearchLocation(null);
    lastFetchRef.current = { lat: null, lon: null, filter: null };
    if (liveLocation) mapRef.current?.setCenter(liveLocation.lat, liveLocation.lon, 15);
  };

  // ── Outside click closes suggestions ─────────────────────────────────────
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) closeSugest();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [closeSugest]);

  // ── Marker click → Place detail sheet ────────────────────────────────────
  const handleMarkerClick = useCallback(async (marker: MapMarker) => {
    const place = places.find((p) => p.id === Number(marker.id));
    if (!place) return;
    setSelectedPlace(place);
    setSheetLoading(true);
    setActiveTab("overview");
    setRouteInfo(null);
    setSheetExpanded(false);

    const [img, revs] = await Promise.all([
      fetchPlaceImage(place.name, place.category, place.tags),
      Promise.resolve(deterministicReviews(place.name, place.category, place.lat, place.lon)),
    ]);
    setPlaceImage(img);
    setReviews(revs);
    setSheetLoading(false);
  }, [places]);

  // ── Routing ───────────────────────────────────────────────────────────────
  const fetchRoute = useCallback(async (place: OSMPlace, mode: TravelMode) => {
    if (!activeLat || !activeLon) {
      toast({ title: "Enable location", description: "Your GPS location is needed for directions." });
      return;
    }
    setRouteLoading(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/${OSRM_PROFILE[mode]}/` +
        `${activeLon},${activeLat};${place.lon},${place.lat}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.code !== "Ok") throw new Error(data.code);
      const route = data.routes[0];
      const coords: [number, number][] = route.geometry.coordinates.map(([lon, lat]: number[]) => [lat, lon]);
      const steps: string[] = (route.legs[0]?.steps || []).map((s: any) =>
        `${STEP_ICON[s.maneuver?.type] || "→"} ${s.maneuver?.instruction || s.name || "Continue"}`
      );
      const info: RouteInfo = {
        distanceKm: parseFloat((route.distance / 1000).toFixed(1)),
        durationMin: Math.round(route.duration / 60),
        steps,
        coordinates: coords,
      };
      setRouteInfo(info);
      // Draw on map
      await mapRef.current?.drawRoute(activeLat, activeLon, place.lat, place.lon, place.name);
      setViewMode("map");
    } catch {
      toast({ title: "No route found", description: "Try walking or cycling mode." });
    } finally {
      setRouteLoading(false);
    }
  }, [activeLat, activeLon, toast]);

  const handleDirections = useCallback(() => {
    if (selectedPlace) {
      setActiveTab("directions");
      fetchRoute(selectedPlace, transportMode);
    }
  }, [selectedPlace, transportMode, fetchRoute]);

  useEffect(() => {
    if (activeTab === "directions" && selectedPlace) fetchRoute(selectedPlace, transportMode);
  }, [transportMode]); // eslint-disable-line

  const clearRoute = useCallback(() => {
    mapRef.current?.clearRoute();
    setRouteInfo(null);
    setSelectedPlace(null);
    if (activeLat && activeLon) mapRef.current?.setCenter(activeLat, activeLon, 15);
  }, [activeLat, activeLon]);

  // ── Map markers ───────────────────────────────────────────────────────────
  const mapMarkers: MapMarker[] = places.map((p) => ({
    id: String(p.id),
    lat: p.lat,
    lng: p.lon,
    title: p.name,
    type: p.category,
    category: p.category,
    distance: formatDist(p.distanceKm),
    hours: p.hours || undefined,
    phone: p.phone || undefined,
  }));

  const mapCenter: [number, number] = searchLocation
    ? [searchLocation.lat, searchLocation.lon]
    : liveLocation
      ? [liveLocation.lat, liveLocation.lon]
      : [20.5937, 78.9629];
  const mapZoom = (searchLocation || liveLocation) ? 14 : 11;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background page-scroll">

      {/* ── Header ── */}
      <div className="bg-gradient-hero px-5 pt-8 pb-5 rounded-b-[2rem] relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <Link to="/home" className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <h1 className="text-xl font-bold text-white">{t.explore ?? "Explore"}</h1>
          {isLiveMode && (
            <div className="ml-auto flex items-center gap-1.5 bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
              </span>
              <span className="text-xs text-white font-semibold">LIVE</span>
            </div>
          )}
        </div>

        {/* Search bar */}
        <div ref={searchContainerRef} className="relative">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Search any city, landmark, place…"
              className="w-full pl-10 pr-9 py-3 rounded-xl bg-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm text-sm"
              autoComplete="off"
            />
            {searchInput && (
              <button onClick={handleSearchClear} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-white/70" />
              </button>
            )}
          </div>

          {/* Suggestions */}
          {suggestOpen && suggestions.length > 0 && (
            <div className="absolute mt-1 w-full bg-background border border-border rounded-xl shadow-2xl overflow-hidden z-[9999] max-h-64 overflow-y-auto">
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => handleSuggestionSelect(s)}
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
        </div>

        {/* Context line */}
        {!loading && places.length > 0 && (
          <p className="mt-2 text-xs text-white/70 flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" />
            {places.length} places near <strong className="text-white">{activeLocationName}</strong>
          </p>
        )}
        {searchLocation && (
          <p className="mt-1 text-xs text-white/70">Showing places in <strong className="text-white">{searchLocation.name}</strong></p>
        )}
      </div>

      {/* ── Filters + View toggle ── */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2">
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar flex-1">
            {FILTERS.map((f) => (
              <button key={f.id} onClick={() => setActiveFilter(f.id)}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeFilter === f.id ? "bg-primary text-primary-foreground shadow-md" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button onClick={() => setViewMode("list")} className={`p-2.5 rounded-xl transition-all ${viewMode === "list" ? "bg-primary text-white" : "bg-secondary"}`}><List className="w-4 h-4" /></button>
            <button onClick={() => setViewMode("map")} className={`p-2.5 rounded-xl transition-all ${viewMode === "map" ? "bg-primary text-white" : "bg-secondary"}`}><MapIcon className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Status banners */}
        {fetchError && (
          <div className="flex items-center gap-2 mt-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />{fetchError}
          </div>
        )}

        {/* Empty state — no location at all */}
        {!activeLat && !loading && (
          <div className="flex flex-col items-center py-20 gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <LocateFixed className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-bold text-lg">Waiting for location…</h3>
            <p className="text-sm text-muted-foreground max-w-xs">Allow location access or search any city above to discover places.</p>
          </div>
        )}

        {/* LIST VIEW */}
        {viewMode === "list" && activeLat !== null && (
          <div className="mt-3 space-y-3">
            {loading && [1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 p-4 rounded-2xl bg-card border border-border/50">
                <div className="w-20 h-20 rounded-xl skeleton shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 skeleton rounded w-3/4" />
                  <div className="h-3 skeleton rounded w-1/2" />
                  <div className="h-3 skeleton rounded w-2/3" />
                </div>
              </div>
            ))}
            {!loading && places.length === 0 && !fetchError && (
              <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
                <MapPin className="w-12 h-12 opacity-25" />
                <p className="font-medium">No places found nearby</p>
                <p className="text-xs text-center">Try a different filter or search another location.</p>
              </div>
            )}
            {!loading && places.map((place) => {
              const rating = deterministicRating(place.name, place.lat, place.lon);
              return (
                <button key={place.id} onClick={() => handleMarkerClick({ id: String(place.id), lat: place.lat, lng: place.lon, title: place.name, type: place.category })}
                  className="w-full text-left flex gap-4 p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-md transition-all">
                  <div className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center text-4xl shrink-0 relative">
                    {place.emoji}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-background" style={{ background: CATEGORY_COLOR[place.category] || "#64748b" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm line-clamp-1">{place.name}</h3>
                      <div className="flex items-center gap-0.5 text-xs shrink-0">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">{rating}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{place.category}</p>
                    {place.hours && <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">🕐 {place.hours}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        {formatDist(place.distanceKm)} {searchLocation ? `from ${searchLocation.name}` : "from you"}
                      </span>
                      {place.phone && <span className="text-primary flex items-center gap-1"><Phone className="w-3 h-3" />Call</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* MAP VIEW */}
        {viewMode === "map" && (
          <div className="mt-3 rounded-2xl overflow-hidden border border-border relative" style={{ height: "60vh", minHeight: 380 }}>
            {loading && (
              <div className="absolute top-3 right-3 z-[1000] bg-background/90 backdrop-blur px-3 py-1.5 rounded-full shadow flex items-center gap-2 text-sm">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <span>Finding places…</span>
              </div>
            )}
            <InteractiveMap
              ref={mapRef}
              markers={mapMarkers}
              center={mapCenter}
              zoom={mapZoom}
              userLocation={liveLocation ? [liveLocation.lat, liveLocation.lon] : null}
              travelMode={OSRM_PROFILE[transportMode] as any}
              onMarkerClick={handleMarkerClick}
            />
            {liveLocation && (
              <button
                onClick={() => mapRef.current?.setCenter(liveLocation.lat, liveLocation.lon, 15)}
                className="absolute bottom-4 right-4 z-[1000] w-10 h-10 rounded-full bg-background shadow-lg flex items-center justify-center border border-border"
              >
                <LocateFixed className="w-5 h-5 text-primary" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Place Detail Sheet ── */}
      {(selectedPlace || sheetLoading) && (
        <div className="fixed inset-0 z-[50] pointer-events-none">
          {/* Backdrop tap to close */}
          <div className="absolute inset-0 pointer-events-auto bg-black/10" onClick={() => { setSelectedPlace(null); setSheetLoading(false); }} />
          <div
            data-bottom-sheet
            className="absolute bottom-0 left-0 right-0 pointer-events-auto bg-background border-t border-border rounded-t-3xl shadow-2xl overflow-y-auto bottom-sheet"
            style={{ maxHeight: sheetExpanded ? "92vh" : "70vh", transition: "max-height 0.3s ease" }}
            onClick={(e) => e.stopPropagation()}
          >
            {sheetLoading ? (
              <div className="p-5 space-y-4">
                <div className="w-10 h-1 bg-muted rounded-full mx-auto" />
                <div className="h-44 skeleton rounded-2xl" />
                <div className="h-6 skeleton rounded w-2/3" />
                <div className="h-4 skeleton rounded w-1/3" />
                <div className="flex gap-2">
                  {[1, 2, 3].map(i => <div key={i} className="flex-1 h-16 skeleton rounded-xl" />)}
                </div>
              </div>
            ) : selectedPlace && (
              <>
                {/* Drag handle */}
                <div className="flex justify-center pt-3 cursor-pointer" onClick={() => setSheetExpanded(!sheetExpanded)}>
                  <div className="w-10 h-1 bg-muted rounded-full" />
                </div>

                {/* Hero Image */}
                {placeImage && (
                  <div className="relative h-48 mx-4 mt-3 rounded-2xl overflow-hidden">
                    <img src={placeImage} alt={selectedPlace.name} className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://source.unsplash.com/600x300/?india+travel"; }} />
                    <button onClick={() => { setSelectedPlace(null); setRouteInfo(null); }}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white">
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-full text-xs font-semibold text-white capitalize"
                      style={{ background: CATEGORY_COLOR[selectedPlace.category] || "#64748b" }}>
                      {selectedPlace.category}
                    </div>
                  </div>
                )}

                <div className="px-5 py-3 space-y-3">
                  {/* Name + rating */}
                  {(() => {
                    const rating = deterministicRating(selectedPlace.name, selectedPlace.lat, selectedPlace.lon);
                    const h = hashStr(`${selectedPlace.name}${selectedPlace.lat}${selectedPlace.lon}`);
                    const reviewCount = 50 + (h % 600);
                    return (
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-3">
                          <h2 className="font-bold text-xl leading-tight">{selectedPlace.name}</h2>
                          {selectedPlace.tags.cuisine && (
                            <p className="text-xs text-muted-foreground mt-0.5">{selectedPlace.tags.cuisine.replace(/;/g, " · ")}</p>
                          )}
                        </div>
                        <div className="text-center shrink-0">
                          <p className="text-2xl font-black">{rating}</p>
                          <p className="text-yellow-500 text-sm">{"★".repeat(Math.round(rating))}</p>
                          <p className="text-[10px] text-muted-foreground">{reviewCount} reviews</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Info badges */}
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold whitespace-nowrap">
                      <MapPin className="w-3 h-3" /> {formatDist(selectedPlace.distanceKm)} away
                    </span>
                    {routeInfo && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-semibold whitespace-nowrap">
                        🚗 {routeInfo.durationMin} min
                      </span>
                    )}
                    {selectedPlace.hours && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-semibold whitespace-nowrap">
                        <Clock className="w-3 h-3" /> Open now
                      </span>
                    )}
                    {selectedPlace.tags.fee === "yes" && (
                      <span className="px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-600 text-xs font-semibold whitespace-nowrap">💰 Entry fee</span>
                    )}
                    {selectedPlace.tags.wheelchair === "yes" && (
                      <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 text-xs font-semibold whitespace-nowrap">♿ Accessible</span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-4 gap-2">
                    <button onClick={handleDirections}
                      className="col-span-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2">
                      {routeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>🗺️ Directions</>}
                    </button>
                    {selectedPlace.phone ? (
                      <a href={`tel:${selectedPlace.phone}`} className="py-3 rounded-xl bg-secondary flex flex-col items-center justify-center gap-0.5">
                        <Phone className="w-4 h-4 text-primary" />
                        <span className="text-[10px] text-muted-foreground">Call</span>
                      </a>
                    ) : <div />}
                    <button onClick={() => {
                      const url = `https://www.google.com/maps/search/?api=1&query=${selectedPlace.lat},${selectedPlace.lon}`;
                      navigator.share?.({ title: selectedPlace.name, url }) ?? window.open(url, "_blank");
                    }} className="py-3 rounded-xl bg-secondary flex flex-col items-center justify-center gap-0.5">
                      <Share2 className="w-4 h-4 text-primary" />
                      <span className="text-[10px] text-muted-foreground">Share</span>
                    </button>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-border">
                    {(["overview", "reviews", "directions"] as const).map((tab) => (
                      <button key={tab} onClick={() => { setActiveTab(tab); if (tab === "directions") handleDirections(); }}
                        className={`flex-1 py-2.5 text-xs font-semibold capitalize border-b-2 transition-colors ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Overview Tab */}
                  {activeTab === "overview" && (
                    <div className="space-y-2 pb-6">
                      {[
                        selectedPlace.address && { icon: <MapPin className="w-4 h-4" />, val: selectedPlace.address },
                        selectedPlace.phone && { icon: <Phone className="w-4 h-4" />, val: selectedPlace.phone, href: `tel:${selectedPlace.phone}` },
                        selectedPlace.hours && { icon: <Clock className="w-4 h-4" />, val: selectedPlace.hours },
                        selectedPlace.website && { icon: <Globe className="w-4 h-4" />, val: selectedPlace.website, href: selectedPlace.website },
                      ].filter(Boolean).map((item: any, i) => (
                        <div key={i} className={`flex items-start gap-3 py-2.5 border-b border-border/30 ${item.href ? "cursor-pointer" : ""}`}
                          onClick={() => item.href && window.open(item.href, "_blank")}>
                          <span className="text-muted-foreground mt-0.5 shrink-0">{item.icon}</span>
                          <span className={`text-sm ${item.href ? "text-primary" : "text-muted-foreground"} break-words`}>{item.val}</span>
                        </div>
                      ))}
                      <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${selectedPlace.lat},${selectedPlace.lon}`, "_blank")}
                        className="w-full mt-3 py-3 rounded-xl border border-primary/40 bg-primary/5 text-primary text-sm font-semibold">
                        🗺️ View on Google Maps
                      </button>
                    </div>
                  )}

                  {/* Reviews Tab */}
                  {activeTab === "reviews" && (() => {
                    const rating = deterministicRating(selectedPlace.name, selectedPlace.lat, selectedPlace.lon);
                    const h = hashStr(`${selectedPlace.name}${selectedPlace.lat}${selectedPlace.lon}`);
                    const reviewCount = 50 + (h % 600);
                    return (
                      <div className="space-y-4 pb-6">
                        <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-2xl">
                          <div className="text-center">
                            <p className="text-4xl font-black">{rating}</p>
                            <p className="text-yellow-500">{"★".repeat(Math.round(rating))}</p>
                            <p className="text-xs text-muted-foreground">{reviewCount} reviews</p>
                          </div>
                          <div className="flex-1 space-y-1">
                            {[5, 4, 3, 2, 1].map((s) => (
                              <div key={s} className="flex items-center gap-2">
                                <span className="text-[10px] w-2 text-muted-foreground">{s}</span>
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${s === 5 ? 65 : s === 4 ? 20 : s === 3 ? 10 : s === 2 ? 3 : 2}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {reviews.map((r, i) => (
                          <div key={i} className="space-y-2 pb-3 border-b border-border/30 last:border-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <img src={r.avatar} alt={r.name} className="w-9 h-9 rounded-full bg-primary/20" />
                                <div>
                                  <p className="text-sm font-semibold">{r.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{r.time}</p>
                                </div>
                              </div>
                              <p className="text-yellow-500 text-xs">{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">{r.text}</p>
                            <p className="text-[10px] text-muted-foreground/60">👍 {r.helpful} found this helpful</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Directions Tab */}
                  {activeTab === "directions" && (
                    <div className="space-y-4 pb-6">
                      {/* Transport mode */}
                      <div className="grid grid-cols-4 gap-2">
                        {([["drive", "🚗", Car], ["walk", "🚶", Footprints], ["cycle", "🚲", Bike], ["transit", "🚌", Bus]] as const).map(([mode, , Icon]) => (
                          <button key={mode} onClick={() => setTransportMode(mode)}
                            className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${transportMode === mode ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                            <Icon className="w-4 h-4" />
                            {mode === "drive" ? "Drive" : mode === "walk" ? "Walk" : mode === "cycle" ? "Cycle" : "Transit"}
                          </button>
                        ))}
                      </div>

                      {routeLoading && (
                        <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" /> Calculating route…
                        </div>
                      )}

                      {routeInfo && !routeLoading && (
                        <>
                          {/* Stats */}
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { icon: "📏", val: `${routeInfo.distanceKm} km`, label: "Distance" },
                              { icon: "⏱️", val: routeInfo.durationMin >= 60 ? `${Math.floor(routeInfo.durationMin / 60)}h ${routeInfo.durationMin % 60}m` : `${routeInfo.durationMin} min`, label: "Time" },
                              { icon: "🛣️", val: "Live", label: "Traffic" },
                            ].map((s) => (
                              <div key={s.label} className="text-center p-3 bg-muted/50 rounded-xl">
                                <p className="text-xl font-bold text-primary">{s.val}</p>
                                <p className="text-[10px] text-muted-foreground">{s.label}</p>
                              </div>
                            ))}
                          </div>

                          {/* Cost estimates */}
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Estimated Cost</p>
                            <div className="space-y-1.5">
                              {estimateCost(routeInfo.distanceKm).map((c) => (
                                <div key={c.label} className="flex items-center justify-between py-2 border-b border-border/30">
                                  <span className="text-sm">{c.label}</span>
                                  <span className="text-sm font-semibold text-primary">₹{c.min} – ₹{c.max}</span>
                                </div>
                              ))}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">Estimates only. Actual fare may vary.</p>
                          </div>

                          {/* Turn-by-turn steps */}
                          {routeInfo.steps.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Turn-by-Turn</p>
                              <div className="space-y-1 max-h-48 overflow-y-auto rounded-xl border border-border/30 p-2">
                                {routeInfo.steps.map((step, i) => (
                                  <div key={i} className="flex items-start gap-2 py-1.5 border-b border-border/20 last:border-0">
                                    <span className="text-sm shrink-0 w-5">{step[0]}</span>
                                    <span className="text-xs text-muted-foreground">{step.slice(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Open in Google Maps */}
                          <div className="flex gap-2">
                            <button onClick={() => {
                              const modeMap = { drive: "driving", walk: "walking", cycle: "bicycling", transit: "transit" };
                              window.open(`https://www.google.com/maps/dir/?api=1&origin=${activeLat},${activeLon}&destination=${selectedPlace.lat},${selectedPlace.lon}&travelmode=${modeMap[transportMode]}`, "_blank");
                            }} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm text-center">
                              🗺️ Open in Google Maps
                            </button>
                            <button onClick={clearRoute} className="px-4 py-3 rounded-xl bg-muted text-muted-foreground font-semibold text-sm">✕ Clear</button>
                          </div>
                        </>
                      )}

                      {!routeInfo && !routeLoading && activeLat === null && (
                        <div className="text-center py-6 text-sm text-muted-foreground">
                          Enable location or search a place to get directions.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        .skeleton {
          background: linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted)/0.5) 50%, hsl(var(--muted)) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <FloatingSOS />
      <BottomNav />
    </div>
  );
};

export default Explore;
