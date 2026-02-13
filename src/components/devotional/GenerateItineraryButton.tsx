/**
 * GenerateItineraryButton — Animated GSAP button with glow, scale, ripple
 */
import { useRef, useEffect, useCallback } from "react";
import gsap from "gsap";

interface Props {
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
}

const GenerateItineraryButton = ({ onClick, loading, disabled }: Props) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const rippleRef = useRef<HTMLDivElement>(null);

  // Glow pulse animation
  useEffect(() => {
    if (!glowRef.current || loading || disabled) return;
    const anim = gsap.to(glowRef.current, {
      opacity: 0.6,
      scale: 1.05,
      duration: 1.2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
    return () => { anim.kill(); };
  }, [loading, disabled]);

  // Hover scale
  useEffect(() => {
    if (!btnRef.current || loading || disabled) return;
    const btn = btnRef.current;
    const onEnter = () => gsap.to(btn, { scale: 1.04, duration: 0.25, ease: "power2.out" });
    const onLeave = () => gsap.to(btn, { scale: 1, duration: 0.25, ease: "power2.out" });
    btn.addEventListener("mouseenter", onEnter);
    btn.addEventListener("mouseleave", onLeave);
    return () => {
      btn.removeEventListener("mouseenter", onEnter);
      btn.removeEventListener("mouseleave", onLeave);
    };
  }, [loading, disabled]);

  // Ripple on click
  const handleClick = useCallback(() => {
    if (disabled || loading) return;

    // Ripple wave
    if (rippleRef.current) {
      gsap.fromTo(
        rippleRef.current,
        { scale: 0, opacity: 0.5 },
        { scale: 2.5, opacity: 0, duration: 0.6, ease: "power2.out" }
      );
    }

    // Button press
    if (btnRef.current) {
      gsap.to(btnRef.current, {
        scale: 0.95,
        duration: 0.1,
        ease: "power2.in",
        onComplete: () => {
          gsap.to(btnRef.current, { scale: 1, duration: 0.2, ease: "back.out(2)" });
        },
      });
    }

    onClick();
  }, [onClick, disabled, loading]);

  return (
    <div className="relative w-full">
      {/* Glow effect */}
      <div
        ref={glowRef}
        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 blur-lg opacity-40"
        style={{ pointerEvents: "none" }}
      />

      {/* Button */}
      <button
        ref={btnRef}
        onClick={handleClick}
        disabled={disabled || loading}
        className="relative w-full py-4 px-6 rounded-2xl font-bold text-lg
          bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600
          text-white shadow-lg
          disabled:opacity-50 disabled:cursor-not-allowed
          overflow-hidden transition-shadow
          hover:shadow-xl hover:shadow-orange-500/25
          active:shadow-md"
      >
        {/* Ripple container */}
        <div
          ref={rippleRef}
          className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-white/30"
          style={{ pointerEvents: "none", opacity: 0 }}
        />

        <span className="relative z-10 flex items-center justify-center gap-3">
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Generating Itinerary...
            </>
          ) : (
            <>
              <span className="text-xl">🧭</span>
              Generate Itinerary
            </>
          )}
        </span>
      </button>
    </div>
  );
};

export default GenerateItineraryButton;
