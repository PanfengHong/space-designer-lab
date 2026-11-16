import type { OutdoorObject } from '../../../../types';
import type { OutdoorPlanPalette } from '../../planPalette';

/** 轿车 2D — 圆角车身 + 前后挡风玻璃示意 */
export function Car2D({ item, C, selected }: { item: OutdoorObject; C: OutdoorPlanPalette; selected?: boolean }) {
  const [w, , d] = item.size;
  return (
    <g>
      <rect
        x={-w / 2} y={-d / 2} width={w} height={d}
        rx={0.3} ry={0.3}
        fill={C.car} stroke={C.carStroke} strokeWidth={0.1}
      />
      {/* 座舱 */}
      <rect x={-w * 0.18} y={-d / 2 + 0.08} width={w * 0.4} height={d - 0.16} rx={0.12} fill="none" stroke={C.carStroke} strokeWidth={0.04} opacity={0.7} />
      {selected && (
        <rect x={-w / 2 - 0.15} y={-d / 2 - 0.15} width={w + 0.3} height={d + 0.3}
          fill="none" stroke={C.select} strokeWidth={0.25} strokeDasharray="0.8 0.5" />
      )}
    </g>
  );
}
