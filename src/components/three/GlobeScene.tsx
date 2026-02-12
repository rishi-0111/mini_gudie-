import { useEffect, useRef } from "react";
import * as THREE from "three";

interface GlobeSceneProps {
  className?: string;
}

const GlobeScene = ({ className = "" }: GlobeSceneProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 5;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Globe wireframe
    const globeGeometry = new THREE.SphereGeometry(1.5, 32, 32);
    const globeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    scene.add(globe);

    // Inner glow sphere
    const glowGeometry = new THREE.SphereGeometry(1.48, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x9333ea, // purple-600
      transparent: true,
      opacity: 0.08,
    });
    const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(glowSphere);

    // Latitude rings
    const ringColors = [0xf97316, 0xa855f7, 0x6366f1]; // orange, purple, indigo
    ringColors.forEach((color, i) => {
      const ringGeometry = new THREE.RingGeometry(1.6 + i * 0.15, 1.62 + i * 0.15, 64);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.2 - i * 0.05,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI * 0.3 + i * 0.3;
      ring.rotation.y = i * 0.5;
      scene.add(ring);
    });

    // Floating location markers (dots on the globe)
    const markerPositions = [
      { lat: 28.6, lng: 77.2 },   // Delhi
      { lat: 48.8, lng: 2.3 },    // Paris
      { lat: 35.6, lng: 139.6 },  // Tokyo
      { lat: -33.8, lng: 151.2 }, // Sydney
      { lat: 40.7, lng: -74.0 },  // New York
      { lat: -22.9, lng: -43.2 }, // Rio
      { lat: 51.5, lng: -0.1 },   // London
    ];

    const markers: THREE.Mesh[] = [];
    markerPositions.forEach(({ lat, lng }) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lng + 180) * (Math.PI / 180);
      const x = -(1.52) * Math.sin(phi) * Math.cos(theta);
      const y = (1.52) * Math.cos(phi);
      const z = (1.52) * Math.sin(phi) * Math.sin(theta);

      const dotGeometry = new THREE.SphereGeometry(0.03, 8, 8);
      const dotMaterial = new THREE.MeshBasicMaterial({
        color: 0xf97316, // orange
        transparent: true,
        opacity: 0.9,
      });
      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      dot.position.set(x, y, z);
      globe.add(dot);
      markers.push(dot);
    });

    // Particle field (stars background)
    const particlesGeometry = new THREE.BufferGeometry();
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 15;
    }
    particlesGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.02,
      transparent: true,
      opacity: 0.5,
    });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    // Animation loop
    let time = 0;
    const animate = () => {
      time += 0.005;
      globe.rotation.y += 0.003;
      globe.rotation.x = Math.sin(time) * 0.1;
      particles.rotation.y += 0.0005;

      // Pulse markers
      markers.forEach((marker, i) => {
        const scale = 1 + Math.sin(time * 3 + i * 1.5) * 0.3;
        marker.scale.setScalar(scale);
      });

      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Resize handler
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

export default GlobeScene;
