/**
 * PlanPreview — Shows the generated trip:
 *  - Overview banner
 *  - Day-wise plan with time slots
 *  - Hidden gems
 *  - Budget breakdown
 *  - Devotional places
 *  - Stays / Hostels
 *  - Food options within budget
 */

import { useRef, useEffect } from "react";
import gsap from "gsap";
import type { SmartTripPlan, DevotionalPlace, StayOption, FoodOption } from "@/hooks/useSmartTrip";

interface PlanPreviewProps {
  plan: SmartTripPlan;
  onEdit: () => void;
  devotionalPlaces?: DevotionalPlace[];
  stays?: StayOption[];
  foods?: FoodOption[];
}

export default function PlanPreview({ plan, onEdit, devotionalPlaces, stays, foods }: PlanPreviewProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const sections = ref.current.querySelectorAll(".plan-section");
    gsap.fromTo(
      sections,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.1, duration: 0.5, ease: "power3.out" }
    );
  }, [plan]);

  const trip = plan.plan;
  const dayPlans = trip?.dayWisePlan || [];
  const hidden = trip?.hiddenSpots || [];
  const bb = plan.budgetBreakdown;
  const crowd = plan.crowd;

  return (
    <div ref={ref} className="space-y-4">
      {/* Overview banner */}
      <div className="plan-section glass-card p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-bold text-lg">
              {plan.meta.from} → {plan.meta.to}
            </h3>
            <p className="text-xs text-muted-foreground">
              {plan.meta.days} days • {plan.meta.persons} person{plan.meta.persons > 1 ? "s" : ""} • {plan.distanceEmoji} {plan.distance} km
            </p>
          </div>
          <button
            onClick={onEdit}
            className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 transition"
          >
            ✏️ Edit
          </button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">
            {plan.budgetEmoji} {plan.budgetLabel}
          </span>
          <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">
            {plan.distanceEmoji} {plan.distanceLabel}
          </span>
          {crowd && (
            <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">
              {crowd.crowd_level === "low" ? "🟢" : crowd.crowd_level === "medium" ? "🟡" : "🔴"}{" "}
              {crowd.crowd_level} crowd
            </span>
          )}
        </div>
      </div>

      {/* Day-wise plan */}
      {dayPlans.map((day: any) => (
        <div key={day.day} className="plan-section glass-card p-4 rounded-2xl">
          <h4 className="font-semibold text-sm mb-3">
            📅 Day {day.day}
            <span className="text-xs text-muted-foreground ml-2">
              ₹{day.dayCost?.toLocaleString("en-IN") || "—"} • {day.travelDistance}km travel
            </span>
          </h4>
          <div className="space-y-2">
            <TimeSlot emoji="🌅" label="Morning" slot={day.morning} />
            <TimeSlot emoji="☀️" label="Afternoon" slot={day.afternoon} />
            <TimeSlot emoji="🌙" label="Evening" slot={day.evening} />
          </div>
        </div>
      ))}

      {/* Hidden gems */}
      {hidden.length > 0 && (
        <div className="plan-section glass-card p-4 rounded-2xl">
          <h4 className="font-semibold text-sm mb-3">🔮 Hidden Gems</h4>
          <div className="space-y-2">
            {hidden.map((h: any, i: number) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">✨</span>
                <div>
                  <div className="font-medium">{h.name}</div>
                  <div className="text-xs text-muted-foreground">{h.whySpecial} • {h.distance}km</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Devotional Places */}
      {devotionalPlaces && devotionalPlaces.length > 0 && (
        <div className="plan-section glass-card p-4 rounded-2xl">
          <h4 className="font-semibold text-sm mb-3">🛕 Devotional Places</h4>
          <div className="space-y-2.5">
            {devotionalPlaces.slice(0, 5).map((p, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-lg mt-0.5">🕉</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">⭐ {p.rating}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.type} • {p.distance_km}km • {p.timings}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      p.crowd_prediction === "low" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : p.crowd_prediction === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}>
                      {p.crowd_prediction === "low" ? "🟢" : p.crowd_prediction === "medium" ? "🟡" : "🔴"} {p.crowd_prediction}
                    </span>
                    {p.entry_fee > 0 && (
                      <span className="text-xs text-muted-foreground">₹{p.entry_fee} entry</span>
                    )}
                  </div>
                  {p.festivals && p.festivals.length > 0 && (
                    <div className="text-xs text-primary/80 mt-0.5">🎉 {p.festivals.join(", ")}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stays / Hostels */}
      {stays && stays.length > 0 && (
        <div className="plan-section glass-card p-4 rounded-2xl">
          <h4 className="font-semibold text-sm mb-3">🏨 Stays & Hostels</h4>
          <div className="space-y-2.5">
            {stays.slice(0, 4).map((s, i) => (
              <div key={i} className={`flex items-start gap-2 p-2 rounded-xl ${
                s.withinBudget ? "bg-green-50/50 dark:bg-green-900/10" : "bg-red-50/50 dark:bg-red-900/10"
              }`}>
                <span className="text-lg mt-0.5">
                  {s.type === "Dharamshala" ? "🛕" : s.type === "Hostel" ? "🏠" : "🏨"}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className={`text-sm font-bold ${s.withinBudget ? "text-green-600" : "text-red-500"}`}>
                      ₹{s.pricePerNight}/night
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.type} • ⭐ {s.rating} • {s.distance_km}km away
                  </div>
                  {s.amenities && s.amenities.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {s.amenities.slice(0, 4).map((a, j) => (
                        <span key={j} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/70">{a}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Food within Budget */}
      {foods && foods.length > 0 && (
        <div className="plan-section glass-card p-4 rounded-2xl">
          <h4 className="font-semibold text-sm mb-3">🍽 Food Options</h4>
          <div className="space-y-2">
            {foods.slice(0, 5).map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-lg">{f.isVeg ? "🥗" : "🍗"}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{f.name}</span>
                    <span className={`text-xs font-medium ${f.withinBudget ? "text-green-600" : "text-red-500"}`}>
                      {f.priceRange}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {f.cuisine} • ⭐ {f.rating} • {f.distance_km}km
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budget breakdown */}
      <div className="plan-section glass-card p-4 rounded-2xl">
        <h4 className="font-semibold text-sm mb-3">💰 Budget Breakdown</h4>
        <div className="space-y-1.5">
          <BudgetRow emoji="🚌" label="Transport" value={bb.transport} total={bb.total} />
          <BudgetRow emoji="🏨" label="Stay" value={bb.stay} total={bb.total} />
          <BudgetRow emoji="🍽" label="Food" value={bb.food} total={bb.total} />
          <BudgetRow emoji="🎯" label="Activities" value={bb.activities} total={bb.total} />
          <BudgetRow emoji="🛡" label="Buffer" value={bb.buffer} total={bb.total} />
          <div className="border-t border-border pt-1 flex justify-between font-bold text-sm">
            <span>Total</span>
            <span>₹{bb.total.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimeSlot({ emoji, label, slot }: { emoji: string; label: string; slot: any }) {
  if (!slot) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <span>{emoji}</span>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="font-medium">{slot.place || slot.activity}</span>
          {slot.cost > 0 && (
            <span className="text-xs text-muted-foreground">₹{slot.cost}</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">{slot.description || slot.time}</div>
      </div>
    </div>
  );
}

function BudgetRow({
  emoji,
  label,
  value,
  total,
}: {
  emoji: string;
  label: string;
  value: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span>{emoji}</span>
      <span className="w-20">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium w-16 text-right">
        ₹{value.toLocaleString("en-IN")}
      </span>
    </div>
  );
}
