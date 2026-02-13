/**
 * TripControlsPanel — All trip input controls:
 *  Budget slider (input+drag), days, date picker (no past), persons,
 *  rating 1-5 stars, distance slider w/ duration, transport mode w/ duration/distance,
 *  hidden gems toggle (ML vs training data)
 */

import { useRef, useEffect, useMemo } from "react";
import gsap from "gsap";
import { Calendar, Star, Users, MapPin, Compass, Eye, Clock } from "lucide-react";
import BudgetSlider from "./BudgetSlider";
import DistanceSlider from "./DistanceSlider";
import CityAutocomplete from "./CityAutocomplete";

export interface TripInputs {
  fromCity: string;
  toCity: string;
  budget: number;
  days: number;
  date: string;
  persons: number;
  rating: number;
  distance: number;
  transportMode: string;
  hiddenGems: boolean;
}

interface TripControlsPanelProps {
  values: TripInputs;
  onChange: (v: TripInputs) => void;
  flightAvailable?: boolean;
  actualDistance?: number;
}

const TRANSPORT_MODES = [
  { id: "walk", icon: "🚶", label: "Walk", speed: 5, maxKm: 20 },
  { id: "bus", icon: "🚌", label: "Bus", speed: 45, maxKm: 1500 },
  { id: "train", icon: "🚆", label: "Train", speed: 60, maxKm: 3000 },
  { id: "flight", icon: "✈️", label: "Flight", speed: 500, maxKm: 99999 },
  { id: "auto", icon: "🤖", label: "Auto", speed: 0, maxKm: 99999 },
];

function formatDuration(km: number, speed: number): string {
  if (speed <= 0) return "AI picks";
  const mins = Math.round((km / speed) * 60);
  if (mins < 60) return `~${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}

export default function TripControlsPanel({ values, onChange, flightAvailable, actualDistance }: TripControlsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panelRef.current) return;
    const els = panelRef.current.querySelectorAll(".ctrl-section");
    gsap.fromTo(
      els,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.08, duration: 0.5, ease: "power3.out" }
    );
  }, []);

  const set = (partial: Partial<TripInputs>) => onChange({ ...values, ...partial });

  // Today in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];

  // Dynamic pricing message
  const dateObj = values.date ? new Date(values.date) : null;
  const isWeekend = dateObj ? dateObj.getDay() === 0 || dateObj.getDay() === 6 : false;
  const pricingMsg = isWeekend ? "📈 Weekend pricing — 15-20% higher" : dateObj ? "✅ Weekday — best rates!" : "";

  // Estimated cost per person per day
  const estPerPersonDay = Math.round(values.budget / Math.max(1, values.persons) / Math.max(1, values.days));

  // Use actual distance from API when available, otherwise the slider value
  const displayDistance = actualDistance || values.distance;

  // Auto-recommend transport based on distance
  const autoRecommended = useMemo(() => {
    if (displayDistance < 10) return "walk";
    if (displayDistance < 100) return "bus";
    if (displayDistance < 500) return "train";
    return "flight";
  }, [displayDistance]);

  return (
    <div ref={panelRef} className="space-y-5">
      {/* From / To — high z-index so dropdown overlays below sections */}
      <div className="ctrl-section grid grid-cols-2 gap-3 relative" style={{ zIndex: 50 }}>
        <CityAutocomplete
          value={values.fromCity}
          onChange={(v) => set({ fromCity: v })}
          placeholder="Current Location"
          icon={<MapPin className="w-3 h-3" />}
          label="From"
        />
        <CityAutocomplete
          value={values.toCity}
          onChange={(v) => set({ toCity: v })}
          placeholder="e.g. Jaipur"
          icon={<Compass className="w-3 h-3" />}
          label="To"
        />
      </div>

      {/* Budget Slider (input + drag) */}
      <div className="ctrl-section glass-card p-4 rounded-2xl relative" style={{ zIndex: 1 }}>
        <BudgetSlider
          value={values.budget}
          onChange={(v) => set({ budget: v })}
          persons={values.persons}
        />
      </div>

      {/* Days + Date */}
      <div className="ctrl-section grid grid-cols-2 gap-3">
        <div className="glass-card p-4 rounded-2xl">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            📅 Days
          </label>
          <div className="flex items-center gap-3">
            <button
              className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold hover:bg-primary/20 transition"
              onClick={() => set({ days: Math.max(1, values.days - 1) })}
            >
              −
            </button>
            <span className="text-xl font-bold w-8 text-center">{values.days}</span>
            <button
              className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold hover:bg-primary/20 transition"
              onClick={() => set({ days: Math.min(14, values.days + 1) })}
            >
              +
            </button>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            ~₹{estPerPersonDay.toLocaleString("en-IN")}/person/day
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
            <Calendar className="w-3 h-3" /> Date
          </label>
          <input
            type="date"
            min={today}
            className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.date}
            onChange={(e) => set({ date: e.target.value })}
          />
          {pricingMsg && (
            <div className="text-xs mt-1 font-medium" style={{ color: isWeekend ? "#f59e0b" : "#22c55e" }}>
              {pricingMsg}
            </div>
          )}
        </div>
      </div>

      {/* Persons */}
      <div className="ctrl-section glass-card p-4 rounded-2xl">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
          <Users className="w-3 h-3" /> Number of Persons
        </label>
        <div className="flex items-center gap-3">
          <button
            className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold hover:bg-primary/20 transition"
            onClick={() => set({ persons: Math.max(1, values.persons - 1) })}
          >
            −
          </button>
          <span className="text-xl font-bold w-8 text-center">{values.persons}</span>
          <button
            className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold hover:bg-primary/20 transition"
            onClick={() => set({ persons: Math.min(20, values.persons + 1) })}
          >
            +
          </button>
          <span className="text-xs text-muted-foreground ml-2">
            ₹{Math.round(values.budget / Math.max(1, values.persons)).toLocaleString("en-IN")} per person
          </span>
        </div>
      </div>

      {/* Rating */}
      <div className="ctrl-section glass-card p-4 rounded-2xl">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
          <Star className="w-3 h-3" /> Minimum Rating
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => set({ rating: s })}
              className="transition-transform hover:scale-125"
            >
              <Star
                className={`w-7 h-7 transition-colors ${
                  s <= values.rating
                    ? "fill-amber-400 text-amber-400"
                    : "fill-none text-muted-foreground/40"
                }`}
              />
            </button>
          ))}
          <span className="ml-3 text-sm font-medium">{values.rating}+ stars</span>
        </div>
      </div>

      {/* Distance */}
      <div className="ctrl-section glass-card p-4 rounded-2xl">
        <DistanceSlider
          value={values.distance}
          onChange={(v) => set({ distance: v })}
        />
        {actualDistance != null && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-primary font-medium">
            <MapPin className="w-3 h-3" />
            Actual distance: {Math.round(actualDistance)} km
            {actualDistance > values.distance && (
              <span className="text-amber-500 ml-1">(route is longer than max slider)</span>
            )}
          </div>
        )}
      </div>

      {/* Transport Mode — with duration/distance display */}
      <div className="ctrl-section glass-card p-4 rounded-2xl">
        <label className="text-xs font-medium text-muted-foreground mb-3 block">
          🚀 Mode of Transport
        </label>
        <div className="flex gap-2 flex-wrap">
          {TRANSPORT_MODES
            .filter((m) => m.id !== "flight" || flightAvailable !== false)
            .map((m) => (
            <TransportBtn
              key={m.id}
              icon={m.icon}
              label={m.label}
              speed={m.speed}
              distance={displayDistance}
              active={values.transportMode === m.id}
              recommended={autoRecommended === m.id && values.transportMode === "auto"}
              onClick={() => set({ transportMode: m.id })}
            />
          ))}
        </div>
        {/* Duration callout for selected mode */}
        {values.transportMode !== "auto" && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>
              {Math.round(displayDistance)} km by {values.transportMode} ≈{" "}
              <strong className="text-foreground">
                {formatDuration(
                  displayDistance,
                  TRANSPORT_MODES.find((m) => m.id === values.transportMode)?.speed || 60
                )}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Hidden Gems Toggle */}
      <div className="ctrl-section glass-card p-4 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          <div>
            <div className="text-sm font-medium">Hidden Gems Mode</div>
            <div className="text-xs text-muted-foreground">
              {values.hiddenGems
                ? "🔮 Uses ML model — undiscovered spots"
                : "📊 Uses curated training data"}
            </div>
          </div>
        </div>
        <button
          onClick={() => set({ hiddenGems: !values.hiddenGems })}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            values.hiddenGems ? "bg-primary" : "bg-muted"
          }`}
        >
          <div
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              values.hiddenGems ? "translate-x-6" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

