import { useRef, useCallback, type ReactNode, type ButtonHTMLAttributes } from "react";

interface MagneticButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  circleColor?: string;
}

/**
 * Button with an inner circle that follows the cursor on hover.
 * Based on the circle-follow-mouse pattern — pure React, no GSAP needed.
 */
const MagneticButton = ({
  children,
  circleColor = "rgba(255,255,255,0.18)",
  className = "",
  ...props
}: MagneticButtonProps) => {
  const circleRef = useRef<HTMLSpanElement>(null);
  const btnRectRef = useRef<DOMRect | null>(null);

  const handleMouseEnter = useCallback(() => {
    // Cache rect on enter so we aren't calling getBoundingClientRect every frame
    btnRectRef.current =
      circleRef.current?.parentElement?.getBoundingClientRect() ?? null;
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!circleRef.current || !btnRectRef.current) return;
      const rect = btnRectRef.current;
      circleRef.current.style.top = `${e.clientY - rect.y}px`;
      circleRef.current.style.left = `${e.clientX - rect.x}px`;
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    if (!circleRef.current) return;
    // Reset to center so the next hover starts cleanly
    circleRef.current.style.top = "50%";
    circleRef.current.style.left = "50%";
  }, []);

  return (
    <button
      {...props}
      className={`magnetic-btn ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <span
        ref={circleRef}
        className="magnetic-btn__circle"
        style={{ background: circleColor }}
      />
      <span className="magnetic-btn__content">{children}</span>
    </button>
  );
};

export default MagneticButton;
