import type { FurnitureElement } from '../../../types';
import { meta } from './meta';
import { Toilet } from './View3D';
import { Toilet2D } from './Symbol2D';

export const toiletElement: FurnitureElement = {
  kind: 'furniture',
  type: 'toilet',
  meta,
  View3D: Toilet,
  Symbol2D: Toilet2D,
  officePresets: [
    { name: '马桶', size: [0.4, 0.8, 0.65], color: '#fafafa' },
  ],
};
