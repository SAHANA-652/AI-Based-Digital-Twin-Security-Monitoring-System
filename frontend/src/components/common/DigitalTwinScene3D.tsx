import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface DigitalTwinScene3DProps {
  className?: string;
  intensity?: number;
}

export const DigitalTwinScene3D: React.FC<DigitalTwinScene3DProps> = ({
  className = '',
  intensity = 1.0,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // --- Scene, Camera, Renderer ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0d14, 0.035);

    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 1.2, 7.5);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch (e) {
      console.warn('WebGL initialization failed, falling back to 2D background:', e);
      return;
    }

    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0d14, 1);
    container.appendChild(renderer.domElement);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0x0a192f, 2.0 * intensity);
    scene.add(ambientLight);

    const cyanLight = new THREE.PointLight(0x00f0ff, 3.5 * intensity, 25);
    cyanLight.position.set(3, 4, 3);
    scene.add(cyanLight);

    const emeraldLight = new THREE.PointLight(0x00ff9d, 3.0 * intensity, 25);
    emeraldLight.position.set(-4, -2, 2);
    scene.add(emeraldLight);

    const coreLight = new THREE.PointLight(0x00f0ff, 2.0 * intensity, 15);
    coreLight.position.set(0, 0, 0);
    scene.add(coreLight);

    // --- Digital Twin Core (Holographic Hex/Icosahedron Cluster) ---
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // 1. Outer Wireframe Geodesic Sphere
    const outerGeo = new THREE.IcosahedronGeometry(2.1, 2);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
    });
    const outerSphere = new THREE.Mesh(outerGeo, outerMat);
    coreGroup.add(outerSphere);

    // 2. Mid Faceted Polyhedron with Translucent Glow
    const midGeo = new THREE.IcosahedronGeometry(1.6, 1);
    const midMat = new THREE.MeshStandardMaterial({
      color: 0x0c4a6e,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
      roughness: 0.2,
      metalness: 0.8,
      wireframe: false,
      transparent: true,
      opacity: 0.3,
    });
    const midPoly = new THREE.Mesh(midGeo, midMat);
    coreGroup.add(midPoly);

    // Mid Polyhedron Edge Outline
    const midEdges = new THREE.EdgesGeometry(midGeo);
    const midLines = new THREE.LineSegments(
      midEdges,
      new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 })
    );
    coreGroup.add(midLines);

    // 3. Inner Pulsing Core
    const innerGeo = new THREE.OctahedronGeometry(0.85, 2);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const innerCore = new THREE.Mesh(innerGeo, innerMat);
    coreGroup.add(innerCore);

    // 4. Gimbal / Orbit Defense Rings
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const ringGeo1 = new THREE.TorusGeometry(3.0, 0.015, 8, 80);
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 3;
    scene.add(ring1);

    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x00ff9d,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    });
    const ringGeo2 = new THREE.TorusGeometry(3.4, 0.012, 8, 80);
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.y = Math.PI / 4;
    ring2.rotation.x = -Math.PI / 6;
    scene.add(ring2);

    // --- Subsystem Satellite Nodes ---
    const satelliteNodes: { mesh: THREE.Mesh; angle: number; radius: number; speed: number; yOffset: number }[] = [];
    const nodeColors = [0x00f0ff, 0x00ff9d, 0x00f0ff, 0x00ff9d, 0x38bdf8, 0x00ff9d];
    const nodeGeometry = new THREE.SphereGeometry(0.09, 16, 16);

    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: nodeColors[i],
        emissive: nodeColors[i],
        emissiveIntensity: 0.8,
        roughness: 0.1,
        metalness: 0.9,
      });
      const node = new THREE.Mesh(nodeGeometry, mat);
      const angle = (i / 6) * Math.PI * 2;
      const radius = 2.7 + (i % 2) * 0.5;
      const yOffset = (i % 3 - 1) * 0.6;
      satelliteNodes.push({ mesh: node, angle, radius, speed: 0.008 + (i % 3) * 0.003, yOffset });
      scene.add(node);
    }

    // Dynamic Data Connector Lines between satellites and center
    const connectorLinesGeo = new THREE.BufferGeometry();
    const connectorPositions = new Float32Array(6 * 2 * 3); // 6 lines, 2 vertices each
    connectorLinesGeo.setAttribute('position', new THREE.BufferAttribute(connectorPositions, 3));
    const connectorMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.25,
    });
    const connectorLines = new THREE.LineSegments(connectorLinesGeo, connectorMat);
    scene.add(connectorLines);

    // --- Floating Particle Matrix / Telemetry Constellation ---
    const particleCount = 1400;
    const particleGeo = new THREE.BufferGeometry();
    const particleCoords = new Float32Array(particleCount * 3);
    const particleScales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particleCoords[i * 3] = (Math.random() - 0.5) * 22;
      particleCoords[i * 3 + 1] = (Math.random() - 0.5) * 16;
      particleCoords[i * 3 + 2] = (Math.random() - 0.5) * 18;
      particleScales[i] = Math.random() * 0.04 + 0.01;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particleCoords, 3));

    // Custom Canvas Circular Dot Texture for crisp glow particles
    const createParticleTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
        gradient.addColorStop(0, 'rgba(0, 240, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(56, 189, 248, 0.6)');
        gradient.addColorStop(0.7, 'rgba(99, 102, 241, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
      }
      return new THREE.CanvasTexture(canvas);
    };

    const particleMat = new THREE.PointsMaterial({
      size: 0.12,
      map: createParticleTexture(),
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // --- Infinite Cyber Horizon Grid ---
    const gridHelper = new THREE.GridHelper(32, 40, 0x00f0ff, 0x1e293b);
    gridHelper.position.y = -3.2;
    // Set material opacity
    const gridMat = gridHelper.material as THREE.Material;
    gridMat.transparent = true;
    gridMat.opacity = 0.28;
    scene.add(gridHelper);

    // --- Interactive Mouse Parallax ---
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const handleMouseMove = (event: MouseEvent) => {
      mouse.targetX = (event.clientX / window.innerWidth - 0.5) * 2;
      mouse.targetY = -(event.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // --- Window Resize Handler ---
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- Animation Loop ---
    let frameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Smooth camera parallax interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.04;
      mouse.y += (mouse.targetY - mouse.y) * 0.04;

      camera.position.x = mouse.x * 1.4;
      camera.position.y = 1.2 + mouse.y * 0.9;
      camera.lookAt(0, 0.2, 0);

      // Core rotations
      coreGroup.rotation.y = elapsedTime * 0.18;
      coreGroup.rotation.x = Math.sin(elapsedTime * 0.15) * 0.2;
      innerCore.rotation.y = -elapsedTime * 0.35;
      innerCore.rotation.z = elapsedTime * 0.2;

      // Subtle breath pulse
      const pulseScale = 1 + Math.sin(elapsedTime * 2.0) * 0.035;
      midPoly.scale.set(pulseScale, pulseScale, pulseScale);
      innerCore.scale.set(1 / pulseScale, 1 / pulseScale, 1 / pulseScale);

      // Ring rotations
      ring1.rotation.z = elapsedTime * 0.12;
      ring2.rotation.z = -elapsedTime * 0.09;

      // Satellites orbital positioning & connector lines update
      const positions = connectorLinesGeo.attributes.position.array as Float32Array;
      satelliteNodes.forEach((sat, i) => {
        sat.angle += sat.speed;
        const x = Math.cos(sat.angle) * sat.radius;
        const z = Math.sin(sat.angle) * sat.radius;
        const y = Math.sin(elapsedTime * 1.5 + i) * 0.4 + sat.yOffset;
        sat.mesh.position.set(x, y, z);

        // Update connector line: (0, 0, 0) to satellite position
        const idx = i * 6;
        positions[idx] = 0;
        positions[idx + 1] = 0;
        positions[idx + 2] = 0;
        positions[idx + 3] = x;
        positions[idx + 4] = y;
        positions[idx + 5] = z;
      });
      connectorLinesGeo.attributes.position.needsUpdate = true;

      // Background particles drift
      particles.rotation.y = -elapsedTime * 0.025;
      particles.rotation.x = Math.sin(elapsedTime * 0.015) * 0.05;

      // Subtle undulating horizon grid drift
      gridHelper.position.z = (elapsedTime * 0.4) % (32 / 40);

      renderer.render(scene, camera);
    };

    animate();

    // --- Cleanup on unmount ---
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      // Dispose Three.js assets
      outerGeo.dispose();
      outerMat.dispose();
      midGeo.dispose();
      midMat.dispose();
      midEdges.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      nodeGeometry.dispose();
      connectorLinesGeo.dispose();
      connectorMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      gridHelper.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [intensity]);

  return (
    <div
      ref={mountRef}
      className={`w-full h-full absolute inset-0 overflow-hidden select-none pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
};

export default DigitalTwinScene3D;
