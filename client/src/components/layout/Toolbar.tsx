import { ChevronDown, Eye, Box, Grid3X3, LayoutGrid, Play, Undo2, Redo2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { RenderMode, ViewMode } from '../../types';

const VIEW_MODES: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
  { key: 'perspective', label: '透视', icon: <Eye size={14} /> },
  { key: 'axonometric', label: '轴测', icon: <Box size={14} /> },
  { key: 'top', label: '顶视', icon: <Grid3X3 size={14} /> },
  { key: 'plan', label: '平面', icon: <LayoutGrid size={14} /> },
  { key: 'walkthrough', label: '漫游', icon: <Play size={14} /> },
];

const RENDER_MODES: { key: RenderMode; label: string }[] = [
  { key: 'arctic', label: 'ARCTIC' },
  { key: 'shaded', label: 'SHADED' },
  { key: 'material', label: 'MATERIAL' },
];

/**
 * 视口顶部工具条 (室内 / 户外共用)
 *
 * 左边: 视图模式 + 视角预设 + 渲染模式 —— 两种模式语义一致, 全部内置;
 * 右边: 由调用方通过 children 注入 (撤销/重做、导出等), 差异留在调用处。
 */
export function Toolbar({
  presets,
  children,
}: {
  presets: string[];
  children?: React.ReactNode;
}) {
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const renderMode = useAppStore((s) => s.renderMode);
  const setRenderMode = useAppStore((s) => s.setRenderMode);
  const cameraPreset = useAppStore((s) => s.cameraPreset);
  const setCameraPreset = useAppStore((s) => s.setCameraPreset);
  // 视角预设按模式切换, 但 cameraPreset 是共用的单值: 若当前值不在本模式的预设里,
  // select 会显示空白, 因此回退显示第一个预设 (切换模式时顺手纠正)
  const activePreset = presets.includes(cameraPreset) ? cameraPreset : presets[0];

  return (
    <div className="absolute top-0 left-0 right-0 h-11 bg-white/90 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-3 z-20 select-none">
      {/* 视图模式 + 视角预设 */}
      <div className="flex items-center gap-0.5">
        {VIEW_MODES.map((mode) => (
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
            value={activePreset}
            onChange={(e) => setCameraPreset(e.target.value)}
            className="appearance-none bg-gray-50 border border-gray-200 text-xs text-gray-700 px-2.5 py-1.5 pr-7 rounded-md cursor-pointer hover:bg-gray-100 focus:outline-none focus:border-gray-400"
          >
            {presets.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"
          />
        </div>
      </div>

      {/* 渲染模式 + 调用方注入的差异按钮 */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-gray-50 rounded-md p-0.5">
          {RENDER_MODES.map((mode) => (
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
        {children}
      </div>
    </div>
  );
}

/**
 * 撤销 / 重做按钮组 (室内 / 户外通用, 历史栈由 store 按 designerMode 切换)
 * 也可单独使用, 不依赖 Toolbar。
 */
export function UndoRedoButtons() {
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const canUndo = useAppStore((s) => s.past.length > 0);
  const canRedo = useAppStore((s) => s.future.length > 0);

  return (
    <>
      <button
        onClick={undo}
        disabled={!canUndo}
        title="撤销 (Ctrl+Z)"
        className={`p-1.5 rounded-md transition-colors ${
          canUndo ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'
        }`}
      >
        <Undo2 size={14} />
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        title="重做 (Ctrl+Shift+Z)"
        className={`p-1.5 rounded-md transition-colors ${
          canRedo ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'
        }`}
      >
        <Redo2 size={14} />
      </button>
    </>
  );
}
