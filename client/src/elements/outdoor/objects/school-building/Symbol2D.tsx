import type { OutdoorObject } from '../../../../types';
import type { OutdoorPlanPalette } from '../../planPalette';

/** 校园建筑 (教学楼/实验楼/宿舍楼) 2D — 矩形 + 楼层分隔线 */
export function SchoolBuilding2D({ item, C, selected }: { item: OutdoorObject; C: OutdoorPlanPalette; selected?: boolean }) {
  const [w, , d] = item.size;
  return (
    <g>
      <rect
        x={-w / 2} y={-d / 2} width={w} height={d}
        rx={0.15} ry={0.15}
        fill={C.warehouse} stroke={C.warehouseStroke} strokeWidth={0.15}
      />
      {/* 楼层分隔线 */}
      <line x1={-w / 2} y1={-d / 6} x2={w / 2} y2={-d / 6} stroke={C.warehouseStroke} strokeWidth={0.06} opacity={0.6} />
      <line x1={-w / 2} y1={d / 6} x2={w / 2} y2={d / 6} stroke={C.warehouseStroke} strokeWidth={0.06} opacity={0.6} />
      {selected && (
        <rect x={-w / 2 - 0.15} y={-d / 2 - 0.15} width={w + 0.3} height={d + 0.3}
          fill="none" stroke={C.select} strokeWidth={0.25} strokeDasharray="0.8 0.5" />
      )}
    </g>
  );
}
