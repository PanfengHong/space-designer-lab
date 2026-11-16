import type { GroundItem } from '../../../../types';
import type { OutdoorPlanPalette } from '../../planPalette';

/** 地面基座 2D — 白色大矩形 */
export function GroundSlab2D({ item, C, selected }: { item: GroundItem; C: OutdoorPlanPalette; selected?: boolean }) {
  const [w, , d] = item.size;
  return (
    <g>
      <rect x={-w / 2} y={-d / 2} width={w} height={d} fill={C.ground} stroke={C.groundStroke} strokeWidth={0.15} />
      {selected && <rect x={-w / 2} y={-d / 2} width={w} height={d} fill="none" stroke={C.select} strokeWidth={0.25} strokeDasharray="0.8 0.5" />}
    </g>
  );
}
