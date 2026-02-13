/**
 * GenerateButton — GSAP animated glow pulse button to generate trip plan
 */

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { Sparkles } from "lucide-react";

interface GenerateButtonProps {
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
}

export default function GenerateButton({ onClick, loading, disabled }: GenerateButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  // Glow pulse animation
  useEffect(() => {
    if (!glowRef.current || loading || disabled) return;
    const tl = gsap.timeline({ repeat: -1 });
    tl.to(glowRef.current, {
      boxShadow: "0 0 30px 8px rgba(139, 92, 246, 0.4)",
      duration: 1.2,
      ease: "sine.inOut",
    }).to(glowRef.current, {
      boxShadow: "0 0 10px 2px rgba(139, 92, 246, 0.1)",
      duration: 1.2,
      ease: "sine.inOut",
    });
    return () => { tl.kill(); };
  }, [loading, disabled]);

  const handleClick = () => {
    if (loading || disabled) return;
    onClick();
    if (btnRef.current) {
      // Ripple + scale
      gsap.fromTo(
        btnRef.current,
        { scale: 0.92 },
        { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.4)" }
      );
    }
  };

  const handleHover = () => {
    if (btnRef.current && !loading && !disabled) {
      gsap.to(btnRef.current, { scale: 1.04, duration: 0.2, ease: "power2.out" });
    }
  };
  const handleLeave = () => {
    if (btnRef.current) {
      gsap.to(btnRef.current, { scale: 1, duration: 0.3 });
    }
  };

  return (
    <div className="relative">
      {/* Glow layer */}
      <div ref={glowRef} className="absolute inset-0 rounded-2xl pointer-events-none" />

      <button
        ref={btnRef}
        onClick={handleClick}
        onMouseEnter={handleHover}
        onMouseLeave={handleLeave}
        disabled={loading || disabled}
        className={`w-full relative py-4 px-6 rounded-2xl font-bold text-white transition-all overflow-hidden ${
          loading || disabled
            ? "bg-muted cursor-not-allowed text-muted-foreground"
            : "bg-gradient-to-r from-primary via-purple-500 to-accent hover:shadow-lg cursor-pointer"
        }`}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating AI Plan...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Smart Trip ✨
            </>
          )}
        </span>
      </button>
    </div>
  );
}
