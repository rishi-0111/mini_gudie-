import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Fade-in animation with optional direction, triggered on mount or scroll.
 */
export function useGsapFadeIn(
  options: {
    direction?: "up" | "down" | "left" | "right" | "none";
    duration?: number;
    delay?: number;
    distance?: number;
    ease?: string;
    scrollTrigger?: boolean;
    scrub?: number | boolean;
  } = {}
) {
  const ref = useRef<HTMLDivElement>(null);
  const {
    direction = "up",
    duration = 0.8,
    delay = 0,
    distance = 40,
    ease = "power3.out",
    scrollTrigger = false,
    scrub = false,
  } = options;

  useEffect(() => {
    if (!ref.current) return;

    const fromVars: gsap.TweenVars = { opacity: 0 };
    if (direction === "up") fromVars.y = distance;
    else if (direction === "down") fromVars.y = -distance;
    else if (direction === "left") fromVars.x = distance;
    else if (direction === "right") fromVars.x = -distance;

    const toVars: gsap.TweenVars = {
      opacity: 1,
      x: 0,
      y: 0,
      duration,
      delay,
      ease,
    };

    if (scrollTrigger) {
      toVars.scrollTrigger = {
        trigger: ref.current,
        start: "top 90%",
        end: "bottom 30%",
        scrub: scrub || undefined,
        once: !scrub,
      };
    }

    gsap.fromTo(ref.current, fromVars, toVars);

    return () => {
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, [direction, duration, delay, distance, ease, scrollTrigger, scrub]);

  return ref;
}

/**
 * Stagger children animation — great for lists and grids.
 */
export function useGsapStagger(
  options: {
    stagger?: number;
    duration?: number;
    delay?: number;
    ease?: string;
    direction?: "up" | "down" | "left" | "right";
    distance?: number;
    scrollTrigger?: boolean;
    scrub?: number | boolean;
  } = {}
) {
  const ref = useRef<HTMLDivElement>(null);
  const {
    stagger = 0.1,
    duration = 0.6,
    delay = 0,
    ease = "power2.out",
    direction = "up",
    distance = 30,
    scrollTrigger = false,
    scrub = false,
  } = options;

  useEffect(() => {
    if (!ref.current) return;

    const children = ref.current.children;
    if (!children.length) return;

    const fromVars: gsap.TweenVars = { opacity: 0 };
    if (direction === "up") fromVars.y = distance;
    else if (direction === "down") fromVars.y = -distance;
    else if (direction === "left") fromVars.x = distance;
    else if (direction === "right") fromVars.x = -distance;

    const toVars: gsap.TweenVars = {
      opacity: 1,
      x: 0,
      y: 0,
      duration,
      delay,
      stagger,
      ease,
    };

    if (scrollTrigger) {
      toVars.scrollTrigger = {
        trigger: ref.current,
        start: "top 90%",
        end: "bottom 30%",
        scrub: scrub || undefined,
        once: !scrub,
      };
    }

    gsap.fromTo(children, fromVars, toVars);

    return () => {
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, [stagger, duration, delay, ease, direction, distance, scrollTrigger, scrub]);

  return ref;
}

/**
 * Scale-in bounce animation.
 */
export function useGsapScaleIn(
  options: {
    duration?: number;
    delay?: number;
    ease?: string;
    startScale?: number;
  } = {}
) {
  const ref = useRef<HTMLDivElement>(null);
  const {
    duration = 0.7,
    delay = 0,
    ease = "back.out(1.7)",
    startScale = 0.5,
  } = options;

  useEffect(() => {
    if (!ref.current) return;

    gsap.fromTo(
      ref.current,
      { opacity: 0, scale: startScale },
      { opacity: 1, scale: 1, duration, delay, ease }
    );
  }, [duration, delay, ease, startScale]);

  return ref;
}

/**
 * Create a GSAP timeline for complex sequenced animations.
 */
export function useGsapTimeline(options: { paused?: boolean } = {}) {
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    timelineRef.current = gsap.timeline({
      paused: options.paused ?? false,
    });

    return () => {
      timelineRef.current?.kill();
    };
  }, [options.paused]);

  return timelineRef;
}

/**
 * Magnetic hover effect — element gently follows cursor direction.
 */
export function useGsapMagnetic(strength: number = 0.3) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(el, {
        x: x * strength,
        y: y * strength,
        duration: 0.4,
        ease: "power2.out",
      });
    };

    const onLeave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.3)" });
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);

    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [strength]);

  return ref;
}

/**
 * Scrub-linked scroll timeline — elements animate in sync with scroll position.
 * Wraps gsap.timeline({ scrollTrigger: { scrub, ... } }).
 */
export function useGsapScrubTimeline(
  options: {
    scrub?: number | boolean;
    start?: string;
    end?: string;
  } = {}
) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  const {
    scrub = 1,
    start = "top 90%",
    end = "bottom 30%",
  } = options;

  useEffect(() => {
    if (!triggerRef.current) return;

    timelineRef.current = gsap.timeline({
      scrollTrigger: {
        scrub,
        trigger: triggerRef.current,
        start,
        end,
      },
    });

    return () => {
      timelineRef.current?.scrollTrigger?.kill();
      timelineRef.current?.kill();
    };
  }, [scrub, start, end]);

  return { triggerRef, timeline: timelineRef };
}

/**
 * Parallax on scroll effect.
 */
export function useGsapParallax(speed: number = 0.5) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    gsap.to(ref.current, {
      y: () => speed * 100,
      ease: "none",
      scrollTrigger: {
        trigger: ref.current,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, [speed]);

  return ref;
}
