import { Eye, Box, Grid3X3, LayoutGrid, Play, ChevronDown, Download } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export function Toolbar() {
  const { viewMode, setViewMode, renderMode, setRenderMode, cameraPreset, setCameraPreset } = useAppStore();

  const viewModes: { key: typeof viewMode; label: string; icon: React.ReactNode }[] = [
    { key: 'perspective', label: '透视', icon: <Eye size={15} /> },
    { key: 'axonometric', label: '轴测', icon: <Box size={15} /> },
    { key: 'top', label: '顶视', icon: <Grid3X3 size={15} /> },
    { key: 'plan', label: '平面', icon: <LayoutGrid size={15} /> },
    { key: 'walkthrough', label: '漫游', icon: <Play size={15} /> },
  ];

  const renderModes: { key: typeof renderMode; label: string }[] = [
    { key: 'arctic', label: 'ARCTIC' },
    { key: 'shaded', label: 'SHADED' },
    { key: 'material', label: 'MATERIAL' },
  ];

  const presets = ['整体', '自由视角', '客厅', '厨房', '卧室'];

  return (
    <div className="h-11 bg-white border-b border-gray-200 flex items-center justify-between px-4 select-none">
      {/* 视图模式切换 */}
      <div className="flex items-center gap-1">
        {viewModes.map((mode) => (
          <button
            key={mode.key}
            onClick={() => setViewMode(mode.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
              viewMode === mode.key
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {mode.icon}
            {mode.label}
          </button>
        ))}

        <div className="w-px h-6 bg-gray-200 mx-2" />

        {/* 视角预设 */}
        <div className="relative">
          <select
            value={cameraPreset}
            onChange={(e) => setCameraPreset(e.target.value)}
            className="appearance-none bg-gray-50 border border-gray-200 text-xs text-gray-700 px-3 py-1.5 pr-7 rounded-md cursor-pointer hover:bg-gray-100 focus:outline-none focus:border-gray-400"
          >
            {presets.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
        </div>
      </div>

      {/* 渲染模式切换 */}
      <div className="flex items-center gap-1">
        <div className="flex items-center bg-gray-50 rounded-md p-0.5">
          {renderModes.map((mode) => (
            <button
              key={mode.key}
              onClick={() => setRenderMode(mode.key)}
              className={`px-3 py-1 text-[10px] tracking-wide rounded transition-colors ${
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
          <Download size={15} />
        </button>
      </div>
    </div>
  );
}
