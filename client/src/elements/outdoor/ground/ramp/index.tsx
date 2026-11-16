import type { GroundItem } from '../../../../types';
import type { OutdoorElement } from '../../../types';
import { Ramp } from './View3D';
import { Ramp2D } from './Symbol2D';

export const rampElement: OutdoorElement<GroundItem> = {
  kind: 'ground',
  type: 'ramp',
  label: '高架匝道',
  presets: [{ name: '高架匝道', size: [12, 0.22, 2.6], color: '#4a4e54' }],
  View3D: Ramp,
  Symbol2D: Ramp2D,
};
