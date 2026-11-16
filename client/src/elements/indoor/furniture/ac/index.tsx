import type { FurnitureElement } from '../../../types';
import { meta } from './meta';
import { AirConditioner } from './View3D';
import { Ac2D } from './Symbol2D';

export const acElement: FurnitureElement = {
  kind: 'furniture',
  type: 'ac',
  meta,
  View3D: AirConditioner,
  Symbol2D: Ac2D,
};
