import type { FurnitureElement } from '../../../types';
import { meta } from './meta';
import { Chair } from './View3D';
import { Chair2D } from './Symbol2D';

export const chairElement: FurnitureElement = {
  kind: 'furniture',
  type: 'chair',
  meta,
  View3D: Chair,
  Symbol2D: Chair2D,
  officePresets: [
    { name: '办公椅', size: [0.5, 0.9, 0.5], color: '#3d3d3d' },
    { name: '会议椅', size: [0.5, 0.9, 0.5], color: '#8b7355' },
  ],
};
