import type { FurnitureElement } from '../../../types';
import { meta } from './meta';
import { Curtain } from './View3D';
import { Curtain2D } from './Symbol2D';

export const curtainElement: FurnitureElement = {
  kind: 'furniture',
  type: 'curtain',
  meta,
  View3D: Curtain,
  Symbol2D: Curtain2D,
};
