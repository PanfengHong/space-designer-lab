import type { GroundItem } from '../../../../types';
import type { OutdoorPlanPalette } from '../../planPalette';

/** 操场 2D — 红色塑胶场地 + 跑道环线 */
export function Playground2D({ item, C, selected }: { item: GroundItem; C: OutdoorPlanPalette; selected?: boolean }) {
  const [w, , d] = item.size;
  return (
    <g>
      <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={0.3} ry={0.3} fill="#e8b8b8" stroke="#c98f8f" strokeWidth={0.12} />
      <rect x={-w / 2 + 0.8} y={-d / 2 + 0.8} width={w - 1.6} height={d - 1.6} rx={0.2} ry={0.2} fill="#d93636" stroke="#b92626" strokeWidth={0.08} opacity={0.85} />
      {selected && <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={0.3} ry={0.3} fill="none" stroke={C.select} strokeWidth={0.25} strokeDasharray="0.8 0.5" />}
    </g>
  );
}
