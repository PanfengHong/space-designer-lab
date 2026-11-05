import type { DeviceState } from '../types';
import { useAppStore } from '../store/useAppStore';

export interface DeviceSnapshot {
  id: string;
  state: Partial<DeviceState>;
}

/**
 * 运行器的设备状态来源。
 *
 * 运行器（`/view`）只认这个接口，不认任何具体后端。现在只有一个本地实现：
 * 状态存在浏览器内存里，点一下就变，用于演示与验收。
 *
 * 将来接真实数据源时不要再改渲染层，实现同一个接口即可：
 *   - `haAdapter`        : 连 HA WebSocket, 按 entityId 订阅并回写
 *   - `postMessageAdapter`: 被宿主页面（iframe）用 postMessage 驱动
 * 渲染层与 DevicePanel 完全不用动。
 */
export interface DeviceAdapter {
  /** 用于界面提示"当前状态来源" */
  readonly name: string;
  connect(handlers: {
    onState: (devices: DeviceSnapshot[]) => void;
    onError?: (message: string) => void;
  }): void;
  disconnect(): void;
  /** 下发一条控制指令 */
  set(id: string, patch: Partial<DeviceState>): void;
}

/**
 * 本地适配器：状态直接落在 store.devices 上。
 *
 * 不需要 connect 做任何事 —— 状态就是本地 store 本身，
 * 外部状态源接入后才会在 connect 里建立订阅并 onState 推送。
 */
export function createLocalDeviceAdapter(): DeviceAdapter {
  return {
    name: '本地演示',
    connect() {
      /* 状态即 store, 无外部订阅 */
    },
    disconnect() {
      /* 无需清理 */
    },
    set(id, patch) {
      useAppStore.getState().updateDevice(id, patch);
    },
  };
}
