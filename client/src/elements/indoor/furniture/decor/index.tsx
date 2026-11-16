import type { FurnitureElement } from '../../../types';
import { meta } from './meta';
import { Decor } from './View3D';
import { Decor2D } from './Symbol2D';

export const decorElement: FurnitureElement = {
  kind: 'furniture',
  type: 'decor',
  meta,
  View3D: Decor,
  Symbol2D: Decor2D,
  officePresets: [
    { name: '绿植盆栽', size: [0.6, 1.2, 0.6], color: '#4a7c59' },
  ],
};
