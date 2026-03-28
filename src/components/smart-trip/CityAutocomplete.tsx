/**
 * CityAutocomplete — Powered by local AI search + Nominatim.
 * Provides clean address parsing and respects rate limits.
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

const API_BASE = import.meta.env.VITE_HIDDEN_GEM_API_URL || "https://web-production-4a409.up.railway.app";

const POPULAR_CITIES: CityResult[] = [];

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
        // If query is not empty but no city selected, update parent with just the name
        if (query.trim() && query !== value) {
          onChange({
            name: query,
            displayName: query,
            lat: 0,
            lon: 0
          });
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [query, value, onChange]);

  const searchPlaces = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // Use local backend search for better Indian city data
      const url = `${API_BASE}/search-cities?q=${encodeURIComponent(q)}`;

      const response = await fetch(url, {
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();
      const mappedResults: CityResult[] = (data.results || []).map((item: any) => ({
        name: item.name,
        displayName: item.displayName || item.display_name || item.name,
        lat: item.lat,
        lon: item.lng ?? item.lon ?? 0,
        type: item.type || "live"
      }));

      setResults(mappedResults);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError("Search unavailable");
        console.error("Search Error:", err);
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

    if (val.length >= 2) {
      debounceRef.current = setTimeout(() => searchPlaces(val), 350);
    } else {
      setResults(POPULAR_CITIES.map(c => ({ ...c, type: "popular" })));
    }
  };

  const handleFocus = () => {
    setFocused(true);
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setOpen(false);
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (results.length > 0) {
        handleSelect(results[0]);
      } else if (query.trim()) {
        onChange({ name: query, displayName: query, lat: 0, lon: 0 });
        setOpen(false);
      }
    }
  };

  useEffect(() => {
    const handleScroll = (e: Event) => {
      if (containerRef.current?.contains(e.target as Node)) return;
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
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="w-3.5 h-3.5 text-primary absolute right-3 animate-spin" />
        )}
      </div>

      {open && (
        <div
          data-suggestions
          className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-150 z-50"
        >
          {results.length > 0 && (
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium bg-muted/30 flex items-center gap-1">
              <Navigation className="w-2.5 h-2.5" />
              {results[0].type === "popular" ? "Popular Destinations" : "Search Results"}
            </div>
          )}

          {error && (
            <div className="p-3 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

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

          {!loading && !error && query.length >= 2 && results.length === 0 && (
            <div className="p-3 text-center text-sm text-muted-foreground">
              No results found
            </div>
          )}

          <div className="px-3 py-1 text-[9px] text-muted-foreground/50 bg-muted/10 text-right">
            MiniGudie Smart Search
          </div>
        </div>
      )}
    </div>
  );
}


