import type { Furniture } from '../../../../types';
import { footprintOf } from '../metas';
import { C } from '../../../common/planColors';

/** 落地灯 / 绿植: 圆 + 内圆 (俯视轮廓) */
export function Decor2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  const r = Math.min(w, h) / 2;
  return (
    <g>
      <circle cx={x} cy={z} r={r} fill={C.furnitureLight} stroke={C.furnitureStroke} strokeWidth={0.02} />
      <circle cx={x} cy={z} r={r * 0.45} fill="none" stroke={C.furnitureStroke} strokeWidth={0.02} />
    </g>
  );
}
