import type { Furniture } from '../../../../types';
import { footprintOf } from '../metas';
import { C } from '../../../common/planColors';

/** 洗手台: 台面 + 盆 */
export function Sink2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  return (
    <g>
      <rect
        x={x - w / 2} y={z - h / 2} width={w} height={h}
        fill={C.furnitureLight} stroke={C.furnitureStroke} strokeWidth={0.02} rx={0.04}
      />
      <ellipse
        cx={x} cy={z} rx={w * 0.3} ry={h * 0.3}
        fill={C.furniture} stroke={C.furnitureStroke} strokeWidth={0.02}
      />
    </g>
  );
}
