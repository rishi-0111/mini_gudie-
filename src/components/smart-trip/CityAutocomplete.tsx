/**
 * CityAutocomplete — Real-time place search powered by Nominatim (OpenStreetMap).
 * Respects usage limits and provides clean address parsing.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Loader2, Search, Navigation, AlertCircle } from "lucide-react";

export interface CityResult {
  name: string;
  displayName: string;
  lat: number;
  lon: number;
  type?: string;
}

interface CityAutocompleteProps {
  value: string;
  onChange: (city: { name: string; displayName: string; lat: number; lon: number } | null) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  label?: string;
}

const POPULAR_CITIES = [
  { name: "Jaipur", displayName: "Jaipur, Rajasthan, India", lat: 26.9124, lon: 75.7873 },
  { name: "Delhi", displayName: "Delhi, India", lat: 28.6139, lon: 77.2090 },
  { name: "Mumbai", displayName: "Mumbai, Maharashtra, India", lat: 19.0760, lon: 72.8777 },
  { name: "Bangalore", displayName: "Bangalore, Karnataka, India", lat: 12.9716, lon: 77.5946 },
  { name: "Goa", displayName: "Goa, India", lat: 15.2993, lon: 74.1240 },
  { name: "Varanasi", displayName: "Varanasi, Uttar Pradesh, India", lat: 25.3176, lon: 82.9739 },
  { name: "Udaipur", displayName: "Udaipur, Rajasthan, India", lat: 24.5854, lon: 73.7125 },
  { name: "Agra", displayName: "Agra, Uttar Pradesh, India", lat: 27.1767, lon: 78.0081 },
];


export default function CityAutocomplete({
  value,
  onChange,
  placeholder = "Search city...",
  icon,
  label,
}: CityAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Handle clicks outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Address Parsing Logic
  const parseName = (address: any, fallbackName: string): string => {
    const priority = [
      "amenity", "tourism", "neighbourhood", "suburb",
      "village", "town", "city_district", "city", "county"
    ];
    for (const key of priority) {
      if (address[key]) return address[key];
    }
    return fallbackName;
  };

  const searchPlaces = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=10&accept-language=en&dedupe=1`;

      const response = await fetch(url, {
        headers: {
          "User-Agent": "MiniGudie/1.0 (contact@minigudie.ai)"
        },
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();

      const mappedResults: CityResult[] = data.map((item: any) => ({
        name: parseName(item.address, item.name || item.display_name.split(",")[0]),
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        type: "live"
      }));

      setResults(mappedResults);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError("Could not load results");
        console.error("OSM Error:", err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Trigger after 2+ characters with 350ms debounce
    if (val.length >= 2) {
      debounceRef.current = setTimeout(() => searchPlaces(val), 350);
    } else {
      // Show popular results if characters < 2
      setResults(POPULAR_CITIES.map(c => ({ ...c, type: "popular" })));
    }
  };

  const handleFocus = () => {
    setFocused(true);
    if (!query.trim() || query.length < 2) {
      setResults(POPULAR_CITIES.map(c => ({ ...c, type: "popular" })));
      setOpen(true);
    } else if (query.length >= 2) {
      setOpen(true);
    }
  };

  const handleSelect = (city: CityResult) => {
    setQuery(city.name);
    setOpen(false);
    onChange({
      name: city.name,
      displayName: city.displayName,
      lat: city.lat,
      lon: city.lon
    });
  };


  // Handle scroll outside to close dropdown
  useEffect(() => {
    const handleScroll = () => {
      setOpen(false);
    };
    if (open) {
      window.addEventListener("scroll", handleScroll, true);
      return () => window.removeEventListener("scroll", handleScroll, true);
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
          {icon} {label}
        </label>
      )}

      <div className={`relative flex items-center rounded-xl bg-muted/50 border transition-all ${focused ? "border-primary/60 ring-2 ring-primary/30" : "border-border"
        }`}>
        <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3" />
        <input
          ref={inputRef}
          type="text"
          className="w-full pl-9 pr-8 py-2 rounded-xl bg-transparent text-sm focus:outline-none"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="w-3.5 h-3.5 text-primary absolute right-3 animate-spin" />
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-150 z-50">
          {/* Header for Popular/Live */}
          {results.length > 0 && (
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium bg-muted/30 flex items-center gap-1">
              <Navigation className="w-2.5 h-2.5" />
              {results[0].type === "popular" ? "Popular Destinations" : "Search Results"}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          {/* Results List */}
          {results.map((city, i) => (
            <button
              key={`${city.lat}-${city.lon}-${i}`}
              className="w-full text-left px-3 py-2.5 hover:bg-primary/10 transition-colors flex items-center gap-2 text-sm border-b border-border/30 last:border-0"
              onClick={() => handleSelect(city)}
              type="button"
            >
              <MapPin className="w-3.5 h-3.5 text-primary/70 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="font-medium">{city.name}</span>
                <div className="text-[10px] text-muted-foreground/70 truncate">
                  {city.displayName}
                </div>
              </div>
            </button>
          ))}

          {/* No Results */}
          {!loading && !error && query.length >= 2 && results.length === 0 && (
            <div className="p-3 text-center text-sm text-muted-foreground">
              No results found
            </div>
          )}

          {/* OSM Attribution */}
          <div className="px-3 py-1 text-[9px] text-muted-foreground/50 bg-muted/10 text-right">
            © OpenStreetMap contributors
          </div>
        </div>
      )}
    </div>
  );
}

