import type { GroundItem } from '../../../../types';
import type { OutdoorPlanPalette } from '../../planPalette';

/** 道路车道虚线 (2 车道 / 4 车道) */
function RoadMarkings({ w, d, lanes, C }: { w: number; d: number; lanes: 2 | 4; C: OutdoorPlanPalette }) {
  const edgeZ = d / 2 - 0.22;
  const dashList = Array.from({ length: Math.floor((w - 2) / 3) }, (_, i) => -w / 2 + 1.5 + i * 3);
  if (lanes === 4) {
    return (
      <g>
        <rect x={-w / 2 + 1} y={-edgeZ - 0.04} width={w - 2} height={0.08} fill={C.roadLine} opacity={0.9} />
        <rect x={-w / 2 + 1} y={edgeZ - 0.04} width={w - 2} height={0.08} fill={C.roadLine} opacity={0.9} />
        <rect x={-w / 2 + 1} y={0.09 - 0.04} width={w - 2} height={0.06} fill={C.roadLine} />
        <rect x={-w / 2 + 1} y={-0.09 - 0.04} width={w - 2} height={0.06} fill={C.roadLine} />
        {dashList.map((x, i) => (
          <g key={i}>
            <rect x={x} y={d / 4 - 0.04} width={1.4} height={0.08} fill={C.roadLine} />
            <rect x={x} y={-d / 4 - 0.04} width={1.4} height={0.08} fill={C.roadLine} />
          </g>
        ))}
      </g>
    );
  }
  return (
    <g>
      <rect x={-w / 2 + 1} y={-edgeZ - 0.04} width={w - 2} height={0.08} fill={C.roadLine} opacity={0.9} />
      <rect x={-w / 2 + 1} y={edgeZ - 0.04} width={w - 2} height={0.08} fill={C.roadLine} opacity={0.9} />
      {dashList.map((x, i) => (
        <rect key={i} x={x} y={-0.04} width={1.4} height={0.08} fill={C.roadLine} />
      ))}
    </g>
  );
}

/** 道路 2D — 灰蓝路面 + 车道虚线; y>0.5 时是高架道路, 画桥墩支点 */
export function Road2D({ item, C, selected }: { item: GroundItem; C: OutdoorPlanPalette; selected?: boolean }) {
  const [w, , d] = item.size;
  const elevated = item.position[1] > 0.5;
  return (
    <g>
      {elevated && (
        Array.from({ length: Math.floor((w - 4) / 10) + 1 }, (_, i) => (
          <circle key={i} cx={-w / 2 + 5 + i * 10} cy={0} r={0.28} fill={C.pillar} stroke={C.pillarStroke} strokeWidth={0.08} />
        ))
      )}
      <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={0.25} ry={0.25} fill={elevated ? C.roadElevated : C.road} stroke={C.roadStroke} strokeWidth={0.12} />
      <RoadMarkings w={w} d={d} lanes={item.lanes === 4 ? 4 : 2} C={C} />
      {selected && <rect x={-w / 2} y={-d / 2} width={w} height={d} fill="none" stroke={C.select} strokeWidth={0.25} strokeDasharray="0.8 0.5" />}
    </g>
  );
}
