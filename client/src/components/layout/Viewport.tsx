import { RotateCcw, Maximize2, Minimize2, ChevronDown, Sun, SlidersHorizontal, Eye, Box, Grid3X3, LayoutGrid, Play, Download, X, Layers } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Scene } from '../3D/Scene';
import { FloorPlan2D } from '../2D/FloorPlan2D';
import { LIGHTING_OPTIONS, LIGHTING_ICONS } from '../../constants/lighting';
import type { Furniture } from '../../types';

export function Viewport() {
  const {
    viewMode, setViewMode,
    renderMode, setRenderMode,
    cameraPreset, setCameraPreset,
    viewSettings, updateViewSettings,
    triggerResetCamera,
    styles, designStyleId, selectStyle,
    pixelsPerMeter,
    isFullscreen, toggleFullscreen,
    walkthroughIndex,
    selectedFurnitureId, selectFurniture,
    selectedStructureId, selectStructure,
    activeSpaceId, spaces, selectSpace,
    sceneData,
    updateFurniture, updateStructure,
  } = useAppStore();

  const [showSettings, setShowSettings] = useState(true);

  const viewModes: { key: typeof viewMode; label: string; icon: React.ReactNode }[] = [
    { key: 'perspective', label: '透视', icon: <Eye size={14} /> },
    { key: 'axonometric', label: '轴测', icon: <Box size={14} /> },
    { key: 'top', label: '顶视', icon: <Grid3X3 size={14} /> },
    { key: 'plan', label: '平面', icon: <LayoutGrid size={14} /> },
    { key: 'walkthrough', label: '漫游', icon: <Play size={14} /> },
  ];

  const renderModes: { key: typeof renderMode; label: string }[] = [
    { key: 'arctic', label: 'ARCTIC' },
    { key: 'shaded', label: 'SHADED' },
    { key: 'material', label: 'MATERIAL' },
  ];

  const presets = ['整体', '自由视角', '客厅', '厨房', '卧室'];

  const currentStyle = styles.find((s) => s.id === designStyleId);
  const styleCode = currentStyle?.code ?? 'BASE';

  // 查找选中的家具对象
  const selectedFurniture: Furniture | null = selectedFurnitureId
    ? sceneData.rooms.flatMap((r) => r.furniture).find((f) => f.id === selectedFurnitureId) ?? null
    : null;

  // 解析选中的建筑结构对象
  const selectedStructure = (() => {
    if (!selectedStructureId) return null;
    const [type, roomId, id] = selectedStructureId.split(':');
    const room = sceneData.rooms.find((r) => r.id === roomId);
    if (!room) return null;
    if (type === 'floor') {
      // 从墙体端点计算房间尺寸
      const xs = room.walls.flatMap((w) => [w.start[0], w.end[0]]);
      const zs = room.walls.flatMap((w) => [w.start[1], w.end[1]]);
      const w = Math.max(...xs) - Math.min(...xs);
      const d = Math.max(...zs) - Math.min(...zs);
      return {
        type: '地板', name: `${room.name} 地板`, id: room.id,
        position: null,
        size: null,
        extra: {
          width: w,
          depth: d,
          floorThickness: sceneData.floorThickness,
          floorHeight: room.floorHeight,
          ceilingHeight: sceneData.ceilingHeight,
        },
      };
    }
    if (type === 'wall') {
      const seg = room.walls.find((w) => w.id === id);
      if (!seg) return null;
      const len = Math.sqrt((seg.end[0] - seg.start[0]) ** 2 + (seg.end[1] - seg.start[1]) ** 2);
      return { type: '墙体', name: `${room.name} ${seg.id}`, id: seg.id, position: null, size: null, extra: { length: len, start: seg.start, end: seg.end, height: seg.height } };
    }
    if (type === 'door') {
      const d = room.doors.find((x) => x.id === id);
      if (!d) return null;
      return { type: '门', name: `${room.name} ${d.id}`, id: d.id, position: d.position, size: [d.width, d.height], extra: { rotation: d.rotation ?? 0, openInward: d.openInward, hingeSide: d.hingeSide ?? 'left' } };
    }
    if (type === 'window') {
      const w = room.windows.find((x) => x.id === id);
      if (!w) return null;
      return { type: '窗', name: `${room.name} ${w.id}`, id: w.id, position: w.position, size: [w.width, w.height], extra: { rotation: w.rotation ?? 0, style: w.style } };
    }
    if (type === 'bay') {
      const b = (room.bayWindows ?? []).find((x) => x.id === id);
      if (!b) return null;
      return { type: '飘窗', name: `${room.name} ${b.id}`, id: b.id, position: b.position, size: [b.width, b.height, b.depth], extra: { rotation: b.rotation ?? 0 } };
    }
    if (type === 'french') {
      const f = (room.frenchWindows ?? []).find((x) => x.id === id);
      if (!f) return null;
      return { type: '落地窗', name: `${room.name} ${f.id}`, id: f.id, position: f.position, size: [f.width, f.height], extra: { rotation: f.rotation ?? 0 } };
    }
    return null;
  })();

  return (
    <div className="flex-1 relative overflow-hidden h-full">
      {/* 3D 画布 / 2D 平面图 */}
      <div className="absolute inset-0 h-full w-full">
        {viewMode === 'plan' ? <FloorPlan2D /> : <Scene />}
      </div>

      {/* === 顶部浮动工具条 === */}
      <div className="absolute top-0 left-0 right-0 h-11 bg-white/90 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-3 z-20 select-none">
        {/* 视图模式切换 */}
        <div className="flex items-center gap-0.5">
          {viewModes.map((mode) => (
            <button
              key={mode.key}
              onClick={() => setViewMode(mode.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                viewMode === mode.key
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {mode.icon}
              {mode.label}
            </button>
          ))}
          <div className="w-px h-5 bg-gray-200 mx-1.5" />
          {/* 视角预设 */}
          <div className="relative">
            <select
              value={cameraPreset}
              onChange={(e) => setCameraPreset(e.target.value)}
              className="appearance-none bg-gray-50 border border-gray-200 text-xs text-gray-700 px-2.5 py-1.5 pr-7 rounded-md cursor-pointer hover:bg-gray-100 focus:outline-none focus:border-gray-400"
            >
              {presets.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
          </div>
        </div>
        {/* 渲染模式切换 */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-50 rounded-md p-0.5">
            {renderModes.map((mode) => (
              <button
                key={mode.key}
                onClick={() => setRenderMode(mode.key)}
                className={`px-2.5 py-1 text-[10px] tracking-wide rounded transition-colors ${
                  renderMode === mode.key
                    ? 'bg-white shadow-sm text-gray-900 font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <button className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* === 左上角信息标签 === */}
      <div className="absolute top-14 left-4 pointer-events-none z-10">
        <div className="text-[10px] text-gray-500 tracking-widest font-medium">{styleCode} / {renderMode.toUpperCase()}</div>
        <div className="text-sm text-gray-700 font-medium mt-0.5 capitalize">{viewMode}</div>
        <div className="text-xs text-gray-500 mt-0.5">{currentStyle?.label}</div>
        {viewMode === 'walkthrough' && (
          <div className="text-[11px] text-gray-500 mt-1 bg-white/70 backdrop-blur-sm px-2 py-0.5 rounded inline-block">
            视角 {walkthroughIndex + 1} / 8 · 点击蓝色光柱切换 · 拖拽环视
          </div>
        )}
      </div>

      {/* === 右上角：刷新 + 最大化/最小化 === */}
      <div className="absolute top-14 right-4 z-20 flex gap-2 select-none">
        <button
          onClick={triggerResetCamera}
          className="w-9 h-9 rounded-lg bg-white/90 backdrop-blur-md shadow-md border border-gray-200 hover:bg-white flex items-center justify-center text-gray-600 transition-colors"
          title="重置视角"
        >
          <RotateCcw size={15} />
        </button>
        <button
          onClick={toggleFullscreen}
          className="w-9 h-9 rounded-lg bg-white/90 backdrop-blur-md shadow-md border border-gray-200 hover:bg-white flex items-center justify-center text-gray-600 transition-colors"
          title={isFullscreen ? '退出全屏' : '全屏'}
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      </div>

      {/* === 右侧悬浮设置面板 === */}
      {showSettings ? (
        <div className="absolute top-28 right-4 w-56 bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 z-10 select-none overflow-hidden">
          {/* 标题栏 */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <span className="text-[11px] font-semibold text-gray-700 tracking-wide">视图设置</span>
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-400 hover:text-gray-600 text-xs"
            >
              ✕
            </button>
          </div>
          {/* 开关组 */}
          <div className="px-3 py-2.5 space-y-2.5 border-b border-gray-100">
            <SettingToggle
              label="空间名称"
              value={viewSettings.showSpaceName}
              onChange={(v) => updateViewSettings('showSpaceName', v)}
            />
            <SettingToggle
              label="交通动线"
              value={viewSettings.showTrafficLines}
              onChange={(v) => updateViewSettings('showTrafficLines', v)}
            />
            <SettingToggle
              label="显示顶面"
              value={viewSettings.showCeiling}
              onChange={(v) => updateViewSettings('showCeiling', v)}
            />
            <SettingToggle
              label="开启平开门"
              value={viewSettings.showDoorsOpen}
              onChange={(v) => updateViewSettings('showDoorsOpen', v)}
            />
          </div>
          {/* 墙体剖切 */}
          <div className="px-3 py-2.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-gray-700 font-medium">墙体剖切</span>
              <span className="text-[10px] text-gray-500">{viewSettings.wallCutHeight.toFixed(2)} m</span>
            </div>
            <input
              type="range"
              min={0}
              max={3}
              step={0.05}
              value={viewSettings.wallCutHeight}
              onChange={(e) => updateViewSettings('wallCutHeight', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-gray-900"
            />
            <div className="flex justify-between text-[9px] text-gray-400 mt-1">
              <span>0</span>
              <span>3.00</span>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowSettings(true)}
          className="absolute top-28 right-4 w-9 h-9 rounded-lg bg-white/90 backdrop-blur-md shadow-md border border-gray-200 hover:bg-white flex items-center justify-center text-gray-600 transition-colors z-10"
          title="视图设置"
        >
          <SlidersHorizontal size={15} />
        </button>
      )}

      {/* === 选中家具属性面板（悬浮于右侧，位于视图设置面板下方） === */}
      {selectedFurniture && (
        <div className="absolute right-4 z-30 select-none" style={{ top: showSettings ? '370px' : '7rem' }}>
          <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 w-64 overflow-hidden">
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50/80">
              <div className="flex items-center gap-1.5">
                <Layers size={12} className="text-gray-500" />
                <span className="text-[11px] font-semibold text-gray-700 tracking-wide">家具属性</span>
              </div>
              <button
                onClick={() => selectFurniture(null)}
                className="text-gray-400 hover:text-gray-600 text-xs"
              >
                <X size={13} />
              </button>
            </div>
            {/* 属性列表 */}
            <div className="px-3 py-2.5 space-y-2.5 max-h-[calc(100vh-20rem)] overflow-y-auto">
              <PropRow label="名称" value={selectedFurniture.name} />
              <PropRow label="类型" value={selectedFurniture.type} />

              {/* 位置编辑 (X/Z) */}
              <div className="space-y-1.5 pt-1 border-t border-gray-100">
                <div className="text-[10px] text-gray-400 font-medium pt-1">位置</div>
                <StepperRow
                  label="X"
                  value={selectedFurniture.position[0]}
                  step={0.1}
                  min={-15}
                  max={15}
                  onChange={(v) => updateFurniture(selectedFurniture.id, { position: [v, selectedFurniture.position[1], selectedFurniture.position[2]] })}
                />
                <StepperRow
                  label="Z"
                  value={selectedFurniture.position[2]}
                  step={0.1}
                  min={-15}
                  max={15}
                  onChange={(v) => updateFurniture(selectedFurniture.id, { position: [selectedFurniture.position[0], selectedFurniture.position[1], v] })}
                />
              </div>

              {/* 旋转编辑 (拖拽条) */}
              <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
                <SliderRow
                  label="旋转角度"
                  value={selectedFurniture.rotation}
                  min={0}
                  max={359}
                  step={1}
                  unit="°"
                  onChange={(v) => updateFurniture(selectedFurniture.id, { rotation: Math.round(v) })}
                />
              </div>

              {/* 尺寸编辑 (长×高×宽) */}
              <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
                <div className="text-[10px] text-gray-400 font-medium pt-1">尺寸 (长×高×宽)</div>
                <StepperRow
                  label="长 (D)"
                  value={selectedFurniture.size[0]}
                  step={0.05}
                  min={0.1}
                  max={10}
                  onChange={(v) => updateFurniture(selectedFurniture.id, { size: [v, selectedFurniture.size[1], selectedFurniture.size[2]] })}
                />
                <StepperRow
                  label="高 (H)"
                  value={selectedFurniture.size[1]}
                  step={0.05}
                  min={0.1}
                  max={5}
                  onChange={(v) => updateFurniture(selectedFurniture.id, { size: [selectedFurniture.size[0], v, selectedFurniture.size[2]] })}
                />
                <StepperRow
                  label="宽 (W)"
                  value={selectedFurniture.size[2]}
                  step={0.05}
                  min={0.1}
                  max={10}
                  onChange={(v) => updateFurniture(selectedFurniture.id, { size: [selectedFurniture.size[0], selectedFurniture.size[1], v] })}
                />
              </div>

              {/* 颜色编辑 */}
              <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
                <ColorRow
                  label="颜色"
                  value={selectedFurniture.color}
                  onChange={(v) => updateFurniture(selectedFurniture.id, { color: v })}
                />
              </div>

              {selectedFurniture.shape && (
                <div className="pt-1.5 border-t border-gray-100">
                  <ToggleRow
                    label="形状"
                    options={[
                      { label: '长方形', value: 'rect' },
                      { label: '四分之一圆', value: 'quarter' },
                    ]}
                    value={selectedFurniture.shape}
                    onChange={(v) => updateFurniture(selectedFurniture.id, { shape: v as 'rect' | 'quarter' })}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* === 选中建筑结构属性面板 === */}
      {selectedStructure && (
        <div className="absolute right-4 z-30 select-none" style={{ top: showSettings ? '370px' : '7rem' }}>
          <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 w-64 overflow-hidden">
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50/80">
              <div className="flex items-center gap-1.5">
                <Layers size={12} className="text-gray-500" />
                <span className="text-[11px] font-semibold text-gray-700 tracking-wide">建筑结构属性</span>
              </div>
              <button
                onClick={() => selectStructure(null)}
                className="text-gray-400 hover:text-gray-600 text-xs"
              >
                <X size={13} />
              </button>
            </div>
            {/* 属性列表 */}
            <div className="px-3 py-2.5 space-y-2.5 max-h-[calc(100vh-20rem)] overflow-y-auto">
              <PropRow label="类型" value={selectedStructure.type} />
              <PropRow label="名称" value={selectedStructure.name} />

              {/* 地板专属属性 */}
              {selectedStructure.type === '地板' && selectedStructure.extra && (
                <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
                  <div className="text-[10px] text-gray-400 font-medium pt-1">尺寸 (宽×深)</div>
                  <PropRow label="宽" value={`${(selectedStructure.extra.width as number).toFixed(2)} m`} />
                  <PropRow label="深" value={`${(selectedStructure.extra.depth as number).toFixed(2)} m`} />
                </div>
              )}
              {selectedStructure.type === '地板' && selectedStructure.extra && (
                <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
                  <div className="text-[10px] text-gray-400 font-medium pt-1">地板参数</div>
                  <StepperRow
                    label="板厚"
                    value={selectedStructure.extra.floorThickness as number}
                    step={0.05}
                    min={0.05}
                    max={0.5}
                    unit="m"
                    onChange={(v) => updateStructure(selectedStructureId!, { floorThickness: v })}
                  />
                  <StepperRow
                    label="地板高度"
                    value={selectedStructure.extra.floorHeight as number}
                    step={0.05}
                    min={0}
                    max={2}
                    unit="m"
                    onChange={(v) => updateStructure(selectedStructureId!, { floorHeight: v })}
                  />
                  <StepperRow
                    label="层高"
                    value={selectedStructure.extra.ceilingHeight as number}
                    step={0.1}
                    min={2}
                    max={4}
                    unit="m"
                    onChange={(v) => updateStructure(selectedStructureId!, { ceilingHeight: v })}
                  />
                </div>
              )}

              {/* 位置 (可编辑 X/Z, 仅门窗类有 position) */}
              {selectedStructure.position && (
                <div className="space-y-1.5 pt-1 border-t border-gray-100">
                  <div className="text-[10px] text-gray-400 font-medium pt-1">位置</div>
                  <StepperRow
                    label="X"
                    value={selectedStructure.position[0]}
                    step={0.1}
                    min={-15}
                    max={15}
                    onChange={(v) => updateStructure(selectedStructureId!, {
                      position: [v, selectedStructure.position![1], selectedStructure.position![2]],
                    })}
                  />
                  <StepperRow
                    label="Z"
                    value={selectedStructure.position[2]}
                    step={0.1}
                    min={-15}
                    max={15}
                    onChange={(v) => updateStructure(selectedStructureId!, {
                      position: [selectedStructure.position![0], selectedStructure.position![1], v],
                    })}
                  />
                </div>
              )}

              {/* 尺寸编辑 (门/窗: 宽×高; 飘窗: 宽×高×深) */}
              {selectedStructure.size && (
                <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
                  <div className="text-[10px] text-gray-400 font-medium pt-1">
                    尺寸 {selectedStructure.size.length === 3 ? '(宽×高×深)' : '(宽×高)'}
                  </div>
                  <StepperRow
                    label="宽 (W)"
                    value={selectedStructure.size[0]}
                    step={0.05}
                    min={0.3}
                    max={6}
                    onChange={(v) => updateStructure(selectedStructureId!, selectedStructure.size!.length === 3
                      ? { width: v, size: [v, selectedStructure.size![1], selectedStructure.size![2]] }
                      : { width: v, size: [v, selectedStructure.size![1]] }
                    )}
                  />
                  <StepperRow
                    label="高 (H)"
                    value={selectedStructure.size[1]}
                    step={0.05}
                    min={0.3}
                    max={4}
                    onChange={(v) => updateStructure(selectedStructureId!, selectedStructure.size!.length === 3
                      ? { height: v, size: [selectedStructure.size![0], v, selectedStructure.size![2]] }
                      : { height: v, size: [selectedStructure.size![0], v] }
                    )}
                  />
                  {selectedStructure.size.length === 3 && (
                    <StepperRow
                      label="深 (D)"
                      value={selectedStructure.size[2]}
                      step={0.05}
                      min={0.1}
                      max={2}
                      onChange={(v) => updateStructure(selectedStructureId!, {
                        depth: v,
                        size: [selectedStructure.size![0], selectedStructure.size![1], v],
                      })}
                    />
                  )}
                </div>
              )}

              {/* 墙体位置与尺寸 (可编辑) */}
              {selectedStructure.extra?.length !== undefined && selectedStructure.extra.start && selectedStructure.extra.end && (() => {
                const [sx, sz] = selectedStructure.extra.start as [number, number];
                const [ex, ez] = selectedStructure.extra.end as [number, number];
                const cx = (sx + ex) / 2;
                const cz = (sz + ez) / 2;
                const len = selectedStructure.extra.length as number;
                const isHorizontal = Math.abs(ez - sz) < 0.01;
                const isVertical = Math.abs(ex - sx) < 0.01;
                return (
                  <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
                    <div className="text-[10px] text-gray-400 font-medium pt-1">墙体位置 (整体平移)</div>
                    <StepperRow
                      label="中心 X"
                      value={cx}
                      step={0.1}
                      min={-15}
                      max={15}
                      unit="m"
                      onChange={(v) => {
                        const dx = v - cx;
                        updateStructure(selectedStructureId!, {
                          start: [sx + dx, sz],
                          end: [ex + dx, ez],
                        });
                      }}
                    />
                    <StepperRow
                      label="中心 Z"
                      value={cz}
                      step={0.1}
                      min={-15}
                      max={15}
                      unit="m"
                      onChange={(v) => {
                        const dz = v - cz;
                        updateStructure(selectedStructureId!, {
                          start: [sx, sz + dz],
                          end: [ex, ez + dz],
                        });
                      }}
                    />
                    {(isHorizontal || isVertical) && (
                      <div className="pt-1.5 border-t border-gray-100">
                        <ToggleRow
                          label="朝向"
                          options={[
                            { label: '水平', value: 'horizontal' },
                            { label: '垂直', value: 'vertical' },
                          ]}
                          value={isVertical ? 'vertical' : 'horizontal'}
                          onChange={(v) => {
                            // 绕中心 90° 旋转: 水平↔垂直
                            const targetIsVertical = v === 'vertical';
                            if (targetIsVertical && isHorizontal) {
                              updateStructure(selectedStructureId!, {
                                start: [cx, cz - len / 2],
                                end: [cx, cz + len / 2],
                              });
                            } else if (!targetIsVertical && isVertical) {
                              updateStructure(selectedStructureId!, {
                                start: [cx - len / 2, cz],
                                end: [cx + len / 2, cz],
                              });
                            }
                          }}
                        />
                      </div>
                    )}
                    <div className="text-[10px] text-gray-400 font-medium pt-1">墙体尺寸</div>
                    <StepperRow
                      label="长度"
                      value={selectedStructure.extra.length}
                      step={0.1}
                      min={0.3}
                      max={20}
                      unit="m"
                      onChange={(v) => {
                        // 沿 start→end 方向缩放 end 点, 保持墙体方向不变
                      const [sx, sz] = selectedStructure.extra!.start as [number, number];
                      const [ex, ez] = selectedStructure.extra!.end as [number, number];
                      const dx = ex - sx;
                      const dz = ez - sz;
                      const curLen = Math.sqrt(dx * dx + dz * dz);
                      if (curLen < 0.001) return; // 防止零向量
                      const scale = v / curLen;
                      const newEnd: [number, number] = [sx + dx * scale, sz + dz * scale];
                      updateStructure(selectedStructureId!, {
                        end: newEnd,
                      });
                    }}
                  />
                  {selectedStructure.extra.height !== undefined && (
                    <StepperRow
                      label="高度"
                      value={selectedStructure.extra.height}
                      step={0.1}
                      min={1.5}
                      max={4}
                      unit="m"
                      onChange={(v) => updateStructure(selectedStructureId!, { height: v })}
                    />
                  )}
                </div>
            );
          })()}

              {/* 旋转 (拖拽条) */}
              {selectedStructure.extra?.rotation !== undefined && (
                <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
                  <SliderRow
                    label="旋转角度"
                    value={selectedStructure.extra.rotation}
                    min={0}
                    max={359}
                    step={1}
                    unit="°"
                    onChange={(v) => updateStructure(selectedStructureId!, { rotation: Math.round(v) })}
                  />
                </div>
              )}

              {/* 开门方向 (toggle) */}
              {selectedStructure.extra?.openInward !== undefined && (
                <div className="pt-1.5 border-t border-gray-100">
                  <ToggleRow
                    label="开门方向"
                    options={[
                      { label: '向室外', value: 'false' },
                      { label: '向室内', value: 'true' },
                    ]}
                    value={String(selectedStructure.extra.openInward)}
                    onChange={(v) => updateStructure(selectedStructureId!, { openInward: v === 'true' })}
                  />
                </div>
              )}

              {/* 铰链位置 (toggle) */}
              {selectedStructure.extra?.hingeSide !== undefined && (
                <div className="pt-1.5 border-t border-gray-100">
                  <ToggleRow
                    label="铰链位置"
                    options={[
                      { label: '左', value: 'left' },
                      { label: '右', value: 'right' },
                    ]}
                    value={selectedStructure.extra.hingeSide}
                    onChange={(v) => updateStructure(selectedStructureId!, { hingeSide: v as 'left' | 'right' })}
                  />
                </div>
              )}

              {/* 窗样式 (toggle) */}
              {selectedStructure.extra?.style !== undefined && (
                <div className="pt-1.5 border-t border-gray-100">
                  <ToggleRow
                    label="窗样式"
                    options={[
                      { label: '默认', value: 'default' },
                      { label: '推拉', value: 'sliding' },
                    ]}
                    value={selectedStructure.extra.style}
                    onChange={(v) => updateStructure(selectedStructureId!, { style: v as 'default' | 'sliding' })}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* === 选中空间信息面板（悬浮于左下角） === */}
      {activeSpaceId && (() => {
        const room = sceneData.rooms.find((r) => r.id === activeSpaceId);
        if (!room) return null;
        return (
          <div className="absolute bottom-12 left-4 z-30 select-none max-w-xs">
            <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 overflow-hidden">
              {/* 标题栏 */}
              <div className="flex items-center justify-between px-3.5 py-2 border-b border-gray-100 bg-gray-50/80">
                <span className="text-[10px] font-semibold text-gray-500 tracking-widest">SELECTED SPACE</span>
                <button
                  onClick={() => selectSpace('')}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="关闭"
                >
                  <X size={13} />
                </button>
              </div>
              {/* 空间名称 */}
              <div className="px-3.5 pt-2.5 pb-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-gray-900">{room.name}</span>
                  <span className="text-xs text-gray-400 tracking-wide">{room.nameEn}</span>
                </div>
              </div>
              {/* 描述 */}
              {room.description && (
                <div className="px-3.5 py-1.5">
                  <p className="text-[12px] leading-relaxed text-gray-600">{room.description}</p>
                </div>
              )}
              {/* 标签 */}
              {room.tags && room.tags.length > 0 && (
                <div className="px-3.5 pb-3 pt-1 flex flex-wrap gap-1.5">
                  {room.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* === 右侧底部光影面板（在底部信息栏上方） === */}
      <div className="absolute bottom-12 right-4 z-10 select-none">
        <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 px-3 py-2.5 w-56">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              {LIGHTING_ICONS[viewSettings.lighting]?.(13) || <Sun size={13} />}
              <span className="text-[11px] text-gray-700 font-medium">光影</span>
            </div>
            <span className="text-[9px] text-gray-400 tracking-wider">LIGHTING</span>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {LIGHTING_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => updateViewSettings('lighting', opt)}
                className={`flex flex-col items-center gap-0.5 py-1.5 rounded text-[9px] transition-colors ${
                  viewSettings.lighting === opt
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
                title={opt}
              >
                {LIGHTING_ICONS[opt]?.(13)}
                <span className="text-[8px] leading-none">{opt.slice(0, 2)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* === 底部信息栏（操作提示 + 动态比例尺） === */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-white/90 backdrop-blur-md border-t border-gray-200 flex items-center justify-center gap-6 z-10 select-none pointer-events-none">
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="px-1.5 py-0.5 bg-gray-200 rounded text-[9px] font-medium">左键</span>
          旋转
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="px-1.5 py-0.5 bg-gray-200 rounded text-[9px] font-medium">中键</span>
          平移
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="px-1.5 py-0.5 bg-gray-200 rounded text-[9px] font-medium">滚轮</span>
          缩放
        </span>
        <span className="w-px h-3 bg-gray-300" />
        <span className="text-[10px] text-gray-500 tracking-wide">
          1 px = {Math.max(1, Math.round(1000 / pixelsPerMeter))} mm | 单位 m
        </span>
      </div>
    </div>
  );
}

function SettingToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-gray-700">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
          value ? 'bg-gray-900' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-1/2 -translate-y-1/2 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
            value ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

function PropRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[11px] text-gray-400 shrink-0 pt-0.5">{label}</span>
      <span className="text-[11px] text-gray-800 text-right break-all font-mono">{value}</span>
    </div>
  );
}

/** 拖拽条编辑 (适用于角度/比例等连续值) */
function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-gray-400">{label}</span>
        <span className="text-[11px] text-gray-800 font-mono">{value.toFixed(step < 1 ? 2 : 0)}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-gray-900"
      />
    </div>
  );
}

/** 数字步进器 (适用于尺寸/位置等精确值) */
function StepperRow({
  label,
  value,
  step = 0.05,
  min,
  max,
  unit = 'm',
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => {
    if (min !== undefined && v < min) v = min;
    if (max !== undefined && v > max) v = max;
    return Math.round(v * 100) / 100;
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-gray-400 shrink-0">{label}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(clamp(value - step))}
          className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded text-xs transition-colors"
        >
          −
        </button>
        <input
          type="number"
          value={value.toFixed(2)}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(clamp(v));
          }}
          className="w-14 text-center text-[11px] text-gray-800 font-mono border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-gray-400"
        />
        <button
          onClick={() => onChange(clamp(value + step))}
          className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded text-xs transition-colors"
        >
          +
        </button>
        <span className="text-[10px] text-gray-400 w-3">{unit}</span>
      </div>
    </div>
  );
}

/** 按钮组选择 (适用于枚举值: 左/右、向内/向外等) */
function ToggleRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-gray-400 shrink-0">{label}</span>
      <div className="flex items-center bg-gray-100 rounded-md p-0.5 gap-0.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
              value === opt.value
                ? 'bg-white shadow-sm text-gray-900 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 颜色选择器 */
function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-gray-400 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer border border-gray-200"
        />
        <span className="text-[11px] text-gray-800 font-mono">{value}</span>
      </div>
    </div>
  );
}

