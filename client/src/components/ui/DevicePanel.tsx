import {
  Lightbulb,
  Snowflake,
  Blinds,
  Refrigerator,
  Tv,
  WashingMachine,
  Power,
  X,
} from 'lucide-react';
import { useAppStore, DEVICE_DEFAULTS } from '../../store/useAppStore';
import { SliderRow, StepperRow, ToggleRow } from './PropertyControls';
import type { DeviceKind, Furniture } from '../../types';

const KIND_META: Record<DeviceKind, { label: string; Icon: typeof Lightbulb }> = {
  light: { label: '灯光', Icon: Lightbulb },
  ac: { label: '空调', Icon: Snowflake },
  curtain: { label: '窗帘', Icon: Blinds },
  fridge: { label: '冰箱', Icon: Refrigerator },
  tv: { label: '电视', Icon: Tv },
  washer: { label: '洗衣机', Icon: WashingMachine },
};

interface DeviceTarget {
  id: string;
  kind: DeviceKind;
  name: string;
  roomName: string;
  furniture?: Furniture;
}

/**
 * 解析当前选中的设备。
 * 设备来源有两处:
 *   1. 灯具 — Building 按房间自动布置, id 形如 lamp:<roomId>:<index>
 *   2. 家具 — 带 device 声明的家具 (电视/冰箱/空调/窗帘/洗衣机)
 */
function useDeviceTarget(): DeviceTarget | null {
  const id = useAppStore((s) => s.selectedDeviceId);
  const rooms = useAppStore((s) => s.sceneData.rooms);
  if (!id) return null;

  if (id.startsWith('lamp:')) {
    const [, roomId, idx] = id.split(':');
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return null;
    const n = Number(idx) + 1;
    return {
      id,
      kind: 'light',
      name: n > 1 ? `${room.name}吸顶灯 ${n}` : `${room.name}吸顶灯`,
      roomName: room.name,
    };
  }

  const room = rooms.find((r) => r.furniture.some((f) => f.id === id));
  const item = room?.furniture.find((f) => f.id === id);
  if (!item || !item.device) return null;
  return { id, kind: item.device.kind, name: item.name, roomName: room?.name ?? '', furniture: item };
}

/**
 * 设备控制面板 — 点击 3D 场景里的设备 (灯 / 空调 / 窗帘 / 冰箱 / 电视) 弹出。
 * 只读写 store.devices, 不进场景撤销栈: 开关灯不该被 Ctrl+Z 撤销。
 */
