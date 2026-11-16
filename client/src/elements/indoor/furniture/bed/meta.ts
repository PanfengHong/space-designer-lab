import type { FurnitureMeta } from '../../../types';

/** 床 — 床头板立在床架 -X 端外侧 (2D 命中盒同步外扩, 见 index.tsx hitPadNegX) */
export const meta: FurnitureMeta = {
  label: '床',
  defaultSize: [1.8, 0.45, 2.0],
  defaultColor: '#e8e0d4',
  footprintX: 'size2',
};
