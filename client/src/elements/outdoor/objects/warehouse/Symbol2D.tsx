import type { OutdoorObject } from '../../../../types';
import type { OutdoorPlanPalette } from '../../planPalette';

/** 厂房仓库 2D — 浅色填充 + 两个卷帘门 */
export function Warehouse2D({ item, C, selected }: { item: OutdoorObject; C: OutdoorPlanPalette; selected?: boolean }) {
  const [w, , d] = item.size;
  return (
    <g>
      <rect
        x={-w / 2} y={-d / 2} width={w} height={d}
        rx={0.15} ry={0.15}
        fill={C.warehouse} stroke={C.warehouseStroke} strokeWidth={0.15}
      />
      {/* 卷帘门 */}
      <rect x={-w * 0.29} y={d / 2 - 0.06} width={w * 0.22} height={0.06} fill={C.buildingStroke} opacity={0.85} />
      <rect x={w * 0.07} y={d / 2 - 0.06} width={w * 0.22} height={0.06} fill={C.buildingStroke} opacity={0.85} />
      {selected && (
        <rect x={-w / 2 - 0.15} y={-d / 2 - 0.15} width={w + 0.3} height={d + 0.3}
          fill="none" stroke={C.select} strokeWidth={0.25} strokeDasharray="0.8 0.5" />
      )}
    </g>
  );
}
