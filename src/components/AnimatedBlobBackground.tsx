/**
 * Animated Liquid Blob Background
 * Creates morphing liquid blob shapes using Three.js
 * Great for modern, sleek interfaces
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface AnimatedBlobBackgroundProps {
  className?: string;
  colors?: string[];
  speed?: number;
}

export const AnimatedBlobBackground: React.FC<AnimatedBlobBackgroundProps> = ({
  className = "",
  colors = ["#7c3aed", "#a78bfa", "#e879f9"],
  speed = 1,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create SVG canvas for blob animation
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 1200 1200");
    svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.position = "absolute";
    svg.style.inset = "0";
    svg.style.filter = "blur(40px)";

    // Create multiple blobs
    const blobs = [
      { cx: 300, cy: 300, r: 150, color: colors[0], delay: 0 },
      { cx: 900, cy: 300, r: 200, color: colors[1], delay: 2 },
      { cx: 600, cy: 900, r: 180, color: colors[2], delay: 4 },
    ];

    blobs.forEach((blob) => {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", blob.cx.toString());
      circle.setAttribute("cy", blob.cy.toString());
      circle.setAttribute("r", blob.r.toString());
      circle.setAttribute("fill", blob.color);
      circle.setAttribute("opacity", "0.7");

      // Create animation keyframes
      const animate = document.createElementNS("http://www.w3.org/2000/svg", "animate");
      animate.setAttribute("attributeName", "cy");
      animate.setAttribute("values", `${blob.cy}; ${blob.cy + 100}; ${blob.cy}`);
      animate.setAttribute("dur", `${8 / speed}s`);
      animate.setAttribute("repeatCount", "indefinite");
      animate.setAttribute("begin", `${blob.delay}s`);

      circle.appendChild(animate);
      svg.appendChild(circle);
    });

    containerRef.current.appendChild(svg);

    return () => {
      if (containerRef.current && svg.parentNode === containerRef.current) {
        containerRef.current.removeChild(svg);
      }
    };
  }, [colors, speed]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 -z-10 overflow-hidden backdrop-blur-3xl ${className}`}
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(124, 58, 237, 0.1) 0%, transparent 70%)",
        pointerEvents: "none",
      }}
    />
  );
};

export default AnimatedBlobBackground;
