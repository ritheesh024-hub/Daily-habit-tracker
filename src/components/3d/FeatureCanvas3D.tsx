import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { isWebGLAvailable, createStandardRenderer, setupStudioEnvironment } from './threeUtils';
import { createFoodBowlModel } from './proceduralModels';

/**
 * Photorealistic Precision Habit Activity Rings Micro-Canvas
 */
export const HabitRings3D: React.FC<{ className?: string }> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webGLSupported, setWebGLSupported] = useState(true);

  useEffect(() => {
    if (!isWebGLAvailable()) {
      setWebGLSupported(false);
      return;
    }
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const w = container.clientWidth || 240;
    const h = container.clientHeight || 180;

    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 50);
    camera.position.set(0, 0, 3.4);

    const canvas = document.createElement('canvas');
    canvas.className = 'w-full h-full block rounded-xl';
    container.appendChild(canvas);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = createStandardRenderer(canvas);
      renderer.setSize(w, h);
    } catch {
      setWebGLSupported(false);
      return;
    }

    setupStudioEnvironment(scene, renderer);

    // Precision Metallic Concentric Rings
    const ringGroup = new THREE.Group();
    scene.add(ringGroup);

    const ringDefs = [
      { r: 0.9, tube: 0.075, arc: Math.PI * 1.7, col: 0x10b981, emissive: 0x059669 },
      { r: 0.72, tube: 0.075, arc: Math.PI * 1.45, col: 0xf97316, emissive: 0xea580c },
      { r: 0.54, tube: 0.075, arc: Math.PI * 1.85, col: 0x8b5cf6, emissive: 0x7c3aed },
    ];

    ringDefs.forEach((def) => {
      // High-precision Torus with physical clearcoat
      const geo = new THREE.TorusGeometry(def.r, def.tube, 20, 64, def.arc);
      const mat = new THREE.MeshPhysicalMaterial({
        color: def.col,
        emissive: def.emissive,
        emissiveIntensity: 0.5,
        metalness: 0.8,
        roughness: 0.2,
        clearcoat: 0.8,
      });
      const mesh = new THREE.Mesh(geo, mat);
      ringGroup.add(mesh);

      // Matte Black Backing Track
      const trackGeo = new THREE.TorusGeometry(def.r, def.tube * 0.88, 16, 48);
      const trackMat = new THREE.MeshStandardMaterial({
        color: 0x181e26,
        metalness: 0.4,
        roughness: 0.8,
        transparent: true,
        opacity: 0.45,
      });
      ringGroup.add(new THREE.Mesh(trackGeo, trackMat));
    });

    ringGroup.scale.setScalar(0.9);

    let animId = 0;
    let isVisible = true;
    const clock = new THREE.Clock();

    const obs = new IntersectionObserver(([e]) => { isVisible = e.isIntersecting; }, { threshold: 0.1 });
    obs.observe(container);

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isVisible) return;
      const elapsed = clock.getElapsedTime();
      ringGroup.rotation.z = elapsed * 0.25;
      ringGroup.rotation.x = Math.sin(elapsed * 0.6) * 0.15;
      ringGroup.rotation.y = Math.cos(elapsed * 0.5) * 0.15;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      obs.disconnect();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry?.dispose();
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material?.dispose();
        }
      });
      renderer.dispose();
      if (container.contains(canvas)) container.removeChild(canvas);
    };
  }, []);

  if (!webGLSupported) return null;
  return <div ref={mountRef} className={`w-full h-36 ${className}`} />;
};

/**
 * Photorealistic Athletic Fuel Food AI Micro-Canvas
 */
