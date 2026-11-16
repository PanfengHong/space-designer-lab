import type { OutdoorObject } from '../../../../types';
import type { OutdoorPlanPalette } from '../../planPalette';

/** 卡车 2D — 货厢 + 车头驾驶室 */
export function Truck2D({ item, C, selected }: { item: OutdoorObject; C: OutdoorPlanPalette; selected?: boolean }) {
  const [w, , d] = item.size;
  const cabW = w * 0.24;
  return (
    <g>
      <rect
        x={-w / 2} y={-d / 2} width={w} height={d}
        rx={0.3} ry={0.3}
        fill={C.truck} stroke={C.truckStroke} strokeWidth={0.1}
      />
      <rect x={w / 2 - cabW} y={-d / 2} width={cabW} height={d} fill={C.warehouse} stroke={C.truckStroke} strokeWidth={0.06} />
      {selected && (
        <rect x={-w / 2 - 0.15} y={-d / 2 - 0.15} width={w + 0.3} height={d + 0.3}
          fill="none" stroke={C.select} strokeWidth={0.25} strokeDasharray="0.8 0.5" />
      )}
    </g>
  );
}
