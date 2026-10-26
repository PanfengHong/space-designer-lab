/**
 * 属性面板通用控件
 *
 * 这些部件原先在 Viewport / OutdoorViewport / RightPanel 里各写了一份,
 * 行为一致但字号/上下边框细节略有漂移。统一收到这里, 三个地方共用。
 * 容器间距(space-y / border-t)交给调用方, 控件本身只负责「一行」。
 */
import { useEffect, useState } from 'react';

/** 开关行 */
export function SettingToggle({
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

/** 只读信息行 */
export function PropRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[11px] text-gray-400 shrink-0 pt-0.5">{label}</span>
      <span className="text-[11px] text-gray-800 text-right break-all font-mono">{value}</span>
    </div>
  );
}

/**
 * 数字步进器 (适用于尺寸/位置等精确值)
 *
 * 内部保留输入字符串: 直接 toFixed 回写会把用户输入的中间态吃掉
 * (输 "-" 或 "1." 会被立刻重写成 "0.00"/"1.00"), 因此聚焦期间不回写。
 */
export function StepperRow({
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
  const fmt = (v: number) => v.toFixed(2);

  const [draft, setDraft] = useState<string | null>(null);
  // 外部值变化 (拖动 3D 物体 / 撤销) 时同步显示; 正在输入时以用户输入为准
  useEffect(() => {
    if (draft !== null) {
      const typed = parseFloat(draft);
      if (!Number.isNaN(typed) && Math.abs(clamp(typed) - value) < 1e-6) return;
      setDraft(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

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
          value={draft ?? fmt(value)}
          step={step}
          min={min}
          max={max}
          onFocus={() => setDraft(fmt(value))}
          onChange={(e) => {
            setDraft(e.target.value);
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v)) onChange(clamp(v));
          }}
          onBlur={() => setDraft(null)}
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

/** 滑块行 (连续值) */
export function SliderRow({
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
        <span className="text-[11px] text-gray-800 font-mono">
          {value.toFixed(step < 1 ? 2 : 0)}
          {unit}
        </span>
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

/** 按钮组 (枚举值: 左/右、向内/向外等) */
export function ToggleRow({
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

/** 颜色选择 */
export function ColorRow({
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

const QUICK_ANGLES = [0, 45, 90, 180, 270];

/** 旋转控制 (快捷角度 + 数字输入 + 滑块) */
export function RotationControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const norm = (v: number) => ((Math.round(v) % 360) + 360) % 360;
  const cur = norm(value);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-gray-400">旋转角度</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onChange(cur - 1)}
            className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded text-xs transition-colors"
            title="-1°"
          >
            −
          </button>
          <input
            type="number"
            value={cur}
            min={0}
            max={359}
            step={1}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isNaN(v)) onChange(norm(v));
            }}
            className="w-12 text-center text-[11px] text-gray-800 font-mono border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-gray-400"
          />
          <span className="text-[11px] text-gray-500">°</span>
          <button
            onClick={() => onChange(cur + 1)}
            className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded text-xs transition-colors"
            title="+1°"
          >
            +
          </button>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        {QUICK_ANGLES.map((a) => (
          <button
            key={a}
            onClick={() => onChange(a)}
            className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
              cur === a
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900'
            }`}
          >
            {a}°
          </button>
        ))}
      </div>
      <input
        type="range"
        min={0}
        max={359}
        step={1}
        value={cur}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-gray-900"
      />
    </div>
  );
}

/** 位置 X/Y/Z 行 (户外用) */
export function PositionRows({
  position,
  onChange,
  withY,
  yStep = 0.1,
  range = 80,
}: {
  position: [number, number, number];
  onChange: (p: [number, number, number]) => void;
  withY?: boolean;
  yStep?: number;
  range?: number;
}) {
  return (
    <div className="space-y-1.5 pt-1 border-t border-gray-100">
      <div className="text-[10px] text-gray-400 font-medium pt-1">位置</div>
      <StepperRow
        label="X"
        value={position[0]}
        step={0.2}
        min={-range}
        max={range}
        onChange={(v) => onChange([v, position[1], position[2]])}
      />
      {withY && (
        <StepperRow
          label="Y"
          value={position[1]}
          step={yStep}
          min={-5}
          max={20}
          onChange={(v) => onChange([position[0], v, position[2]])}
        />
      )}
      <StepperRow
        label="Z"
        value={position[2]}
        step={0.2}
        min={-range}
        max={range}
        onChange={(v) => onChange([position[0], position[1], v])}
      />
    </div>
  );
}

/** 尺寸 长/高/宽 行 (户外用) */
export function SizeRows({
  size,
  onChange,
  max = 60,
}: {
  size: [number, number, number];
  onChange: (s: [number, number, number]) => void;
  max?: number;
}) {
  return (
    <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
      <div className="text-[10px] text-gray-400 font-medium pt-1">尺寸 (长×高×宽)</div>
      <StepperRow
        label="长"
        value={size[0]}
        step={0.1}
        min={0.1}
        max={max}
        onChange={(v) => onChange([v, size[1], size[2]])}
      />
      <StepperRow
        label="高"
        value={size[1]}
        step={0.1}
        min={0.05}
        max={max}
        onChange={(v) => onChange([size[0], v, size[2]])}
      />
      <StepperRow
        label="宽"
        value={size[2]}
        step={0.1}
        min={0.1}
        max={max}
        onChange={(v) => onChange([size[0], size[1], v])}
      />
    </div>
  );
}
