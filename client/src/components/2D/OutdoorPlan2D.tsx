import { useRef, useState, useCallback, useEffect } from 'react';
import type { GroundItem, OutdoorObject } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { useOutdoorPalette } from '../../constants/outdoorStyles';
import { PLAN_LIGHT, PLAN_DARK } from '../../elements/outdoor/planPalette';
import { GROUND_ELEMENTS, getGroundElement } from '../../elements/outdoor/ground';
import { getOutdoorObjectElement } from '../../elements/outdoor/objects';

/* ============================================================
 * 户外空间总平面图 (俯视)
 *  - 白色地面基座 + 蓝色水面 + 绿色草地 + 灰蓝道路
 *  - 道路白色虚线车道
 *  - 建筑/车辆带朝向旋转, 选中绿色高亮
 *  - 滚轮缩放 / 拖拽平移 / 双击重置
 *
 * 各元素的图形本体在 elements/outdoor/<分组>/<元素>/Symbol2D.tsx (与素材卡图标同源),
 * 本文件只负责定位/旋转/选中事件/名称标签与绘制顺序。
 * ============================================================ */

export function OutdoorPlan2D() {
  const palette = useOutdoorPalette();
  const C = palette.dark ? PLAN_DARK : PLAN_LIGHT;
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

  /** 地面元素 (道路沿 X 方向, 旋转角与 3D Y 旋转取反) */
  const GroundView = ({ item }: { item: GroundItem }) => {
    const selected = selectedGroundId === item.id;
    const el = getGroundElement(item.type);
    const clickable = !groundLocked;
    return (
      <g
        transform={`translate(${item.position[0]} ${item.position[2]}) rotate(${-item.rotation})`}
        style={{ cursor: clickable ? 'pointer' : 'default' }}
        onClick={clickable ? (e) => { e.stopPropagation(); selectGround(item.id); } : undefined}
      >
        {el ? <el.Symbol2D item={item} C={C} selected={selected} /> : null}
      </g>
    );
  };

  /** 空间对象 (车辆/建筑) */
  const ObjectView = ({ item }: { item: OutdoorObject }) => {
    const selected = selectedOutdoorObjectId === item.id;
    const clickable = !spaceLocked;
    const el = getOutdoorObjectElement(item.type);
    return (
      <g
        transform={`translate(${item.position[0]} ${item.position[2]}) rotate(${-item.rotation})`}
        style={{ cursor: clickable ? 'pointer' : 'default' }}
        onClick={clickable ? (e) => { e.stopPropagation(); selectOutdoorObject(item.id); } : undefined}
      >
        {el ? <el.Symbol2D item={item} C={C} selected={selected} /> : null}
        {showLabels && (
          <text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fontSize={0.9} fill={C.text}
            transform={`rotate(${item.rotation})`} style={{ paintOrder: 'stroke' }} stroke={C.textHalo} strokeWidth={0.25}>
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
        {/* 地面结构层: 按注册表声明顺序铺设 (地面 → 草地/河流 → 道路 → 路口/匝道/围墙/操场) */}
        {GROUND_ELEMENTS.map((el) =>
          outdoorSceneData.ground
            .filter((g) => g.type === el.type)
            .map((g) => <GroundView key={g.id} item={g} />),
        )}

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
