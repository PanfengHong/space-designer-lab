import type { Furniture } from '../../../../types';
import { footprintOf } from '../metas';
import { C } from '../../../common/planColors';

/** 冰箱: 矩形 + 上下门分隔 */
export function Fridge2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  return (
    <g>
      <rect
        x={x - w / 2} y={z - h / 2} width={w} height={h}
        fill={C.furnitureLight} stroke={C.furnitureStroke} strokeWidth={0.02} rx={0.04}
      />
      <line
        x1={x - w / 2 + 0.03} y1={z} x2={x + w / 2 - 0.03} y2={z}
        stroke={C.furnitureStroke} strokeWidth={0.02} opacity={0.5}
      />
    </g>
  );
}