export const FoodAI3D: React.FC<{ className?: string }> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webGLSupported, setWebGLSupported] = useState(true);

  useEffect(() => {
    if (!isWebGLAvailable()) {
      setWebGLSupported(false);
      return;
    }
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const w = container.clientWidth || 240;
    const h = container.clientHeight || 180;

    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 50);
    camera.position.set(0, 1.3, 2.6);
    camera.lookAt(0, 0.18, 0);

    const canvas = document.createElement('canvas');
    canvas.className = 'w-full h-full block rounded-xl';
    container.appendChild(canvas);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = createStandardRenderer(canvas);
      renderer.setSize(w, h);
    } catch {
      setWebGLSupported(false);
      return;
    }

    setupStudioEnvironment(scene, renderer);

    const food = createFoodBowlModel();
    food.scale.setScalar(0.92);
    scene.add(food);

    let animId = 0;
    let isVisible = true;
    const clock = new THREE.Clock();

    const obs = new IntersectionObserver(([e]) => { isVisible = e.isIntersecting; }, { threshold: 0.1 });
    obs.observe(container);

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isVisible) return;
      const elapsed = clock.getElapsedTime();
      food.rotation.y = elapsed * 0.35;
      food.position.y = Math.sin(elapsed * 1.2) * 0.035;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      obs.disconnect();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry?.dispose();
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material?.dispose();
        }
      });
      renderer.dispose();
      if (container.contains(canvas)) container.removeChild(canvas);
    };
  }, []);

  if (!webGLSupported) return null;
  return <div ref={mountRef} className={`w-full h-36 ${className}`} />;
};

/**
 * Photorealistic Architectural Analytics Chart Micro-Canvas
 */
export const AnalyticsChart3D: React.FC<{ className?: string }> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webGLSupported, setWebGLSupported] = useState(true);

  useEffect(() => {
    if (!isWebGLAvailable()) {
      setWebGLSupported(false);
      return;
    }
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const w = container.clientWidth || 240;
    const h = container.clientHeight || 180;

    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 50);
    camera.position.set(0, 1.7, 3.4);
    camera.lookAt(0, 0.25, 0);

    const canvas = document.createElement('canvas');
    canvas.className = 'w-full h-full block rounded-xl';
    container.appendChild(canvas);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = createStandardRenderer(canvas);
      renderer.setSize(w, h);
    } catch {
      setWebGLSupported(false);
      return;
    }

    setupStudioEnvironment(scene, renderer);

    const chartGroup = new THREE.Group();
    scene.add(chartGroup);

    // Milled Dark Slate Ground Platform
    const baseGeo = new THREE.BoxGeometry(2.5, 0.08, 1.2);
    const baseMat = new THREE.MeshPhysicalMaterial({
      color: 0x11161d,
      roughness: 0.65,
      metalness: 0.35,
      clearcoat: 0.3,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.04;
    chartGroup.add(base);

    // 5 Architectural Monolith Columns with Chamfers
    const barData = [
      { h: 0.65, col: 0x10b981 },
      { h: 0.95, col: 0x059669 },
      { h: 0.45, col: 0x10b981 },
      { h: 1.25, col: 0xf97316 }, // Weekly Peak Workout
      { h: 0.85, col: 0x10b981 },
    ];

    const bars: THREE.Mesh[] = [];
    barData.forEach((d, idx) => {
      const geo = new THREE.BoxGeometry(0.25, d.h, 0.25);
      const mat = new THREE.MeshPhysicalMaterial({
        color: d.col,
        emissive: d.col,
        emissiveIntensity: 0.45,
        roughness: 0.18,
        metalness: 0.3,
        clearcoat: 0.9,
      });
      const bar = new THREE.Mesh(geo, mat);
      bar.position.set(-0.8 + idx * 0.4, d.h / 2, 0);
      chartGroup.add(bar);
      bars.push(bar);
    });

    let animId = 0;
    let isVisible = true;
    const clock = new THREE.Clock();

    const obs = new IntersectionObserver(([e]) => { isVisible = e.isIntersecting; }, { threshold: 0.1 });
    obs.observe(container);

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isVisible) return;
      const elapsed = clock.getElapsedTime();
      chartGroup.rotation.y = Math.sin(elapsed * 0.4) * 0.18;

      bars.forEach((b, i) => {
        const targetH = barData[i].h * (1 + Math.sin(elapsed * 1.8 + i) * 0.05);
        b.scale.y = targetH / barData[i].h;
        b.position.y = (barData[i].h * b.scale.y) / 2;
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      obs.disconnect();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry?.dispose();
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material?.dispose();
        }
      });
      renderer.dispose();
      if (container.contains(canvas)) container.removeChild(canvas);
    };
  }, []);

  if (!webGLSupported) return null;
  return <div ref={mountRef} className={`w-full h-36 ${className}`} />;
};
