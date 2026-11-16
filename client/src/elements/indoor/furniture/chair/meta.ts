import type { FurnitureMeta } from '../../../types';

/**
 * 椅子 — 建模轴向是反的 (boxGeometry args=[w, seatT, d], X 直接取 size[0]),
 * 占地按 footprintX: 'size0' 推导, 否则碰撞盒相对视觉旋转 90°。
 */
export const meta: FurnitureMeta = {
  label: '椅子',
  defaultSize: [0.5, 0.9, 0.5],
  defaultColor: '#8b7355',
  footprintX: 'size0',
};
