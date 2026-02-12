import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import logo from "@/assets/logo.png";
import { ThreeScene, LazyGlobeScene } from "@/components/three/LazyThreeScenes";

const SplashScreen = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);
  const globeWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      // 1. Globe fades in with scale
      tl.fromTo(
        globeWrapperRef.current,
        { opacity: 0, scale: 0.6 },
        { opacity: 1, scale: 1, duration: 1.2, ease: "power2.out" }
      );

      // 2. Logo scales in with bounce
      tl.fromTo(
        logoRef.current,
        { opacity: 0, scale: 0, rotation: -15 },
        { opacity: 1, scale: 1, rotation: 0, duration: 0.9, ease: "back.out(1.7)" },
        "-=0.6"
      );

      // 3. Glow pulse
      tl.fromTo(
        glowRef.current,
        { opacity: 0, scale: 0.5 },
        { opacity: 1, scale: 1.5, duration: 1.2, ease: "power2.out" },
        "-=0.7"
      );

      // 4. Title letters stagger in
      if (titleRef.current) {
        const title = titleRef.current;
        const originalHTML = title.innerHTML;
        // Split text into spans
        title.innerHTML = originalHTML.replace(/(<span[^>]*>)(.*?)(<\/span>)/g, (_match, open, text, close) => {
          return open + text.split("").map((c: string) => `<span class="inline-block">${c === " " ? "&nbsp;" : c}</span>`).join("") + close;
        });
        // Also wrap the "Mini " part
        const textNodes = title.childNodes;
        const wrappedChars: HTMLElement[] = [];
        textNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE && node.textContent) {
            const frag = document.createDocumentFragment();
            node.textContent.split("").forEach((c) => {
              const span = document.createElement("span");
              span.className = "inline-block";
              span.innerHTML = c === " " ? "&nbsp;" : c;
              frag.appendChild(span);
              wrappedChars.push(span);
            });
            node.replaceWith(frag);
          }
        });

        const allChars = title.querySelectorAll(".inline-block");
        tl.fromTo(
          allChars,
          { opacity: 0, y: 30, rotationX: -90 },
          {
            opacity: 1,
            y: 0,
            rotationX: 0,
            duration: 0.5,
            stagger: 0.04,
            ease: "back.out(1.4)",
          },
          "-=0.4"
        );
      }

      // 5. Tagline slides up
      tl.fromTo(
        taglineRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.7 },
        "-=0.2"
      );

      // 6. Loading dots bounce in
      if (dotsRef.current) {
        tl.fromTo(
          dotsRef.current.children,
          { opacity: 0, scale: 0 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.4,
            stagger: 0.12,
            ease: "back.out(2)",
          },
          "-=0.3"
        );

        // Continuous dot animation
        gsap.to(dotsRef.current.children, {
          y: -6,
          duration: 0.5,
          stagger: { each: 0.15, repeat: -1, yoyo: true },
          ease: "power1.inOut",
          delay: 2,
        });
      }

      // 7. Exit animation before navigation
      const exitTl = gsap.timeline({ delay: 2.8 });
      exitTl.to(containerRef.current, {
        opacity: 0,
        scale: 1.1,
        duration: 0.5,
        ease: "power2.in",
        onComplete: () => navigate("/signup"),
      });
    }, containerRef);

    return () => ctx.revert();
  }, [navigate]);

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center p-6 overflow-hidden relative"
    >
      {/* Three.js Globe Background */}
      <div ref={globeWrapperRef} className="absolute inset-0 opacity-0">
        <ThreeScene className="absolute inset-0">
          <LazyGlobeScene />
        </ThreeScene>
      </div>

      {/* Background decorations with enhanced blur */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-primary-foreground/5 animate-float" />
        <div className="absolute bottom-32 right-8 w-24 h-24 rounded-full bg-primary-foreground/5 animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/3 right-20 w-16 h-16 rounded-full bg-primary-foreground/5 animate-float" style={{ animationDelay: "0.5s" }} />
      </div>

      {/* Logo */}
      <div ref={logoRef} className="relative z-10 opacity-0">
        <div className="relative">
          {/* Glow effect */}
          <div
            ref={glowRef}
            className="absolute inset-0 bg-primary-foreground/20 blur-3xl rounded-full scale-150 opacity-0"
          />

          {/* Logo image */}
          <img
            src={logo}
            alt="Mini Guide Logo"
            className="w-48 h-48 md:w-56 md:h-56 object-cover relative z-10 drop-shadow-2xl rounded-full border-4 border-primary-foreground/20"
          />
        </div>
      </div>

      {/* App Name */}
      <div className="mt-8 text-center relative z-10">
        <h1
          ref={titleRef}
          className="text-4xl md:text-5xl font-bold text-primary-foreground tracking-tight"
        >
          Mini <span className="text-accent">Guide</span>
        </h1>

        <p
          ref={taglineRef}
          className="mt-4 text-primary-foreground/80 text-lg md:text-xl max-w-xs mx-auto opacity-0"
        >
          Your Smart Travel Companion
        </p>
      </div>

      {/* Loading indicator */}
      <div ref={dotsRef} className="mt-12 flex gap-2 relative z-10">
        <div className="w-2.5 h-2.5 rounded-full bg-primary-foreground/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-accent/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-primary-foreground/70" />
      </div>
    </div>
  );
};

export default SplashScreen;
