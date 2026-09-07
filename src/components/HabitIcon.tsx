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
  Briefcase,
  GraduationCap,
  Apple,
  Pencil,
  Compass,
  LucideIcon,
} from 'lucide-react';

export const AVAILABLE_ICONS: { name: string; label: string; icon: LucideIcon }[] = [
  { name: 'droplet', label: 'Water / Hydration', icon: Droplets },
  { name: 'dumbbell', label: 'Workout / Fitness', icon: Dumbbell },
  { name: 'footprints', label: 'Running / Steps', icon: Footprints },
  { name: 'activity', label: 'Meditation / Health', icon: Activity },
  { name: 'heart', label: 'Wellness / Heart', icon: Heart },
  { name: 'apple', label: 'Nutrition / Diet', icon: Apple },
  { name: 'book', label: 'Reading', icon: BookOpen },
  { name: 'brain', label: 'Study / Focus', icon: Brain },
  { name: 'graduation-cap', label: 'Learning / Academic', icon: GraduationCap },
  { name: 'briefcase', label: 'Work / Career', icon: Briefcase },
  { name: 'target', label: 'Personal Goals', icon: Target },
  { name: 'pencil', label: 'Journaling / Writing', icon: Pencil },
  { name: 'moon', label: 'Sleep / Rest', icon: Moon },
  { name: 'sun', label: 'Morning / Wake Up', icon: Sun },
  { name: 'utensils', label: 'Healthy Meal', icon: Utensils },
  { name: 'coffee', label: 'Coffee / Routine', icon: Coffee },
  { name: 'clock', label: 'Time Management', icon: Clock },
  { name: 'flame', label: 'Streak / Energy', icon: Flame },
  { name: 'zap', label: 'Fast Habit', icon: Zap },
  { name: 'sparkles', label: 'Self Care', icon: Sparkles },
  { name: 'check', label: 'Checklist / Task', icon: CheckCircle2 },
  { name: 'smile', label: 'Mindset', icon: Smile },
  { name: 'compass', label: 'Explore / Habit', icon: Compass },
];

const iconMap: Record<string, LucideIcon> = {
  sun: Sun,
  droplet: Droplets,
  water: Droplets,
  dumbbell: Dumbbell,
  gym: Dumbbell,
  fitness: Dumbbell,
  workout: Dumbbell,
  utensils: Utensils,
  meal: Utensils,
  book: BookOpen,
  reading: BookOpen,
  moon: Moon,
  sleep: Moon,
  activity: Activity,
  meditation: Activity,
  health: Activity,
  footprints: Footprints,
  walking: Footprints,
  running: Footprints,
  coffee: Coffee,
  brain: Brain,
  study: Brain,
  focus: Brain,
  clock: Clock,
  heart: Heart,
  wellness: Heart,
  flame: Flame,
  zap: Zap,
  target: Target,
  goal: Target,
  personal: Target,
  sparkles: Sparkles,
  check: CheckCircle2,
  smile: Smile,
  briefcase: Briefcase,
  work: Briefcase,
  'graduation-cap': GraduationCap,
  graduation: GraduationCap,
  apple: Apple,
  nutrition: Apple,
  pencil: Pencil,
  journal: Pencil,
  compass: Compass,
};

interface HabitIconProps {
  name?: string;
  icon?: string;
  iconName?: string;
  className?: string;
}

export const HabitIcon: React.FC<HabitIconProps> = ({ name, icon, iconName, className = 'w-4 h-4' }) => {
  const resolvedName = name || icon || iconName;
  if (!resolvedName) return null;
  const IconComponent = iconMap[resolvedName.toLowerCase()] || null;
  if (!IconComponent) return null;
  return <IconComponent className={className} />;
};
