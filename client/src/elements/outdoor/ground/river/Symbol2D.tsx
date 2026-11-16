import type { GroundItem } from '../../../../types';
import type { OutdoorPlanPalette } from '../../planPalette';

/** 河流 2D — 蓝色水面 + 内圈虚线 */
export function River2D({ item, C, selected }: { item: GroundItem; C: OutdoorPlanPalette; selected?: boolean }) {
  const [w, , d] = item.size;
  return (
    <g>
      <rect x={-w / 2} y={-d / 2} width={w} height={d} fill={C.river} stroke={C.riverStroke} strokeWidth={0.12} />
      <rect x={-w / 2 + 0.6} y={-d / 2 + 0.6} width={w - 1.2} height={d - 1.2} fill="none" stroke={C.riverStroke} strokeWidth={0.1} strokeDasharray="0.8 0.6" />
      {selected && <rect x={-w / 2} y={-d / 2} width={w} height={d} fill="none" stroke={C.select} strokeWidth={0.25} strokeDasharray="0.8 0.5" />}
    </g>
  );
}
