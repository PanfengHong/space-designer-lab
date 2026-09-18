import { useRef, useState, useCallback, useEffect } from 'react';
import type { Room, WallSegment, Door, Furniture } from '../../types';
import { useAppStore } from '../../store/useAppStore';

/* ============================================================
 * 极简灰阶平面图 (参考建筑户型图风格)
 *  - 深色粗墙体, 圆角端点
 *  - 浅灰简化家具, 无文字标注
 *  - 灰阶门窗, 无彩色
 *  - 房间标签居中, 深灰文字
 * ============================================================ */

// 灰阶色板
const C = {
  bg: '#f5f5f5',
  floor: '#ffffff',
  floorAlt: '#f0f0f0',
  wall: '#1f1f1f',
  wallInner: '#2a2a2a',
  door: '#888888',
  doorArc: '#bbbbbb',
  window: '#9a9a9a',
  windowFill: '#d8d8d8',
  furniture: '#e2e2e2',
  furnitureStroke: '#b8b8b8',
  furnitureDark: '#d0d0d0',
  furnitureLight: '#ededed',
  text: '#555555',
  textDim: '#888888',
};

export function FloorPlan2D() {
  const showSpaceName = useAppStore((s) => s.viewSettings.showSpaceName);
  const sceneData = useAppStore((s) => s.sceneData);
  const setPixelsPerMeter = useAppStore((s) => s.setPixelsPerMeter);
  const rooms = sceneData.rooms;
  const wallT = sceneData.wallThickness;

  // 缩放和平移状态
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // 计算所有墙的边界
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  rooms.forEach((room) => {
    room.walls.forEach((w) => {
      minX = Math.min(minX, w.start[0], w.end[0]);
      maxX = Math.max(maxX, w.start[0], w.end[0]);
      minZ = Math.min(minZ, w.start[1], w.end[1]);
      maxZ = Math.max(maxZ, w.start[1], w.end[1]);
    });
    room.bayWindows?.forEach((bw) => {
      const protrude = bw.depth;
      const dir = bw.rotation ?? 0;
      let bx = bw.position[0], bz = bw.position[2];
      if (dir === 0) bz += protrude;
      else if (dir === 180) bz -= protrude;
      else if (dir === 90) bx += protrude;
      else if (dir === 270) bx -= protrude;
      minX = Math.min(minX, bx - bw.width / 2);
      maxX = Math.max(maxX, bx + bw.width / 2);
      minZ = Math.min(minZ, bz - bw.width / 2);
      maxZ = Math.max(maxZ, bz + bw.width / 2);
    });
  });

  const pad = 1.5;
  const vbX = minX - pad;
  const vbY = minZ - pad;
  const vbW = (maxX - minX) + pad * 2;
  const vbH = (maxZ - minZ) + pad * 2;

  // 滚轮缩放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setZoom((z) => Math.max(0.3, Math.min(8, z * delta)));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  }, [pan.x, pan.y]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isPanning.current = false;
    try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {}
  }, []);

  const handleDoubleClick = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prevent = (e: WheelEvent) => e.preventDefault();
    el.addEventListener('wheel', prevent, { passive: false });
    return () => el.removeEventListener('wheel', prevent);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updatePpm = () => {
      const containerW = el.clientWidth;
      const ppm = (containerW * zoom) / vbW;
      setPixelsPerMeter(Math.max(1, ppm));
    };
    updatePpm();
    const ro = new ResizeObserver(updatePpm);
    ro.observe(el);
    return () => ro.disconnect();
  }, [zoom, vbW, setPixelsPerMeter]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden relative"
      style={{ backgroundColor: C.bg, cursor: isPanning.current ? 'grabbing' : 'grab' }}
    >
      {/* 缩放控制按钮 */}
      <div className="absolute right-3 bottom-3 z-10 flex flex-col gap-1 select-none">
        <button
          onClick={() => setZoom((z) => Math.min(8, z * 1.25))}
          className="w-8 h-8 bg-white/90 backdrop-blur-md rounded-md shadow border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-white hover:text-gray-900 transition-colors text-sm font-medium"
          title="放大"
        >+</button>
        <button
          onClick={() => setZoom((z) => Math.max(0.3, z / 1.25))}
          className="w-8 h-8 bg-white/90 backdrop-blur-md rounded-md shadow border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-white hover:text-gray-900 transition-colors text-sm font-medium"
          title="缩小"
        >−</button>
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          className="w-8 h-8 bg-white/90 backdrop-blur-md rounded-md shadow border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-white hover:text-gray-900 transition-colors text-[10px]"
          title="重置"
        >1:1</button>
      </div>
      <svg
        ref={svgRef}
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        style={{
          width: '100%',
          height: '100%',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center',
        }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        {/* 房间地面填充 */}
        {rooms.map((room) => (
          <RoomFloor key={`floor-${room.id}`} room={room} />
        ))}

        {/* 飘窗凸出结构 */}
        {rooms.map((room) =>
          room.bayWindows?.map((bw) => (
            <BayWindow2D key={bw.id} bayWindow={bw} wallThickness={wallT} />
          ))
        )}

        {/* 墙体 (窗户位置断开) */}
        {rooms.map((room) =>
          room.walls.map((wall) =>
            wall.opening ? null : (
              <WallLine key={wall.id} wall={wall} thickness={wallT} windows={room.windows ?? []} />
            )
          )
        )}

        {/* 落地窗 */}
        {rooms.map((room) =>
          room.frenchWindows?.map((fw) => (
            <FrenchWindow2D key={fw.id} frenchWindow={fw} wallThickness={wallT} />
          ))
        )}

        {/* 普通窗户 */}
        {rooms.map((room) =>
          room.windows.map((win) => (
            <Window2D key={win.id} window={win} wallThickness={wallT} />
          ))
        )}

        {/* 门 */}
        {rooms.map((room) =>
          room.doors.map((door) => (
            <Door2D key={door.id} door={door} wallThickness={wallT} />
          ))
        )}

        {/* 家具 */}
        {rooms.map((room) =>
          room.furniture.map((f) => (
            <Furniture2D key={f.id} furniture={f} />
          ))
        )}

        {/* 房间名称 */}
        {showSpaceName && rooms.map((room) => {
          const xs = room.walls.flatMap((w) => [w.start[0], w.end[0]]);
          const zs = room.walls.flatMap((w) => [w.start[1], w.end[1]]);
          const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
          const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
          return (
            <text
              key={`label-${room.id}`}
              x={cx}
              y={cz}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={C.text}
              fontSize={0.5}
              fontWeight={500}
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              {room.name}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/** 房间地面填充 — 白色 */
function RoomFloor({ room }: { room: Room }) {
  const xs = room.walls.flatMap((w) => [w.start[0], w.end[0]]);
  const zs = room.walls.flatMap((w) => [w.start[1], w.end[1]]);
  const x = Math.min(...xs);
  const z = Math.min(...zs);
  const w = Math.max(...xs) - x;
  const h = Math.max(...zs) - z;
  return (
    <rect x={x} y={z} width={w} height={h} fill={C.floor} stroke="none" />
  );
}

/** 单段墙体 — 深色粗线, 圆角端点, 窗户位置断开 */
function WallLine({
  wall,
  thickness,
  windows,
}: {
  wall: WallSegment;
  thickness: number;
  windows: import('../../types').Window[];
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
function Door2D({ door, wallThickness: wt }: { door: Door; wallThickness: number }) {
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
function Window2D({ window, wallThickness: wt }: { window: import('../../types').Window; wallThickness: number }) {
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
function BayWindow2D({ bayWindow, wallThickness: wt }: { bayWindow: import('../../types').BayWindow; wallThickness: number }) {
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
function FrenchWindow2D({ frenchWindow, wallThickness: wt }: { frenchWindow: import('../../types').FrenchWindow; wallThickness: number }) {
  const [x, , z] = frenchWindow.position;
  const w = frenchWindow.width;
  const rot = frenchWindow.rotation ?? 0;
  const isVertical = rot === 90 || rot === 270;

  if (isVertical) {
    return <line x1={x} y1={z - w / 2} x2={x} y2={z + w / 2} stroke={C.window} strokeWidth={0.12} />;
  }
  return <line x1={x - w / 2} y1={z} x2={x + w / 2} y2={z} stroke={C.window} strokeWidth={0.12} />;
}

/** 家具 — 极简灰阶图形, 无文字标注 */
function Furniture2D({ furniture }: { furniture: Furniture }) {
  if (furniture.type === 'shower') return <Shower2D furniture={furniture} />;

  const [x, , z] = furniture.position;
  const [w, , d] = furniture.size;
  const rot = furniture.rotation;

  // 3D boxGeometry args=[d, h, w] → 2D footprint: localW=d, localH=w
  const localW = d;
  const localH = w;

  // 灶台: 深色台面 + 2 个炉头圆圈
  if (furniture.type === 'stove') {
    const burnerR = Math.min(localW, localH) * 0.2;
    const burnerOffsets: [number, number][] = [
      [-localW * 0.28, 0],
      [localW * 0.28, 0],
    ];
    return (
      <g transform={`rotate(${rot}, ${x}, ${z})`}>
        <rect
          x={x - localW / 2} y={z - localH / 2}
          width={localW} height={localH}
          fill={C.furnitureDark}
          stroke={C.furnitureStroke}
          strokeWidth={0.02}
          rx={0.04}
        />
        {burnerOffsets.map(([ox, oz], i) => (
          <circle key={i} cx={x + ox} cy={z + oz} r={burnerR} fill="none" stroke={C.textDim} strokeWidth={0.03} />
        ))}
      </g>
    );
  }

  // 床: 主体 + 床头板
  if (furniture.type === 'bed') {
    return (
      <g transform={`rotate(${rot}, ${x}, ${z})`}>
        <rect
          x={x - localW / 2} y={z - localH / 2}
          width={localW} height={localH}
          fill={C.furnitureLight}
          stroke={C.furnitureStroke}
          strokeWidth={0.02}
          rx={0.05}
        />
        {/* 床头板 (靠 -H 侧) */}
        <rect
          x={x - localW / 2} y={z - localH / 2}
          width={localW} height={localH * 0.12}
          fill={C.furnitureDark}
          stroke="none"
          rx={0.03}
        />
      </g>
    );
  }


  // 沙发: 圆角矩形 + 坐垫分隔
  if (furniture.type === 'sofa') {
    return (
      <g transform={`rotate(${rot}, ${x}, ${z})`}>
        <rect
          x={x - localW / 2} y={z - localH / 2}
          width={localW} height={localH}
          fill={C.furniture}
          stroke={C.furnitureStroke}
          strokeWidth={0.02}
          rx={0.08}
        />
        {/* 坐垫分隔线 */}
        <line
          x1={x - localW / 2 + localW * 0.15} y1={z}
          x2={x + localW / 2 - localW * 0.15} y2={z}
          stroke={C.furnitureStroke}
          strokeWidth={0.02}
          opacity={0.5}
        />
      </g>
    );
  }

  // 桌子: 圆角矩形
  if (furniture.type === 'table') {
    return (
      <g transform={`rotate(${rot}, ${x}, ${z})`}>
        <rect
          x={x - localW / 2} y={z - localH / 2}
          width={localW} height={localH}
          fill={C.furniture}
          stroke={C.furnitureStroke}
          strokeWidth={0.02}
          rx={0.06}
        />
      </g>
    );
  }

  // 椅子: 小圆角方形
  if (furniture.type === 'chair') {
    return (
      <g transform={`rotate(${rot}, ${x}, ${z})`}>
        <rect
          x={x - localW / 2} y={z - localH / 2}
          width={localW} height={localH}
          fill={C.furniture}
          stroke={C.furnitureStroke}
          strokeWidth={0.02}
          rx={0.08}
        />
      </g>
    );
  }

  // 柜子: 矩形 + 内部分隔线
  if (furniture.type === 'cabinet') {
    return (
      <g transform={`rotate(${rot}, ${x}, ${z})`}>
        <rect
          x={x - localW / 2} y={z - localH / 2}
          width={localW} height={localH}
          fill={C.furniture}
          stroke={C.furnitureStroke}
          strokeWidth={0.02}
          rx={0.03}
        />
        {/* 门板/抽屉分隔线 (竖向) */}
        <line
          x1={x} y1={z - localH / 2 + 0.05}
          x2={x} y2={z + localH / 2 - 0.05}
          stroke={C.furnitureStroke}
          strokeWidth={0.02}
          opacity={0.4}
        />
      </g>
    );
  }

  // 马桶: 椭圆 + 水箱
  if (furniture.type === 'toilet') {
    return (
      <g transform={`rotate(${rot}, ${x}, ${z})`}>
        {/* 水箱 */}
        <rect
          x={x - localW / 2} y={z - localH / 2}
          width={localW} height={localH * 0.35}
          fill={C.furnitureLight}
          stroke={C.furnitureStroke}
          strokeWidth={0.02}
          rx={0.03}
        />
        {/* 马桶座 */}
        <ellipse
          cx={x} cy={z + localH * 0.15}
          rx={localW * 0.4} ry={localH * 0.3}
          fill={C.furnitureLight}
          stroke={C.furnitureStroke}
          strokeWidth={0.02}
        />
      </g>
    );
  }

  // 洗手台: 矩形 + 盆
  if (furniture.type === 'sink') {
    return (
      <g transform={`rotate(${rot}, ${x}, ${z})`}>
        <rect
          x={x - localW / 2} y={z - localH / 2}
          width={localW} height={localH}
          fill={C.furnitureLight}
          stroke={C.furnitureStroke}
          strokeWidth={0.02}
          rx={0.04}
        />
        {/* 盆 */}
        <ellipse
          cx={x} cy={z}
          rx={localW * 0.3} ry={localH * 0.3}
          fill={C.furniture}
          stroke={C.furnitureStroke}
          strokeWidth={0.02}
        />
      </g>
    );
  }

  // 冰箱: 矩形 + 门缝
  if (furniture.type === 'fridge') {
    return (
      <g transform={`rotate(${rot}, ${x}, ${z})`}>
        <rect
          x={x - localW / 2} y={z - localH / 2}
          width={localW} height={localH}
          fill={C.furnitureLight}
          stroke={C.furnitureStroke}
          strokeWidth={0.02}
          rx={0.04}
        />
        {/* 上下门分隔 */}
        <line
          x1={x - localW / 2 + 0.03} y1={z}
          x2={x + localW / 2 - 0.03} y2={z}
          stroke={C.furnitureStroke}
          strokeWidth={0.02}
          opacity={0.5}
        />
      </g>
    );
  }

  // 洗衣机: 矩形 + 圆形门
  if (furniture.type === 'washer') {
    return (
      <g transform={`rotate(${rot}, ${x}, ${z})`}>
        <rect
          x={x - localW / 2} y={z - localH / 2}
          width={localW} height={localH}
          fill={C.furnitureLight}
          stroke={C.furnitureStroke}
          strokeWidth={0.02}
          rx={0.04}
        />
        <circle
          cx={x} cy={z}
          r={Math.min(localW, localH) * 0.3}
          fill="none"
          stroke={C.furnitureStroke}
          strokeWidth={0.02}
        />
      </g>
    );
  }

  // 其他: 通用圆角矩形
  return (
    <g transform={`rotate(${rot}, ${x}, ${z})`}>
      <rect
        x={x - localW / 2} y={z - localH / 2}
        width={localW} height={localH}
        fill={C.furniture}
        stroke={C.furnitureStroke}
        strokeWidth={0.02}
        rx={0.05}
      />
    </g>
  );
}

/** 淋浴间 2D — 灰阶风格 */
function Shower2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const [w, , d] = furniture.size;
  const rot = furniture.rotation;
  const shape = furniture.shape ?? 'quarter';
  const glassStroke = C.window;
  const fill = C.furnitureLight;

  if (shape === 'quarter') {
    const r = w;
    return (
      <g transform={`rotate(${rot}, ${x}, ${z})`}>
        <path
          d={`M ${x} ${z} L ${x + r} ${z} A ${r} ${r} 0 0 1 ${x} ${z + r} Z`}
          fill={fill}
          stroke={glassStroke}
          strokeWidth={0.04}
        />
        <path
          d={`M ${x + r} ${z} A ${r} ${r} 0 0 1 ${x} ${z + r}`}
          fill="none"
          stroke={glassStroke}
          strokeWidth={0.06}
          strokeDasharray="0.08 0.06"
        />
        <circle cx={x + r * 0.4} cy={z + r * 0.4} r={0.06} fill={C.furnitureStroke} />
      </g>
    );
  }

  const rw = w;
  const rh = d;
  return (
    <g transform={`rotate(${rot}, ${x}, ${z})`}>
      <rect
        x={x} y={z} width={rw} height={rh}
        fill={fill}
        stroke={glassStroke}
        strokeWidth={0.04}
      />
      <line
        x1={x} y1={z + rh} x2={x + rw} y2={z + rh}
        stroke={glassStroke}
        strokeWidth={0.06}
        strokeDasharray="0.08 0.06"
      />
      <line
        x1={x + rw} y1={z} x2={x + rw} y2={z + rh}
        stroke={glassStroke}
        strokeWidth={0.06}
        strokeDasharray="0.08 0.06"
      />
      <circle cx={x + rw * 0.3} cy={z + rh * 0.3} r={0.06} fill={C.furnitureStroke} />
    </g>
  );
}
