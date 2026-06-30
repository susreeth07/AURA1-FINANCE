import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export const ThreeGlobe: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const isMobile = window.innerWidth < 768;
    const globeSegments = isMobile ? 16 : 30;
    const innerSegments = isMobile ? 12 : 20;
    const particleCount = isMobile ? 60 : 180;

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 500;

    // Create scene
    const scene = new THREE.Scene();

    // Create Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 12;

    // Create Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ 
        antialias: !isMobile, 
        alpha: true, 
        powerPreference: "high-performance" 
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(isMobile ? 1.0 : Math.min(window.devicePixelRatio, 1.5));
      container.appendChild(renderer.domElement);
    } catch (e) {
      console.error("WebGL not supported:", e);
      setLoadError(true);
      return;
    }

    // Add ambient lighting and directional futuristic lights
    const ambientLight = new THREE.AmbientLight(0x0f172a, 1.5);
    scene.add(ambientLight);

    const blueLight = new THREE.PointLight(0x6366f1, 15, 30);
    blueLight.position.set(5, 5, 5);
    scene.add(blueLight);

    const purpleLight = new THREE.PointLight(0xc084fc, 12, 30);
    purpleLight.position.set(-5, -5, 5);
    scene.add(purpleLight);

    const whiteLight = new THREE.DirectionalLight(0xffffff, 1.8);
    whiteLight.position.set(0, 8, 8);
    scene.add(whiteLight);

    // Create Globe (Outer Wireframe)
    const globeGeometry = new THREE.SphereGeometry(3.5, globeSegments, globeSegments);
    const globeMaterial = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    const globeMesh = new THREE.Mesh(globeGeometry, globeMaterial);
    scene.add(globeMesh);

    // Create Inner Sphere Core
    const innerGeometry = new THREE.SphereGeometry(3.2, innerSegments, innerSegments);
    const innerMaterial = new THREE.MeshPhongMaterial({
      color: 0x0f172a,
      emissive: 0x4f46e5,
      emissiveIntensity: 0.15,
      shininess: 90,
      transparent: true,
      opacity: 0.6,
    });
    const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
    scene.add(innerMesh);

    // Create Financial Growth Nodes (points on sphere coordinate grid)
    const nodeCount = 12;
    const nodeGroup = new THREE.Group();
    const nodeGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const nodeMaterial = new THREE.MeshPhongMaterial({
      color: 0xe879f9,
      emissive: 0xe879f9,
      emissiveIntensity: 0.8,
      specular: 0xffffff,
    });

    const latitudalLines: THREE.Line[] = [];
    const points: THREE.Vector3[] = [];

    for (let i = 0; i < nodeCount; i++) {
      // Golden ratio placement
      const phi = Math.acos(-1 + (2 * i) / nodeCount);
      const theta = Math.sqrt(nodeCount * Math.PI) * phi;

      const x = 3.5 * Math.sin(phi) * Math.cos(theta);
      const y = 3.5 * Math.sin(phi) * Math.sin(theta);
      const z = 3.5 * Math.cos(phi);

      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      node.position.set(x, y, z);
      nodeGroup.add(node);
      points.push(new THREE.Vector3(x, y, z));
    }
    scene.add(nodeGroup);

    // Connecting Neon Lines between nodes
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xc084fc,
      transparent: true,
      opacity: 0.4,
    });

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        // Connect if relatively near
        if (points[i].distanceTo(points[j]) < 4.5) {
          const lineGeom = new THREE.BufferGeometry().setFromPoints([points[i], points[j]]);
          const line = new THREE.Line(lineGeom, lineMaterial);
          latitudalLines.push(line);
          nodeGroup.add(line);
        }
      }
    }

    // Interactive Floating Cloud Particles (Financial Nodes Stream)
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const particleSpeeds: number[] = [];

    for (let i = 0; i < particleCount; i++) {
      // position randomly in external sphere ring
      const r = 3.6 + Math.random() * 1.8;
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      particleSpeeds.push(0.002 + Math.random() * 0.005);
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x818cf8,
      size: 0.08,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });

    const starParticles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(starParticles);

    // Grid helper on bottom for "grounding" look
    const gridHelper = new THREE.GridHelper(20, 20, 0x4f46e5, 0x1e1b4b);
    gridHelper.position.y = -5;
    const gridMat = gridHelper.material as THREE.Material;
    gridMat.opacity = 0.3;
    gridMat.transparent = true;
    scene.add(gridHelper);

    // Mouse / Touch Easing & Idle Return
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    let mouseTimeout: any = null;

    const resetMouseToIdle = () => {
      mouseX = 0;
      mouseY = 0;
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      if (mouseTimeout) clearTimeout(mouseTimeout);
      mouseTimeout = setTimeout(resetMouseToIdle, 2000);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 0) {
        const touch = event.touches[0];
        const rect = renderer.domElement.getBoundingClientRect();
        mouseX = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        mouseY = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

        if (mouseTimeout) clearTimeout(mouseTimeout);
        mouseTimeout = setTimeout(resetMouseToIdle, 2000);
      }
    };

    const handleMouseLeaveWindow = () => {
      resetMouseToIdle();
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeaveWindow, { passive: true });

    let isIntersecting = true;
    let tabActive = true;

    const handleVisibilityChange = () => {
      tabActive = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isIntersecting = entry.isIntersecting;
    }, { threshold: 0.05 });
    intersectionObserver.observe(container);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const animate = () => {
      if (isIntersecting && tabActive) {
        const elapsedTime = clock.getElapsedTime();

        // Smooth inertia-based lag target tracking
        targetX += (mouseX - targetX) * 0.04;
        targetY += (mouseY - targetY) * 0.04;

        // Floating Y-axis animation (gentle bob)
        const floatY = prefersReducedMotion ? 0 : Math.sin(elapsedTime * 0.5) * 0.08;

        // Rotate Globe wireframe with mouse tracking + idle rotation
        globeMesh.rotation.y = prefersReducedMotion ? 0 : elapsedTime * 0.06 + targetX * 0.4;
        globeMesh.rotation.x = prefersReducedMotion ? 0 : elapsedTime * 0.02 + targetY * 0.3;
        globeMesh.position.y = floatY;

        // Inner core with counter-rotation + mouse tracking
        innerMesh.rotation.y = prefersReducedMotion ? 0 : -elapsedTime * 0.03 + targetX * 0.3;
        innerMesh.rotation.x = prefersReducedMotion ? 0 : targetY * 0.2;
        innerMesh.position.y = floatY;

        // Node group with mouse tracking + idle rotation
        nodeGroup.rotation.y = prefersReducedMotion ? 0 : elapsedTime * 0.05 + targetX * 0.5;
        nodeGroup.rotation.x = prefersReducedMotion ? 0 : elapsedTime * 0.015 + targetY * 0.5;
        nodeGroup.position.y = floatY;

        starParticles.rotation.y = prefersReducedMotion ? 0 : elapsedTime * 0.04;
        starParticles.rotation.z = prefersReducedMotion ? 0 : elapsedTime * 0.01;

        // Animate node scales (visualizing pulsing growth)
        const pulsate = prefersReducedMotion ? 1.0 : Math.sin(elapsedTime * 2.5) * 0.12 + 1.0;
        nodeGroup.children.forEach((child) => {
          if (child instanceof THREE.Mesh) {
            child.scale.set(pulsate, prefersReducedMotion ? 1.0 : pulsate, pulsate);
          }
        });

        // Render Scene
        renderer.render(scene, camera);
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup memory properly
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseleave', handleMouseLeaveWindow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      if (mouseTimeout) clearTimeout(mouseTimeout);

      _safeDispose(scene, renderer);

      if (container && renderer.domElement) {
        try {
          container.removeChild(renderer.domElement);
        } catch (e) {
          // already removed or safe
        }
      }
    };
  }, []);

  // Safe cleaner
  const _safeDispose = (scene: THREE.Scene, renderer: THREE.WebGLRenderer) => {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
        if (object.geometry) {
          object.geometry.dispose();
        }

        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else if (object.material) {
          object.material.dispose();
        }
      }
    });

    renderer.dispose();
  };

  if (loadError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center border border-indigo-500/20 bg-indigo-950/20 rounded-3xl p-8 backdrop-blur-md">
        <div className="text-indigo-400 font-mono text-xs mb-3">WEBGL CORRIDOR OFFLINE</div>
        <div className="relative w-40 h-40 rounded-full border-4 border-dashed border-indigo-500/40 animate-spin flex items-center justify-center">
          <div className="absolute w-28 h-28 rounded-full border-4 border-double border-pink-500/50 animate-ping"></div>
          <span className="text-xl font-bold text-gradient">94.8%</span>
        </div>
        <div className="text-xs text-slate-500 mt-4 text-center">Three.js Fallback Mode: Quantum Node Cloud actively accelerating flow.</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative pointer-events-none" id="threejs-container">
      <div ref={mountRef} className="w-full h-full absolute inset-0" />
      {/* Absolute indicators detailing quantum parameters */}
      <div className="absolute bottom-4 left-4 font-mono text-[9px] text-indigo-400/40 tracking-wider flex items-center gap-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>GLOBE_NODE_SYSTEM ACTIVE // v3.1</span>
      </div>
    </div>
  );
};
