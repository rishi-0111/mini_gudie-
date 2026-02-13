import { useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Map, Calendar, User } from "lucide-react";
import gsap from "gsap";
import { useLanguage } from "@/contexts/LanguageContext";

const BottomNav = () => {
  const location = useLocation();
  const { t } = useLanguage();
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const navItems = [
    { icon: Home, label: t.home, href: "/home" },
    { icon: Map, label: t.explore, href: "/explore" },
    { icon: Calendar, label: t.trips, href: "/smart-trip" },
    { icon: User, label: t.profile, href: "/profile" },
  ];

  // Entrance animation
  useEffect(() => {
    if (navRef.current) {
      gsap.fromTo(
        navRef.current,
        { y: 80, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, delay: 0.8, ease: "power3.out" }
      );
    }
  }, []);

  // Animate active indicator on route change
  useEffect(() => {
    const activeIndex = navItems.findIndex((item) => item.href === location.pathname);
    if (activeIndex !== -1 && itemRefs.current[activeIndex]) {
      gsap.fromTo(
        itemRefs.current[activeIndex],
        { scale: 0.9 },
        { scale: 1, duration: 0.3, ease: "back.out(2)" }
      );
    }
  }, [location.pathname]);

  const handleTap = useCallback((index: number) => {
    const el = itemRefs.current[index];
    if (el) {
      gsap.fromTo(el, { scale: 0.85 }, { scale: 1, duration: 0.4, ease: "elastic.out(1, 0.4)" });
    }
  }, []);

  return (
    <nav ref={navRef} className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-3 glass opacity-0">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              ref={(el) => { itemRefs.current[index] = el; }}
              onClick={() => handleTap(index)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors duration-200 ${isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <item.icon className={`w-6 h-6 transition-transform ${isActive ? "scale-110" : ""}`} />
              <span className="text-xs font-medium">{item.label}</span>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
