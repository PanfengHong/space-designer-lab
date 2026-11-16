import type { FurnitureMeta } from '../../../types';

/** 空调 — 壁挂件, 2D 平面图按贴墙细长条画, 不按落地家具算占地 */
export const meta: FurnitureMeta = {
  label: '空调',
  defaultSize: [0.95, 0.3, 0.22],
  defaultColor: '#ffffff',
  footprintX: 'size2',
  device: 'ac',
  wallMounted: true,
};
