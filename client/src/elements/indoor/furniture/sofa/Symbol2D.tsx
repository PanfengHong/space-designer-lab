import type { Furniture } from '../../../../types';
import { footprintOf } from '../metas';
import { C } from '../../../common/planColors';

/** 沙发: 圆角矩形 + 坐垫分隔 */
export function Sofa2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  return (
    <g>
      <rect
        x={x - w / 2} y={z - h / 2} width={w} height={h}
        fill={C.furniture} stroke={C.furnitureStroke} strokeWidth={0.02} rx={0.08}
      />
      <line
        x1={x - w / 2 + w * 0.15} y1={z}
        x2={x + w / 2 - w * 0.15} y2={z}
        stroke={C.furnitureStroke} strokeWidth={0.02} opacity={0.5}
      />
    </g>
  );
}
