import type { GroundItem } from '../../../../types';
import type { OutdoorPlanPalette } from '../../planPalette';

/**
 * 路口 2D — 中央方块 + 端面延伸条 + 内角扇形圆弧 + 十字标线。
 * 支线数 branches: 2/3=丁字岔口, 4=十字路口。
 */
export function Intersection2D({ item, C, selected }: { item: GroundItem; C: OutdoorPlanPalette; selected?: boolean }) {
  const [w, , d] = item.size;
  const half = Math.min(w, d) / 2;
  const lineLen = Math.min(w, d) * 0.7;
  const branches = item.branches ?? 4;
  const arcR = item.arcRadius ?? 1.5;
  const stub = Math.max(w, d) * 0.5;
  // 4 个角: 每个角带 a0 (起始角度, SVG 中 Y 朝下, 0=+X右, π/2=+Y下, π=-X左, 3π/2=-Y上)
  // 每个扇形从角点朝路口中心 (0,0) 方向延伸:
  //   右上(half,half) → 朝 -X 和 -Y → 覆盖 π 到 3π/2, sweep=1 (顺时针), 起点 π
  //   左上(-half,half) → 朝 +X 和 -Y → 覆盖 3π/2 到 2π, sweep=1, 起点 3π/2
  //   左下(-half,-half) → 朝 +X 和 +Y → 覆盖 0 到 π/2, sweep=1, 起点 0
  //   右下(half,-half) → 朝 -X 和 +Y → 覆盖 π/2 到 π, sweep=1, 起点 π/2
  const cornerArcs = [
    { cx: half, cz: half, a0: Math.PI, minBranches: 2 },
    { cx: -half, cz: half, a0: Math.PI * 1.5, minBranches: 3 },
    { cx: -half, cz: -half, a0: 0, minBranches: 4 },
    { cx: half, cz: -half, a0: Math.PI / 2, minBranches: 4 },
  ].filter((c) => branches >= c.minBranches);
  return (
    <g>
      {/* 端面延伸条 */}
      <rect x={w / 2} y={-d / 2} width={stub} height={d} fill={C.road} stroke={C.roadStroke} strokeWidth={0.08} />
      <rect x={-w / 2 - stub} y={-d / 2} width={stub} height={d} fill={C.road} stroke={C.roadStroke} strokeWidth={0.08} />
      {branches >= 3 && <rect x={-w / 2} y={d / 2} width={w} height={stub} fill={C.road} stroke={C.roadStroke} strokeWidth={0.08} />}
      {branches >= 4 && <rect x={-w / 2} y={-d / 2 - stub} width={w} height={stub} fill={C.road} stroke={C.roadStroke} strokeWidth={0.08} />}
      {/* 中央方块 */}
      <rect x={-w / 2} y={-d / 2} width={w} height={d} fill={C.road} stroke={C.roadStroke} strokeWidth={0.12} />
      {/* 内角扇形圆弧 (SVG path, 每个 1/4 圆从角点向路口中心方向延伸) */}
      {cornerArcs.map((c, i) => {
        const x0 = c.cx, y0 = c.cz;
        const sx = x0 + arcR * Math.cos(c.a0);
        const sy = y0 + arcR * Math.sin(c.a0);
        const ex = x0 + arcR * Math.cos(c.a0 + Math.PI / 2);
        const ey = y0 + arcR * Math.sin(c.a0 + Math.PI / 2);
        return (
          <path key={`arc-${i}`}
            d={`M ${x0} ${y0} L ${sx} ${sy} A ${arcR} ${arcR} 0 0 1 ${ex} ${ey} Z`}
            fill={C.road}
            stroke={C.roadStroke}
            strokeWidth={0.08}
          />
        );
      })}
      {/* 十字标线 */}
      <rect x={-lineLen / 2} y={-0.04} width={lineLen} height={0.08} fill={C.roadLine} />
      {branches === 4 && <rect x={-0.04} y={-lineLen / 2} width={0.08} height={lineLen} fill={C.roadLine} />}
      {/* 中央圆点 */}
      <circle cx={0} cy={0} r={0.18} fill="none" stroke={C.roadLine} strokeWidth={0.05} />
      {/* 端面让车虚线 */}
      <line x1={half + stub - 0.6} y1={0} x2={half + stub - 0.1} y2={0} stroke={C.roadLine} strokeWidth={0.05} strokeDasharray="0.15 0.1" />
      <line x1={-half - stub + 0.1} y1={0} x2={-half - stub + 0.6} y2={0} stroke={C.roadLine} strokeWidth={0.05} strokeDasharray="0.15 0.1" />
      {branches >= 3 && <line x1={0} y1={half + stub - 0.6} x2={0} y2={half + stub - 0.1} stroke={C.roadLine} strokeWidth={0.05} strokeDasharray="0.15 0.1" />}
      {branches >= 4 && <line x1={0} y1={-half - stub + 0.1} x2={0} y2={-half - stub + 0.6} stroke={C.roadLine} strokeWidth={0.05} strokeDasharray="0.15 0.1" />}
      {selected && <rect x={-w / 2 - stub} y={-d / 2 - (branches >= 4 ? stub : 0)} width={w + 2 * stub} height={d + (branches >= 3 ? stub : 0) + (branches >= 4 ? stub : 0)} fill="none" stroke={C.select} strokeWidth={0.25} strokeDasharray="0.8 0.5" />}
    </g>
  );
}
