import type { FurnitureElement } from '../../../types';
import { meta } from './meta';
import { Refrigerator } from './View3D';
import { Fridge2D } from './Symbol2D';

export const fridgeElement: FurnitureElement = {
  kind: 'furniture',
  type: 'fridge',
  meta,
  View3D: Refrigerator,
  Symbol2D: Fridge2D,
  officePresets: [
    { name: '冰箱', size: [0.7, 1.8, 0.65], color: '#e0e0e0' },
  ],
};
