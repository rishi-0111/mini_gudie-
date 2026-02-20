/**
 * Animated 3D Background Component
 * Creates a stunning 3D animated background using Three.js
 * Features: Floating particles, morphing meshes, dynamic lighting
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface Animated3DBackgroundProps {
  className?: string;
  intensity?: number;
  speed?: number;
}

export const Animated3DBackground: React.FC<Animated3DBackgroundProps> = ({
  className = "",
  intensity = 0.5,
  speed = 1,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const particlesRef = useRef<THREE.Points[] | null>(null);
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Three.js Scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true,
      powerPreference: "high-performance"
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); // Transparent background
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    camera.position.z = 50;

    // Create particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particleCount = 200;
    const positionArray = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positionArray[i] = (Math.random() - 0.5) * 200;
      positionArray[i + 1] = (Math.random() - 0.5) * 200;
      positionArray[i + 2] = (Math.random() - 0.5) * 200;
    }

    particlesGeometry.setAttribute("position", new THREE.BufferAttribute(positionArray, 3));

    // Create particle materials with gradient
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.5,
      color: 0x7c3aed,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    // Create floating mesh
    const geometryMesh = new THREE.IcosahedronGeometry(20, 4);
    const materialMesh = new THREE.MeshPhongMaterial({
      color: 0xa78bfa,
      transparent: true,
      opacity: 0.1,
      wireframe: false,
    });
    const mesh = new THREE.Mesh(geometryMesh, materialMesh);
    scene.add(mesh);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, intensity);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x7c3aed, intensity * 1.5);
    pointLight1.position.set(50, 50, 50);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xa78bfa, intensity);
    pointLight2.position.set(-50, -50, 50);
    scene.add(pointLight2);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    particlesRef.current = [particles];

    // Animation loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Rotate mesh
      mesh.rotation.x += 0.0005 * speed;
      mesh.rotation.y += 0.0008 * speed;
      mesh.rotation.z += 0.0003 * speed;

      // Animate particles
      const positions = particlesGeometry.getAttribute("position") as THREE.BufferAttribute;
      const posArray = positions.array as Float32Array;

      for (let i = 0; i < posArray.length; i += 3) {
        posArray[i] += (Math.random() - 0.5) * 0.2 * speed;
        posArray[i + 1] += (Math.random() - 0.5) * 0.2 * speed;
        posArray[i + 2] += (Math.random() - 0.5) * 0.2 * speed;

        // Wrap around
        if (posArray[i] > 100) posArray[i] = -100;
        if (posArray[i + 1] > 100) posArray[i + 1] = -100;
        if (posArray[i + 2] > 100) posArray[i + 2] = -100;
      }
      positions.needsUpdate = true;

      // Rotate particles
      particles.rotation.x += 0.0001 * speed;
      particles.rotation.y += 0.0002 * speed;

      renderer.render(scene, camera);
    };

    animate();
    animationIdRef.current = animationFrameId;

    // Handle window resize
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometryMesh.dispose();
      materialMesh.dispose();
      particlesGeometry.dispose();
      particlesMaterial.dispose();
    };
  }, [intensity, speed]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 -z-10 overflow-hidden ${className}`}
      style={{ pointerEvents: "none" }}
    />
  );
};

export default Animated3DBackground;
