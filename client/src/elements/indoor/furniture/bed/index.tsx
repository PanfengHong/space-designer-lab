import type { FurnitureElement } from '../../../types';
import { meta } from './meta';
import { Bed } from './View3D';
import { Bed2D } from './Symbol2D';

/** 床 — 床头板立在 -X 外侧 0.08m, 2D 命中盒同步外扩, 否则点床头板选不中床 */
export const bedElement: FurnitureElement = {
  kind: 'furniture',
  type: 'bed',
  meta,
  View3D: Bed,
  Symbol2D: Bed2D,
  hitPadNegX: 0.08,
};
