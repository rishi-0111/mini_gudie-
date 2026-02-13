/**
 * DevotionalPlaces — Interactive cards + filter panel for devotional places
 */
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Star, MapPin, Clock, Users } from "lucide-react";
import type { DevotionalPlace } from "@/hooks/useDevotional";

interface Props {
  places: DevotionalPlace[];
  loading: boolean;
  onSelectPlace: (place: DevotionalPlace) => void;
  filters: {
    rating: number;
    distance: number;
    crowd: string;
  };
  onFilterChange: (key: string, value: string | number) => void;
}

const crowdOptions = [
  { id: "all", label: "All", emoji: "👥" },
  { id: "low", label: "Low", emoji: "🟢" },
  { id: "medium", label: "Medium", emoji: "🟡" },
  { id: "high", label: "High", emoji: "🔴" },
];

const DevotionalPlaces = ({ places, loading, onSelectPlace, filters, onFilterChange }: Props) => {
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cardsRef.current || places.length === 0) return;
    const cards = cardsRef.current.querySelectorAll(".dev-card");
    gsap.fromTo(
      cards,
      { y: 30, opacity: 0, scale: 0.95 },
      { y: 0, opacity: 1, scale: 1, stagger: 0.08, duration: 0.5, ease: "power3.out" }
    );
  }, [places]);

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="glass-card p-4 space-y-3">
        <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
          <span>🛕</span> Filter Devotional Places
        </h3>

        {/* Crowd Filter */}
        <div className="flex gap-2">
          {crowdOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onFilterChange("crowd", opt.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filters.crowd === opt.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-primary/10"
              }`}
            >
              {opt.emoji} {opt.label}
            </button>
          ))}
        </div>

        {/* Rating Filter */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Min Rating:</span>
          <div className="flex gap-1">
            {[3, 3.5, 4, 4.5].map((r) => (
              <button
                key={r}
                onClick={() => onFilterChange("rating", r)}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                  filters.rating === r
                    ? "bg-amber-500 text-white"
                    : "bg-secondary text-muted-foreground hover:bg-amber-100"
                }`}
              >
                {r}⭐
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="travel-card animate-pulse">
              <div className="h-5 bg-secondary rounded w-2/3 mb-2" />
              <div className="h-4 bg-secondary rounded w-1/2 mb-2" />
              <div className="h-3 bg-secondary rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {/* Place Cards */}
      <div ref={cardsRef} className="space-y-3">
        {places.map((place) => (
          <button
            key={place.id}
            onClick={() => onSelectPlace(place)}
            className="dev-card w-full text-left travel-card hover:ring-2 hover:ring-primary/40 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{place.templeEmoji}</span>
                  <h4 className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {place.name}
                  </h4>
                  {place.hasFestival && (
                    <span className="text-sm" title="Festival active">
                      {place.festivalEmoji}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {place.description}
                </p>

                {/* Tags Row */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 text-amber-600">
                    <Star className="w-3 h-3 fill-amber-500" />
                    {place.rating}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {place.distance} km
                  </span>
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
                    place.crowdLevel === "low"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : place.crowdLevel === "medium"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}>
                    <Users className="w-3 h-3" />
                    {place.crowdEmoji} {place.crowdLevel}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {place.timings.open} - {place.timings.close}
                  </span>
                </div>

                {/* Festivals */}
                {place.festivals.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {place.festivals.map((f, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                      >
                        🔥 {f}
                      </span>
                    ))}
                  </div>
                )}

                {/* Entry Fee */}
                {place.entryFee.indian > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    🎟 Entry: ₹{place.entryFee.indian} (Indian) / ₹{place.entryFee.foreigner} (Foreign)
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}

        {!loading && places.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <span className="text-4xl block mb-2">🛕</span>
            <p className="text-sm">No devotional places found. Try adjusting filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DevotionalPlaces;
