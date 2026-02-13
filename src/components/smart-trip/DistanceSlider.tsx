/**
 * DistanceSlider — GSAP wave-style draggable distance selector
 * Emoji: <10km 🚶 | 10-50km 🚗 | 50-200km 🏞 | 200km+ ✈
 */

import { useRef, useEffect, useCallback } from "react";
import gsap from "gsap";

interface DistanceSliderProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}

function getDistMeta(km: number) {
  if (km < 10) return { emoji: "🚶", label: "Quick Escape", color: "#22c55e", speed: 5 };
  if (km < 50) return { emoji: "🚗", label: "Short Trip", color: "#3b82f6", speed: 50 };
  if (km < 200) return { emoji: "🏞", label: "Weekend Trip", color: "#8b5cf6", speed: 60 };
  return { emoji: "✈", label: "Adventure Mode", color: "#f59e0b", speed: 500 };
}

export default function DistanceSlider({ value, onChange, min = 1, max = 1000 }: DistanceSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  const meta = getDistMeta(value);
  const pct = ((value - min) / (max - min)) * 100;
  const durMin = Math.round((value / meta.speed) * 60);
  const durH = Math.floor(durMin / 60);
  const durM = durMin % 60;
  const durStr = durH > 0 ? `${durH}h ${durM}m` : `${durM}m`;

  useEffect(() => {
    if (!waveRef.current) return;
    gsap.to(waveRef.current, { scaleY: 1.4, duration: 1, repeat: -1, yoyo: true, ease: "sine.inOut" });
  }, []);

  useEffect(() => {
    if (!thumbRef.current) return;
    gsap.fromTo(thumbRef.current, { y: 0 }, { y: -3, duration: 0.8, repeat: -1, yoyo: true, ease: "sine.inOut" });
  }, []);

  const handleDrag = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const track = trackRef.current;
      if (!track) return;
      const move = (ev: PointerEvent) => {
        const rect = track.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
        const v = Math.round(min + x * (max - min));
        onChange(Math.max(min, Math.min(max, v)));
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [min, max, onChange]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const v = Math.round(min + x * (max - min));
      onChange(Math.max(min, Math.min(max, v)));
    },
    [min, max, onChange]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Distance</span>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{meta.emoji}</span>
          <div className="text-right">
            <div className="text-lg font-bold" style={{ color: meta.color }}>
              {value} km
            </div>
            <div className="text-xs text-muted-foreground">
              ~{durStr} • {meta.label}
            </div>
          </div>
        </div>
      </div>

      <div
        ref={trackRef}
        className="relative h-3 rounded-full bg-muted cursor-pointer touch-none select-none"
        onClick={handleClick}
      >
        <div
          ref={waveRef}
          className="absolute inset-y-0 left-0 rounded-full origin-left"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${meta.color}88, ${meta.color})` }}
        />
        <div
          ref={thumbRef}
          className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 border-white shadow-lg cursor-grab active:cursor-grabbing z-10"
          style={{ left: `calc(${pct}% - 12px)`, backgroundColor: meta.color }}
          onPointerDown={handleDrag}
        />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{min} km</span>
        <span>{max} km</span>
      </div>
    </div>
  );
}
