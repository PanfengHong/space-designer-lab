import type { OutdoorObject } from '../../../../types';
import type { OutdoorElement } from '../../../types';
import { Car } from './View3D';
import { Car2D } from './Symbol2D';

export const carElement: OutdoorElement<OutdoorObject> = {
  kind: 'object',
  type: 'car',
  label: '轿车',
  presets: [{ name: '轿车', size: [1.5, 0.45, 0.7], color: '#ffffff' }],
  View3D: Car,
  Symbol2D: Car2D,
};
