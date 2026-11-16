import type { Furniture } from '../../../../types';
import { footprintOf } from '../metas';
import { C } from '../../../common/planColors';

/** 床: 床架 + 被褥 + 双枕 + 床头板 (床头板在 -X 外侧, 与 3D 同构) */
export function Bed2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  const headT = 0.08;
  const pillowW = 0.4;
  const pillowH = 0.6;
  const pillowX = x - w / 2 + 0.35;
  return (
    <g>
      <rect
        x={x - w / 2} y={z - h / 2} width={w} height={h}
        fill={C.furnitureLight} stroke={C.furnitureStroke} strokeWidth={0.02} rx={0.05}
      />
      <rect
        x={x + 0.1 - (w - 0.05) / 2} y={z - (h - 0.15) / 2}
        width={w - 0.05} height={h - 0.15}
        fill={C.furniture} stroke="none" rx={0.04}
      />
      {[-h / 4, h / 4].map((oz, i) => (
        <rect
          key={`pillow-${i}`}
          x={pillowX - pillowW / 2} y={z + oz - pillowH / 2}
          width={pillowW} height={pillowH}
          fill={C.floor} stroke={C.furnitureStroke} strokeWidth={0.015} rx={0.06}
        />
      ))}
      <rect
        data-part="headboard"
        x={x - w / 2 - headT} y={z - h / 2} width={headT} height={h}
        fill="#c2c2c2" stroke="#9e9e9e" strokeWidth={0.015} rx={0.02}
      />
    </g>
  );
}
