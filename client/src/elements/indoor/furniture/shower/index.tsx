import type { FurnitureElement } from '../../../types';
import type { Furniture } from '../../../../types';
import { meta } from './meta';
import { Shower } from './View3D';
import { Shower2D } from './Symbol2D';
import { ShowerConfig } from './Config';

/**
 * 淋浴 — 锚点展开图形: 从 (x,z) 向 +X/+Z 生长 (四分之一圆以 (x,z) 为圆心),
 * 命中与素材卡取景不能用中心对称的占地盒, 走元素自己的 hitTest / iconBox2D。
 */
export const showerElement: FurnitureElement = {
  kind: 'furniture',
  type: 'shower',
  meta,
  View3D: Shower,
  Symbol2D: Shower2D,
  Config: ShowerConfig,
  hitTest: (f: Furniture, px: number, pz: number, pad: number) => {
    const [x, , z] = f.position;
    const r = f.size[0];
    return px >= x - pad && px <= x + r + pad && pz >= z - pad && pz <= z + r + pad;
  },
  iconBox2D: (f: Furniture) => {
    const r = f.size[0];
    return { x0: 0, y0: 0, x1: r, y1: r };
  },
};
