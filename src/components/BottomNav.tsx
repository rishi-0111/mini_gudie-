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

  // Entrance animation — only if motion is OK
  useEffect(() => {
    if (!navRef.current) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      gsap.set(navRef.current, { opacity: 1, y: 0 });
      return;
    }
    gsap.fromTo(
      navRef.current,
      { y: 80, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55, delay: 0.6, ease: "power3.out" }
    );
  }, []);

  // Bounce the active item on route change
  useEffect(() => {
    const activeIndex = navItems.findIndex((item) => item.href === location.pathname);
    if (activeIndex !== -1 && itemRefs.current[activeIndex]) {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!prefersReduced) {
        gsap.fromTo(
          itemRefs.current[activeIndex],
          { scale: 0.88 },
          { scale: 1, duration: 0.35, ease: "back.out(2)" }
        );
      }
    }
  }, [location.pathname]); // eslint-disable-line

  const handleTap = useCallback((index: number) => {
    const el = itemRefs.current[index];
    if (!el) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!prefersReduced) {
      gsap.fromTo(el, { scale: 0.82 }, { scale: 1, duration: 0.4, ease: "elastic.out(1, 0.4)" });
    }
  }, []);

  return (
    <nav
      ref={navRef}
      data-bottom-nav
      className="
        fixed bottom-0 left-0 right-0
        bg-card/95 backdrop-blur-xl
        border-t border-border/60
        opacity-0
        z-[60]
      "
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-stretch justify-around max-w-lg mx-auto px-2 h-[4.5rem]">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              ref={(el) => { itemRefs.current[index] = el; }}
              onClick={() => handleTap(index)}
              className={`
                relative flex flex-col items-center justify-center gap-0.5
                flex-1 px-2 py-2 rounded-2xl mx-1 my-2
                transition-colors duration-200
                ${isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }
              `}
            >
              {/* Active fill indicator */}
              {isActive && (
                <span className="
                  absolute top-1.5 left-1/2 -translate-x-1/2
                  w-5 h-0.5 rounded-full bg-primary
                  animate-fade-in
                " />
              )}

              <item.icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
              <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
