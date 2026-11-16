import type { FurnitureElement } from '../../../types';
import { meta } from './meta';
import { Sink } from './View3D';
import { Sink2D } from './Symbol2D';

export const sinkElement: FurnitureElement = {
  kind: 'furniture',
  type: 'sink',
  meta,
  View3D: Sink,
  Symbol2D: Sink2D,
  officePresets: [
    { name: '洗手台', size: [0.7, 0.85, 0.5], color: '#ffffff' },
  ],
};
