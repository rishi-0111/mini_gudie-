/**
 * CityAutocomplete — Real-time place search powered by Google Maps JS API.
 * Uses Google Places AutocompleteService for live suggestions as user types.
 * Falls back to backend /search-cities if Google isn't available.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Loader2, Search, Navigation } from "lucide-react";

export interface CityResult {
  name: string;
  state: string;
  displayName: string;
  lat: number;
  lng: number;
  type: string;
  placeId?: string;
}

interface CityAutocompleteProps {
  value: string;
  onChange: (city: string, lat?: number, lng?: number) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  label?: string;
}

const API_BASE =
  import.meta.env.VITE_HIDDEN_GEM_API_URL || "http://localhost:8000";

// Popular picks shown when input is empty (on focus)
const POPULAR_CITIES = [
  "Delhi", "Mumbai", "Bangalore", "Jaipur", "Goa",
  "Varanasi", "Udaipur", "Agra", "Shimla", "Manali",
  "Rishikesh", "Kochi", "Mysuru", "Darjeeling", "Ooty",
  "Tirupati", "Pondicherry", "Kanyakumari", "Hampi", "Kodaikanal",
];

/** Check if Google Maps JS API is loaded */
function isGoogleMapsLoaded(): boolean {
  return (
    typeof google !== "undefined" &&
    typeof google.maps !== "undefined" &&
    typeof google.maps.places !== "undefined"
  );
}

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
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  // Initialize Google services when API loads
  useEffect(() => {
    const initGoogle = () => {
      if (isGoogleMapsLoaded()) {
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        geocoderRef.current = new google.maps.Geocoder();
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
      }
    };
    // Try immediately
    initGoogle();
    // Also retry after a short delay in case script loads after component mounts
    const timer = setTimeout(initGoogle, 1500);
    return () => clearTimeout(timer);
  }, []);

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

  // ── Google Places search ───────────────────────────────────────────────
  const searchWithGoogle = useCallback(
    (q: string): Promise<CityResult[]> => {
      return new Promise((resolve) => {
        const service = autocompleteServiceRef.current;
        if (!service) {
          resolve([]);
          return;
        }
        service.getPlacePredictions(
          {
            input: q,
            componentRestrictions: { country: "in" },
            types: ["(regions)"],
            sessionToken: sessionTokenRef.current ?? undefined,
          },
          (predictions, status) => {
            if (
              status !== google.maps.places.PlacesServiceStatus.OK ||
              !predictions
            ) {
              resolve([]);
              return;
            }
            const mapped: CityResult[] = predictions.slice(0, 8).map((p) => {
              // Parse structured formatting for clean name/state
              const mainText =
                p.structured_formatting?.main_text || p.description.split(",")[0];
              const secondaryText =
                p.structured_formatting?.secondary_text || "";
              // Extract state (usually last part before "India")
              const parts = secondaryText.split(",").map((s) => s.trim());
              const state =
                parts.find(
                  (s) =>
                    !s.toLowerCase().includes("india") && s.length > 1
                ) || "";

              return {
                name: mainText,
                state,
                displayName: p.description,
                lat: 0,
                lng: 0,
                type: "place",
                placeId: p.place_id,
              };
            });
            resolve(mapped);
          }
        );
      });
    },
    []
  );

  // ── Backend fallback search ────────────────────────────────────────────
  const searchWithBackend = useCallback(async (q: string): Promise<CityResult[]> => {
    try {
      const resp = await fetch(
        `${API_BASE}/search-cities?q=${encodeURIComponent(q)}&limit=10`
      );
      if (resp.ok) {
        const data = await resp.json();
        return data.results || [];
      }
    } catch {
      // silent
    }
    // Offline last resort: filter popular cities
    const lower = q.toLowerCase();
    return POPULAR_CITIES.filter((c) => c.toLowerCase().includes(lower)).map(
      (c) => ({ name: c, state: "", displayName: c, lat: 0, lng: 0, type: "city" })
    );
  }, []);

  // ── Combined search strategy ───────────────────────────────────────────
  const searchCities = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        // Prefer Google if available
        let items: CityResult[] = [];
        if (isGoogleMapsLoaded() && autocompleteServiceRef.current) {
          items = await searchWithGoogle(q);
        }
        // Fallback to backend if Google returned no results
        if (items.length === 0) {
          items = await searchWithBackend(q);
        }
        setResults(items);
      } finally {
        setLoading(false);
      }
    },
    [searchWithGoogle, searchWithBackend]
  );

  // ── Geocode a selected place (get lat/lng) ─────────────────────────────
  const geocodePlace = useCallback(
    (city: CityResult): Promise<{ lat: number; lng: number } | null> => {
      return new Promise((resolve) => {
        const geocoder = geocoderRef.current;
        if (!geocoder) {
          resolve(null);
          return;
        }
        // Use placeId for accuracy, fall back to address string
        const request: google.maps.GeocoderRequest = city.placeId
          ? { placeId: city.placeId }
          : { address: `${city.name}, India` };

        geocoder.geocode(request, (results, status) => {
          if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
            const loc = results[0].geometry.location;
            resolve({ lat: loc.lat(), lng: loc.lng() });
          } else {
            resolve(null);
          }
        });
        // Refresh session token after geocode (since user selected a result)
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
      });
    },
    []
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setOpen(true);

    // Fast debounce: 200ms for real-time feel
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCities(val), 200);
  };

  const handleSelect = async (city: CityResult) => {
    setQuery(city.name);
    setOpen(false);
    setResults([]);

    // If we already have lat/lng (from backend), use directly
    if (city.lat && city.lng) {
      onChange(city.name, city.lat, city.lng);
      return;
    }

    // Otherwise geocode via Google JS API
    const coords = await geocodePlace(city);
    if (coords) {
      onChange(city.name, coords.lat, coords.lng);
    } else {
      // Last resort: just pass name, backend will geocode
      onChange(city.name);
    }
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

  const googleReady = isGoogleMapsLoaded();

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

      {/* Dropdown — real-time results from Google Places / backend */}
      {open && results.length > 0 && (
        <div className="absolute mt-1 w-full bg-background border border-border rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-150" style={{ zIndex: 9999 }}>
          {results[0]?.type === "popular" && (
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium bg-muted/30">
              Popular destinations
            </div>
          )}
          {results[0]?.type !== "popular" && (
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium bg-muted/30 flex items-center gap-1">
              <Navigation className="w-2.5 h-2.5" />
              {googleReady ? "Google Places" : "Real-time places"}
            </div>
          )}
          {results.map((city, i) => (
            <button
              key={`${city.placeId || city.name}-${i}`}
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
              {city.type && city.type !== "city" && city.type !== "popular" && city.type !== "place" && (
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
          No places found for "{query}"
        </div>
      )}
    </div>
  );
}
