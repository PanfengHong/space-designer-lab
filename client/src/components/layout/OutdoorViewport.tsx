import { RotateCcw, Maximize2, Minimize2, ChevronDown, Sun, SlidersHorizontal, Eye, Box, Grid3X3, LayoutGrid, Play, Download, X, Layers, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { OutdoorScene } from '../3D/OutdoorScene';
import { OutdoorPlan2D } from '../2D/OutdoorPlan2D';
import { LIGHTING_OPTIONS, LIGHTING_ICONS } from '../../constants/lighting';
import { OUTDOOR_STYLE_OPTIONS } from '../../constants/outdoorStyles';
import type { GroundItem, OutdoorObject, ViewMode, RenderMode } from '../../types';

const GROUND_TYPE_LABEL: Record<string, string> = {
  ground: '地面', grass: '草地', river: '河流', road: '道路',
};
const OBJECT_TYPE_LABEL: Record<string, string> = {
  building: '玻璃建筑', warehouse: '厂房仓库', car: '轿车', truck: '卡车',
};

export function OutdoorViewport() {
  const {
    viewMode, setViewMode,
    renderMode, setRenderMode,
    cameraPreset, setCameraPreset,
    viewSettings, updateViewSettings,
    triggerResetCamera,
    designStyleId,
    pixelsPerMeter,
    isFullscreen, toggleFullscreen,
    outdoorSceneData,
    selectedGroundId, selectGround,
    selectedOutdoorObjectId, selectOutdoorObject,
    updateGroundItem, removeGroundItem,
    updateOutdoorObject, removeOutdoorObject,
  } = useAppStore();

  const [showSettings, setShowSettings] = useState(true);

  const viewModes: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
    { key: 'perspective', label: '透视', icon: <Eye size={14} /> },
    { key: 'axonometric', label: '轴测', icon: <Box size={14} /> },
    { key: 'top', label: '顶视', icon: <Grid3X3 size={14} /> },
    { key: 'plan', label: '平面', icon: <LayoutGrid size={14} /> },
    { key: 'walkthrough', label: '漫游', icon: <Play size={14} /> },
  ];

  const renderModes: { key: RenderMode; label: string }[] = [
    { key: 'arctic', label: 'ARCTIC' },
    { key: 'shaded', label: 'SHADED' },
    { key: 'material', label: 'MATERIAL' },
  ];

  const presets = ['整体', '高架道路', '建筑组团', '南门入口'];
  const currentStyle = OUTDOOR_STYLE_OPTIONS.find((s) => s.id === designStyleId);
  const styleCode = currentStyle?.code ?? 'DIGITAL PARK';

  const selectedGround: GroundItem | null = selectedGroundId
    ? outdoorSceneData.ground.find((g) => g.id === selectedGroundId) ?? null
    : null;
  const selectedObject: OutdoorObject | null = selectedOutdoorObjectId
    ? outdoorSceneData.objects.find((o) => o.id === selectedOutdoorObjectId) ?? null
    : null;

  return (
    <div className="flex-1 relative overflow-hidden h-full">
      <div className="absolute inset-0 h-full w-full">
        {viewMode === 'plan' ? <OutdoorPlan2D /> : <OutdoorScene />}
      </div>

      {/* === 顶部浮动工具条 === */}
      <div className="absolute top-0 left-0 right-0 h-11 bg-white/90 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-3 z-20 select-none">
        <div className="flex items-center gap-0.5">
          {viewModes.map((mode) => (
            <button
              key={mode.key}
              onClick={() => setViewMode(mode.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                viewMode === mode.key ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {mode.icon}
              {mode.label}
            </button>
          ))}
          <div className="w-px h-5 bg-gray-200 mx-1.5" />
          <div className="relative">
            <select
              value={cameraPreset}
              onChange={(e) => setCameraPreset(e.target.value)}
              className="appearance-none bg-gray-50 border border-gray-200 text-xs text-gray-700 px-2.5 py-1.5 pr-7 rounded-md cursor-pointer hover:bg-gray-100 focus:outline-none focus:border-gray-400"
            >
              {presets.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-50 rounded-md p-0.5">
            {renderModes.map((mode) => (
              <button
                key={mode.key}
                onClick={() => setRenderMode(mode.key)}
                className={`px-2 py-1 text-[10px] tracking-wide rounded transition-colors ${
                  renderMode === mode.key ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'
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
        <div className="text-xs text-gray-500 mt-0.5">{currentStyle?.label ?? '数字园区'}</div>
        {viewMode === 'walkthrough' && (
          <div className="text-[11px] text-gray-500 mt-1 bg-white/70 backdrop-blur-sm px-2 py-0.5 rounded inline-block">
            园区漫游 · 拖拽环视
          </div>
        )}
      </div>

      {/* === 右上角按钮 === */}
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

      {/* === 右侧悬浮视图设置面板 === */}
      {showSettings ? (
        <div className="absolute top-28 right-4 w-56 bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 z-10 select-none overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <span className="text-[11px] font-semibold text-gray-700 tracking-wide">视图设置</span>
            <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
          </div>
          <div className="px-3 py-2.5">
            <SettingToggle
              label="显示标签"
              value={!!viewSettings.showLabels}
              onChange={(v) => updateViewSettings('showLabels', v)}
            />
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

      {/* === 地面元素属性面板 === */}
      {selectedGround && (
        <PropertyPanel
          title="地面结构属性"
          onClose={() => selectGround(null)}
          top={showSettings ? '218px' : '7rem'}
          onDelete={() => removeGroundItem(selectedGround.id)}
        >
          <PropRow label="名称" value={selectedGround.name} />
          <PropRow label="类型" value={GROUND_TYPE_LABEL[selectedGround.type] ?? selectedGround.type} />
          <PositionRows
            position={selectedGround.position}
            onChange={(p) => updateGroundItem(selectedGround.id, { position: p })}
            withY
            yStep={0.1}
          />
          <SliderRow
            label="旋转角度"
            value={selectedGround.rotation}
            min={0} max={359} step={1} unit="°"
            onChange={(v) => updateGroundItem(selectedGround.id, { rotation: Math.round(v) })}
          />
          <SizeRows
            size={selectedGround.size}
            onChange={(s) => updateGroundItem(selectedGround.id, { size: s })}
            max={100}
          />
          <ColorRow
            label="颜色"
            value={selectedGround.color}
            onChange={(v) => updateGroundItem(selectedGround.id, { color: v })}
          />
        </PropertyPanel>
      )}

      {/* === 空间对象属性面板 === */}
      {selectedObject && (
        <PropertyPanel
          title="空间对象属性"
          onClose={() => selectOutdoorObject(null)}
          top={showSettings ? '218px' : '7rem'}
          onDelete={() => removeOutdoorObject(selectedObject.id)}
        >
          <PropRow label="名称" value={selectedObject.name} />
          <PropRow label="类型" value={OBJECT_TYPE_LABEL[selectedObject.type] ?? selectedObject.type} />
          <PositionRows
            position={selectedObject.position}
            onChange={(p) => updateOutdoorObject(selectedObject.id, { position: p })}
            withY
            yStep={0.1}
          />
          <SliderRow
            label="旋转角度"
            value={selectedObject.rotation}
            min={0} max={359} step={1} unit="°"
            onChange={(v) => updateOutdoorObject(selectedObject.id, { rotation: Math.round(v) })}
          />
          <SizeRows
            size={selectedObject.size}
            onChange={(s) => updateOutdoorObject(selectedObject.id, { size: s })}
            max={60}
          />
          <ColorRow
            label="颜色"
            value={selectedObject.color}
            onChange={(v) => updateOutdoorObject(selectedObject.id, { color: v })}
          />
        </PropertyPanel>
      )}

      {/* === 光影面板 === */}
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
                  viewSettings.lighting === opt ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
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

      {/* === 底部信息栏 === */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-white/90 backdrop-blur-md border-t border-gray-200 flex items-center justify-center gap-6 z-10 select-none pointer-events-none">
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="px-1.5 py-0.5 bg-gray-200 rounded text-[9px] font-medium">左键</span>旋转
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="px-1.5 py-0.5 bg-gray-200 rounded text-[9px] font-medium">中键</span>平移
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="px-1.5 py-0.5 bg-gray-200 rounded text-[9px] font-medium">滚轮</span>缩放
        </span>
        <span className="w-px h-3 bg-gray-300" />
        <span className="text-[10px] text-gray-500 tracking-wide">
          1 px = {Math.max(1, Math.round(1000 / pixelsPerMeter))} mm | 单位 m
        </span>
      </div>
    </div>
  );
}

/* ===== 属性面板通用部件 ===== */

function PropertyPanel({
  title, children, onClose, top, onDelete,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  top: string;
  onDelete: () => void;
}) {
  return (
    <div className="absolute right-4 z-30 select-none" style={{ top }}>
      <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 w-64 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50/80">
          <div className="flex items-center gap-1.5">
            <Layers size={12} className="text-gray-500" />
            <span className="text-[11px] font-semibold text-gray-700 tracking-wide">{title}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onDelete} className="text-gray-400 hover:text-red-500 p-0.5" title="删除">
              <Trash2 size={13} />
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-0.5">
              <X size={13} />
            </button>
          </div>
        </div>
        <div className="px-3 py-2.5 space-y-2.5 max-h-[calc(100vh-18rem)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

function SettingToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-gray-700">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${value ? 'bg-gray-900' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-1/2 -translate-y-1/2 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${value ? 'translate-x-4' : 'translate-x-0'}`} />
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

function PositionRows({
  position, onChange, withY, yStep = 0.1,
}: {
  position: [number, number, number];
  onChange: (p: [number, number, number]) => void;
  withY?: boolean;
  yStep?: number;
}) {
  return (
    <div className="space-y-1.5 pt-1 border-t border-gray-100">
      <div className="text-[10px] text-gray-400 font-medium pt-1">位置</div>
      <StepperRow label="X" value={position[0]} step={0.2} min={-80} max={80}
        onChange={(v) => onChange([v, position[1], position[2]])} />
      {withY && (
        <StepperRow label="Y" value={position[1]} step={yStep} min={-5} max={20}
          onChange={(v) => onChange([position[0], v, position[2]])} />
      )}
      <StepperRow label="Z" value={position[2]} step={0.2} min={-80} max={80}
        onChange={(v) => onChange([position[0], position[1], v])} />
    </div>
  );
}

function SizeRows({
  size, onChange, max = 60,
}: {
  size: [number, number, number];
  onChange: (s: [number, number, number]) => void;
  max?: number;
}) {
  return (
    <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
      <div className="text-[10px] text-gray-400 font-medium pt-1">尺寸 (长×高×宽)</div>
      <StepperRow label="长" value={size[0]} step={0.1} min={0.1} max={max}
        onChange={(v) => onChange([v, size[1], size[2]])} />
      <StepperRow label="高" value={size[1]} step={0.1} min={0.05} max={max}
        onChange={(v) => onChange([size[0], v, size[2]])} />
      <StepperRow label="宽" value={size[2]} step={0.1} min={0.1} max={max}
        onChange={(v) => onChange([size[0], size[1], v])} />
    </div>
  );
}

function SliderRow({
  label, value, min, max, step = 1, unit = '', onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1 pt-1.5 border-t border-gray-100">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-gray-400">{label}</span>
        <span className="text-[11px] text-gray-800 font-mono">{value.toFixed(step < 1 ? 2 : 0)}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-gray-900"
      />
    </div>
  );
}

function StepperRow({
  label, value, step = 0.1, min, max, unit = 'm', onChange,
}: {
  label: string; value: number; step?: number; min?: number; max?: number; unit?: string;
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
        <button onClick={() => onChange(clamp(value - step))}
          className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded text-xs transition-colors">−</button>
        <input
          type="number" value={value.toFixed(2)} step={step} min={min} max={max}
          onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(clamp(v)); }}
          className="w-14 text-center text-[11px] text-gray-800 font-mono border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-gray-400"
        />
        <button onClick={() => onChange(clamp(value + step))}
          className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded text-xs transition-colors">+</button>
        <span className="text-[10px] text-gray-400 w-3">{unit}</span>
      </div>
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-gray-100">
      <span className="text-[11px] text-gray-400 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer border border-gray-200" />
        <span className="text-[11px] text-gray-800 font-mono">{value}</span>
      </div>
    </div>
  );
}