export function DevicePanel() {
  const target = useDeviceTarget();
  const raw = useAppStore((s) => s.devices[target?.id ?? '']);
  const selectDevice = useAppStore((s) => s.selectDevice);
  const updateDevice = useAppStore((s) => s.updateDevice);

  if (!target) return null;

  const state = { ...DEVICE_DEFAULTS[target.kind], ...(raw ?? {}) };
  const meta = KIND_META[target.kind];
  const Icon = meta.Icon;

  const set = (patch: Parameters<typeof updateDevice>[1]) => updateDevice(target.id, patch);

  // 开关语义按设备类型改写: 冰箱是"开门", 窗帘是"全开/全关"
  const switchLabel =
    target.kind === 'fridge' ? '冰箱门' : target.kind === 'washer' ? '运行' : '电源';

  const statusText = (() => {
    if (target.kind === 'light') return state.on ? `已开启 · ${state.brightness}% · ${state.colorTemp}K` : '已关闭';
    if (target.kind === 'ac') return state.on ? `${modeLabel(state.acMode)} ${state.targetTemp}°C` : '已关闭';
    if (target.kind === 'curtain') {
      if (state.position >= 99) return '全开';
      if (state.position <= 1) return '全关';
      return `开启 ${state.position}%`;
    }
    if (target.kind === 'fridge') return state.on ? '门已打开' : `冷藏 ${state.targetTemp}°C`;
    return state.on ? '运行中' : '待机';
  })();

  const powerOn = target.kind === 'curtain' ? state.position > 50 : state.on;

  return (
    <div className="w-64 bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50/80">
        <div className="flex items-center gap-1.5">
          <Icon size={12} className="text-gray-500" />
          <span className="text-[11px] font-semibold text-gray-700 tracking-wide">设备控制</span>
        </div>
        <button onClick={() => selectDevice(null)} className="text-gray-400 hover:text-gray-600 p-0.5">
          <X size={13} />
        </button>
      </div>

      <div className="px-3 py-2.5 space-y-2.5">
        {/* 设备名 + 房间 */}
        <div className="flex items-baseline justify-between">
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-gray-900 truncate">{target.name}</div>
            <div className="text-[10px] text-gray-400">{target.roomName} · {meta.label}</div>
          </div>
        </div>

        {/* 主开关 */}
        <button
          onClick={() => {
            if (target.kind === 'curtain') set({ position: state.position > 50 ? 0 : 100 });
            else set({ on: !state.on });
          }}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors ${
            powerOn ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
              powerOn ? 'bg-white/15 text-white' : 'bg-white text-gray-400'
            }`}
          >
            <Power size={14} />
          </span>
          <span className="flex flex-col items-start leading-tight">
            <span className="text-[11px] font-medium">{switchLabel}</span>
            <span className={`text-[9px] ${powerOn ? 'text-white/60' : 'text-gray-400'}`}>{statusText}</span>
          </span>
        </button>

        {/* 灯光: 亮度 + 色温 */}
        {target.kind === 'light' && (
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <SliderRow
              label="亮度"
              value={state.brightness}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(v) => set({ brightness: v })}
            />
            <SliderRow
              label="色温"
              value={state.colorTemp}
              min={2200}
              max={6500}
              step={100}
              unit=" K"
              onChange={(v) => set({ colorTemp: v })}
            />
            <div className="grid grid-cols-3 gap-1">
              {[
                { label: '暖光', k: 2700 },
                { label: '自然', k: 4200 },
                { label: '冷白', k: 6000 },
              ].map((o) => (
                <button
                  key={o.label}
                  onClick={() => set({ colorTemp: o.k, on: true })}
                  className={`py-1 rounded text-[10px] transition-colors ${
                    state.colorTemp === o.k
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 空调: 温度 + 模式 + 风速 */}
        {target.kind === 'ac' && (
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <StepperRow
              label="温度"
              value={state.targetTemp}
              step={1}
              min={16}
              max={30}
              unit="°C"
              precision={0}
              onChange={(v) => set({ targetTemp: v })}
            />
            <ToggleRow
              label="模式"
              options={[
                { label: '制冷', value: 'cool' },
                { label: '制热', value: 'heat' },
                { label: '送风', value: 'fan' },
                { label: '除湿', value: 'dry' },
              ]}
              value={state.acMode}
              onChange={(v) => set({ acMode: v as typeof state.acMode, on: true })}
            />
            <ToggleRow
              label="风速"
              options={[
                { label: '自动', value: 'auto' },
                { label: '低', value: 'low' },
                { label: '中', value: 'mid' },
                { label: '高', value: 'high' },
              ]}
              value={state.fanSpeed}
              onChange={(v) => set({ fanSpeed: v as typeof state.fanSpeed })}
            />
          </div>
        )}

        {/* 窗帘: 开合 */}
        {target.kind === 'curtain' && (
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <SliderRow
              label="开合"
              value={state.position}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(v) => set({ position: v })}
            />
            <div className="grid grid-cols-3 gap-1">
              {[
                { label: '全关', v: 0 },
                { label: '半开', v: 50 },
                { label: '全开', v: 100 },
              ].map((o) => (
                <button
                  key={o.label}
                  onClick={() => set({ position: o.v })}
                  className={`py-1 rounded text-[10px] transition-colors ${
                    state.position === o.v
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 冰箱: 温度 */}
        {target.kind === 'fridge' && (
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <StepperRow
              label="冷藏温度"
              value={state.targetTemp}
              step={1}
              min={2}
              max={8}
              unit="°C"
              precision={0}
              onChange={(v) => set({ targetTemp: v })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

const modeLabel = (m: string) =>
  ({ cool: '制冷', heat: '制热', fan: '送风', dry: '除湿' } as Record<string, string>)[m] ?? m;
