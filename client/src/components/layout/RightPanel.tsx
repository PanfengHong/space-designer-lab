import { RotateCcw, Maximize2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { LIGHTING_OPTIONS, LIGHTING_ICONS } from '../../constants/lighting';

export function RightPanel() {
  const { viewSettings, updateViewSettings, triggerResetCamera, toggleRightPanel, rightPanelOpen } = useAppStore();

  if (!rightPanelOpen) {
    return (
      <div className="w-0 border-l border-gray-200 overflow-hidden transition-all" />
    );
  }

  return (
    <div className="w-56 bg-white border-l border-gray-200 flex flex-col select-none">
      {/* 显示选项 */}
      <div className="p-4 panel-section">
        <div className="space-y-3">
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
      </div>

      {/* 墙体剖切 */}
      <div className="p-4 panel-section">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-700 font-medium">墙体剖切</span>
          <span className="text-xs text-gray-500">{viewSettings.wallCutHeight.toFixed(2)} m</span>
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
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>0</span>
          <span>3.00</span>
        </div>
      </div>

      {/* 光影 */}
      <div className="p-4 panel-section">
        <div className="text-xs text-gray-700 font-medium mb-2">光影 / LIGHTING</div>
        <div className="grid grid-cols-2 gap-1.5">
          {LIGHTING_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => updateViewSettings('lighting', opt)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] transition-colors border ${
                viewSettings.lighting === opt
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {LIGHTING_ICONS[opt]?.(12)}
              <span>{opt}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 底部控制按钮 */}
      <div className="flex-1 flex items-end justify-center gap-3 p-4">
        <button
          onClick={triggerResetCamera}
          className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
          title="重置视角"
        >
          <RotateCcw size={16} />
        </button>
        <button
          className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
          title="全屏"
        >
          <Maximize2 size={16} />
        </button>
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
      <span className="text-xs text-gray-700">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-9 h-5 rounded-full transition-colors ${
          value ? 'bg-gray-900' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
            value ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
