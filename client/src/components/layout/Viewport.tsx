import {
  RotateCcw,
  Maximize2,
  Minimize2,
  Sun,
  SlidersHorizontal,
  X,
  Layers,
  Copy,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Scene } from '../3D/indoor/IndoorScene';
import { OutdoorScene } from '../3D/outdoor/OutdoorScene';
import { FloorPlan2D } from '../2D/FloorPlan2D';
import { OutdoorPlan2D } from '../2D/OutdoorPlan2D';
import { LIGHTING_OPTIONS, LIGHTING_ICONS } from '../../constants/lighting';
import { OUTDOOR_STYLE_OPTIONS } from '../../constants/outdoorStyles';
import { useDesignerShortcuts } from '../../hooks/useDesignerShortcuts';
import { PerformanceMonitor } from '../panel/PerformanceMonitor';
import { Toolbar, UndoRedoButtons } from './Toolbar';
import {
  ColorRow,
  PositionRows,
  PropRow,
  RotationControl,
  SettingToggle,
  SizeRows,
  StepperRow,
  ToggleRow,
} from '../ui/PropertyControls';
import type { Furniture } from '../../types';

/** 室内视角预设 */
const INTERIOR_PRESETS = ['整体', '自由视角', '客厅', '厨房', '卧室'];
/** 户外视角预设 */
const OUTDOOR_PRESETS = ['整体', '高架道路', '建筑组团', '南门入口'];

const GROUND_TYPE_LABEL: Record<string, string> = {
  ground: '地面',
  grass: '草地',
  river: '河流',
  road: '道路',
};
const OBJECT_TYPE_LABEL: Record<string, string> = {
  building: '玻璃建筑',
  warehouse: '厂房仓库',
  car: '轿车',
  truck: '卡车',
};

/**
 * 设计器视口 (室内 / 户外统一入口)
 *
 * 原先 Viewport / OutdoorViewport 是两个平行复制的文件: 工具条、视图设置面板、
 * 光影面板、底部提示条、属性控件完全重复。现在合并为一个组件, 差异只在两处:
 *   1. 中间渲染什么 —— 按 designerMode 选 3D 场景 / 2D 平面图
 *   2. 右侧属性面板内容 —— 室内有家具 + 建筑结构两块, 户外有地面元素 + 空间对象两块
 */
export function Viewport() {
  const designerMode = useAppStore((s) => s.designerMode);
  const outdoor = designerMode === 'outdoor';

  return (
    <div className="flex-1 relative overflow-hidden h-full">
      {/* 3D 画布 / 2D 平面图 */}
      <div className="absolute inset-0 h-full w-full">
        {outdoor ? (
          <SceneSwitch plan={<OutdoorPlan2D />} three={<OutdoorScene />} />
        ) : (
          <SceneSwitch plan={<FloorPlan2D />} three={<Scene />} />
        )}
      </div>

      <Toolbar presets={outdoor ? OUTDOOR_PRESETS : INTERIOR_PRESETS}>
        <UndoRedoButtons />
      </Toolbar>

      <ViewportInfoTag />
      <ViewportTopRightButtons />
      <ViewportPanelColumn />
      <InteriorSpaceCard />
      <LightingPanel />
      <ViewportHintBar />
    </div>
  );
}

/** 按 viewMode 决定渲染 3D 场景还是 2D 平面图, 并统一挂载快捷键 */
function SceneSwitch({ plan, three }: { plan: React.ReactNode; three: React.ReactNode }) {
  const viewMode = useAppStore((s) => s.viewMode);
  useDesignerShortcuts();
  return <>{viewMode === 'plan' ? plan : three}</>;
}

/** 室内: 左侧属性列 → 风格代号 / 中文风格名 (户外取园区风格表) */
function useStyleTag(): { styleCode: string; styleLabel: string } {
  const outdoor = useAppStore((s) => s.designerMode === 'outdoor');
  const styles = useAppStore((s) => s.styles);
  const designStyleId = useAppStore((s) => s.designStyleId);

  if (outdoor) {
    const s = OUTDOOR_STYLE_OPTIONS.find((o) => o.id === designStyleId);
    return { styleCode: s?.code ?? 'DIGITAL PARK', styleLabel: s?.label ?? '数字园区' };
  }
  const s = styles.find((o) => o.id === designStyleId);
  return { styleCode: s?.code ?? 'BASE', styleLabel: s?.label ?? '' };
}

