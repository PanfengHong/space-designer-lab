import type { BayWindow, Door, FrenchWindow, WallSegment, Window } from '../../types';
import { C } from './planColors';

/**
 * 建筑结构元素的 2D 符号 —— 平面图与素材栏缩略图共用。
 *
 * 与 furnitureSymbol2D 同一思路: 一个出口, 两处消费。
 * 素材栏（StructureCatalog）在平面图模式下直接渲染这些组件,
 * 所以"素材卡上画的样子"就是"落到平面图里的样子", 不会漂移。
 *
 * 所有组件都以 position 为中心 (墙体按 start/end 画), 坐标系是 2D 的 (x, z)。
 */

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

/** 普通窗户 — 灰阶三线段 + 浅灰填充 */
export function Window2D({ window, wallThickness: wt }: { window: Window; wallThickness: number }) {
  const [x, , z] = window.position;
  const w = window.width;
  const rot = window.rotation ?? 0;
  const isVertical = rot === 90 || rot === 270;
  const half = wt / 2;

  if (isVertical) {
    return (
      <g>
        <rect x={x - half} y={z - w / 2} width={wt} height={w} fill={C.windowFill} opacity={0.6} />
        <line x1={x} y1={z - w / 2} x2={x} y2={z + w / 2} stroke={C.window} strokeWidth={0.04} />
        <line x1={x - half} y1={z - w / 2} x2={x - half} y2={z + w / 2} stroke={C.window} strokeWidth={0.04} />
        <line x1={x + half} y1={z - w / 2} x2={x + half} y2={z + w / 2} stroke={C.window} strokeWidth={0.04} />
      </g>
    );
  }
  return (
    <g>
      <rect x={x - w / 2} y={z - half} width={w} height={wt} fill={C.windowFill} opacity={0.6} />
      <line x1={x - w / 2} y1={z} x2={x + w / 2} y2={z} stroke={C.window} strokeWidth={0.04} />
      <line x1={x - w / 2} y1={z - half} x2={x + w / 2} y2={z - half} stroke={C.window} strokeWidth={0.04} />
      <line x1={x - w / 2} y1={z + half} x2={x + w / 2} y2={z + half} stroke={C.window} strokeWidth={0.04} />
    </g>
  );
}

/** 飘窗 — 灰阶凸出矩形 */
export function BayWindow2D({ bayWindow, wallThickness: wt }: { bayWindow: BayWindow; wallThickness: number }) {
  const [x, , z] = bayWindow.position;
  const w = bayWindow.width;
  const d = bayWindow.depth;
  const rot = bayWindow.rotation ?? 0;

  let rx = x, ry = z, rw = w, rh = d;
  if (rot === 0 || rot === 180) {
    rw = w; rh = d;
    ry = rot === 0 ? z : z - d;
    rx = x - w / 2;
  } else {
    rw = d; rh = w;
    rx = rot === 90 ? x : x - d;
    ry = z - w / 2;
  }

  return (
    <g>
      <rect
        x={rx} y={ry} width={rw} height={rh}
        fill={C.windowFill}
        stroke={C.window}
        strokeWidth={0.06}
      />
    </g>
  );
}

/** 落地窗 — 灰阶粗线 */
export function FrenchWindow2D({ frenchWindow }: { frenchWindow: FrenchWindow; wallThickness: number }) {
  const [x, , z] = frenchWindow.position;
  const w = frenchWindow.width;
  const rot = frenchWindow.rotation ?? 0;
  const isVertical = rot === 90 || rot === 270;

  if (isVertical) {
    return <line x1={x} y1={z - w / 2} x2={x} y2={z + w / 2} stroke={C.window} strokeWidth={0.12} />;
  }
  return <line x1={x - w / 2} y1={z} x2={x + w / 2} y2={z} stroke={C.window} strokeWidth={0.12} />;
}
