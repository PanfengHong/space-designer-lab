import type { FurnitureMeta } from '../../../types';

/**
 * 马桶 — 水箱宽度直接作为 boxGeometry 的 X (size[0]),
 * 占地按 footprintX: 'size0' 推导。
 */
export const meta: FurnitureMeta = {
  label: '马桶',
  defaultSize: [0.4, 0.8, 0.65],
  defaultColor: '#fafafa',
  footprintX: 'size0',
};