/** 左上角: 风格 / 渲染模式 / 视图模式 / 漫游提示 */
function ViewportInfoTag() {
  const outdoor = useAppStore((s) => s.designerMode === 'outdoor');
  const viewMode = useAppStore((s) => s.viewMode);
  const renderMode = useAppStore((s) => s.renderMode);
  const walkthroughIndex = useAppStore((s) => s.walkthroughIndex);
  const { styleCode, styleLabel } = useStyleTag();

  return (
    <div className="absolute top-14 left-4 pointer-events-none z-10">
      <div className="text-[10px] text-gray-500 tracking-widest font-medium">
        {styleCode} / {renderMode.toUpperCase()}
      </div>
      <div className="text-sm text-gray-700 font-medium mt-0.5 capitalize">{viewMode}</div>
      <div className="text-xs text-gray-500 mt-0.5">{styleLabel}</div>
      {viewMode === 'walkthrough' && (
        <div className="text-[11px] text-gray-500 mt-1 bg-white/70 backdrop-blur-sm px-2 py-0.5 rounded inline-block">
          {outdoor
            ? '园区漫游 · 拖拽环视'
            : `视角 ${walkthroughIndex + 1} / 8 · 点击蓝色光柱切换 · 拖拽环视`}
        </div>
      )}
    </div>
  );
}

/** 右上角: 重置视角 + 全屏 */
function ViewportTopRightButtons() {
  const triggerResetCamera = useAppStore((s) => s.triggerResetCamera);
  const isFullscreen = useAppStore((s) => s.isFullscreen);
  const toggleFullscreen = useAppStore((s) => s.toggleFullscreen);

  return (
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
  );
}

/**
 * 右侧悬浮面板列: 纵向自动堆叠, 由内容决定高度, 面板之间不重叠。
 * (统一走这个 flex 列容器, 不要再给单个面板写 absolute/top 硬定位)
 */
function ViewportPanelColumn() {
  const outdoor = useAppStore((s) => s.designerMode === 'outdoor');
  const [showSettings, setShowSettings] = useState(true);

  return (
    <div className="absolute top-[104px] right-2 z-30 flex flex-col items-end gap-2 max-h-[calc(100%-8rem)] overflow-y-auto px-2 py-2 select-none">
      {showSettings ? (
        <div className="w-56 bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <span className="text-[11px] font-semibold text-gray-700 tracking-wide">视图设置</span>
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-400 hover:text-gray-600 text-xs"
            >
              ✕
            </button>
          </div>
          <div className="px-3 py-2.5 space-y-2.5 border-b border-gray-100">
            {outdoor ? (
              <LabelToggle />
            ) : (
              <InteriorViewSettings />
            )}
          </div>
          {!outdoor && <WallCutout />}
        </div>
      ) : (
        <button
          onClick={() => setShowSettings(true)}
          className="w-9 h-9 rounded-lg bg-white/90 backdrop-blur-md shadow-md border border-gray-200 hover:bg-white flex items-center justify-center text-gray-600 transition-colors"
          title="视图设置"
        >
          <SlidersHorizontal size={15} />
        </button>
      )}

      {outdoor ? (
        <>
          <OutdoorGroundPanel />
          <OutdoorObjectPanel />
        </>
      ) : (
        <>
          <FurniturePanel />
          <StructurePanel />
        </>
      )}
    </div>
  );
}

function LabelToggle() {
  const viewSettings = useAppStore((s) => s.viewSettings);
  const updateViewSettings = useAppStore((s) => s.updateViewSettings);
  return (
    <SettingToggle
      label="显示标签"
      value={!!viewSettings.showLabels}
      onChange={(v) => updateViewSettings('showLabels', v)}
    />
  );
}

function InteriorViewSettings() {
  const viewSettings = useAppStore((s) => s.viewSettings);
  const updateViewSettings = useAppStore((s) => s.updateViewSettings);
  return (
    <>
      <SettingToggle
        label="空间名称"
        value={viewSettings.showSpaceName}
        onChange={(v) => updateViewSettings('showSpaceName', v)}
      />
      <SettingToggle
        label="尺寸标注"
        value={!!viewSettings.showDimensions}
        onChange={(v) => updateViewSettings('showDimensions', v)}
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
    </>
  );
}

