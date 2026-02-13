/**
 * FoodOptions — Restaurant/food cards with veg/budget indicators
 */
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Star, MapPin } from "lucide-react";
import type { FoodOption } from "@/hooks/useDevotional";

interface Props {
  foods: FoodOption[];
  loading: boolean;
  budget: number;
  foodTypeFilter: string;
  onFilterChange: (type: string) => void;
}

const foodTypes = [
  { id: "all", label: "All", emoji: "🍽" },
  { id: "veg", label: "Pure Veg", emoji: "🥬" },
  { id: "nonveg", label: "Non-Veg", emoji: "🍗" },
];

const FoodOptions = ({ foods, loading, budget, foodTypeFilter, onFilterChange }: Props) => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listRef.current || foods.length === 0) return;
    const items = listRef.current.querySelectorAll(".food-item");
    gsap.fromTo(
      items,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.06, duration: 0.4, ease: "power2.out" }
    );
  }, [foods]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          🍽 Food Options
        </h3>
        <span className="text-xs text-muted-foreground">Budget: ₹{budget}/meal</span>
      </div>

      {/* Type filter */}
      <div className="flex gap-2">
        {foodTypes.map((ft) => (
          <button
            key={ft.id}
            onClick={() => onFilterChange(ft.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              foodTypeFilter === ft.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-primary/10"
            }`}
          >
            {ft.emoji} {ft.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="travel-card animate-pulse">
              <div className="h-5 bg-secondary rounded w-1/2 mb-2" />
              <div className="h-4 bg-secondary rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      <div ref={listRef} className="grid grid-cols-1 gap-3">
        {foods.map((food) => (
          <div
            key={food.id}
            className={`food-item travel-card transition-all ${
              food.isVeg ? "border-l-4 border-l-green-500" : "border-l-4 border-l-red-400"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{food.vegEmoji}</span>
                  <h4 className="font-bold truncate">{food.name}</h4>
                  {food.budgetEmoji && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      {food.budgetEmoji} Budget
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-1">{food.specialty}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    {food.rating} {food.ratingEmoji}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {food.distance} km
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-secondary">
                    {food.foodType}
                  </span>
                </div>
              </div>
              <div className="text-right ml-3 shrink-0">
                <p className="text-sm font-bold text-primary">
                  ₹{food.priceLow}-{food.priceHigh}
                </p>
                <p className="text-xs text-muted-foreground">per meal</p>
              </div>
            </div>
          </div>
        ))}

        {!loading && foods.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <span className="text-3xl block mb-2">🍽</span>
            <p className="text-sm">No food options found nearby.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FoodOptions;
