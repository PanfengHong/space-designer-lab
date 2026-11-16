import type { FurnitureElement } from '../../../types';
import { meta } from './meta';
import { Appliance } from './View3D';
import { Appliance2D } from './Symbol2D';

/** 家电 — 只有办公素材库有预设 (饮水机), 住宅素材库不展示 */
export const applianceElement: FurnitureElement = {
  kind: 'furniture',
  type: 'appliance',
  meta,
  View3D: Appliance,
  Symbol2D: Appliance2D,
  presets: [],
  officePresets: [
    { name: '饮水机', size: [0.5, 1.1, 0.5], color: '#f0f0f0' },
  ],
};