function WallCutout() {
  const viewSettings = useAppStore((s) => s.viewSettings);
  const updateViewSettings = useAppStore((s) => s.updateViewSettings);
  return (
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
  );
}

/** 属性面板外壳 (标题 + 关闭 + 可选删除) */
function PropertyCard({
  title,
  onClose,
  onDelete,
  children,
}: {
  title: string;
  onClose: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="w-64 bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50/80">
        <div className="flex items-center gap-1.5">
          <Layers size={12} className="text-gray-500" />
          <span className="text-[11px] font-semibold text-gray-700 tracking-wide">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          {onDelete && (
            <button onClick={onDelete} className="text-gray-400 hover:text-red-500 p-0.5" title="删除">
              <Trash2 size={13} />
            </button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-0.5">
            <X size={13} />
          </button>
        </div>
      </div>
      <div className="px-3 py-2.5 space-y-2.5 max-h-[calc(100vh-20rem)] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

/* ==================== 室内 ==================== */

function FurniturePanel() {
  const selectedFurnitureId = useAppStore((s) => s.selectedFurnitureId);
  const sceneData = useAppStore((s) => s.sceneData);
  const selectFurniture = useAppStore((s) => s.selectFurniture);
  const updateFurniture = useAppStore((s) => s.updateFurniture);
  const removeFurniture = useAppStore((s) => s.removeFurniture);
  const duplicateFurniture = useAppStore((s) => s.duplicateFurniture);

  const item: Furniture | null = selectedFurnitureId
    ? (sceneData.rooms.flatMap((r) => r.furniture).find((f) => f.id === selectedFurnitureId) ?? null)
    : null;
  if (!item) return null;

  return (
    <PropertyCard title="家具属性" onClose={() => selectFurniture(null)}>
      <PropRow label="名称" value={item.name} />
      <PropRow label="类型" value={item.type} />

      {/* 位置 X/Z */}
      <div className="space-y-1.5 pt-1 border-t border-gray-100">
        <div className="text-[10px] text-gray-400 font-medium pt-1">位置</div>
        <StepperRow
          label="X"
          value={item.position[0]}
          step={0.1}
          min={-15}
          max={15}
          onChange={(v) =>
            updateFurniture(item.id, { position: [v, item.position[1], item.position[2]] })
          }
        />
        <StepperRow
          label="Z"
          value={item.position[2]}
          step={0.1}
          min={-15}
          max={15}
          onChange={(v) =>
            updateFurniture(item.id, { position: [item.position[0], item.position[1], v] })
          }
        />
      </div>

      {/* 旋转 */}
      <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
        <RotationControl
          value={item.rotation}
          onChange={(v) => updateFurniture(item.id, { rotation: Math.round(v) })}
        />
      </div>

      {/* 尺寸 (长×高×宽) */}
      <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
        <div className="text-[10px] text-gray-400 font-medium pt-1">尺寸 (长×高×宽)</div>
        <StepperRow
          label="长 (D)"
          value={item.size[0]}
          step={0.05}
          min={0.1}
          max={10}
          onChange={(v) => updateFurniture(item.id, { size: [v, item.size[1], item.size[2]] })}
        />
        <StepperRow
          label="高 (H)"
          value={item.size[1]}
          step={0.05}
          min={0.1}
          max={5}
          onChange={(v) => updateFurniture(item.id, { size: [item.size[0], v, item.size[2]] })}
        />
        <StepperRow
          label="宽 (W)"
          value={item.size[2]}
          step={0.05}
          min={0.1}
          max={10}
          onChange={(v) => updateFurniture(item.id, { size: [item.size[0], item.size[1], v] })}
        />
      </div>

      {/* 颜色 */}
      <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
        <ColorRow
          label="颜色"
          value={item.color}
          onChange={(v) => updateFurniture(item.id, { color: v })}
        />
      </div>

      {item.shape && (
        <div className="pt-1.5 border-t border-gray-100">
          <ToggleRow
            label="形状"
            options={[
              { label: '长方形', value: 'rect' },
              { label: '四分之一圆', value: 'quarter' },
            ]}
            value={item.shape}
            onChange={(v) => updateFurniture(item.id, { shape: v as 'rect' | 'quarter' })}
          />
        </div>
      )}

      {/* 操作 */}
      <div className="pt-2 border-t border-gray-100 flex items-center gap-1.5">
        <button
          onClick={() => duplicateFurniture(item.id)}
          title="复制 (Ctrl+D)"
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
        >
          <Copy size={12} /> 复制
        </button>
        <button
          onClick={() => removeFurniture(item.id)}
          title="删除 (Delete)"
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] text-red-500 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
        >
          <Trash2 size={12} /> 删除
        </button>
      </div>
    </PropertyCard>
  );
}

/** 把 selector "type:roomId:id" 解析成可直接渲染的属性模型 */
function resolveStructure(selector: string | null, sceneData: ReturnType<typeof useAppStore.getState>['sceneData']) {
  if (!selector) return null;
  const [type, roomId, id] = selector.split(':');
  const room = sceneData.rooms.find((r) => r.id === roomId);
  if (!room) return null;

  if (type === 'floor') {
    const xs = room.walls.flatMap((w) => [w.start[0], w.end[0]]);
    const zs = room.walls.flatMap((w) => [w.start[1], w.end[1]]);
    const w = Math.max(...xs) - Math.min(...xs);
    const d = Math.max(...zs) - Math.min(...zs);
    return {
      type: '地板',
      name: `${room.name} 地板`,
      id: room.id,
      position: null,
      size: null,
      extra: {
        width: w,
        depth: d,
        floorThickness: sceneData.floorThickness,
        floorHeight: room.floorHeight,
        ceilingHeight: sceneData.ceilingHeight,
      } as Record<string, unknown>,
    };
  }
  if (type === 'wall') {
    const seg = room.walls.find((w) => w.id === id);
    if (!seg) return null;
    const len = Math.sqrt((seg.end[0] - seg.start[0]) ** 2 + (seg.end[1] - seg.start[1]) ** 2);
    return {
      type: '墙体',
      name: `${room.name} ${seg.id}`,
      id: seg.id,
      position: null,
      size: null,
      extra: { length: len, start: seg.start, end: seg.end, height: seg.height } as Record<string, unknown>,
    };
  }
  if (type === 'door') {
    const d = room.doors.find((x) => x.id === id);
    if (!d) return null;
    return {
      type: '门',
      name: `${room.name} ${d.id}`,
      id: d.id,
      position: d.position,
      size: [d.width, d.height] as number[],
      extra: { rotation: d.rotation ?? 0, openInward: d.openInward, hingeSide: d.hingeSide ?? 'left' } as Record<string, unknown>,
    };
  }
  if (type === 'window') {
    const w = room.windows.find((x) => x.id === id);
    if (!w) return null;
    return {
      type: '窗',
      name: `${room.name} ${w.id}`,
      id: w.id,
      position: w.position,
      size: [w.width, w.height] as number[],
      extra: { rotation: w.rotation ?? 0, style: w.style } as Record<string, unknown>,
    };
  }
  if (type === 'bay') {
    const b = (room.bayWindows ?? []).find((x) => x.id === id);
    if (!b) return null;
    return {
      type: '飘窗',
      name: `${room.name} ${b.id}`,
      id: b.id,
      position: b.position,
      size: [b.width, b.height, b.depth] as number[],
      extra: { rotation: b.rotation ?? 0 } as Record<string, unknown>,
    };
  }
  if (type === 'french') {
    const f = (room.frenchWindows ?? []).find((x) => x.id === id);
    if (!f) return null;
    return {
      type: '落地窗',
      name: `${room.name} ${f.id}`,
      id: f.id,
      position: f.position,
      size: [f.width, f.height] as number[],
      extra: { rotation: f.rotation ?? 0 } as Record<string, unknown>,
    };
  }
  return null;
}

function StructurePanel() {
  const selectedStructureId = useAppStore((s) => s.selectedStructureId);
  const sceneData = useAppStore((s) => s.sceneData);
  const selectStructure = useAppStore((s) => s.selectStructure);
  const updateStructure = useAppStore((s) => s.updateStructure);
  const removeStructure = useAppStore((s) => s.removeStructure);

  const st = resolveStructure(selectedStructureId, sceneData);
  if (!st || !selectedStructureId) return null;

  // 属性条目是异构联合, 各字段有的是 number 有的是 string/数组, 统一放宽为 any 供 JSX 渲染
  const extra = st.extra as Record<string, any>;
  const isFloor = st.type === '地板';

  return (
    <PropertyCard
      title="建筑结构属性"
      onClose={() => selectStructure(null)}
      onDelete={
        selectedStructureId.startsWith('floor:') ? undefined : () => removeStructure(selectedStructureId)
      }
    >
      <PropRow label="类型" value={st.type} />
      <PropRow label="名称" value={st.name} />

      {/* 地板 */}
      {isFloor && (
        <>
          <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
            <div className="text-[10px] text-gray-400 font-medium pt-1">尺寸 (宽×深)</div>
            <PropRow label="宽" value={`${(extra.width as number).toFixed(2)} m`} />
            <PropRow label="深" value={`${(extra.depth as number).toFixed(2)} m`} />
          </div>
          <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
            <div className="text-[10px] text-gray-400 font-medium pt-1">地板参数</div>
            <StepperRow
              label="板厚"
              value={extra.floorThickness as number}
              step={0.05}
              min={0.05}
              max={0.5}
              onChange={(v) => updateStructure(selectedStructureId, { floorThickness: v })}
            />
            <StepperRow
              label="地板高度"
              value={extra.floorHeight as number}
              step={0.05}
              min={0}
              max={2}
              onChange={(v) => updateStructure(selectedStructureId, { floorHeight: v })}
            />
            <StepperRow
              label="层高"
              value={extra.ceilingHeight as number}
              step={0.1}
              min={2}
              max={4}
              onChange={(v) => updateStructure(selectedStructureId, { ceilingHeight: v })}
            />
          </div>
        </>
      )}

      {/* 位置 (门窗类) */}
      {st.position && (
        <div className="space-y-1.5 pt-1 border-t border-gray-100">
          <div className="text-[10px] text-gray-400 font-medium pt-1">位置</div>
          <StepperRow
            label="X"
            value={st.position[0]}
            step={0.1}
            min={-15}
            max={15}
            onChange={(v) =>
              updateStructure(selectedStructureId, {
                position: [v, st.position![1], st.position![2]],
              })
            }
          />
          <StepperRow
            label="Z"
            value={st.position[2]}
            step={0.1}
            min={-15}
            max={15}
            onChange={(v) =>
              updateStructure(selectedStructureId, {
                position: [st.position![0], st.position![1], v],
              })
            }
          />
        </div>
      )}

      {/* 尺寸 */}
      {st.size && (
        <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
          <div className="text-[10px] text-gray-400 font-medium pt-1">
            尺寸 {st.size.length === 3 ? '(宽×高×深)' : '(宽×高)'}
          </div>
          <StepperRow
            label="宽 (W)"
            value={st.size[0]}
            step={0.05}
            min={0.3}
            max={6}
            onChange={(v) =>
              updateStructure(
                selectedStructureId,
                st.size!.length === 3
                  ? { width: v, size: [v, st.size![1], st.size![2]] }
                  : { width: v, size: [v, st.size![1]] }
              )
            }
          />
          <StepperRow
            label="高 (H)"
            value={st.size[1]}
            step={0.05}
            min={0.3}
            max={4}
            onChange={(v) =>
              updateStructure(
                selectedStructureId,
                st.size!.length === 3
                  ? { height: v, size: [st.size![0], v, st.size![2]] }
                  : { height: v, size: [st.size![0], v] }
              )
            }
          />
          {st.size.length === 3 && (
            <StepperRow
              label="深 (D)"
              value={st.size[2]}
              step={0.05}
              min={0.1}
              max={2}
              onChange={(v) =>
                updateStructure(selectedStructureId, {
                  depth: v,
                  size: [st.size![0], st.size![1], v],
                })
              }
            />
          )}
        </div>
      )}

      {/* 墙体位置与尺寸 */}
      {extra.length !== undefined && extra.start && extra.end && (
        <WallGeometryRows
          selector={selectedStructureId}
          start={extra.start as [number, number]}
          end={extra.end as [number, number]}
          length={extra.length as number}
          height={extra.height as number | undefined}
          updateStructure={updateStructure}
        />
      )}

      {/* 旋转 */}
      {extra.rotation !== undefined && (
        <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
          <RotationControl
            value={extra.rotation as number}
            onChange={(v) => updateStructure(selectedStructureId, { rotation: Math.round(v) })}
          />
        </div>
      )}

      {extra.openInward !== undefined && (
        <div className="pt-1.5 border-t border-gray-100">
          <ToggleRow
            label="开门方向"
            options={[
              { label: '向室外', value: 'false' },
              { label: '向室内', value: 'true' },
            ]}
            value={String(extra.openInward)}
            onChange={(v) => updateStructure(selectedStructureId, { openInward: v === 'true' })}
          />
        </div>
      )}

      {extra.hingeSide !== undefined && (
        <div className="pt-1.5 border-t border-gray-100">
          <ToggleRow
            label="铰链位置"
            options={[
              { label: '左', value: 'left' },
              { label: '右', value: 'right' },
            ]}
            value={extra.hingeSide as string}
            onChange={(v) =>
              updateStructure(selectedStructureId, { hingeSide: v as 'left' | 'right' })
            }
          />
        </div>
      )}

      {extra.style !== undefined && (
        <div className="pt-1.5 border-t border-gray-100">
          <ToggleRow
            label="窗样式"
            options={[
              { label: '默认', value: 'default' },
              { label: '推拉', value: 'sliding' },
            ]}
            value={extra.style as string}
            onChange={(v) =>
              updateStructure(selectedStructureId, { style: v as 'default' | 'sliding' })
            }
          />
        </div>
      )}
    </PropertyCard>
  );
}

function WallGeometryRows({
  selector,
  start,
  end,
  length,
  height,
  updateStructure,
}: {
  selector: string;
  start: [number, number];
  end: [number, number];
  length: number;
  height?: number;
  updateStructure: (selector: string, patch: Record<string, unknown>) => void;
}) {
  const [sx, sz] = start;
  const [ex, ez] = end;
  const cx = (sx + ex) / 2;
  const cz = (sz + ez) / 2;
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
        onChange={(v) => {
          const dx = v - cx;
          updateStructure(selector, { start: [sx + dx, sz], end: [ex + dx, ez] });
        }}
      />
      <StepperRow
        label="中心 Z"
        value={cz}
        step={0.1}
        min={-15}
        max={15}
        onChange={(v) => {
          const dz = v - cz;
          updateStructure(selector, { start: [sx, sz + dz], end: [ex, ez + dz] });
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
                updateStructure(selector, {
                  start: [cx, cz - length / 2],
                  end: [cx, cz + length / 2],
                });
              } else if (!targetIsVertical && isVertical) {
                updateStructure(selector, {
                  start: [cx - length / 2, cz],
                  end: [cx + length / 2, cz],
                });
              }
            }}
          />
        </div>
      )}
      <div className="text-[10px] text-gray-400 font-medium pt-1">墙体尺寸</div>
      <StepperRow
        label="长度"
        value={length}
        step={0.1}
        min={0.3}
        max={20}
        onChange={(v) => {
          // 沿 start→end 方向缩放 end 点, 保持墙体方向不变
          const dx = ex - sx;
          const dz = ez - sz;
          const curLen = Math.sqrt(dx * dx + dz * dz);
          if (curLen < 0.001) return; // 防止零向量
          const scale = v / curLen;
          updateStructure(selector, { end: [sx + dx * scale, sz + dz * scale] });
        }}
      />
      {height !== undefined && (
        <StepperRow
          label="高度"
          value={height}
          step={0.1}
          min={1.5}
          max={4}
          onChange={(v) => updateStructure(selector, { height: v })}
        />
      )}
    </div>
  );
}

