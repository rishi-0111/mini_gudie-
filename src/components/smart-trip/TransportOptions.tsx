/**
 * TransportOptions — Animated cards for Bus/Train/Flight options
 * GSAP stagger animation, emoji indicators, smart rules
 */

import { useRef, useEffect } from "react";
import gsap from "gsap";
import type {
  BusOption,
  TrainOption,
  FlightOption,
  TransportData,
} from "@/hooks/useSmartTrip";

interface TransportOptionsProps {
  data: TransportData | null;
  budget: number;
  persons: number;
  distance: number;
  loading: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function TransportOptions({
  data,
  budget,
  persons,
  distance,
  loading,
  activeTab,
  onTabChange,
}: TransportOptionsProps) {
  const cardsRef = useRef<HTMLDivElement>(null);

  // GSAP stagger animation when data changes
  useEffect(() => {
    if (!cardsRef.current) return;
    const cards = cardsRef.current.querySelectorAll(".transport-card");
    if (cards.length === 0) return;
    gsap.fromTo(
      cards,
      { y: 40, opacity: 0, scale: 0.95 },
      { y: 0, opacity: 1, scale: 1, stagger: 0.1, duration: 0.5, ease: "power3.out" }
    );
  }, [data, activeTab]);

  if (!data) return null;

  const tabs = [
    { id: "bus", icon: "🚌", label: "Bus", count: data.buses.length, show: distance < 1500 },
    { id: "train", icon: "🚆", label: "Train", count: data.trains.length, show: distance < 3000 },
    {
      id: "flight",
      icon: "✈",
      label: "Flight",
      count: data.flights.length,
      show: data.flightAvailable,
      badge: distance > 500 ? "✈ Recommended" : undefined,
    },
  ].filter((t) => t.show);

  return (
    <div className="space-y-4">
      {/* Tab buttons */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <TabButton
            key={t.id}
            icon={t.icon}
            label={t.label}
            count={t.count}
            active={activeTab === t.id}
            badge={t.badge}
            onClick={() => onTabChange(t.id)}
          />
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-sm text-muted-foreground">Finding best options...</span>
        </div>
      )}

      {/* Cards */}
      <div ref={cardsRef} className="space-y-3">
        {activeTab === "bus" && data.buses.map((b, i) => <BusCard key={i} bus={b} />)}
        {activeTab === "train" && data.trains.map((t, i) => <TrainCard key={i} train={t} />)}
        {activeTab === "flight" &&
          data.flights.map((f, i) => <FlightCard key={i} flight={f} budget={budget / persons} />)}

        {/* Empty state */}
        {activeTab === "bus" && data.buses.length === 0 && !loading && (
          <EmptyState mode="bus" distance={distance} />
        )}
        {activeTab === "train" && data.trains.length === 0 && !loading && (
          <EmptyState mode="train" distance={distance} />
        )}
        {activeTab === "flight" && data.flights.length === 0 && !loading && (
          <EmptyState mode="flight" distance={distance} />
        )}
      </div>
    </div>
  );
}

// ── Tab Button with GSAP ────────────────────────────────────────────────────