function TransportBtn({
  icon,
  label,
  speed,
  distance,
  active,
  recommended,
  onClick,
}: {
  icon: string;
  label: string;
  speed: number;
  distance: number;
  active: boolean;
  recommended: boolean;
  onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const dur = speed > 0 ? formatDuration(distance, speed) : "AI";

  const handleClick = () => {
    onClick();
    if (ref.current) {
      gsap.fromTo(ref.current, { scale: 0.85 }, { scale: 1, duration: 0.4, ease: "elastic.out(1, 0.4)" });
    }
  };

  const handleHover = () => {
    if (ref.current) {
      gsap.to(ref.current, { y: -3, duration: 0.2, ease: "power2.out" });
    }
  };
  const handleLeave = () => {
    if (ref.current) {
      gsap.to(ref.current, { y: 0, duration: 0.3, ease: "power2.out" });
    }
  };

  return (
    <div className="relative">
      <button
        ref={ref}
        onClick={handleClick}
        onMouseEnter={handleHover}
        onMouseLeave={handleLeave}
        className={`flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl border transition-all ${
          active
            ? "bg-primary/15 border-primary shadow-md shadow-primary/20"
            : "bg-muted/30 border-border hover:bg-muted/60"
        }`}
      >
        <span className="text-xl">{icon}</span>
        <span className={`text-xs font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
          {label}
        </span>
        {/* Duration/distance badge */}
        <span className={`text-[10px] leading-tight ${active ? "text-primary/80" : "text-muted-foreground/60"}`}>
          {dur}
        </span>
      </button>
      {recommended && (
        <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-amber-400 text-black px-1 py-0.5 rounded-full font-bold">
          ★
        </span>
      )}
    </div>
  );
}
