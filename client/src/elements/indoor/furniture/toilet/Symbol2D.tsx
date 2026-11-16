import type { Furniture } from '../../../../types';
import { footprintOf } from '../metas';
import { C } from '../../../common/planColors';

/** 马桶: 水箱 + 椭圆座 */
export function Toilet2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  return (
    <g>
      <rect
        x={x - w / 2} y={z - h / 2} width={w} height={h * 0.35}
        fill={C.furnitureLight} stroke={C.furnitureStroke} strokeWidth={0.02} rx={0.03}
      />
      <ellipse
        cx={x} cy={z + h * 0.15} rx={w * 0.4} ry={h * 0.3}
        fill={C.furnitureLight} stroke={C.furnitureStroke} strokeWidth={0.02}
      />
    </g>
  );
}
