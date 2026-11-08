import React from 'react';
import { motion } from 'motion/react';
import { Activity, ShieldCheck, Heart } from 'lucide-react';

interface RunShowcase3DProps {
  className?: string;
}

export const RunShowcase3D: React.FC<RunShowcase3DProps> = ({ className = '' }) => {
  return (
    <div className={`relative w-full h-[320px] sm:h-[380px] overflow-hidden rounded-2xl group ${className}`}>
      {/* Photorealistic Commercial Product Photography */}
      <img
        src="/src/assets/images/card_daily_run_1794166712711.jpg"
        alt="Photorealistic close-up of runner's wrist with rugged titanium running smartwatch showing live GPS distance 5.02 km and pace"
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover object-center scale-[1.01] transition-transform duration-700 ease-out group-hover:scale-105"
      />

      {/* Dark Studio Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent pointer-events-none" />

      {/* Top Left Live GPS Telemetry Tag */}
      <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-950/85 backdrop-blur-md border border-white/10 text-white text-[11px] font-mono shadow-xl pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
        <span>LIVE GPS WORKOUT · 1 Hz TELEMETRY</span>
      </div>

      {/* Top Right Heart Rate Pill */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-950/80 backdrop-blur-md border border-red-500/30 text-red-300 text-[10px] font-mono shadow-lg pointer-events-none">
        <Heart className="w-3 h-3 text-red-400 fill-red-400" />
        <span>148 BPM AEROBIC</span>
      </div>

      {/* Bottom Telemetry HUD Bar */}
      <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-zinc-950/85 backdrop-blur-md border border-white/10 text-xs flex items-center justify-between text-zinc-300 pointer-events-none">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-orange-400" />
          <span className="font-bold text-white">5.02 KM · 00:26:08</span>
          <span className="text-zinc-500 hidden sm:inline">· 5:12 /km Pace</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>High Accuracy Lock</span>
        </div>
      </div>
    </div>
  );
};
