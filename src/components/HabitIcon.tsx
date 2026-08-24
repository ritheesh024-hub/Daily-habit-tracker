import React from 'react';
import {
  Sun,
  Droplets,
  Dumbbell,
  Utensils,
  BookOpen,
  Moon,
  Flame,
  Footprints,
  Heart,
  Brain,
  Coffee,
  Clock,
  CheckCircle2,
  Sparkles,
  Smile,
  Target,
  Zap,
  Activity,
  LucideIcon,
} from 'lucide-react';

export const AVAILABLE_ICONS: { name: string; label: string; icon: LucideIcon }[] = [
  { name: 'sun', label: 'Sun', icon: Sun },
  { name: 'droplet', label: 'Water', icon: Droplets },
  { name: 'dumbbell', label: 'Gym / Fitness', icon: Dumbbell },
  { name: 'utensils', label: 'Meal', icon: Utensils },
  { name: 'book', label: 'Reading', icon: BookOpen },
  { name: 'moon', label: 'Sleep', icon: Moon },
  { name: 'activity', label: 'Meditation / Health', icon: Activity },
  { name: 'footprints', label: 'Walking / Steps', icon: Footprints },
  { name: 'coffee', label: 'Coffee / Break', icon: Coffee },
  { name: 'brain', label: 'Study / Focus', icon: Brain },
  { name: 'clock', label: 'Time / Routine', icon: Clock },
  { name: 'heart', label: 'Wellness', icon: Heart },
  { name: 'flame', label: 'Energy / Streak', icon: Flame },
  { name: 'zap', label: 'Fast / Quick Habit', icon: Zap },
  { name: 'target', label: 'Goal / Target', icon: Target },
  { name: 'sparkles', label: 'Self Care', icon: Sparkles },
  { name: 'check', label: 'Checklist', icon: CheckCircle2 },
  { name: 'smile', label: 'Mindset', icon: Smile },
];

const iconMap: Record<string, LucideIcon> = {
  sun: Sun,
  droplet: Droplets,
  water: Droplets,
  dumbbell: Dumbbell,
  gym: Dumbbell,
  utensils: Utensils,
  meal: Utensils,
  book: BookOpen,
  reading: BookOpen,
  moon: Moon,
  sleep: Moon,
  activity: Activity,
  meditation: Activity,
  footprints: Footprints,
  walking: Footprints,
  coffee: Coffee,
  brain: Brain,
  study: Brain,
  clock: Clock,
  heart: Heart,
  flame: Flame,
  zap: Zap,
  target: Target,
  sparkles: Sparkles,
  check: CheckCircle2,
  smile: Smile,
};

interface HabitIconProps {
  name?: string;
  className?: string;
}

export const HabitIcon: React.FC<HabitIconProps> = ({ name, className = 'w-4 h-4' }) => {
  if (!name) return null;
  const IconComponent = iconMap[name.toLowerCase()] || null;
  if (!IconComponent) return null;
  return <IconComponent className={className} />;
};
