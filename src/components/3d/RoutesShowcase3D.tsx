import React from 'react';
import { motion } from 'motion/react';
import { Compass, MapPin, ShieldCheck } from 'lucide-react';

interface RoutesShowcase3DProps {
  className?: string;
}

export const RoutesShowcase3D: React.FC<RoutesShowcase3DProps> = ({ className = '' }) => {
  return (
    <div className={`relative w-full h-[320px] sm:h-[380px] overflow-hidden rounded-2xl group ${className}`}>
      {/* Cinematic Aerial Drone Photography */}
      <img
        src="/src/assets/images/card_daily_routes_1794166730073.jpg"
        alt="Cinematic bird's-eye view of a 5K running loop path winding around a park with luminous route line"
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover object-center scale-[1.01] transition-transform duration-700 ease-out group-hover:scale-105"
      />

      {/* Dark Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent pointer-events-none" />

      {/* Top Left Loop Verification Tag */}
      <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-950/85 backdrop-blur-md border border-white/10 text-white text-[11px] font-mono shadow-xl pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
        <span>CLOSED LOOP ROUTE · 5.18 KM</span>
      </div>

      {/* Top Right Waypoint Landmark Badge */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-950/80 backdrop-blur-md border border-white/10 text-zinc-300 text-[10px] font-mono shadow-lg pointer-events-none">
        <MapPin className="w-3 h-3 text-orange-400" />
        <span>QUEEN'S PARK LOOP</span>
      </div>

      {/* Bottom Route Telemetry HUD Bar */}
      <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-zinc-950/85 backdrop-blur-md border border-white/10 text-xs flex items-center justify-between text-zinc-300 pointer-events-none">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-white">5.18 KM · ~27 min</span>
          <span className="text-zinc-500 hidden sm:inline">· +28m Elevation</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Zero Motorway Exposure</span>
        </div>
      </div>
    </div>
  );
};
