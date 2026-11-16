import type { DeviceConfig, FurnitureType } from '../types';
import { metaOf } from '../data/furnitureMeta';

/**
 * 按素材类型推断设备身份 —— 从素材库拖入的物件要自动带 device 声明,
 * 否则放进来是一张"死"的模型, 点不出控制面板。
 *
 * 大多数类型是**确定性**的 (空调/窗帘/冰箱/洗衣机), 身份直接写在
 * data/furnitureMeta.ts 的 meta.device 里, 这里只做读取。
 * 有两类素材靠尺寸区分用途, 需要在运行时判断:
 *   appliance  — 薄的是电视/显示器, 厚的是饮水机/打印机 (不当作可控设备)
 *   decor      — 细高的是落地灯, 其余是绿植/矮凳 (与 Decor 组件的判断保持一致)
 */
export function inferDevice(
  type: FurnitureType,
  size: [number, number, number],
): DeviceConfig | undefined {
  switch (type) {
    case 'appliance':
      return size[2] < 0.15 ? { kind: 'tv' } : undefined;
    case 'decor':
      return size[1] > 1.4 && size[0] < 0.5 && size[2] < 0.5 ? { kind: 'light' } : undefined;
    default: {
      const kind = metaOf(type).device;
      return kind ? { kind } : undefined;
    }
  }
}
