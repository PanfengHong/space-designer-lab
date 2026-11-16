import type { OutdoorObject } from '../../../../types';
import type { OutdoorPlanPalette } from '../../planPalette';

/** 门卫室 2D — 小矩形 + 窗口示意 */
export function GuardBooth2D({ item, C, selected }: { item: OutdoorObject; C: OutdoorPlanPalette; selected?: boolean }) {
  const [w, , d] = item.size;
  return (
    <g>
      <rect
        x={-w / 2} y={-d / 2} width={w} height={d}
        rx={0.15} ry={0.15}
        fill={C.warehouse} stroke={C.warehouseStroke} strokeWidth={0.12}
      />
      <rect x={-w / 4} y={-d / 4} width={w / 2} height={d / 2} fill="none" stroke={C.buildingStroke} strokeWidth={0.05} opacity={0.7} />
      {selected && (
        <rect x={-w / 2 - 0.15} y={-d / 2 - 0.15} width={w + 0.3} height={d + 0.3}
          fill="none" stroke={C.select} strokeWidth={0.25} strokeDasharray="0.8 0.5" />
      )}
    </g>
  );
}
