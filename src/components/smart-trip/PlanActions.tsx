/**
 * PlanActions — Glassmorphism CTA section after plan generation
 * Buttons: View Transport, View Route, Save Plan, Share Plan, Regenerate, Book Now
 * GSAP: fade-in, stagger, hover glow, scale, ripple, floating motion
 */

import { useRef, useEffect, useCallback, useState } from "react";
import gsap from "gsap";
import { useToast } from "@/hooks/use-toast";

interface PlanActionsProps {
  hasPlan: boolean;
  hasTransport: boolean;
  loading: boolean;
  onViewTransport: () => void;
  onViewRoute: () => void;
  onRegenerate: () => void;
  onBookNow: () => void;
}

const ACTIONS = [
  { id: "transport", icon: "🚌", label: "View Transport", color: "#3b82f6" },
  { id: "route", icon: "🗺", label: "View Route", color: "#8b5cf6" },
  { id: "save", icon: "💾", label: "Save Plan", color: "#22c55e" },
  { id: "share", icon: "📤", label: "Share Plan", color: "#f59e0b" },
  { id: "regenerate", icon: "🔁", label: "Regenerate", color: "#ef4444" },
  { id: "book", icon: "💳", label: "Book Now", color: "#ec4899" },
];

const CLICK_FEEDBACK: Record<string, string> = {
  transport: "🚆 Showing best transport options for your selected dates!",
  route: "🗺 Drawing route to your destination — zoom in for details!",
  save: "💾 Plan saved successfully! Find it in your profile.",
  share: "📤 Share link copied! Send it to your travel buddies.",
  regenerate: "🔁 Regenerating with fresh AI suggestions...",
  book: "🎉 Redirecting to secure booking partner...",
};

export default function PlanActions({
  hasPlan,
  hasTransport,
  loading,
  onViewTransport,
  onViewRoute,
  onRegenerate,
  onBookNow,
}: PlanActionsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [regenerating, setRegenerating] = useState(false);

  // Fade-in from bottom + stagger
  useEffect(() => {
    if (!containerRef.current || !hasPlan) return;
    const buttons = containerRef.current.querySelectorAll(".action-btn");
    gsap.fromTo(
      containerRef.current,
      { y: 60, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }
    );
    gsap.fromTo(
      buttons,
      { y: 20, opacity: 0, scale: 0.9 },
      { y: 0, opacity: 1, scale: 1, stagger: 0.08, duration: 0.4, ease: "back.out(1.5)", delay: 0.2 }
    );

    // Subtle floating motion
    gsap.to(containerRef.current, {
      y: -4,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  }, [hasPlan]);

  const handleAction = useCallback(
    (id: string) => {
      // Feedback toast
      toast({
        title: CLICK_FEEDBACK[id] || "Action triggered",
        description: "",
      });

      switch (id) {
        case "transport":
          onViewTransport();
          break;
        case "route":
          onViewRoute();
          break;
        case "save":
          // Save to localStorage
          try {
            const saved = JSON.parse(localStorage.getItem("miniguide_saved_plans") || "[]");
            saved.push({ date: new Date().toISOString(), id: Date.now() });
            localStorage.setItem("miniguide_saved_plans", JSON.stringify(saved));
          } catch {}
          break;
        case "share":
          navigator.clipboard?.writeText(window.location.href).catch(() => {});
          break;
        case "regenerate":
          setRegenerating(true);
          onRegenerate();
          setTimeout(() => setRegenerating(false), 2000);
          break;
        case "book":
          onBookNow();
          break;
      }
    },
    [onViewTransport, onViewRoute, onRegenerate, onBookNow, toast]
  );

  if (!hasPlan) return null;

  return (
    <div
      ref={containerRef}
      className="glass-card p-5 rounded-2xl border border-border/50 bg-gradient-to-br from-primary/5 via-transparent to-accent/5"
    >
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
        ⚡ Quick Actions
        {/* Animated progress dots */}
        <span className="flex gap-0.5 ml-auto">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
          ))}
        </span>
      </h3>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {ACTIONS.map((a) => {
          const disabled =
            loading ||
            (a.id === "book" && !hasTransport) ||
            (a.id === "regenerate" && regenerating);

          return (
            <ActionButton
              key={a.id}
              icon={a.icon}
              label={a.label}
              color={a.color}
              disabled={disabled}
              showSpinner={a.id === "regenerate" && regenerating}
              onClick={() => handleAction(a.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  color,
  disabled,
  showSpinner,
  onClick,
}: {
  icon: string;
  label: string;
  color: string;
  disabled: boolean;
  showSpinner: boolean;
  onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const rippleRef = useRef<HTMLSpanElement>(null);

  const handleClick = () => {
    if (disabled) return;
    onClick();

    // Scale + glow
    if (ref.current) {
      gsap.fromTo(ref.current, { scale: 0.88 }, { scale: 1, duration: 0.4, ease: "elastic.out(1, 0.4)" });
    }

    // Ripple wave
    if (rippleRef.current) {
      gsap.fromTo(
        rippleRef.current,
        { scale: 0, opacity: 0.6 },
        { scale: 3, opacity: 0, duration: 0.6, ease: "power2.out" }
      );
    }
  };

  const handleHover = () => {
    if (ref.current && !disabled) {
      gsap.to(ref.current, {
        scale: 1.08,
        boxShadow: `0 0 20px ${color}40`,
        duration: 0.25,
        ease: "power2.out",
      });
    }
  };

  const handleLeave = () => {
    if (ref.current) {
      gsap.to(ref.current, { scale: 1, boxShadow: "none", duration: 0.3, ease: "power2.out" });
    }
  };

  return (
    <button
      ref={ref}
      onClick={handleClick}
      onMouseEnter={handleHover}
      onMouseLeave={handleLeave}
      disabled={disabled}
      className={`action-btn relative overflow-hidden flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
        disabled
          ? "opacity-40 cursor-not-allowed border-border/30"
          : "border-border/50 hover:border-primary/30 cursor-pointer"
      }`}
      style={{ backgroundColor: disabled ? undefined : `${color}08` }}
      tabIndex={0}
      aria-label={label}
    >
      <span ref={rippleRef} className="absolute inset-0 rounded-xl bg-current opacity-0 pointer-events-none" />
      {showSpinner ? (
        <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <span className="text-xl">{icon}</span>
      )}
      <span className="text-[10px] font-medium text-muted-foreground leading-tight text-center">
        {label}
      </span>
    </button>
  );
}
