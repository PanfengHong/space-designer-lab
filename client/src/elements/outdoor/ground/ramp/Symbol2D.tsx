import type { GroundItem } from '../../../../types';
import type { OutdoorPlanPalette } from '../../planPalette';

/** 匝道 2D — 斜线纹理表示斜坡 + 两侧护栏线 */
export function Ramp2D({ item, C, selected }: { item: GroundItem; C: OutdoorPlanPalette; selected?: boolean }) {
  const [w, , d] = item.size;
  return (
    <g>
      <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={0.15} ry={0.15} fill={C.road} stroke={C.roadStroke} strokeWidth={0.12} />
      {/* 斜线纹理表示斜坡 */}
      {Array.from({ length: Math.max(2, Math.floor(w / 1.5)) }, (_, i) => (
        <line
          key={i}
          x1={-w / 2 + (i + 0.5) * (w / Math.max(2, Math.floor(w / 1.5)))}
          y1={-d / 2 + 0.1}
          x2={-w / 2 + (i + 0.5) * (w / Math.max(2, Math.floor(w / 1.5))) - 0.4}
          y2={d / 2 - 0.1}
          stroke={C.roadStroke}
          strokeWidth={0.04}
        />
      ))}
      {/* 两侧护栏线 */}
      <line x1={-w / 2} y1={-d / 2 + 0.1} x2={w / 2} y2={-d / 2 + 0.1} stroke={C.roadLine} strokeWidth={0.08} />
      <line x1={-w / 2} y1={d / 2 - 0.1} x2={w / 2} y2={d / 2 - 0.1} stroke={C.roadLine} strokeWidth={0.08} />
      {/* 中央虚线 */}
      <line x1={-w / 2 + 0.5} y1={0} x2={w / 2 - 0.5} y2={0} stroke={C.roadLine} strokeWidth={0.05} strokeDasharray="0.6 0.4" />
      {selected && <rect x={-w / 2} y={-d / 2} width={w} height={d} fill="none" stroke={C.select} strokeWidth={0.25} strokeDasharray="0.8 0.5" />}
    </g>
  );
}
