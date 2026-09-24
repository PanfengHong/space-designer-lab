import { useRef, useState, useCallback, useEffect } from 'react';
import type { GroundItem, OutdoorObject } from '../../types';
import { useAppStore } from '../../store/useAppStore';

/* ============================================================
 * 户外空间总平面图 (俯视)
 *  - 白色地面基座 + 蓝色水面 + 绿色草地 + 灰蓝道路
 *  - 道路白色虚线车道
 *  - 建筑/车辆带朝向旋转, 选中绿色高亮
 *  - 滚轮缩放 / 拖拽平移 / 双击重置
 * ============================================================ */

const C = {
  bg: '#eef3f8',
  ground: '#ffffff',
  groundStroke: '#d8dee6',
  grass: '#cfe9cd',
  grassStroke: '#a8d4a6',
  river: '#9ccdee',
  riverStroke: '#7ab8e0',
  road: '#c2cad4',
  roadStroke: '#aeb8c4',
  roadLine: '#ffffff',
  building: '#d9ebf9',
  buildingStroke: '#5a9fd4',
  warehouse: '#f2f5f9',
  warehouseStroke: '#b8c4d0',
  car: '#ffffff',
  carStroke: '#8a97a5',
  truck: '#cfe2f5',
  truckStroke: '#4a90d9',
  select: '#16a34a',
  text: '#4a627a',
};

