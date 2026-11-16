import type { OutdoorObject } from '../../../../types';
import type { OutdoorPlanPalette } from '../../planPalette';

/** 树木 2D — 俯视树冠: 双圆轮廓 */
export function Tree2D({ item, C, selected }: { item: OutdoorObject; C: OutdoorPlanPalette; selected?: boolean }) {
  const [w, , d] = item.size;
  return (
    <g>
      <circle cx={0} cy={0} r={Math.min(w, d) / 2} fill={C.tree} stroke={C.treeStroke} strokeWidth={0.12} />
      <circle cx={0} cy={0} r={Math.min(w, d) / 2 * 0.55} fill="none" stroke={C.treeStroke} strokeWidth={0.06} opacity={0.6} />
      {selected && (
        <rect x={-w / 2 - 0.15} y={-d / 2 - 0.15} width={w + 0.3} height={d + 0.3}
          fill="none" stroke={C.select} strokeWidth={0.25} strokeDasharray="0.8 0.5" />
      )}
    </g>
  );
}
