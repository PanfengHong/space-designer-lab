import type { Furniture } from '../../../../types';
import { footprintOf } from '../metas';
import { C } from '../../../common/planColors';

/**
 * 空调 (壁挂): 平面图上是贴墙的细长条 —— 进深薄、沿墙长。
 * 局部 +X 是出风面 (与 3D 的前脸同侧), 用一条虚线示意送风方向。
 */
export function Ac2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  return (
    <g>
      <rect
        x={x - w / 2} y={z - h / 2} width={w} height={h}
        fill={C.furnitureLight} stroke={C.furnitureStroke} strokeWidth={0.02}
        rx={Math.min(w, h) * 0.25}
      />
      {[-0.3, 0, 0.3].map((o, i) => (
        <line
          key={`vent-${i}`}
          x1={x + w * 0.08} y1={z + h * o}
          x2={x + w / 2 - 0.01} y2={z + h * o}
          stroke={C.furnitureStroke} strokeWidth={0.018}
        />
      ))}
      <line
        x1={x + w / 2 + 0.04} y1={z - h * 0.4}
        x2={x + w / 2 + 0.04} y2={z + h * 0.4}
        stroke={C.furnitureStroke} strokeWidth={0.02} strokeDasharray="0.05 0.05" opacity={0.7}
      />
    </g>
  );
}
