import { useRef, useEffect, useState, useCallback } from "react";
import gsap from "gsap";
import { Sun, Moon } from "lucide-react";

const STORAGE_KEY = "miniguide_theme";

function getInitialDark(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

const DarkModeToggle = () => {
  const [isDark, setIsDark] = useState(getInitialDark);

  const trackRef = useRef<HTMLButtonElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<HTMLDivElement>(null);
  const moonRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);

  // Apply class on mount
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggle = useCallback(() => {
    const next = !isDark;
    setIsDark(next);

    // Apply to <html>
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");

    // GSAP thumb slide
    gsap.to(thumbRef.current, {
      x: next ? 28 : 0,
      duration: 0.4,
      ease: "back.out(1.7)",
    });

    // Sun animation
    gsap.to(sunRef.current, {
      scale: next ? 0 : 1,
      rotation: next ? -90 : 0,
      opacity: next ? 0 : 1,
      duration: 0.4,
      ease: "power2.inOut",
    });

    // Moon animation
    gsap.to(moonRef.current, {
      scale: next ? 1 : 0,
      rotation: next ? 0 : 90,
      opacity: next ? 1 : 0,
      duration: 0.4,
      ease: "power2.inOut",
    });

    // Stars twinkle in/out
    if (starsRef.current) {
      gsap.to(starsRef.current.children, {
        scale: next ? 1 : 0,
        opacity: next ? 1 : 0,
        duration: 0.3,
        stagger: 0.05,
        ease: "back.out(2)",
      });
    }

    // Track background pulse
    gsap.fromTo(
      trackRef.current,
      { scale: 0.95 },
      { scale: 1, duration: 0.3, ease: "elastic.out(1, 0.5)" }
    );
  }, [isDark]);

  // Set initial positions without animation
  useEffect(() => {
    gsap.set(thumbRef.current, { x: isDark ? 28 : 0 });
    gsap.set(sunRef.current, {
      scale: isDark ? 0 : 1,
      rotation: isDark ? -90 : 0,
      opacity: isDark ? 0 : 1,
    });
    gsap.set(moonRef.current, {
      scale: isDark ? 1 : 0,
      rotation: isDark ? 0 : 90,
      opacity: isDark ? 1 : 0,
    });
    if (starsRef.current) {
      gsap.set(starsRef.current.children, {
        scale: isDark ? 1 : 0,
        opacity: isDark ? 0.8 : 0,
      });
    }
  }, []);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          {isDark ? (
            <Moon className="w-5 h-5 text-primary" />
          ) : (
            <Sun className="w-5 h-5 text-primary" />
          )}
        </div>
        <div>
          <h3 className="font-semibold">Dark Mode</h3>
          <p className="text-sm text-muted-foreground">
            {isDark ? "On" : "Off"}
          </p>
        </div>
      </div>

      {/* Toggle Track */}
      <button
        ref={trackRef}
        onClick={toggle}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className={`relative w-16 h-9 rounded-full transition-colors duration-300 ${
          isDark
            ? "bg-indigo-900"
            : "bg-amber-100"
        }`}
      >
        {/* Stars (visible in dark mode) */}
        <div ref={starsRef} className="absolute inset-0 pointer-events-none">
          <span className="absolute top-1.5 left-2 w-1 h-1 rounded-full bg-white" />
          <span className="absolute top-3 left-5 w-0.5 h-0.5 rounded-full bg-white/80" />
          <span className="absolute bottom-2 left-3 w-0.5 h-0.5 rounded-full bg-white/60" />
        </div>

        {/* Thumb */}
        <div
          ref={thumbRef}
          className={`absolute top-1 left-1 w-7 h-7 rounded-full shadow-md flex items-center justify-center transition-colors duration-300 ${
            isDark ? "bg-indigo-200" : "bg-amber-400"
          }`}
        >
          {/* Sun icon inside thumb */}
          <div ref={sunRef} className="absolute">
            <Sun className="w-4 h-4 text-amber-700" />
          </div>
          {/* Moon icon inside thumb */}
          <div ref={moonRef} className="absolute">
            <Moon className="w-4 h-4 text-indigo-800" />
          </div>
        </div>
      </button>
    </div>
  );
};

export default DarkModeToggle;
