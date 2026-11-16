import type { FurnitureMeta } from '../../../types';

/**
 * 淋浴 — 锚点展开图形 (从 (x,z) 向 +X/+Z 生长, 不绕中心),
 * footprintX: 'size0' 且 2D 命中/取景由本元素自己的 hitTest/iconBox2D 处理。
 */
export const meta: FurnitureMeta = {
  label: '淋浴',
  defaultSize: [1.2, 2.0, 1.0],
  defaultColor: '#a8d0e6',
  footprintX: 'size0',
};
