/**
 * BudgetSlider — GSAP wave-animated budget slider with TEXT INPUT + DRAG
 * Text input allows typing exact amount; slider allows drag; both stay in sync.
 * Emoji feedback: ₹500–1500 💸 | ₹1500–5000 🌍 | ₹5000+ ✨
 */

import { useRef, useEffect, useCallback, useState } from "react";
import gsap from "gsap";

interface BudgetSliderProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  persons?: number;
}

function getBudgetMeta(perPerson: number) {
  if (perPerson < 1500) return { emoji: "💸", label: "Budget Explorer", color: "#f59e0b" };
  if (perPerson < 5000) return { emoji: "🌍", label: "Smart Traveler", color: "#8b5cf6" };
  return { emoji: "✨", label: "Premium Escape", color: "#10b981" };
}

export default function BudgetSlider({
  value,
  onChange,
  min = 500,
  max = 50000,
  persons = 1,
}: BudgetSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [inputText, setInputText] = useState(String(value));
  const [editing, setEditing] = useState(false);

  const meta = getBudgetMeta(value / Math.max(1, persons));
  const pct = ((value - min) / (max - min)) * 100;

  // Sync input text when value changes from drag
  useEffect(() => {
    if (!editing) setInputText(String(value));
  }, [value, editing]);

  // GSAP wave animation on mount
  useEffect(() => {
    if (!waveRef.current) return;
    gsap.to(waveRef.current, {
      scaleY: 1.3,
      duration: 1.2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  }, []);

  // Thumb pulse
  useEffect(() => {
    if (!thumbRef.current) return;
    gsap.fromTo(
      thumbRef.current,
      { scale: 1 },
      { scale: 1.15, duration: 0.6, repeat: -1, yoyo: true, ease: "power1.inOut" }
    );
  }, []);

  // Label pop on value change
  useEffect(() => {
    if (!labelRef.current) return;
    gsap.fromTo(labelRef.current, { scale: 0.9 }, { scale: 1, duration: 0.2, ease: "back.out(2)" });
  }, [value]);

  const clamp = (v: number) => Math.max(min, Math.min(max, v));

  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const v = Math.round((min + x * (max - min)) / 100) * 100;
      onChange(clamp(v));
    },
    [min, max, onChange]
  );

  const handleDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const track = trackRef.current;
      if (!track) return;

      const move = (ev: PointerEvent) => {
        const rect = track.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
        const v = Math.round((min + x * (max - min)) / 100) * 100;
        onChange(clamp(v));
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

  // Text input handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value.replace(/[^0-9]/g, ""));
  };

  const commitInput = () => {
    setEditing(false);
    const n = parseInt(inputText, 10);
    if (!isNaN(n)) {
      const clamped = clamp(Math.round(n / 100) * 100);
      onChange(clamped);
      setInputText(String(clamped));
    } else {
      setInputText(String(value));
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      commitInput();
      inputRef.current?.blur();
    }
  };

  return (
    <div className="space-y-3">
      {/* Header: label + text input + emoji */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">💰 Budget</span>
        <div ref={labelRef} className="flex items-center gap-2">
          <span className="text-2xl">{meta.emoji}</span>
          <div className="text-right">
            {/* Editable text input */}
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold" style={{ color: meta.color }}>₹</span>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={inputText}
                onChange={handleInputChange}
                onFocus={() => setEditing(true)}
                onBlur={commitInput}
                onKeyDown={handleInputKeyDown}
                className="w-20 text-lg font-bold bg-transparent border-b-2 border-dashed outline-none text-right transition-colors focus:border-primary"
                style={{ color: meta.color, borderColor: editing ? undefined : `${meta.color}60` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">{meta.label}</div>
          </div>
        </div>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-3 rounded-full bg-muted cursor-pointer touch-none select-none"
        onClick={handleTrackClick}
      >
        {/* Wave fill */}
        <div
          ref={waveRef}
          className="absolute inset-y-0 left-0 rounded-full origin-left"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${meta.color}88, ${meta.color})`,
          }}
        />

        {/* Thumb */}
        <div
          ref={thumbRef}
          className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 border-white shadow-lg cursor-grab active:cursor-grabbing z-10"
          style={{ left: `calc(${pct}% - 12px)`, backgroundColor: meta.color }}
          onPointerDown={handleDrag}
        />
      </div>

      {/* Min/Max + quick preset buttons */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>₹{min.toLocaleString("en-IN")}</span>
        <div className="flex gap-1">
          {[1000, 3000, 5000, 10000, 25000].map((preset) => (
            <button
              key={preset}
              onClick={() => onChange(clamp(preset))}
              className={`px-2 py-0.5 rounded-full transition-all ${
                value === preset
                  ? "bg-primary/20 text-primary font-medium"
                  : "bg-muted/80 hover:bg-muted"
              }`}
            >
              {preset >= 1000 ? `${preset / 1000}k` : preset}
            </button>
          ))}
        </div>
        <span>₹{max.toLocaleString("en-IN")}</span>
      </div>
    </div>
  );
}
