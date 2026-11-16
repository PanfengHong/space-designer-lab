import type { GroundItem } from '../../../../types';
import type { OutdoorPlanPalette } from '../../planPalette';

/** 围墙 2D — 细长浅色矩形 */
export function Fence2D({ item, C, selected }: { item: GroundItem; C: OutdoorPlanPalette; selected?: boolean }) {
  const [w, , d] = item.size;
  return (
    <g>
      <rect x={-w / 2} y={-d / 2} width={w} height={d} fill={C.warehouse} stroke={C.warehouseStroke} strokeWidth={0.1} />
      {selected && <rect x={-w / 2} y={-d / 2} width={w} height={d} fill="none" stroke={C.select} strokeWidth={0.25} strokeDasharray="0.8 0.5" />}
    </g>
  );
}
