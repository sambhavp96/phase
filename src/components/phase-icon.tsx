import { Droplet, Moon, Sprout, Sun } from 'lucide-react-native';

import type { Phase } from '@/lib/cycle';

const ICONS = { menstrual: Droplet, follicular: Sprout, fertile: Sun, luteal: Moon } as const;

export function PhaseIcon({ phase, size = 16, color }: { phase: Phase; size?: number; color: string }) {
  const Icon = ICONS[phase];
  return <Icon size={size} color={color} strokeWidth={size < 14 ? 2 : 1.6} />;
}
