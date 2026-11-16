import type { FurnitureElement } from '../../../types';
import { meta } from './meta';
import { WashingMachine } from './View3D';
import { Washer2D } from './Symbol2D';

export const washerElement: FurnitureElement = {
  kind: 'furniture',
  type: 'washer',
  meta,
  View3D: WashingMachine,
  Symbol2D: Washer2D,
};
