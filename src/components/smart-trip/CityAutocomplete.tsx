/**
 * CityAutocomplete — Real-time place search like Google Maps.
 * Searches ANY place in India: cities, towns, villages, localities.
 * Sources: Nominatim (OpenStreetMap) + local city DB + Supabase POIs.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Loader2, Search, Navigation } from "lucide-react";

interface CityResult {
  name: string;
  state: string;
  displayName: string;
  lat: number;
  lng: number;
  type: string;
}

interface CityAutocompleteProps {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  label?: string;
}

const API_BASE = "http://localhost:8000";

// Popular picks shown when input is empty (on focus)
const POPULAR_CITIES = [
  "Delhi", "Mumbai", "Bangalore", "Jaipur", "Goa",
  "Varanasi", "Udaipur", "Agra", "Shimla", "Manali",
  "Rishikesh", "Kochi", "Mysuru", "Darjeeling", "Ooty",
  "Tirupati", "Pondicherry", "Kanyakumari", "Hampi", "Kodaikanal",
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
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close dropdown on outside click
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

  // Debounced search — queries real-time API (Nominatim + Supabase + local DB)
  const searchCities = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/search-cities?q=${encodeURIComponent(q)}&limit=10`);
      if (resp.ok) {
        const data = await resp.json();
        setResults(data.results || []);
      }
    } catch {
      // Offline fallback: filter popular cities locally
      const lower = q.toLowerCase();
      const filtered = POPULAR_CITIES
        .filter((c) => c.toLowerCase().includes(lower))
        .map((c) => ({ name: c, state: "", displayName: c, lat: 0, lng: 0, type: "city" }));
      setResults(filtered);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setOpen(true);

    // Fast debounce: 200ms for real-time feel
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCities(val), 200);
  };

  const handleSelect = (city: CityResult) => {
    setQuery(city.name);
    onChange(city.name);
    setOpen(false);
    setResults([]);
  };

  const handleFocus = () => {
    setFocused(true);
    // Show popular cities if input is empty
    if (!query.trim()) {
      setResults(
        POPULAR_CITIES.slice(0, 8).map((c) => ({
          name: c,
          state: "",
          displayName: c,
          lat: 0,
          lng: 0,
          type: "popular",
        }))
      );
      setOpen(true);
    } else if (query.length >= 2) {
      setOpen(true);
    }
  };

  return (
    <div ref={containerRef} className="relative" style={{ zIndex: open ? 100 : 1 }}>
      {label && (
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
          {icon} {label}
        </label>
      )}
      <div
        className={`relative flex items-center rounded-xl bg-muted/50 border transition-all ${
          focused ? "border-primary/60 ring-2 ring-primary/30" : "border-border"
        }`}
      >
        <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 pointer-events-none" />
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

      {/* Dropdown — real-time results from Nominatim + DB */}
      {open && results.length > 0 && (
        <div className="absolute mt-1 w-full bg-background border border-border rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-150" style={{ zIndex: 9999 }}>
          {results[0]?.type === "popular" && (
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium bg-muted/30">
              Popular destinations
            </div>
          )}
          {results[0]?.type !== "popular" && (
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium bg-muted/30 flex items-center gap-1">
              <Navigation className="w-2.5 h-2.5" /> Live results
            </div>
          )}
          {results.map((city, i) => (
            <button
              key={`${city.name}-${city.state}-${i}`}
              className="w-full text-left px-3 py-2.5 hover:bg-primary/10 transition-colors flex items-center gap-2 text-sm border-b border-border/30 last:border-0"
              onClick={() => handleSelect(city)}
              type="button"
            >
              <MapPin className="w-3.5 h-3.5 text-primary/70 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="font-medium">{city.name}</span>
                {city.state && (
                  <span className="text-muted-foreground text-xs ml-1">
                    , {city.state}
                  </span>
                )}
                {city.displayName && city.displayName !== city.name && city.displayName !== `${city.name}, ${city.state}` && (
                  <div className="text-[10px] text-muted-foreground/70 truncate">
                    {city.displayName}
                  </div>
                )}
              </div>
              {city.type && city.type !== "city" && city.type !== "popular" && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary/80 shrink-0">
                  {city.type}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {open && query.length >= 2 && !loading && results.length === 0 && (
        <div className="absolute mt-1 w-full bg-background border border-border rounded-xl shadow-2xl p-3 text-center text-sm text-muted-foreground" style={{ zIndex: 9999 }}>
          No cities found for "{query}"
        </div>
      )}
    </div>
  );
}
