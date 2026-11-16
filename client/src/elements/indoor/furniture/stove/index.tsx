import type { FurnitureElement } from '../../../types';
import { meta } from './meta';
import { Stove } from './View3D';
import { Stove2D } from './Symbol2D';

export const stoveElement: FurnitureElement = {
  kind: 'furniture',
  type: 'stove',
  meta,
  View3D: Stove,
  Symbol2D: Stove2D,
};