/* ==================== 户外 ==================== */

function OutdoorGroundPanel() {
  const selectedGroundId = useAppStore((s) => s.selectedGroundId);
  const outdoorSceneData = useAppStore((s) => s.outdoorSceneData);
  const selectGround = useAppStore((s) => s.selectGround);
  const updateGroundItem = useAppStore((s) => s.updateGroundItem);
  const removeGroundItem = useAppStore((s) => s.removeGroundItem);

  const item = selectedGroundId
    ? (outdoorSceneData.ground.find((g) => g.id === selectedGroundId) ?? null)
    : null;
  if (!item) return null;

  return (
    <PropertyCard
      title="地面结构属性"
      onClose={() => selectGround(null)}
      onDelete={() => removeGroundItem(item.id)}
    >
      <PropRow label="名称" value={item.name} />
      <PropRow label="类型" value={GROUND_TYPE_LABEL[item.type] ?? item.type} />
      <PositionRows
        position={item.position}
        onChange={(p) => updateGroundItem(item.id, { position: p })}
        withY
      />
      <RotationControl
        value={item.rotation}
        onChange={(v) => updateGroundItem(item.id, { rotation: Math.round(v) })}
      />
      <SizeRows
        size={item.size}
        onChange={(s) => updateGroundItem(item.id, { size: s })}
        max={100}
      />
      <ColorRow
        label="颜色"
        value={item.color}
        onChange={(v) => updateGroundItem(item.id, { color: v })}
      />
    </PropertyCard>
  );
}

