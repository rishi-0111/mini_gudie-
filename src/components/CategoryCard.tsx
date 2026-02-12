import { useRef, useCallback } from "react";
import { LucideIcon } from "lucide-react";
import gsap from "gsap";

interface CategoryCardProps {
  icon: LucideIcon;
  label: string;
  colorClass: string;
  delay?: number;
}

const CategoryCard = ({ icon: Icon, label, colorClass }: CategoryCardProps) => {
  const cardRef = useRef<HTMLButtonElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback(() => {
    if (cardRef.current && iconRef.current) {
      gsap.to(cardRef.current, {
        scale: 1.08,
        y: -4,
        duration: 0.3,
        ease: "power2.out",
      });
      gsap.to(iconRef.current, {
        rotation: 10,
        scale: 1.15,
        duration: 0.3,
        ease: "back.out(1.7)",
      });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (cardRef.current && iconRef.current) {
      gsap.to(cardRef.current, {
        scale: 1,
        y: 0,
        duration: 0.4,
        ease: "elastic.out(1, 0.5)",
      });
      gsap.to(iconRef.current, {
        rotation: 0,
        scale: 1,
        duration: 0.4,
        ease: "elastic.out(1, 0.5)",
      });
    }
  }, []);

  const handleClick = useCallback(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { scale: 0.92 },
        { scale: 1, duration: 0.4, ease: "elastic.out(1, 0.4)" }
      );
    }
  }, []);

  return (
    <button
      ref={cardRef}
      className="category-pill"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div
        ref={iconRef}
        className={`w-12 h-12 rounded-xl ${colorClass} flex items-center justify-center`}
      >
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </button>
  );
};

export default CategoryCard;
