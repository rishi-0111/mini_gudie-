/**
 * Animated Gradient Background
 * Creates a beautiful animated gradient that continuously shifts
 */

import { useEffect, useRef } from "react";

interface AnimatedGradientProps {
  className?: string;
  duration?: number;
  pauseOnHover?: boolean;
}

export const AnimatedGradientBackground: React.FC<AnimatedGradientProps> = ({
  className = "",
  duration = 15,
  pauseOnHover = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create animated style
    const style = document.createElement("style");
    style.textContent = `
      @keyframes gradientShift {
        0% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
        100% {
          background-position: 0% 50%;
        }
      }

      .animated-gradient {
        background: linear-gradient(
          -45deg,
          #7c3aed,
          #a78bfa,
          #e879f9,
          #7c3aed
        );
        background-size: 400% 400%;
        animation: gradientShift ${duration}s ease infinite;
      }

      .animated-gradient.paused {
        animation-play-state: paused;
      }
    `;
    document.head.appendChild(style);

    container.classList.add("animated-gradient");

    if (pauseOnHover) {
      container.addEventListener("mouseenter", () => {
        container.classList.add("paused");
      });
      container.addEventListener("mouseleave", () => {
        container.classList.remove("paused");
      });
    }

    return () => {
      style.remove();
      container.classList.remove("animated-gradient", "paused");
    };
  }, [duration, pauseOnHover]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 -z-10 ${className}`}
      style={{ pointerEvents: "none" }}
    />
  );
};

export default AnimatedGradientBackground;