function OutdoorObjectPanel() {
  const selectedOutdoorObjectId = useAppStore((s) => s.selectedOutdoorObjectId);
  const outdoorSceneData = useAppStore((s) => s.outdoorSceneData);
  const selectOutdoorObject = useAppStore((s) => s.selectOutdoorObject);
  const updateOutdoorObject = useAppStore((s) => s.updateOutdoorObject);
  const removeOutdoorObject = useAppStore((s) => s.removeOutdoorObject);

  const item = selectedOutdoorObjectId
    ? (outdoorSceneData.objects.find((o) => o.id === selectedOutdoorObjectId) ?? null)
    : null;
  if (!item) return null;

  return (
    <PropertyCard
      title="空间对象属性"
      onClose={() => selectOutdoorObject(null)}
      onDelete={() => removeOutdoorObject(item.id)}
    >
      <PropRow label="名称" value={item.name} />
      <PropRow label="类型" value={OBJECT_TYPE_LABEL[item.type] ?? item.type} />
      <PositionRows
        position={item.position}
        onChange={(p) => updateOutdoorObject(item.id, { position: p })}
        withY
      />
      <RotationControl
        value={item.rotation}
        onChange={(v) => updateOutdoorObject(item.id, { rotation: Math.round(v) })}
      />
      <SizeRows
        size={item.size}
        onChange={(s) => updateOutdoorObject(item.id, { size: s })}
        max={60}
      />
      <ColorRow
        label="颜色"
        value={item.color}
        onChange={(v) => updateOutdoorObject(item.id, { color: v })}
      />
    </PropertyCard>
  );
}

