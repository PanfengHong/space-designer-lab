import { useAppStore, DEVICE_DEFAULTS } from '../store/useAppStore';
import type { DeviceConfig, DeviceState } from '../types';

/**
 * 读取某个元素的设备运行时状态。
 *
 * 只订阅 `devices[id]` 这一格 (返回对象引用), 因此别的设备开关不会引起本组件重渲染 ——
 * 场景里同屏可能有十几盏灯 / 多台空调, 订阅整张 devices 表会全部跟着重渲染。
 *
 * 没有设备声明时返回 null, 调用方据此走原来的纯展示分支。
 */
export function useDeviceState(id: string, device?: DeviceConfig): DeviceState | null {
  const raw = useAppStore((s) => s.devices[id]);
  if (!device) return null;
  return { ...DEVICE_DEFAULTS[device.kind], ...(raw ?? {}) };
}
