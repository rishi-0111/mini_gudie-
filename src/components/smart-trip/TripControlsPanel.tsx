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
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
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
  actualDuration?: number;
  distanceLoading?: boolean;
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

function formatOSMTime(mins: number): string {
  const m = Math.round(mins);
  if (m < 60) return `${m}m`;
  const hrs = Math.floor(m / 60);
  const remMins = m % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
}

export default function TripControlsPanel({ values, onChange, flightAvailable, actualDistance, actualDuration, distanceLoading }: TripControlsPanelProps) {

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panelRef.current) return;
    const els = panelRef.current.querySelectorAll(".ctrl-section");
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!prefersReduced) {
      // gsap.from reads the current CSS value as destination — elements are always
      // visible by default and only animate FROM the hidden state, never get stuck.
      gsap.from(els, {
        y: 24, opacity: 0, stagger: 0.07, duration: 0.45, ease: "power3.out",
        clearProps: "all",   // clean up inline styles after animation finishes
      });
    }
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
  const displayDistance = actualDistance ?? values.distance;
  const hasBothCities = values.fromCity.trim().length >= 2 && values.toCity.trim().length >= 2;
  const distanceKnown = actualDistance != null;

  // Auto-recommend transport based on distance
  const autoRecommended = useMemo(() => {
    if (displayDistance < 10) return "walk";
    if (displayDistance < 100) return "bus";
    if (displayDistance < 500) return "train";
    return "flight";
  }, [displayDistance]);

  return (
    <div ref={panelRef} className="space-y-5">
      {/* From / To — can be scrolled, dropdown closes on scroll */}
      <div className="ctrl-section grid grid-cols-[1fr,auto,1fr] gap-2 items-end relative">
        <CityAutocomplete
          value={values.fromCity}
          onChange={(city) => set({
            fromCity: city?.name || "",
            fromLat: city?.lat || 0,
            fromLng: city?.lon || 0
          })}
          placeholder="Current Location"
          icon={<MapPin className="w-3 h-3" />}
          label="From"
        />

        <button
          onClick={() => set({
            fromCity: values.toCity,
            fromLat: values.toLat,
            fromLng: values.toLng,
            toCity: values.fromCity,
            toLat: values.fromLat,
            toLng: values.fromLng
          })}
          className="mb-1 w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-colors shadow-sm"
          title="Swap locations"
        >
          <Compass className="w-4 h-4 rotate-45" />
        </button>

        <CityAutocomplete
          value={values.toCity}
          onChange={(city) => set({
            toCity: city?.name || "",
            toLat: city?.lat || 0,
            toLng: city?.lon || 0
          })}
          placeholder="e.g. Jaipur"
          icon={<Compass className="w-3 h-3" />}
          label="To"
        />
      </div>

      {/* Live distance indicator */}
      {hasBothCities && (
        <div className="ctrl-section flex items-center gap-2 px-1">
          {distanceLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-3 h-3 border-2 border-primary/50 border-t-primary rounded-full animate-spin" />
              Calculating road distance & checking options...
            </div>
          ) : distanceKnown ? (
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <MapPin className="w-3 h-3" />
              {values.fromCity} → {values.toCity}: {Math.round(actualDistance!)} km
              {flightAvailable === true && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-semibold">
                  ✈️ Flights available
                </span>
              )}
            </div>
          ) : null}
        </div>
      )}


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
                className={`w-7 h-7 transition-colors ${s <= values.rating
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
          {distanceKnown && (
            <span className="ml-2 text-primary font-semibold">
              ({Math.round(displayDistance)} km)
            </span>
          )}
        </label>
        {/* Transport mode grid — auto-sizes to 4 or 5 columns, never wraps/overlaps */}
        <div className={`grid gap-2 ${TRANSPORT_MODES.filter((m) => m.id !== "flight" || flightAvailable === true).length <= 4
          ? "grid-cols-4"
          : "grid-cols-5"
          }`}>
          {TRANSPORT_MODES
            .filter((m) => m.id !== "flight" || flightAvailable === true)
            .map((m) => (
              <TransportBtn
                key={m.id}
                icon={m.icon}
                label={m.label}
                speed={m.speed}
                distance={displayDistance}
                osmDuration={m.id === "auto" || m.id === "bus" ? actualDuration : undefined}
                active={values.transportMode === m.id}
                recommended={autoRecommended === m.id && values.transportMode === "auto"}
                showDuration={distanceKnown}
                onClick={() => set({ transportMode: m.id })}
              />
            ))}
        </div>
        {/* Duration callout for selected mode */}
        {values.transportMode !== "auto" && distanceKnown && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>
              {Math.round(displayDistance)} km by {values.transportMode} ≈{" "}
              <strong className="text-foreground">
                {values.transportMode === "bus" && actualDuration
                  ? formatOSMTime(actualDuration)
                  : formatDuration(
                    displayDistance,
                    TRANSPORT_MODES.find((m) => m.id === values.transportMode)?.speed || 60
                  )
                }
              </strong>
            </span>
          </div>
        )}
        {values.transportMode === "auto" && distanceKnown && actualDuration && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>
              {Math.round(displayDistance)} km by road ≈{" "}
              <strong className="text-foreground text-primary">
                {formatOSMTime(actualDuration)}
              </strong>
            </span>
          </div>
        )}
        {values.transportMode !== "auto" && !distanceKnown && hasBothCities && distanceLoading && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 border-2 border-muted-foreground/40 border-t-primary rounded-full animate-spin" />
            Calculating travel time...
          </div>
        )}
        {!hasBothCities && (
          <div className="mt-2 text-xs text-muted-foreground/60 italic">
            Enter From & To cities to see travel times
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
          className={`relative w-12 h-6 rounded-full transition-colors ${values.hiddenGems ? "bg-primary" : "bg-muted"
            }`}
        >
          <div
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${values.hiddenGems ? "translate-x-6" : "translate-x-0.5"
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
  osmDuration,
  active,
  recommended,
  showDuration = true,
  onClick,
}: {
  icon: string;
  label: string;
  speed: number;
  distance: number;
  osmDuration?: number;
  active: boolean;
  recommended: boolean;
  showDuration?: boolean;
  onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const dur = osmDuration ? formatOSMTime(osmDuration) : speed > 0 ? formatDuration(distance, speed) : "AI";

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
        className={`w-full flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border transition-all ${active
          ? "bg-primary/15 border-primary shadow-md shadow-primary/20"
          : "bg-muted/30 border-border hover:bg-muted/60"
          }`}
      >
        <span className="text-xl leading-none">{icon}</span>
        <span className={`text-[11px] font-semibold leading-tight ${active ? "text-primary" : "text-foreground"
          }`}>
          {label}
        </span>
        {/* Duration badge — always readable */}
        <span className={`text-[10px] font-medium leading-tight ${active ? "text-primary/90" : "text-muted-foreground"
          }`}>
          {showDuration ? dur : "—"}
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
