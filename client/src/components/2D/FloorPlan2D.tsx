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
  const showDimensions = useAppStore((s) => s.viewSettings.showDimensions);
  const sceneData = useAppStore((s) => s.sceneData);
  const setPixelsPerMeter = useAppStore((s) => s.setPixelsPerMeter);
  const rooms = sceneData.rooms;
  const wallT = sceneData.wallThickness;

  // 求某一点所在墙的单墙厚度 (墙段可自带 thickness, 如内隔墙 0.12), 找不到回落全局 wallT
  const wallTAt = (room: typeof rooms[number], x: number, z: number): number => {
    for (const seg of room.walls) {
      if (seg.opening) continue;
      const [x1, z1] = seg.start;
      const [x2, z2] = seg.end;
      const len = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
      if (len === 0) continue;
      const perp = Math.abs(x2 - x1) > Math.abs(z2 - z1) ? Math.abs(z - z1) : Math.abs(x - x1);
      if (perp > 0.15) continue;
      const t = ((x2 - x1) * (x - x1) + (z2 - z1) * (z - z1)) / len;
      if (t >= -0.05 && t <= len + 0.05) return seg.thickness ?? wallT;
    }
    return wallT;
  };

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

  const pad = showDimensions ? 2.6 : 1.5;
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

  /**
   * 屏幕坐标 → 世界坐标 → 命中的家具 (自上而下)。
   * 遍历顺序 = 绘制顺序的倒序: 内嵌件 (后画, 在最上层) 优先, 其次普通件;
   * 第一件命中的即选中目标, 保证"点哪选哪"。
   * 挂墙高位内嵌件 (如电视 y=1.1) 在俯视图里不占可操作平面, 不参与命中,
   * 点击穿透到下方的电视柜等家具 (仍可通过空间目录选中)。
   */
  const pickFurnitureAt = useCallback((clientX: number, clientY: number): Furniture | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    const all = useAppStore.getState().sceneData.rooms.flatMap((r) => r.furniture);
    // 低位内嵌件 (灶台/水槽, 占台面) 优先命中; 挂墙高位内嵌件 (电视 y≥1) 不参与命中
    const embedded = all.filter((f) => f.embedded && f.position[1] < 1);
    const normal = all.filter((f) => !f.embedded);
    for (const f of embedded) if (furnitureHitTest(f, p.x, p.y)) return f;
    for (let i = normal.length - 1; i >= 0; i--) {
      if (furnitureHitTest(normal[i], p.x, p.y)) return normal[i];
    }
    return null;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    // 室内层锁定 = 家具不可选中, 一律当作空白处理
    const locked = useAppStore.getState().layers.find((l) => l.id === 'interior')?.locked ?? false;
    const hit = locked ? null : pickFurnitureAt(e.clientX, e.clientY);
    if (hit) {
      useAppStore.getState().selectFurniture(hit.id);
      return; // 命中家具: 选中, 不进入画布平移
    }
    // 点在空白处 → 清除选中, 与 3D 视口行为一致
    useAppStore.getState().selectFurniture(null);
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  }, [pan.x, pan.y, pickFurnitureAt]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isPanning.current) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
      return;
    }
    // 悬停高亮光标: 家具上 pointer, 其余 grab
    const locked = useAppStore.getState().layers.find((l) => l.id === 'interior')?.locked ?? false;
    const over = !locked && pickFurnitureAt(e.clientX, e.clientY);
    const cursor = over ? 'pointer' : 'grab';
    if (containerRef.current && containerRef.current.style.cursor !== cursor) {
      containerRef.current.style.cursor = cursor;
    }
  }, [pickFurnitureAt]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isPanning.current = false;
    if (containerRef.current) containerRef.current.style.cursor = 'grab';
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
            <BayWindow2D key={bw.id} bayWindow={bw} wallThickness={wallTAt(room, bw.position[0], bw.position[2])} />
          ))
        )}

        {/* 墙体 (窗户位置断开) */}
        {rooms.map((room) =>
          room.walls.map((wall) =>
            wall.opening ? null : (
              <WallLine key={wall.id} wall={wall} thickness={wall.thickness ?? wallT} windows={room.windows ?? []} />
            )
          )
        )}

        {/* 落地窗 */}
        {rooms.map((room) =>
          room.frenchWindows?.map((fw) => (
            <FrenchWindow2D key={fw.id} frenchWindow={fw} wallThickness={wallTAt(room, fw.position[0], fw.position[2])} />
          ))
        )}

        {/* 普通窗户 */}
        {rooms.map((room) =>
          room.windows.map((win) => (
            <Window2D key={win.id} window={win} wallThickness={wallTAt(room, win.position[0], win.position[2])} />
          ))
        )}

        {/* 门 */}
        {rooms.map((room) =>
          room.doors.map((door) => (
            <Door2D key={door.id} door={door} wallThickness={wallTAt(room, door.position[0], door.position[2])} />
          ))
        )}

        {/* 家具
            分两遍渲染: 普通家具 → 内嵌件 (灶台/水槽等嵌在橱柜里的) 后画。
            内嵌件占地被橱柜完全覆盖, 同层渲染时后出现的橱柜命中区 (西橱柜等)
            会把它压住 (SVG 后者在上), 导致点灶台选中橱柜。
            内嵌件放到最上层后, 小面积的灶台/水槽优先吃到点击。 */}
        {rooms.map((room) =>
          room.furniture.filter((f) => !f.embedded).map((f) => (
            <Furniture2DInteractive key={f.id} furniture={f} />
          ))
        )}
        {rooms.map((room) =>
          room.furniture.filter((f) => f.embedded).map((f) => (
            <Furniture2DInteractive key={f.id} furniture={f} />
          ))
        )}

        {/* 尺寸标注: 周长链式标注 (总尺寸 + 逐段净空) */}
        {showDimensions && (
          <g style={{ pointerEvents: 'none' }}>
            <PerimeterDims rooms={rooms} wallT={wallT} minX={minX} maxX={maxX} minZ={minZ} maxZ={maxZ} />
            {/* 单位说明 */}
            <text
              x={vbX + 0.2} y={vbY + 0.42}
              textAnchor="start" dominantBaseline="middle"
              fontSize={0.3} fill={C.textDim}
              style={{ userSelect: 'none' }}
            >
              单位: mm
            </text>
          </g>
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

/** ===== 尺寸标注 (参考建筑户型图: 每侧 "总尺寸线 + 逐段链式尺寸线") ===== */
const DIM = {
  chainOffset: 0.5,  // 链式尺寸线距户型外缘
  totalOffset: 1.6,  // 总尺寸线距户型外缘
  font: 0.26,        // 链式标注字号
  totalFont: 0.34,   // 总尺寸字号
  tick: 0.07,        // 45° 起止符号半径
  narrow: 0.7,       // 段长 < 此值 → 文字转竖排并外移一层
  minLabel: 0.09,    // 段长 < 此值 → 不标数字 (仅符号)
};

/** 45° 起止符号 (建筑制图风格) */
function DimTick({ x, y }: { x: number; y: number }) {
  return (
    <line
      x1={x - DIM.tick} y1={y + DIM.tick} x2={x + DIM.tick} y2={y - DIM.tick}
      stroke={C.textDim} strokeWidth={0.025}
    />
  );
}

/** 标注文字 — 白色描边保证压在家具/地面上仍可读 */
function DimText({
  x, y, text, rotate = 0, fontSize = DIM.font,
}: { x: number; y: number; text: string; rotate?: number; fontSize?: number }) {
  return (
    <text
      x={x} y={y}
      {...(rotate ? { transform: `rotate(${rotate} ${x} ${y})` } : {})}
      textAnchor="middle" dominantBaseline="middle"
      fontSize={fontSize} fontWeight={500} fill={C.text}
      stroke={C.bg} strokeWidth={0.1}
      style={{ paintOrder: 'stroke', userSelect: 'none' }}
    >
      {text}
    </text>
  );
}

/**
 * 从房间几何推导某轴上的分段断点 (不取墙体面, 故不会出现墙厚读数):
 *  - 内部断点: 各房间包围盒的轴线 (相邻房间共享墙只产生一个断点)
 *  - 端部断点: 取墙体外侧 (户型外缘), 并把外墙轴线点并入端部
 *    → 房间起止按"墙外侧"计量, 且端部不再残留半墙厚的碎片段
 */
function buildChainCoords(
  rooms: Room[], axis: 'x' | 'z', outerMin: number, outerMax: number, wallT: number,
): number[] {
  const raw: number[] = [outerMin, outerMax];
  for (const room of rooms) {
    const xs = room.walls.flatMap((w) => [w.start[0], w.end[0]]);
    const zs = room.walls.flatMap((w) => [w.start[1], w.end[1]]);
    raw.push(axis === 'x' ? Math.min(...xs) : Math.min(...zs));
    raw.push(axis === 'x' ? Math.max(...xs) : Math.max(...zs));
  }
  const snapped = raw
    .map((v) => Math.round(v * 200) / 200) // 5mm 粒度
    .filter((v) => v >= outerMin - 1e-6 && v <= outerMax + 1e-6)
    .sort((a, b) => a - b);

  const end = wallT / 2 + 0.02; // 外墙轴线离外缘正好半墙厚 → 并入端部
  const out: number[] = [];
  for (const v of snapped) {
    if (!out.length || v - out[out.length - 1] > 0.03) out.push(v);
  }
  const inner = out.filter((v) => v - outerMin > end && outerMax - v > end);
  const coords = [outerMin, ...inner, outerMax];
  return coords.length >= 2 ? coords : [outerMin, outerMax];
}

/** 墙厚段 (不标注, 只保留起止符号) */
function isWallThickness(len: number, wallT: number) {
  return Math.abs(len - wallT) <= 0.03;
}

/** 水平链式尺寸线 (dir: -1 在户型上方 / +1 在下方) */
function HDimChain({
  coords, y, edge, dir, wallT,
}: { coords: number[]; y: number; edge: number; dir: -1 | 1; wallT: number }) {
  const extStart = edge + dir * 0.06;
  const extEnd = y + dir * 0.1;
  return (
    <g>
      <line x1={coords[0]} y1={y} x2={coords[coords.length - 1]} y2={y} stroke={C.textDim} strokeWidth={0.022} />
      {coords.map((c, i) => (
        <g key={`t${i}`}>
          <DimTick x={c} y={y} />
          <line x1={c} y1={extStart} x2={c} y2={extEnd} stroke={C.textDim} strokeWidth={0.013} />
        </g>
      ))}
      {coords.slice(0, -1).map((a, i) => {
        const b = coords[i + 1];
        const len = b - a;
        if (len < DIM.minLabel || isWallThickness(len, wallT)) return null;
        const mid = (a + b) / 2;
        const rot = len < DIM.narrow;
        return (
          <DimText
            key={`d${i}`} x={mid}
            y={y + dir * (rot ? 0.62 : 0.26)}
            text={`${Math.round(len * 1000)}`}
            rotate={rot ? -90 : 0}
          />
        );
      })}
    </g>
  );
}

/** 垂直链式尺寸线 (dir: -1 在户型左侧 / +1 在右侧) */
function VDimChain({
  coords, x, edge, dir, wallT,
}: { coords: number[]; x: number; edge: number; dir: -1 | 1; wallT: number }) {
  const extStart = edge + dir * 0.06;
  const extEnd = x + dir * 0.1;
  return (
    <g>
      <line x1={x} y1={coords[0]} x2={x} y2={coords[coords.length - 1]} stroke={C.textDim} strokeWidth={0.022} />
      {coords.map((c, i) => (
        <g key={`t${i}`}>
          <DimTick x={x} y={c} />
          <line x1={extStart} y1={c} x2={extEnd} y2={c} stroke={C.textDim} strokeWidth={0.013} />
        </g>
      ))}
      {coords.slice(0, -1).map((a, i) => {
        const b = coords[i + 1];
        const len = b - a;
        if (len < DIM.minLabel || isWallThickness(len, wallT)) return null;
        const mid = (a + b) / 2;
        const rot = len < DIM.narrow;
        return (
          <DimText
            key={`d${i}`}
            x={x + dir * (rot ? 0.62 : 0.26)}
            y={mid}
            text={`${Math.round(len * 1000)}`}
            rotate={rot ? 0 : -90}
          />
        );
      })}
    </g>
  );
}

/**
 * 户型周长尺寸标注 — 四侧各一组:
 *   内侧: 逐段链式尺寸线 (墙厚 / 净空交替)
 *   外侧: 总尺寸线
 */
function PerimeterDims({
  rooms, wallT, minX, maxX, minZ, maxZ,
}: { rooms: Room[]; wallT: number; minX: number; maxX: number; minZ: number; maxZ: number }) {
  // 外缘 = 墙中心线包围盒 ± 半墙厚 (墙体按中心线绘制)
  const oMinX = minX - wallT / 2, oMaxX = maxX + wallT / 2;
  const oMinZ = minZ - wallT / 2, oMaxZ = maxZ + wallT / 2;

  const xCoords = buildChainCoords(rooms, 'x', oMinX, oMaxX, wallT);
  const zCoords = buildChainCoords(rooms, 'z', oMinZ, oMaxZ, wallT);
  const totalW = `${Math.round((oMaxX - oMinX) * 1000)}`;
  const totalH = `${Math.round((oMaxZ - oMinZ) * 1000)}`;

  const yTopChain = oMinZ - DIM.chainOffset;
  const yTopTotal = oMinZ - DIM.totalOffset;
  const yBotChain = oMaxZ + DIM.chainOffset;
  const yBotTotal = oMaxZ + DIM.totalOffset;
  const xLeftChain = oMinX - DIM.chainOffset;
  const xLeftTotal = oMinX - DIM.totalOffset;
  const xRightChain = oMaxX + DIM.chainOffset;
  const xRightTotal = oMaxX + DIM.totalOffset;

  return (
    <g>
      {/* 上: 总宽 + 链式 */}
      <HDimChain coords={xCoords} y={yTopChain} edge={oMinZ} dir={-1} wallT={wallT} />
      <line x1={oMinX} y1={yTopTotal} x2={oMaxX} y2={yTopTotal} stroke={C.textDim} strokeWidth={0.022} />
      <DimTick x={oMinX} y={yTopTotal} />
      <DimTick x={oMaxX} y={yTopTotal} />
      <DimText x={(oMinX + oMaxX) / 2} y={yTopTotal - 0.32} text={totalW} fontSize={DIM.totalFont} />
      <line x1={oMinX} y1={oMinZ - 0.06} x2={oMinX} y2={yTopTotal - 0.1} stroke={C.textDim} strokeWidth={0.013} />
      <line x1={oMaxX} y1={oMinZ - 0.06} x2={oMaxX} y2={yTopTotal - 0.1} stroke={C.textDim} strokeWidth={0.013} />

      {/* 下: 总宽 + 链式 */}
      <HDimChain coords={xCoords} y={yBotChain} edge={oMaxZ} dir={1} wallT={wallT} />
      <line x1={oMinX} y1={yBotTotal} x2={oMaxX} y2={yBotTotal} stroke={C.textDim} strokeWidth={0.022} />
      <DimTick x={oMinX} y={yBotTotal} />
      <DimTick x={oMaxX} y={yBotTotal} />
      <DimText x={(oMinX + oMaxX) / 2} y={yBotTotal + 0.32} text={totalW} fontSize={DIM.totalFont} />
      <line x1={oMinX} y1={oMaxZ + 0.06} x2={oMinX} y2={yBotTotal + 0.1} stroke={C.textDim} strokeWidth={0.013} />
      <line x1={oMaxX} y1={oMaxZ + 0.06} x2={oMaxX} y2={yBotTotal + 0.1} stroke={C.textDim} strokeWidth={0.013} />

      {/* 左: 总深 + 链式 */}
      <VDimChain coords={zCoords} x={xLeftChain} edge={oMinX} dir={-1} wallT={wallT} />
      <line x1={xLeftTotal} y1={oMinZ} x2={xLeftTotal} y2={oMaxZ} stroke={C.textDim} strokeWidth={0.022} />
      <DimTick x={xLeftTotal} y={oMinZ} />
      <DimTick x={xLeftTotal} y={oMaxZ} />
      <DimText x={xLeftTotal - 0.32} y={(oMinZ + oMaxZ) / 2} text={totalH} rotate={-90} fontSize={DIM.totalFont} />
      <line x1={oMinX - 0.06} y1={oMinZ} x2={xLeftTotal - 0.1} y2={oMinZ} stroke={C.textDim} strokeWidth={0.013} />
      <line x1={oMinX - 0.06} y1={oMaxZ} x2={xLeftTotal - 0.1} y2={oMaxZ} stroke={C.textDim} strokeWidth={0.013} />

      {/* 右: 总深 + 链式 */}
      <VDimChain coords={zCoords} x={xRightChain} edge={oMaxX} dir={1} wallT={wallT} />
      <line x1={xRightTotal} y1={oMinZ} x2={xRightTotal} y2={oMaxZ} stroke={C.textDim} strokeWidth={0.022} />
      <DimTick x={xRightTotal} y={oMinZ} />
      <DimTick x={xRightTotal} y={oMaxZ} />
      <DimText x={xRightTotal + 0.32} y={(oMinZ + oMaxZ) / 2} text={totalH} rotate={-90} fontSize={DIM.totalFont} />
      <line x1={oMaxX + 0.06} y1={oMinZ} x2={xRightTotal + 0.1} y2={oMinZ} stroke={C.textDim} strokeWidth={0.013} />
      <line x1={oMaxX + 0.06} y1={oMaxZ} x2={xRightTotal + 0.1} y2={oMaxZ} stroke={C.textDim} strokeWidth={0.013} />
    </g>
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

/**
 * 平面图家具的交互包装 — 选中描边。
 *
 * 命中判定不再依赖逐件铺开的大透明矩形: 相邻大件 (橱柜等) 的命中区会互相
 * 遮挡, 出现"点东橱柜选中冰箱/淋浴"的错位。现在统一由 FloorPlan2D 根节点
 * 的 pointerDown 做几何命中测试 (furnitureHitTest), 本组件只负责:
 *   - 选中态绿色描边 (尺寸与占地同口径)
 *   - 内嵌件 (灶台/水槽) 的描边渲染顺序 (内嵌件后画, 在最上层)
 */
function Furniture2DInteractive({ furniture }: { furniture: Furniture }) {
  const selected = useAppStore((s) => s.selectedFurnitureId === furniture.id);

  const [x, , z] = furniture.position;
  // 描边尺寸 = 占地 (与 furnitureHitTest 同口径); 淋浴间图形从锚点展开, 按 size[0] 作边长
  const isShower = furniture.type === 'shower';
  const hitW = isShower ? furniture.size[0] : furniture.size[2];
  const hitH = isShower ? furniture.size[0] : furniture.size[0];
  const hitX = isShower ? x : x - hitW / 2;
  const hitY = isShower ? z : z - hitH / 2;

  return (
    <g data-fid={furniture.id} data-ftype={furniture.type}>
      <Furniture2D furniture={furniture} />
      {selected && (
        <rect
          x={hitX - 0.05} y={hitY - 0.05}
          width={hitW + 0.1} height={hitH + 0.1}
          transform={`rotate(${-furniture.rotation}, ${x}, ${z})`}
          fill="none"
          stroke="#22c55e"
          strokeWidth={0.045}
          rx={0.05}
          pointerEvents="none"
        />
      )}
    </g>
  );
}

/**
 * 几何命中测试: 世界坐标点是否落在家具占地内 (考虑旋转)。
 * 矩形占地以 (x, z) 为中心、宽=size[2] (SVG x 向)、深=size[0] (SVG z 向),
 * 旋转后仍是中心对称矩形, 逆旋转到局部坐标再判边界即可。
 * 淋浴间是锚点展开图形, 保持旧行为: 以 (x, z) 为左上角、边长 size[0]。
 */
function furnitureHitTest(f: Furniture, px: number, pz: number, pad = 0.03): boolean {
  const [x, , z] = f.position;
  const isShower = f.type === 'shower';
  const w = isShower ? f.size[0] : f.size[2];
  const h = isShower ? f.size[0] : f.size[0];

  if (isShower) {
    return px >= x - pad && px <= x + w + pad && pz >= z - pad && pz <= z + h + pad;
  }

  const rot = ((f.rotation % 360) + 360) % 360;
  const rad = (rot * Math.PI) / 180;
  const dx = px - x, dz = pz - z;
  // 图形以 SVG rotate(-rot) 绘制, 命中需按同一变换的逆矩阵回到局部坐标
  const lx = dx * Math.cos(rad) - dz * Math.sin(rad);
  const lz = dx * Math.sin(rad) + dz * Math.cos(rad);
  // 床的床头板立在床架 -X 端外侧 0.08m, 命中盒同步向 -X 外扩, 否则点床头板选不中床
  const padNegX = f.type === 'bed' ? pad + 0.08 : pad;
  return lx <= w / 2 + pad && lx >= -w / 2 - padNegX && Math.abs(lz) <= h / 2 + pad;
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

  // 灶台: 深色台面 + 2 个炉头圆圈 + 2 个前端旋钮
  // 与 3D Stove.tsx 对齐: 炉头沿局部 Z 轴排列 (间距 ±0.28*size[0] = ±0.28*localH),
  // 旋钮在 +X 前端边缘 (距边 0.04, z=±0.2*size[0])。
  // 注意 rotate(-rot): three.js 绕 Y 轴旋转俯视是逆时针, SVG rotate 顺视是顺时针,
  // 两者反向 —— 台面/炉头是 ± 对称的看不出来, 但旋钮在 +X 单边, 方向反了会贴到墙上。
  if (furniture.type === 'stove') {
    const burnerR = Math.min(localW, localH) * 0.2;
    const burnerOffsets: [number, number][] = [
      [0, -localH * 0.28],
      [0, localH * 0.28],
    ];
    // 3D 灶面是黑色玻璃, 平面图压到比橱柜台面深一档, 否则嵌在橱柜里完全分不出来
    const plateFill = '#b4b4b4';
    const burnerStroke = '#5f5f5f';
    return (
      <g transform={`rotate(${-rot}, ${x}, ${z})`}>
        <rect
          x={x - localW / 2} y={z - localH / 2}
          width={localW} height={localH}
          fill={plateFill}
          stroke="#8f8f8f"
          strokeWidth={0.025}
          rx={0.03}
        />
        {burnerOffsets.map(([ox, oz], i) => (
          <g key={i}>
            <circle cx={x + ox} cy={z + oz} r={burnerR} fill="none" stroke={burnerStroke} strokeWidth={0.035} />
            {/* 炉头内圈, 对应 3D 火盖 */}
            <circle cx={x + ox} cy={z + oz} r={burnerR * 0.45} fill="none" stroke={burnerStroke} strokeWidth={0.025} opacity={0.85} />
          </g>
        ))}
        {/* 控制旋钮 (+X 前端边缘) */}
        {[-localH * 0.2, localH * 0.2].map((oz, i) => (
          <circle
            key={`knob-${i}`}
            cx={x + localW / 2 - 0.04}
            cy={z + oz}
            r={0.02}
            fill={burnerStroke}
          />
        ))}
      </g>
    );
  }

  // 床: 与 3D Bed.tsx 同构 —— x=床长 size[2], 床头板立在 -x 端 (**床架外侧**),
  // 所以平面图里床头板也必须画到床架外沿, 否则看不出"床头已经靠墙"。
  // rotate(-rot): three 绕 Y 旋转与 SVG rotate 反向 (实测 rotY=+90 时局部 +X → 世界 -Z)
  if (furniture.type === 'bed') {
    const headT = 0.08;                       // 与 3D headT 同口径
    const pillowW = 0.4;
    const pillowH = 0.6;
    const pillowX = x - localW / 2 + 0.35;    // 3D: -d/2 + 0.35
    return (
      <g transform={`rotate(${-rot}, ${x}, ${z})`}>
        {/* 床架 */}
        <rect
          x={x - localW / 2} y={z - localH / 2}
          width={localW} height={localH}
          fill={C.furnitureLight}
          stroke={C.furnitureStroke}
          strokeWidth={0.02}
          rx={0.05}
        />
        {/* 被褥 (3D 偏 +x 0.1, 覆盖床尾) */}
        <rect
          x={x + 0.1 - (localW - 0.05) / 2} y={z - (localH - 0.15) / 2}
          width={localW - 0.05} height={localH - 0.15}
          fill={C.furniture}
          stroke="none"
          rx={0.04}
        />
        {/* 枕头 x2 — 靠床头, 长边沿 z (床宽方向) */}
        {[-localH / 4, localH / 4].map((oz, i) => (
          <rect
            key={`pillow-${i}`}
            x={pillowX - pillowW / 2} y={z + oz - pillowH / 2}
            width={pillowW} height={pillowH}
            fill={C.floor}
            stroke={C.furnitureStroke}
            strokeWidth={0.015}
            rx={0.06}
          />
        ))}
        {/* 床头板 — 床架外侧, 横跨床宽 (压深一档, 否则和被褥分不出来) */}
        <rect
          data-part="headboard"
          x={x - localW / 2 - headT} y={z - localH / 2}
          width={headT} height={localH}
          fill="#c2c2c2"
          stroke="#9e9e9e"
          strokeWidth={0.015}
          rx={0.02}
        />
      </g>
    );
  }


  // 沙发: 圆角矩形 + 坐垫分隔
  if (furniture.type === 'sofa') {
    return (
      <g transform={`rotate(${-rot}, ${x}, ${z})`}>
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
      <g transform={`rotate(${-rot}, ${x}, ${z})`}>
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
      <g transform={`rotate(${-rot}, ${x}, ${z})`}>
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

  // 柜子: 矩形 + 内部分隔线; 高柜 (h>1.5, 衣柜) 用挂衣杆 + 衣架斜线
  if (furniture.type === 'cabinet') {
    // 与 3D Cabinet.tsx 的 isWardrobe 同口径 (h > 1.5)
    const isWardrobe = furniture.size[1] > 1.5;

    if (isWardrobe) {
      // 衣柜: 挂衣杆画在进深正中, 衣架斜线横贯整个柜深 (背板侧 → 前缘侧),
      // 挂衣杆从每根斜线的中点穿过 (经典 CAD 衣柜符号)。
      // 3D 柜门朝局部 +X, 这里 rotate(-rot) 与 3D 同向 (理由同灶台: SVG rotate 与 three Y 旋转反向)
      const backX = -localW / 2 + 0.04;           // 斜线起点距背板 0.04
      const frontX = localW / 2 - 0.04;           // 斜线终点距前缘 0.04
      const railHalf = localH / 2 - 0.08;
      const n = Math.max(3, Math.round(localH / 0.25)); // 衣架数量按柜宽排布
      const tilt = (frontX - backX) * 0.35 * 0.5; // 每半段斜移, 杆处正好是中点
      return (
        <g transform={`rotate(${-rot}, ${x}, ${z})`}>
          <rect
            x={x - localW / 2} y={z - localH / 2}
            width={localW} height={localH}
            fill={C.furniture}
            stroke={C.furnitureStroke}
            strokeWidth={0.02}
            rx={0.03}
          />
          {/* 衣架斜线: 从背板侧到前缘侧, 关于杆对称, 钳制在柜体轮廓内 */}
          {Array.from({ length: n + 1 }).map((_, i) => {
            const zi = Math.max(
              -railHalf + tilt,
              Math.min(railHalf - tilt, -railHalf + 0.07 + (i * (2 * railHalf - 0.14)) / n)
            );
            return (
              <line
                key={i}
                x1={x + backX} y1={z + zi + tilt}
                x2={x + frontX} y2={z + zi - tilt}
                stroke={C.textDim}
                strokeWidth={0.025}
                opacity={0.8}
              />
            );
          })}
          {/* 挂衣杆 (画在斜线之上, 从每根斜线中点穿过) */}
          <line
            x1={x} y1={z - railHalf}
            x2={x} y2={z + railHalf}
            stroke={C.textDim}
            strokeWidth={0.035}
          />
        </g>
      );
    }

    return (
      <g transform={`rotate(${-rot}, ${x}, ${z})`}>
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
      <g transform={`rotate(${-rot}, ${x}, ${z})`}>
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
      <g transform={`rotate(${-rot}, ${x}, ${z})`}>
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
      <g transform={`rotate(${-rot}, ${x}, ${z})`}>
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
      <g transform={`rotate(${-rot}, ${x}, ${z})`}>
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
    <g transform={`rotate(${-rot}, ${x}, ${z})`}>
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
      <g transform={`rotate(${-rot}, ${x}, ${z})`}>
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
    <g transform={`rotate(${-rot}, ${x}, ${z})`}>
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
