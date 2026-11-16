import type { Furniture } from '../../../../types';
import { footprintOf } from '../metas';
import { C } from '../../../common/planColors';

/** 窗帘: 贴墙的细长条 + 竖向褶皱。沿墙方向是局部 Z (长), 进深是局部 X (薄)。 */
export function Curtain2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  const n = Math.max(4, Math.round(h / 0.18));
  return (
    <g>
      <rect
        x={x - w / 2} y={z - h / 2} width={w} height={h}
        fill={C.furnitureLight} stroke={C.furnitureStroke} strokeWidth={0.015}
      />
      {Array.from({ length: n }).map((_, i) => {
        const zz = z - h / 2 + ((i + 0.5) * h) / n;
        return (
          <line
            key={`fold-${i}`}
            x1={x - w / 2} y1={zz} x2={x + w / 2} y2={zz}
            stroke={C.furnitureStroke} strokeWidth={0.012} opacity={0.8}
          />
        );
      })}
    </g>
  );
}
