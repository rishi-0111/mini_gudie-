import { LucideIcon } from "lucide-react";

interface CategoryCardProps {
  icon: LucideIcon;
  label: string;
  colorClass: string;
  delay?: number;
}

const CategoryCard = ({ icon: Icon, label, colorClass, delay = 0 }: CategoryCardProps) => {
  return (
    <button
      className="category-pill animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, opacity: 0, animationFillMode: "forwards" }}
    >
      <div className={`w-12 h-12 rounded-xl ${colorClass} flex items-center justify-center`}>
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </button>
  );
};

export default CategoryCard;
