/**
 * useNominatimAutocomplete
 * Provides Nominatim search suggestions as user types.
 * All Overpass fetching lives in Explore.tsx (single source of truth).
 */
import { useState, useRef, useCallback, useEffect } from "react";

export interface NominatimSuggestion {
    displayName: string;
    shortName: string;
    lat: number;
    lon: number;
}

const UA = "MiniGudie/1.0";

export function useNominatimAutocomplete() {
    const [suggestions, setSuggestions] = useState<NominatimSuggestion[]>([]);
    const [open, setOpen] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout>>();

    const search = useCallback((q: string) => {
        clearTimeout(timerRef.current);
        abortRef.current?.abort();
        if (q.length < 2) { setSuggestions([]); setOpen(false); return; }

        timerRef.current = setTimeout(async () => {
            abortRef.current = new AbortController();
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1&accept-language=en`,
                    { headers: { "User-Agent": UA }, signal: abortRef.current.signal }
                );
                const data = await res.json();
                const results: NominatimSuggestion[] = data.map((item: any) => ({
                    displayName: item.display_name,
                    shortName:
                        item.address?.city ||
                        item.address?.town ||
                        item.address?.village ||
                        item.address?.county ||
                        item.display_name.split(",")[0],
                    lat: parseFloat(item.lat),
                    lon: parseFloat(item.lon),
                }));
                setSuggestions(results);
                setOpen(results.length > 0);
            } catch { /* AbortError or network */ }
        }, 300);
    }, []);

    const close = useCallback(() => setOpen(false), []);

    useEffect(() => () => {
        clearTimeout(timerRef.current);
        abortRef.current?.abort();
    }, []);

    return { suggestions, open, search, close };
}

// ── Helpers re-exported so Explore.tsx can use them ──────────────────────────

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
}

export function formatDist(km: number): string {
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

/** Deterministic hash — no Math.random() ever */
export function hashStr(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}