function TabButton({
  icon,
  label,
  count,
  active,
  badge,
  onClick,
}: {
  icon: string;
  label: string;
  count: number;
  active: boolean;
  badge?: string;
  onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    onClick();
    if (ref.current) {
      gsap.fromTo(ref.current, { scale: 0.9 }, { scale: 1, duration: 0.35, ease: "elastic.out(1, 0.5)" });
    }
  };

  return (
    <div className="relative">
      <button
        ref={ref}
        onClick={handleClick}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
          active
            ? "bg-primary/15 border-primary shadow-md"
            : "bg-muted/30 border-border hover:bg-muted/60"
        }`}
      >
        <span className="text-lg">{icon}</span>
        <span className={`text-sm font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
          {label}
        </span>
        <span
          className={`text-xs px-1.5 py-0.5 rounded-full ${
            active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {count}
        </span>
      </button>
      {badge && (
        <span className="absolute -top-2 -right-2 text-[10px] bg-amber-400 text-black px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">
          {badge}
        </span>
      )}
    </div>
  );
}

// ── Bus Card ────────────────────────────────────────────────────────────────

function BusCard({ bus }: { bus: BusOption }) {
  return (
    <div
      className={`transport-card glass-card p-4 rounded-2xl border transition-all hover:shadow-md ${
        bus.withinBudget ? "border-green-300/50" : "border-red-300/50"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{bus.comfortEmoji}</span>
            <span className="font-semibold text-sm">{bus.operator}</span>
          </div>
          <div className="text-xs text-muted-foreground">{bus.busType} • {bus.busNumber}</div>
        </div>
        <div className="text-right">
          <div className="font-bold text-lg">₹{bus.ticketPrice.toLocaleString("en-IN")}</div>
          <div className="text-xs text-muted-foreground">/person</div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div>
          <div className="font-medium">{bus.departureTime}</div>
          <div className="text-xs text-muted-foreground">{bus.from}</div>
        </div>
        <div className="flex-1 flex items-center gap-1">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground px-1">{bus.duration}</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="text-right">
          <div className="font-medium">{bus.arrivalTime}</div>
          <div className="text-xs text-muted-foreground">{bus.to}</div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span>{bus.distance} km</span>
        <span>⭐ {bus.rating}</span>
        <span className={bus.seatsAvailable > 0 ? "text-green-500" : "text-red-500"}>
          {bus.seatsAvailable > 0 ? `${bus.seatsAvailable} seats` : "Sold out"}
        </span>
      </div>
    </div>
  );
}

// ── Train Card ──────────────────────────────────────────────────────────────

function TrainCard({ train }: { train: TrainOption }) {
  return (
    <div className="transport-card glass-card p-4 rounded-2xl border border-border/50 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-semibold text-sm">🚆 {train.trainName}</div>
          <div className="text-xs text-muted-foreground">#{train.trainNumber}</div>
        </div>
        <div className="text-right">
          <div className="font-bold text-lg">₹{train.cheapestPrice.toLocaleString("en-IN")}</div>
          <div className="text-xs text-muted-foreground">{train.cheapestClass} class</div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div>
          <div className="font-medium">{train.departureTime}</div>
          <div className="text-xs text-muted-foreground">{train.from}</div>
        </div>
        <div className="flex-1 flex items-center gap-1">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground px-1">{train.duration}</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="text-right">
          <div className="font-medium">{train.arrivalTime}</div>
          <div className="text-xs text-muted-foreground">{train.to}</div>
        </div>
      </div>
      {/* Class pills */}
      <div className="mt-2 flex gap-1.5 flex-wrap">
        {train.classes.map((c) => (
          <span
            key={c.code}
            className={`text-xs px-2 py-0.5 rounded-full ${
              c.withinBudget
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
            }`}
          >
            {c.emoji} {c.code} ₹{c.price}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Flight Card ─────────────────────────────────────────────────────────────

function FlightCard({ flight, budget }: { flight: FlightOption; budget: number }) {
  const overBudget = budget > 0 && flight.ticketPrice > budget;
  return (
    <div
      className={`transport-card glass-card p-4 rounded-2xl border transition-all hover:shadow-md ${
        overBudget ? "border-red-300/50 opacity-70" : "border-border/50"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-semibold text-sm">✈ {flight.airline}</div>
          <div className="text-xs text-muted-foreground">
            {flight.flightNumber} • {flight.fromAirport}→{flight.toAirport}
          </div>
        </div>
        <div className="text-right">
          <div className={`font-bold text-lg ${overBudget ? "text-red-500" : ""}`}>
            ₹{flight.ticketPrice.toLocaleString("en-IN")}
          </div>
          {overBudget && <div className="text-xs text-red-500">Budget exceeded 💸</div>}
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div>
          <div className="font-medium">{flight.departureTime}</div>
          <div className="text-xs text-muted-foreground">{flight.from}</div>
        </div>
        <div className="flex-1 flex items-center gap-1">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground px-1">{flight.duration}</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="text-right">
          <div className="font-medium">{flight.arrivalTime}</div>
          <div className="text-xs text-muted-foreground">{flight.to}</div>
        </div>
      </div>
    </div>
  );
}

// ── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ mode, distance }: { mode: string; distance: number }) {
  const msgs: Record<string, string> = {
    bus: distance > 1500 ? "🚌 Bus routes not available for 1500+ km" : "No bus options found",
    train: distance > 3000 ? "🚆 Trains not available for 3000+ km" : "No train options found",
    flight: "✈ No flights available on this route",
  };
  return (
    <div className="text-center py-8 text-muted-foreground">
      <div className="text-4xl mb-2">{mode === "bus" ? "🚌" : mode === "train" ? "🚆" : "✈"}</div>
      <div className="text-sm">{msgs[mode]}</div>
    </div>
  );
}
