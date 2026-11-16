import type { GroundItem } from '../../../../types';
import type { OutdoorPlanPalette } from '../../planPalette';

/** 草地 2D — 圆角绿色矩形 */
export function Grass2D({ item, C, selected }: { item: GroundItem; C: OutdoorPlanPalette; selected?: boolean }) {
  const [w, , d] = item.size;
  return (
    <g>
      <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={0.6} ry={0.6} fill={C.grass} stroke={C.grassStroke} strokeWidth={0.12} />
      {selected && <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={0.6} ry={0.6} fill="none" stroke={C.select} strokeWidth={0.25} strokeDasharray="0.8 0.5" />}
    </g>
  );
}