export function OutdoorPlan2D() {
  const showLabels = useAppStore((s) => s.viewSettings.showLabels);
  const outdoorSceneData = useAppStore((s) => s.outdoorSceneData);
  const setPixelsPerMeter = useAppStore((s) => s.setPixelsPerMeter);
  const layers = useAppStore((s) => s.layers);
  const selectedGroundId = useAppStore((s) => s.selectedGroundId);
  const selectedOutdoorObjectId = useAppStore((s) => s.selectedOutdoorObjectId);
  const selectGround = useAppStore((s) => s.selectGround);
  const selectOutdoorObject = useAppStore((s) => s.selectOutdoorObject);

  const groundLocked = layers.find((l) => l.id === 'ground')?.locked ?? true;
  const spaceLocked = layers.find((l) => l.id === 'space')?.locked ?? true;

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // 场景边界
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  const boundsItems = outdoorSceneData.ground.length > 0
    ? [...outdoorSceneData.ground, ...outdoorSceneData.objects]
    : outdoorSceneData.objects;
  boundsItems.forEach((it) => {
    const hw = it.size[0] / 2;
    const hd = it.size[2] / 2;
    // 旋转后外接矩形 (按 45° 上界简化)
    const rad = (it.rotation * Math.PI) / 180;
    const ex = Math.abs(Math.cos(rad)) * hw + Math.abs(Math.sin(rad)) * hd;
    const ez = Math.abs(Math.sin(rad)) * hw + Math.abs(Math.cos(rad)) * hd;
    minX = Math.min(minX, it.position[0] - ex);
    maxX = Math.max(maxX, it.position[0] + ex);
    minZ = Math.min(minZ, it.position[2] - ez);
    maxZ = Math.max(maxZ, it.position[2] + ez);
  });
  if (!isFinite(minX)) { minX = -40; maxX = 40; minZ = -30; maxZ = 30; }

  const pad = 4;
  const vbX = minX - pad;
  const vbY = minZ - pad;
  const vbW = maxX - minX + pad * 2;
  const vbH = maxZ - minZ + pad * 2;

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setZoom((z) => Math.max(0.3, Math.min(8, z * delta)));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }, [pan.x, pan.y]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return;
    setPan({ x: panStart.current.panX + e.clientX - panStart.current.x, y: panStart.current.panY + e.clientY - panStart.current.y });
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isPanning.current = false;
    try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch {}
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
      const ppm = (el.clientWidth * zoom) / vbW;
      setPixelsPerMeter(Math.max(1, ppm));
    };
    updatePpm();
    const ro = new ResizeObserver(updatePpm);
    ro.observe(el);
    return () => ro.disconnect();
  }, [zoom, vbW, setPixelsPerMeter]);

  // 道路车道虚线
  const RoadMarkings = ({ w, d, lanes }: { w: number; d: number; lanes: 2 | 4 }) => {
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
  };

  /** 地面元素 (道路沿 X 方向, 旋转角与 3D Y 旋转取反) */
  const GroundView = ({ item }: { item: GroundItem }) => {
    const [w, , d] = item.size;
    const selected = selectedGroundId === item.id;
    const common = {
      transform: `translate(${item.position[0]} ${item.position[2]}) rotate(${-item.rotation})`,
    };
    const clickable = !groundLocked;

    if (item.type === 'river') {
      return (
        <g {...common} style={{ cursor: clickable ? 'pointer' : 'default' }}
          onClick={clickable ? (e) => { e.stopPropagation(); selectGround(item.id); } : undefined}>
          <rect x={-w / 2} y={-d / 2} width={w} height={d} fill={C.river} stroke={C.riverStroke} strokeWidth={0.12} />
          <rect x={-w / 2 + 0.6} y={-d / 2 + 0.6} width={w - 1.2} height={d - 1.2} fill="none" stroke="#bfe0f5" strokeWidth={0.1} strokeDasharray="0.8 0.6" />
          {selected && <rect x={-w / 2} y={-d / 2} width={w} height={d} fill="none" stroke={C.select} strokeWidth={0.25} strokeDasharray="0.8 0.5" />}
        </g>
      );
    }
    if (item.type === 'grass') {
      return (
        <g {...common} style={{ cursor: clickable ? 'pointer' : 'default' }}
          onClick={clickable ? (e) => { e.stopPropagation(); selectGround(item.id); } : undefined}>
          <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={0.6} ry={0.6} fill={C.grass} stroke={C.grassStroke} strokeWidth={0.12} />
          {selected && <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={0.6} ry={0.6} fill="none" stroke={C.select} strokeWidth={0.25} strokeDasharray="0.8 0.5" />}
        </g>
      );
    }
    if (item.type === 'road') {
      const elevated = item.position[1] > 0.5;
      return (
        <g {...common} style={{ cursor: clickable ? 'pointer' : 'default' }}
          onClick={clickable ? (e) => { e.stopPropagation(); selectGround(item.id); } : undefined}>
          {elevated && (
            Array.from({ length: Math.floor((w - 4) / 10) + 1 }, (_, i) => (
              <circle key={i} cx={-w / 2 + 5 + i * 10} cy={0} r={0.28} fill="#d8dee6" stroke="#bcc8d4" strokeWidth={0.08} />
            ))
          )}
          <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={0.25} ry={0.25} fill={elevated ? '#b8c2cd' : C.road} stroke={C.roadStroke} strokeWidth={0.12} />
          <RoadMarkings w={w} d={d} lanes={(item as any).lanes === 4 ? 4 : 2} />
          {selected && <rect x={-w / 2} y={-d / 2} width={w} height={d} fill="none" stroke={C.select} strokeWidth={0.25} strokeDasharray="0.8 0.5" />}
        </g>
      );
    }
    if (item.type === 'intersection') {
      const half = Math.min(w, d) / 2;
      const lineLen = Math.min(w, d) * 0.7;
      const branches = (item as any).branches ?? 4;
      const arcR = (item as any).arcRadius ?? 1.5;
      const stub = Math.max(w, d) * 0.5;
      // 4 个角: 每个角带 a0 (起始角度, SVG 中 Y 朝下, 0=+X右, π/2=+Y下, π=-X左, 3π/2=-Y上)
      // 每个扇形从角点朝路口中心 (0,0) 方向延伸:
      //   右上(half,half) → 朝 -X 和 -Y → 覆盖 π 到 3π/2, sweep=1 (顺时针), 起点 π
      //   左上(-half,half) → 朝 +X 和 -Y → 覆盖 3π/2 到 2π, sweep=1, 起点 3π/2
      //   左下(-half,-half) → 朝 +X 和 +Y → 覆盖 0 到 π/2, sweep=1, 起点 0
      //   右下(half,-half) → 朝 -X 和 +Y → 覆盖 π/2 到 π, sweep=1, 起点 π/2
      const cornerArcs = [
        { cx: half, cz: half,    a0: Math.PI,         minBranches: 2 },
        { cx: -half, cz: half,   a0: Math.PI * 1.5,   minBranches: 3 },
        { cx: -half, cz: -half,  a0: 0,               minBranches: 4 },
        { cx: half, cz: -half,   a0: Math.PI / 2,     minBranches: 4 },
      ].filter((c) => branches >= c.minBranches);
      return (
        <g {...common} style={{ cursor: clickable ? 'pointer' : 'default' }}
          onClick={clickable ? (e) => { e.stopPropagation(); selectGround(item.id); } : undefined}>
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
    if (item.type === 'ramp') {
      return (
        <g {...common} style={{ cursor: clickable ? 'pointer' : 'default' }}
          onClick={clickable ? (e) => { e.stopPropagation(); selectGround(item.id); } : undefined}>
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
    // ground
    return (
      <g {...common} style={{ cursor: clickable ? 'pointer' : 'default' }}
        onClick={clickable ? (e) => { e.stopPropagation(); selectGround(item.id); } : undefined}>
        <rect x={-w / 2} y={-d / 2} width={w} height={d} fill={C.ground} stroke={C.groundStroke} strokeWidth={0.15} />
        {selected && <rect x={-w / 2} y={-d / 2} width={w} height={d} fill="none" stroke={C.select} strokeWidth={0.25} strokeDasharray="0.8 0.5" />}
      </g>
    );
  };

  /** 空间对象 (车辆/建筑) */
  const ObjectView = ({ item }: { item: OutdoorObject }) => {
    const [w, , d] = item.size;
    const selected = selectedOutdoorObjectId === item.id;
    const clickable = !spaceLocked;
    const t = `translate(${item.position[0]} ${item.position[2]}) rotate(${-item.rotation})`;

    let fill = C.warehouse;
    let stroke = C.warehouseStroke;
    if (item.type === 'building') { fill = C.building; stroke = C.buildingStroke; }
    else if (item.type === 'car') { fill = C.car; stroke = C.carStroke; }
    else if (item.type === 'truck') { fill = C.truck; stroke = C.truckStroke; }

    const isVehicle = item.type === 'car' || item.type === 'truck';
    const cabW = item.type === 'truck' ? w * 0.24 : 0;

    return (
      <g transform={t} style={{ cursor: clickable ? 'pointer' : 'default' }}
        onClick={clickable ? (e) => { e.stopPropagation(); selectOutdoorObject(item.id); } : undefined}>
        <rect
          x={-w / 2} y={-d / 2} width={w} height={d}
          rx={isVehicle ? 0.3 : 0.15} ry={isVehicle ? 0.3 : 0.15}
          fill={fill} stroke={stroke} strokeWidth={isVehicle ? 0.1 : 0.15}
        />
        {item.type === 'building' && (
          <>
            {/* 玻璃幕墙分格 */}
            <line x1={-w / 6} y1={-d / 2} x2={-w / 6} y2={d / 2} stroke={stroke} strokeWidth={0.06} opacity={0.6} />
            <line x1={w / 6} y1={-d / 2} x2={w / 6} y2={d / 2} stroke={stroke} strokeWidth={0.06} opacity={0.6} />
            <line x1={-w / 2} y1={-d / 6} x2={w / 2} y2={-d / 6} stroke={stroke} strokeWidth={0.06} opacity={0.6} />
            <line x1={-w / 2} y1={d / 6} x2={w / 2} y2={d / 6} stroke={stroke} strokeWidth={0.06} opacity={0.6} />
          </>
        )}
        {item.type === 'warehouse' && (
          <>
            {/* 卷帘门 */}
            <rect x={-w * 0.29} y={d / 2 - 0.06} width={w * 0.22} height={0.06} fill={C.buildingStroke} opacity={0.85} />
            <rect x={w * 0.07} y={d / 2 - 0.06} width={w * 0.22} height={0.06} fill={C.buildingStroke} opacity={0.85} />
          </>
        )}
        {item.type === 'truck' && (
          <rect x={w / 2 - cabW} y={-d / 2} width={cabW} height={d} fill="#f2f5f9" stroke={stroke} strokeWidth={0.06} />
        )}
        {selected && (
          <rect x={-w / 2 - 0.15} y={-d / 2 - 0.15} width={w + 0.3} height={d + 0.3}
            fill="none" stroke={C.select} strokeWidth={0.25} strokeDasharray="0.8 0.5" />
        )}
        {showLabels && (
          <text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fontSize={0.9} fill={C.text}
            transform={`rotate(${item.rotation})`} style={{ paintOrder: 'stroke' }} stroke="#ffffff" strokeWidth={0.25}>
            {item.name}
          </text>
        )}
      </g>
    );
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden relative"
      style={{ backgroundColor: C.bg, cursor: isPanning.current ? 'grabbing' : 'grab' }}
    >
      {/* 缩放控制 */}
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
        onClick={() => { selectGround(null); selectOutdoorObject(null); }}
      >
        {/* 地面结构层 (按地面→河流→草地→道路顺序) */}
        {outdoorSceneData.ground.filter((g) => g.type === 'ground').map((g) => <GroundView key={g.id} item={g} />)}
        {outdoorSceneData.ground.filter((g) => g.type === 'river').map((g) => <GroundView key={g.id} item={g} />)}
        {outdoorSceneData.ground.filter((g) => g.type === 'grass').map((g) => <GroundView key={g.id} item={g} />)}
        {outdoorSceneData.ground.filter((g) => g.type === 'road').map((g) => <GroundView key={g.id} item={g} />)}

        {/* 空间设计层 */}
        {outdoorSceneData.objects.map((o) => <ObjectView key={o.id} item={o} />)}

        {/* 地面元素名称 */}
        {showLabels && outdoorSceneData.ground.filter((g) => g.type !== 'ground').map((g) => (
          <text key={`lb-${g.id}`} x={g.position[0]} y={g.position[2]} textAnchor="middle" dominantBaseline="middle"
            fontSize={1.1} fill={C.text} style={{ paintOrder: 'stroke' }} stroke="#ffffff" strokeWidth={0.3}>
            {g.name}
          </text>
        ))}
      </svg>
    </div>
  );
}
