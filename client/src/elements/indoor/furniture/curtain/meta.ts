import type { FurnitureMeta } from '../../../types';

/** 窗帘 — 挂顶件, 2D 平面图按贴墙细长条画, 不按落地家具算占地 */
export const meta: FurnitureMeta = {
  label: '窗帘',
  defaultSize: [2.4, 2.5, 0.1],
  defaultColor: '#efe7da',
  footprintX: 'size2',
  device: 'curtain',
  wallMounted: true,
};
