/**
 * MiniPlanPreview — Compact itinerary card with day-by-day summary
 */
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Clock, Wallet, Users, TrendingUp, MapPin, ArrowLeft } from "lucide-react";
import type { DevotionalItinerary } from "@/hooks/useDevotional";

interface Props {
  itinerary: DevotionalItinerary;
  onEdit: () => void;
}

const MiniPlanPreview = ({ itinerary, onEdit }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const sections = containerRef.current.querySelectorAll(".plan-section");
    gsap.fromTo(
      sections,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.1, duration: 0.5, ease: "power3.out" }
    );
  }, [itinerary]);

  const crowdEmoji = itinerary.crowdPrediction?.crowd_level === "low"
    ? "🟢" : itinerary.crowdPrediction?.crowd_level === "high" ? "🔴" : "🟡";

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Back */}
      <button onClick={onEdit} className="flex items-center gap-2 text-primary font-medium text-sm">
        <ArrowLeft className="w-4 h-4" /> Edit Plan
      </button>

      {/* Overview Card */}
      <div className="plan-section travel-card bg-gradient-to-br from-orange-600 to-amber-500 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              🛕 {itinerary.temple}
            </h2>
            <div className="flex items-center gap-4 mt-2 text-sm opacity-90">
              <span>{itinerary.days} days</span>
              <span>{itinerary.persons} persons</span>
              <span className="capitalize">{itinerary.travelMode}</span>
            </div>
            {itinerary.festivals.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {itinerary.festivals.map((f, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-white/20">
                    🔥 {f}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">₹{itinerary.totalCost.toLocaleString()}</p>
            <p className="text-xs opacity-80">Total estimated</p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="plan-section grid grid-cols-4 gap-2">
        {[
          { icon: <Wallet className="w-4 h-4" />, label: "Remaining", value: `₹${itinerary.budgetRemaining.toLocaleString()}`, color: itinerary.budgetRemaining > 0 ? "text-green-600" : "text-red-500" },
          { icon: <Clock className="w-4 h-4" />, label: "Travel", value: `${itinerary.estimatedTravelTime}h`, color: "text-blue-600" },
          { icon: <Users className="w-4 h-4" />, label: "Crowd", value: `${crowdEmoji} ${itinerary.crowdPrediction?.crowd_level ?? "N/A"}`, color: "" },
          { icon: <TrendingUp className="w-4 h-4" />, label: "Hidden", value: `${itinerary.hiddenSpots.length}`, color: "text-purple-600" },
        ].map((stat, i) => (
          <div key={i} className="travel-card p-3 text-center">
            <div className="flex justify-center mb-1 text-muted-foreground">{stat.icon}</div>
            <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Day-wise Plan */}
      {itinerary.dayPlans.map((day) => (
        <div key={day.day} className="plan-section travel-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-primary text-lg">Day {day.day}</h3>
            <span className="text-sm font-semibold text-primary">₹{day.dayCost.toLocaleString()}</span>
          </div>

          <div className="space-y-3">
            {/* Morning */}
            <div className="flex gap-3">
              <div className="w-14 h-14 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex flex-col items-center justify-center shrink-0">
                <span className="text-lg">🌅</span>
                <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">AM</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{day.morning.activity}</p>
                <p className="text-xs text-muted-foreground truncate">{day.morning.place}</p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  <span>{day.morning.time}</span>
                  {day.morning.crowdEmoji && <span>{day.morning.crowdEmoji}</span>}
                </div>
              </div>
            </div>

            {/* Lunch */}
            <div className="flex gap-3">
              <div className="w-14 h-14 rounded-xl bg-green-100 dark:bg-green-900/30 flex flex-col items-center justify-center shrink-0">
                <span className="text-lg">🍽</span>
                <span className="text-[10px] font-medium text-green-700 dark:text-green-400">Lunch</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{day.lunch.activity}</p>
                <p className="text-xs text-muted-foreground truncate">{day.lunch.place}</p>
                <p className="text-xs text-primary mt-0.5">₹{day.lunch.cost}</p>
              </div>
            </div>

            {/* Afternoon */}
            <div className="flex gap-3">
              <div className="w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex flex-col items-center justify-center shrink-0">
                <span className="text-lg">✨</span>
                <span className="text-[10px] font-medium text-blue-700 dark:text-blue-400">PM</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{day.afternoon.activity}</p>
                <p className="text-xs text-muted-foreground truncate">{day.afternoon.place}</p>
                <p className="text-xs text-primary mt-0.5">₹{day.afternoon.cost}</p>
              </div>
            </div>

            {/* Evening */}
            <div className="flex gap-3">
              <div className="w-14 h-14 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex flex-col items-center justify-center shrink-0">
                <span className="text-lg">🛕</span>
                <span className="text-[10px] font-medium text-purple-700 dark:text-purple-400">Eve</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{day.evening.activity}</p>
                <p className="text-xs text-muted-foreground truncate">{day.evening.place}</p>
                {day.evening.crowdEmoji && (
                  <span className="text-xs">{day.evening.crowdEmoji} {day.evening.crowdLevel}</span>
                )}
              </div>
            </div>

            {/* Stay */}
            <div className="flex gap-3">
              <div className="w-14 h-14 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex flex-col items-center justify-center shrink-0">
                <span className="text-lg">🏨</span>
                <span className="text-[10px] font-medium text-indigo-700 dark:text-indigo-400">Stay</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{day.stayCheckin.activity}</p>
                <p className="text-xs text-muted-foreground truncate">{day.stayCheckin.place}</p>
                <p className="text-xs text-primary mt-0.5">₹{day.stayCheckin.cost}</p>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Hidden Spots */}
      {itinerary.hiddenSpots.length > 0 && (
        <div className="plan-section travel-card">
          <h3 className="font-bold text-primary mb-3 flex items-center gap-2">
            ✨ Hidden Spots Nearby
          </h3>
          <div className="space-y-2">
            {itinerary.hiddenSpots.map((hs, i) => (
              <div key={i} className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <p className="font-semibold text-sm">{hs.name}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>⭐ Score: {hs.score}</span>
                  <span><MapPin className="w-3 h-3 inline" /> {hs.distance} km</span>
                  <span>🕐 {hs.bestTime}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budget Breakdown */}
      <div className="plan-section travel-card">
        <h3 className="font-bold text-primary mb-3 flex items-center gap-2">
          <Wallet className="w-4 h-4" /> Budget Breakdown
        </h3>
        <div className="space-y-2">
          {[
            { label: "🏨 Stay", value: itinerary.budgetBreakdown.stay },
            { label: "🍽 Food", value: itinerary.budgetBreakdown.food },
            { label: "🚗 Transport", value: itinerary.budgetBreakdown.transport },
            { label: "🎯 Activities", value: itinerary.budgetBreakdown.activities },
            { label: "🛡 Buffer", value: itinerary.budgetBreakdown.buffer },
          ].map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium">₹{item.value.toLocaleString()}</span>
            </div>
          ))}
          <div className="border-t pt-2 flex justify-between">
            <span className="font-bold text-primary">Total</span>
            <span className="font-bold text-primary text-lg">₹{itinerary.budgetBreakdown.total.toLocaleString()}</span>
          </div>
          {itinerary.budgetRemaining > 0 && (
            <p className="text-center text-sm text-green-600 font-medium">
              ✅ ₹{itinerary.budgetRemaining.toLocaleString()} remaining
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MiniPlanPreview;
