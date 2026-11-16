import type { FurnitureElement } from '../../../types';
import { meta } from './meta';
import { Cabinet } from './View3D';
import { Cabinet2D } from './Symbol2D';

export const cabinetElement: FurnitureElement = {
  kind: 'furniture',
  type: 'cabinet',
  meta,
  View3D: Cabinet,
  Symbol2D: Cabinet2D,
  officePresets: [
    { name: '文件柜', size: [1.6, 1.8, 0.45], color: '#d4c5b0' },
    { name: '茶水柜', size: [2.0, 0.9, 0.6], color: '#e0e0e0' },
  ],
};
