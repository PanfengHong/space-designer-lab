import type { Furniture } from '../../../../types';
import { footprintOf } from '../metas';
import { C } from '../../../common/planColors';

/** 洗衣机: 矩形 + 圆形门 */
export function Washer2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  return (
    <g>
      <rect
        x={x - w / 2} y={z - h / 2} width={w} height={h}
        fill={C.furnitureLight} stroke={C.furnitureStroke} strokeWidth={0.02} rx={0.04}
      />
      <circle
        cx={x} cy={z} r={Math.min(w, h) * 0.3}
        fill="none" stroke={C.furnitureStroke} strokeWidth={0.02}
      />
    </g>
  );
}
