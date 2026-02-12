import { Suspense, lazy, ComponentType } from "react";

// Lazy-loaded Three.js components — keeps them in a separate chunk
export const LazyGlobeScene = lazy(() => import("@/components/three/GlobeScene"));
export const LazyParticleField = lazy(() => import("@/components/three/ParticleField"));
export const LazyFloatingIconsScene = lazy(() => import("@/components/three/FloatingIconsScene"));

/** Minimal shimmer placeholder while 3D scenes load */
const SceneFallback = () => (
  <div className="absolute inset-0 flex items-center justify-center">
    <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
  </div>
);

/** Wraps a lazy Three.js component with Suspense + fallback */
export function ThreeScene({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Suspense fallback={<SceneFallback />}>
      <div className={className}>{children}</div>
    </Suspense>
  );
}
