import type { Furniture } from '../../../../types';
import { footprintOf } from '../metas';
import { C } from '../../../common/planColors';

/** 柜子: 高柜 (h>1.5) 画挂衣杆 + 衣架斜线, 其余画门板分隔线 */
export function Cabinet2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  const isWardrobe = furniture.size[1] > 1.5;

  if (!isWardrobe) {
    return (
      <g>
        <rect
          x={x - w / 2} y={z - h / 2} width={w} height={h}
          fill={C.furniture} stroke={C.furnitureStroke} strokeWidth={0.02} rx={0.03}
        />
        <line
          x1={x} y1={z - h / 2 + 0.05} x2={x} y2={z + h / 2 - 0.05}
          stroke={C.furnitureStroke} strokeWidth={0.02} opacity={0.4}
        />
      </g>
    );
  }

  const backX = -w / 2 + 0.04;
  const frontX = w / 2 - 0.04;
  const railHalf = h / 2 - 0.08;
  const n = Math.max(3, Math.round(h / 0.25));
  const tilt = (frontX - backX) * 0.35 * 0.5;
  return (
    <g>
      <rect
        x={x - w / 2} y={z - h / 2} width={w} height={h}
        fill={C.furniture} stroke={C.furnitureStroke} strokeWidth={0.02} rx={0.03}
      />
      {Array.from({ length: n + 1 }).map((_, i) => {
        const zi = Math.max(
          -railHalf + tilt,
          Math.min(railHalf - tilt, -railHalf + 0.07 + (i * (2 * railHalf - 0.14)) / n),
        );
        return (
          <line
            key={i}
            x1={x + backX} y1={z + zi + tilt}
            x2={x + frontX} y2={z + zi - tilt}
            stroke={C.textDim} strokeWidth={0.025} opacity={0.8}
          />
        );
      })}
      <line x1={x} y1={z - railHalf} x2={x} y2={z + railHalf} stroke={C.textDim} strokeWidth={0.035} />
    </g>
  );
}
