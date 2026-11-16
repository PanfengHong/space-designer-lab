import type { WallSegment, Window } from '../../../../types';
import { C } from '../../../common/planColors';

/** 单段墙体 — 深色粗线, 圆角端点, 窗户位置断开 */
export function WallLine({
  wall,
  thickness,
  windows,
}: {
  wall: WallSegment;
  thickness: number;
  windows: Window[];
}) {
  const [x1, z1] = wall.start;
  const [x2, z2] = wall.end;

  const isHorizontal = Math.abs(z2 - z1) < 0.01;
  const isVertical = Math.abs(x2 - x1) < 0.01;

  const gaps: [number, number][] = [];
  for (const win of windows) {
    const [wx, , wz] = win.position;
    const ww = win.width;
    const rot = win.rotation ?? 0;
    const winIsVertical = rot === 90 || rot === 270;

    if (isHorizontal && !winIsVertical) {
      if (Math.abs(wz - z1) < 0.3) gaps.push([wx - ww / 2, wx + ww / 2]);
    } else if (isVertical && winIsVertical) {
      if (Math.abs(wx - x1) < 0.3) gaps.push([wz - ww / 2, wz + ww / 2]);
    }
  }

  const wallLen = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
  if (wallLen < 0.001) return null;

  const gapRanges: [number, number][] = gaps.map(([s, e]) => {
    if (isHorizontal) {
      const denom = x2 - x1 || 1;
      return [(s - x1) / denom, (e - x1) / denom];
    } else {
      const denom = z2 - z1 || 1;
      return [(s - z1) / denom, (e - z1) / denom];
    }
  });

  const sortedRanges = gapRanges
    .map(([s, e]) => (s > e ? [e, s] : [s, e]) as [number, number])
    .sort((a, b) => a[0] - b[0]);

  const segments: [number, number][] = [];
  let cursor = 0;
  for (const [gs, ge] of sortedRanges) {
    const s = Math.max(0, Math.min(1, gs));
    const e = Math.max(0, Math.min(1, ge));
    if (s > cursor) segments.push([cursor, s]);
    cursor = Math.max(cursor, e);
  }
  if (cursor < 1) segments.push([cursor, 1]);

  if (segments.length === 0) return null;

  return (
    <g>
      {segments.map(([ts, te], i) => {
        const sx = x1 + (x2 - x1) * ts;
        const sz = z1 + (z2 - z1) * ts;
        const ex = x1 + (x2 - x1) * te;
        const ez = z1 + (z2 - z1) * te;
        return (
          <line
            key={i}
            x1={sx} y1={sz} x2={ex} y2={ez}
            stroke={C.wall}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </g>
  );
}
