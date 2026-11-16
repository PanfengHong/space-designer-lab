import type { FurnitureElement } from '../../../types';
import { meta } from './meta';
import { Sofa } from './View3D';
import { Sofa2D } from './Symbol2D';

export const sofaElement: FurnitureElement = {
  kind: 'furniture',
  type: 'sofa',
  meta,
  View3D: Sofa,
  Symbol2D: Sofa2D,
  officePresets: [
    { name: '接待沙发', size: [2.0, 0.85, 0.9], color: '#c8b8a0' },
  ],
};
