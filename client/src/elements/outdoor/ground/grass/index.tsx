import type { GroundItem } from '../../../../types';
import type { OutdoorElement } from '../../../types';
import { Grass } from './View3D';
import { Grass2D } from './Symbol2D';

export const grassElement: OutdoorElement<GroundItem> = {
  kind: 'ground',
  type: 'grass',
  label: '草地',
  presets: [{ name: '草地', size: [6, 0.16, 5], color: '#bfe3c0' }],
  View3D: Grass,
  Symbol2D: Grass2D,
};
