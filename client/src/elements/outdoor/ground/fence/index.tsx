import type { GroundItem } from '../../../../types';
import type { OutdoorElement } from '../../../types';
import { Fence } from './View3D';
import { Fence2D } from './Symbol2D';

export const fenceElement: OutdoorElement<GroundItem> = {
  kind: 'ground',
  type: 'fence',
  label: '围墙',
  presets: [{ name: '围墙', size: [10, 1.8, 0.4], color: '#f0f4f8' }],
  View3D: Fence,
  Symbol2D: Fence2D,
};
