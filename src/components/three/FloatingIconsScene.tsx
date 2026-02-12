import { useEffect, useRef } from "react";
import * as THREE from "three";

interface FloatingIconsSceneProps {
  className?: string;
}

/**
 * A 3D scene with floating travel-themed geometric shapes
 * (pyramids, cubes, spheres) gently rotating in the background.
 */
const FloatingIconsScene = ({ className = "" }: FloatingIconsSceneProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Create floating geometric shapes
    const shapes: { mesh: THREE.Mesh; baseY: number; speed: number; rotSpeed: THREE.Vector3 }[] = [];

    const colors = [0x9333ea, 0xf97316, 0x6366f1, 0xa855f7, 0xec4899, 0x06b6d4];

    // Pyramids (travel → adventurous)
    for (let i = 0; i < 4; i++) {
      const geo = new THREE.TetrahedronGeometry(0.3 + Math.random() * 0.2, 0);
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
        wireframe: true,
        transparent: true,
        opacity: 0.25,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 4 - 2
      );
      scene.add(mesh);
      shapes.push({
        mesh,
        baseY: mesh.position.y,
        speed: 0.3 + Math.random() * 0.5,
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.01
        ),
      });
    }

    // Octahedrons (compass-like)
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.OctahedronGeometry(0.25 + Math.random() * 0.15, 0);
      const mat = new THREE.MeshBasicMaterial({
        color: colors[(i + 2) % colors.length],
        wireframe: true,
        transparent: true,
        opacity: 0.2,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 4 - 2
      );
      scene.add(mesh);
      shapes.push({
        mesh,
        baseY: mesh.position.y,
        speed: 0.2 + Math.random() * 0.4,
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.015,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.01
        ),
      });
    }

    // Small spheres (like map pins)
    for (let i = 0; i < 5; i++) {
      const geo = new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 8, 8);
      const mat = new THREE.MeshBasicMaterial({
        color: colors[(i + 4) % colors.length],
        transparent: true,
        opacity: 0.35,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 3 - 1
      );
      scene.add(mesh);
      shapes.push({
        mesh,
        baseY: mesh.position.y,
        speed: 0.4 + Math.random() * 0.6,
        rotSpeed: new THREE.Vector3(0, 0, 0),
      });
    }

    let time = 0;
    const animate = () => {
      time += 0.01;
      shapes.forEach((s) => {
        s.mesh.position.y = s.baseY + Math.sin(time * s.speed) * 0.4;
        s.mesh.rotation.x += s.rotSpeed.x;
        s.mesh.rotation.y += s.rotSpeed.y;
        s.mesh.rotation.z += s.rotSpeed.z;
      });

      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationRef.current);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`absolute inset-0 ${className}`}
      style={{ pointerEvents: "none" }}
    />
  );
};

export default FloatingIconsScene;
