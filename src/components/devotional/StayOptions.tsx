/**
 * StayOptions — Budget-based stay cards with emoji indicators
 */
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Star, MapPin } from "lucide-react";
import type { StayOption } from "@/hooks/useDevotional";

interface Props {
  stays: StayOption[];
  loading: boolean;
  budget: number;
  persons: number;
  days: number;
}

const StayOptions = ({ stays, loading, budget, persons, days }: Props) => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listRef.current || stays.length === 0) return;
    const items = listRef.current.querySelectorAll(".stay-item");
    gsap.fromTo(
      items,
      { x: -20, opacity: 0 },
      { x: 0, opacity: 1, stagger: 0.06, duration: 0.4, ease: "power2.out" }
    );
  }, [stays]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="travel-card animate-pulse">
            <div className="h-5 bg-secondary rounded w-1/2 mb-2" />
            <div className="h-4 bg-secondary rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (stays.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <span className="text-3xl block mb-2">🏨</span>
        <p className="text-sm">No stays found within budget.</p>
        <p className="text-xs mt-1">Try increasing your budget or search radius.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          🏨 Stay Options
        </h3>
        <span className="text-xs text-muted-foreground">
          Budget: ₹{budget.toLocaleString()} • {persons}p • {days}d
        </span>
      </div>

      <div ref={listRef} className="space-y-3">
        {stays.map((stay) => (
          <div
            key={stay.id}
            className={`stay-item travel-card transition-all ${
              stay.withinBudget
                ? "border-l-4 border-l-green-500"
                : "border-l-4 border-l-red-400 opacity-75"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{stay.typeEmoji}</span>
                  <h4 className="font-bold truncate">{stay.name}</h4>
                  {stay.foodEmoji && <span title="Food included">{stay.foodEmoji}</span>}
                  {stay.acEmoji && <span title="AC available">{stay.acEmoji}</span>}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    {stay.rating}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {stay.distance} km
                  </span>
                  {stay.templeDistance > 0 && (
                    <span>🛕 {stay.templeDistance} km from temple</span>
                  )}
                </div>

                {/* Amenities */}
                <div className="flex flex-wrap gap-1">
                  {stay.amenities.map((a, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-right ml-3 shrink-0">
                <p className="text-lg font-bold text-primary">₹{stay.pricePerNight}</p>
                <p className="text-xs text-muted-foreground">/night</p>
                <p className="text-xs font-medium mt-1 text-foreground/70">
                  Total: ₹{stay.totalCost.toLocaleString()}
                </p>
                {stay.withinBudget ? (
                  <span className="text-xs text-green-600">✅ In budget</span>
                ) : (
                  <span className="text-xs text-red-500">⚠️ Over budget</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StayOptions;
