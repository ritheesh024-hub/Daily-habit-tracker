import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { ShieldCheck, Activity, Compass } from 'lucide-react';

interface Hero3DCanvasProps {
  className?: string;
}

export const Hero3DCanvas: React.FC<Hero3DCanvasProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Smooth spring-damped 3D tilt coordinates
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), {
    stiffness: 120,
    damping: 18,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), {
    stiffness: 120,
    damping: 18,
  });

  const glareX = useSpring(useTransform(mouseX, [-0.5, 0.5], [20, 80]), {
    stiffness: 140,
    damping: 20,
  });
  const glareY = useSpring(useTransform(mouseY, [-0.5, 0.5], [20, 80]), {
    stiffness: 140,
    damping: 20,
  });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div className={`relative w-full select-none ${className}`}>
      {/* 3D Perspective Card Container */}
      <div
        ref={containerRef}
        onPointerEnter={() => setIsHovered(true)}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="relative max-w-5xl mx-auto rounded-3xl overflow-hidden cursor-crosshair [perspective:1200px]"
      >
        <motion.div
          style={{
            rotateX,
            rotateY,
            transformStyle: 'preserve-3d',
          }}
          className="relative w-full rounded-3xl overflow-hidden border border-zinc-800/80 bg-zinc-950 shadow-2xl transition-shadow duration-300 group"
        >
          {/* Main Photorealistic Hero Image */}
          <div className="relative aspect-16/9 sm:aspect-16/9.5 w-full overflow-hidden bg-zinc-950">
            <img
              src="/src/assets/images/hero_cinematic_fitness_1794166691190.jpg"
              alt="Cinematic Daily Habits product showcase: Flagship smartphone displaying daily habits, luxury running smartwatch with live OLED metrics, athletic running shoe, and hydration flask"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center scale-[1.01] transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />

            {/* Dynamic Specular Glare Reflection Layer */}
            <motion.div
              style={{
                background: `radial-gradient(circle at ${glareX.get()}% ${glareY.get()}%, rgba(255, 255, 255, 0.12) 0%, rgba(16, 185, 129, 0.06) 30%, transparent 70%)`,
              }}
              className="absolute inset-0 pointer-events-none transition-opacity duration-300"
            />

            {/* Deep Obsidian Vignette & Controlled Emerald Accent Lighting Overlay */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent pointer-events-none opacity-90 sm:opacity-80"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-r from-zinc-950/40 via-transparent to-zinc-950/40 pointer-events-none"
            />

            {/* Floating Top Left Telemetry Tag */}
            <div className="absolute top-4 sm:top-6 left-4 sm:left-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-950/80 backdrop-blur-md border border-white/10 text-white text-[11px] font-mono shadow-xl pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
              <span className="tracking-wide">PRO CAMPAIGN EDITION · OLED 1 Hz</span>
            </div>

            {/* Floating Top Right GPS Signal Indicator */}
            <div className="hidden sm:flex absolute top-6 right-6 items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-950/80 backdrop-blur-md border border-white/10 text-zinc-300 text-[11px] font-mono shadow-xl pointer-events-none">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>DUAL-BAND GPS SYNCED</span>
            </div>

            {/* Bottom Telemetry Bar */}
            <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 text-xs text-zinc-300 pointer-events-none">
              <div className="space-y-1">
                <div className="text-[11px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                  Hardware & Experience Synchronization
                </div>
                <div className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Flagship Phone · OLED Smartwatch · Athletic Mesh
                </div>
              </div>

              <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Titanium Chassis</span>
                </span>
                <span>·</span>
                <span className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-orange-400" />
                  <span>5K Loop Verification</span>
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Subtle Studio Interactive Pill */}
      <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
        <span>Photorealistic Studio Advertisement · Hover or tilt for depth</span>
      </div>
    </div>
  );
};
