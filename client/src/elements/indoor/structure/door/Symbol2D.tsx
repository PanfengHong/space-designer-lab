import type { Door } from '../../../../types';
import { C } from '../../../common/planColors';

/** 门 — 灰阶风格, 打开状态 + 弧线 */
export function Door2D({ door, wallThickness: wt }: { door: Door; wallThickness: number }) {
  const [x, , z] = door.position;
  const w = door.width;
  const rot = door.rotation ?? 0;
  const openInward = door.openInward ?? false;
  const hingeSide = door.hingeSide ?? 'left';
  const isVerticalWall = rot === 90 || rot === 270;
  const hingeRight = hingeSide === 'right';

  let hingeX: number, hingeZ: number;
  let closedX: number, closedZ: number;
  let endX: number, endZ: number;
  let sweep: number;

  if (isVerticalWall) {
    if (rot === 90) {
      hingeX = x;
      hingeZ = hingeRight ? z - w / 2 : z + w / 2;
      closedX = x;
      closedZ = hingeRight ? z + w / 2 : z - w / 2;
      endX = x + (openInward ? w : -w);
      endZ = hingeZ;
      sweep = openInward ? 1 : 0;
    } else {
      hingeX = x;
      hingeZ = hingeRight ? z + w / 2 : z - w / 2;
      closedX = x;
      closedZ = hingeRight ? z - w / 2 : z + w / 2;
      endX = x + (openInward ? w : -w);
      endZ = hingeZ;
      sweep = openInward ? 0 : 1;
    }
  } else {
    if (rot === 0 || rot === undefined) {
      hingeX = hingeRight ? x + w / 2 : x - w / 2;
      hingeZ = z;
      closedX = hingeRight ? x - w / 2 : x + w / 2;
      closedZ = z;
      endX = hingeX;
      endZ = z + (openInward ? w : -w);
      sweep = openInward ? 1 : 0;
    } else {
      hingeX = hingeRight ? x - w / 2 : x + w / 2;
      hingeZ = z;
      closedX = hingeRight ? x + w / 2 : x - w / 2;
      closedZ = z;
      endX = hingeX;
      endZ = z + (openInward ? w : -w);
      sweep = openInward ? 0 : 1;
    }
  }

  return (
    <g>
      {/* 门洞 (白色缺口, 覆盖墙体) */}
      <line
        x1={isVerticalWall ? x : x - w / 2}
        y1={isVerticalWall ? z - w / 2 : z}
        x2={isVerticalWall ? x : x + w / 2}
        y2={isVerticalWall ? z + w / 2 : z}
        stroke={C.floor}
        strokeWidth={wt * 0.9}
      />
      {/* 开门轨迹弧线 */}
      <path
        d={`M ${closedX} ${closedZ} A ${w} ${w} 0 0 ${sweep} ${endX} ${endZ}`}
        fill="none"
        stroke={C.doorArc}
        strokeWidth={0.03}
        strokeDasharray="0.1 0.08"
      />
      {/* 门扇 */}
      <line
        x1={hingeX} y1={hingeZ} x2={endX} y2={endZ}
        stroke={C.door}
        strokeWidth={0.07}
        strokeLinecap="round"
      />
    </g>
  );
}
