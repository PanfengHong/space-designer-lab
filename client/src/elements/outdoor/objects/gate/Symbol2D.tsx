import type { OutdoorObject } from '../../../../types';
import type { OutdoorPlanPalette } from '../../planPalette';

/** 园区大门 2D — 细长门体 + 两侧门柱 */
export function Gate2D({ item, C, selected }: { item: OutdoorObject; C: OutdoorPlanPalette; selected?: boolean }) {
  const [w, , d] = item.size;
  const pillarW = Math.max(0.4, d * 0.9);
  return (
    <g>
      <rect x={-w / 2} y={-d / 2} width={w} height={d} fill={C.warehouse} stroke={C.warehouseStroke} strokeWidth={0.08} />
      <rect x={-w / 2} y={-d / 2} width={pillarW} height={d} fill={C.buildingStroke} stroke={C.warehouseStroke} strokeWidth={0.06} />
      <rect x={w / 2 - pillarW} y={-d / 2} width={pillarW} height={d} fill={C.buildingStroke} stroke={C.warehouseStroke} strokeWidth={0.06} />
      {selected && (
        <rect x={-w / 2 - 0.15} y={-d / 2 - 0.15} width={w + 0.3} height={d + 0.3}
          fill="none" stroke={C.select} strokeWidth={0.25} strokeDasharray="0.8 0.5" />
      )}
    </g>
  );
}
