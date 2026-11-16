import type { GroundItem } from '../../../../types';
import type { OutdoorElement } from '../../../types';
import { Intersection } from './View3D';
import { Intersection2D } from './Symbol2D';

/** 路口 — 十字 / 三岔两种素材预设 (branches 在拖入时展开到元素数据上) */
export const intersectionElement: OutdoorElement<GroundItem> = {
  kind: 'ground',
  type: 'intersection',
  label: '路口',
  presets: [
    { name: '十字路口', size: [4, 0.18, 4], color: '#4a4e54', extra: { branches: 4, arcRadius: 1.5 } },
    { name: '三岔路口', size: [4, 0.18, 4], color: '#4a4e54', extra: { branches: 3, arcRadius: 1.5 } },
  ],
  View3D: Intersection,
  Symbol2D: Intersection2D,
};
