import type { DeviceConfig, FurnitureType } from '../types';

/**
 * 按素材类型推断设备身份 —— 从素材库拖入的物件要自动带 device 声明,
 * 否则放进来是一张"死"的模型, 点不出控制面板。
 *
 * 有两类素材靠尺寸区分用途:
 *   appliance  — 薄的是电视/显示器, 厚的是饮水机/打印机 (不当作可控设备)
 *   decor      — 细高的是落地灯, 其余是绿植/矮凳 (与 Decor 组件的判断保持一致)
 */
export function inferDevice(
  type: FurnitureType,
  size: [number, number, number],
): DeviceConfig | undefined {
  switch (type) {
    case 'ac':
      return { kind: 'ac' };
    case 'curtain':
      return { kind: 'curtain' };
    case 'fridge':
      return { kind: 'fridge' };
    case 'washer':
      return { kind: 'washer' };
    case 'appliance':
      return size[2] < 0.15 ? { kind: 'tv' } : undefined;
    case 'decor':
      return size[1] > 1.4 && size[0] < 0.5 && size[2] < 0.5 ? { kind: 'light' } : undefined;
    default:
      return undefined;
  }
}
