import { Sun, Moon, Cloud, Lightbulb, Sunset } from 'lucide-react';
import type { ReactNode } from 'react';

export const LIGHTING_OPTIONS = ['自然光照', '人造光', '阴天', '夜景', '黄昏'] as const;

export const LIGHTING_ICONS: Record<string, (size?: number) => ReactNode> = {
  自然光照: (size = 13) => <Sun size={size} />,
  人造光: (size = 13) => <Lightbulb size={size} />,
  阴天: (size = 13) => <Cloud size={size} />,
  夜景: (size = 13) => <Moon size={size} />,
  黄昏: (size = 13) => <Sunset size={size} />,
};