/* ==================== 公共浮层 ==================== */

/** 室内: 选中空间信息卡 (悬浮于左下角) */
function InteriorSpaceCard() {
  const outdoor = useAppStore((s) => s.designerMode === 'outdoor');
  const activeSpaceId = useAppStore((s) => s.activeSpaceId);
  const sceneData = useAppStore((s) => s.sceneData);
  const selectSpace = useAppStore((s) => s.selectSpace);

  if (outdoor || !activeSpaceId) return null;
  const room = sceneData.rooms.find((r) => r.id === activeSpaceId);
  if (!room) return null;

  return (
    <div className="absolute bottom-12 left-4 z-30 select-none max-w-xs">
      <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 overflow-hidden">
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
        <div className="px-3.5 pt-2.5 pb-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-gray-900">{room.name}</span>
            <span className="text-xs text-gray-400 tracking-wide">{room.nameEn}</span>
          </div>
        </div>
        {room.description && (
          <div className="px-3.5 py-1.5">
            <p className="text-[12px] leading-relaxed text-gray-600">{room.description}</p>
          </div>
        )}
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
}

/** 右下角: 性能胶囊 + 光影面板 (统一纵向堆叠, 性能面板展开为右侧侧栏) */
function LightingPanel() {
  const viewSettings = useAppStore((s) => s.viewSettings);
  const updateViewSettings = useAppStore((s) => s.updateViewSettings);

  return (
    <div className="absolute bottom-12 right-4 z-10 select-none flex flex-col items-end gap-2">
      {/* 性能按钮与光影面板同属这一列, 由 flex 排布 —— 不要再各自 absolute 定位 (会重叠) */}
      <PerformanceMonitor />
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
  );
}

/** 底部: 操作提示 + 动态比例尺 */
function ViewportHintBar() {
  const pixelsPerMeter = useAppStore((s) => s.pixelsPerMeter);

  return (
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
  );
}
