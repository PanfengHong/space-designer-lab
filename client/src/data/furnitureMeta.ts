import type { DeviceKind, FurnitureType } from '../types';

/**
 * 家具元数据表 —— 每个 FurnitureType 一条记录, 是所有渲染出口的**唯一真源**。
 *
 * 为什么要有这张表:
 *   改架构之前, "一种家具长什么样"散在三处 —— 3D 分派 (Furniture.tsx)、
 *   2D 符号 (FloorPlan2D.tsx 里 11 个 if 分支)、素材缩略图 (FurnitureCatalog.tsx)。
 *   新增一种类型时只要漏改一处, 就会出现"3D 有、2D 是个空白矩形"或者
 *   "缩略图和实物不是同一个东西", 而且没有任何编译期提示。
 *
 * 本文件是**纯数据**, 不含 JSX, 因此可以被 utils/ 里的纯逻辑安全导入
 * (collision.ts 的占位盒、FurnitureTransform 的足迹都要读 footprintX)。
 * 渲染分派见:
 *   - 3D: components/3D/indoor/furnitureRegistry.tsx
 *   - 2D: components/2D/furnitureSymbol2D.tsx
 */

/**
 * 素材组件把哪个 size 分量当作**局部 +X**。
 *
 * 项目约定是 X = size[2]、Z = size[0], 但有两个素材是反的:
 *   toilet — `tankW = w * 0.85` 直接作为 boxGeometry 的 X
 *   chair  — `boxGeometry args=[w, seatT, d]`
 * 这两类如果按约定推导占地, 占位盒/碰撞盒会相对视觉旋转 90°,
 * 表现为"贴墙摆放凭空多占十几厘米"、"点边缘选不中"。
 *
 * 这里把例外写成**数据**, 而不是散在各处的 `Set(['toilet','chair'])`。
 */
export type FootprintAxis = 'size0' | 'size2';

export interface FurnitureMeta {
  /** 素材名 (素材栏/默认命名用) */
  label: string;
  /** 拖入时的默认尺寸 [x, y, z] */
  defaultSize: [number, number, number];
  defaultColor: string;
  /** 局部 +X 对应的 size 分量 */
  footprintX: FootprintAxis;
  /** 拖入即具备的设备身份 (需要在尺寸上再细分的类型见 utils/device.ts) */
  device?: DeviceKind;
  /** 挂墙/挂顶件: 2D 里不按落地家具画 (空调、窗帘) */
  wallMounted?: boolean;
}

export const FURNITURE_META: Record<FurnitureType, FurnitureMeta> = {
  cabinet: {
    label: '柜子',
    defaultSize: [1.5, 1.8, 0.5],
    defaultColor: '#d4c5b0',
    footprintX: 'size2',
  },
  sofa: {
    label: '沙发',
    defaultSize: [2.0, 0.85, 0.9],
    defaultColor: '#d4c5b0',
    footprintX: 'size2',
  },
  table: {
    label: '桌子',
    defaultSize: [1.2, 0.75, 0.7],
    defaultColor: '#5c4033',
    footprintX: 'size2',
  },
  bed: {
    label: '床',
    defaultSize: [1.8, 0.45, 2.0],
    defaultColor: '#e8e0d4',
    footprintX: 'size2',
  },
  appliance: {
    label: '家电',
    defaultSize: [0.5, 1.1, 0.5],
    defaultColor: '#f0f0f0',
    footprintX: 'size2',
  },
  decor: {
    label: '落地灯',
    defaultSize: [0.4, 1.6, 0.4],
    defaultColor: '#e8e0d4',
    footprintX: 'size2',
  },
  chair: {
    label: '椅子',
    defaultSize: [0.5, 0.9, 0.5],
    defaultColor: '#8b7355',
    footprintX: 'size0',
  },
  shower: {
    label: '淋浴',
    defaultSize: [1.2, 2.0, 1.0],
    defaultColor: '#a8d0e6',
    footprintX: 'size0',
  },
  sink: {
    label: '洗手台',
    defaultSize: [0.7, 0.85, 0.5],
    defaultColor: '#ffffff',
    footprintX: 'size2',
  },
  toilet: {
    label: '马桶',
    defaultSize: [0.4, 0.8, 0.65],
    defaultColor: '#fafafa',
    footprintX: 'size0',
  },
  fridge: {
    label: '冰箱',
    defaultSize: [0.7, 1.8, 0.65],
    defaultColor: '#e0e0e0',
    footprintX: 'size2',
    device: 'fridge',
  },
  washer: {
    label: '洗衣机',
    defaultSize: [0.6, 0.85, 0.6],
    defaultColor: '#f0f0f0',
    footprintX: 'size2',
    device: 'washer',
  },
  stove: {
    label: '灶台',
    defaultSize: [0.8, 0.08, 0.5],
    defaultColor: '#1a1a1a',
    footprintX: 'size2',
  },
  ac: {
    label: '空调',
    defaultSize: [0.95, 0.3, 0.22],
    defaultColor: '#ffffff',
    footprintX: 'size2',
    device: 'ac',
    wallMounted: true,
  },
  curtain: {
    label: '窗帘',
    defaultSize: [2.4, 2.5, 0.1],
    defaultColor: '#efe7da',
    footprintX: 'size2',
    device: 'curtain',
    wallMounted: true,
  },
};

/** 取某类型的元数据 (未知类型回落到柜子, 保证永远有值) */
export function metaOf(type: FurnitureType): FurnitureMeta {
  return FURNITURE_META[type] ?? FURNITURE_META.cabinet;
}

export function footprintXOf(type: FurnitureType): FootprintAxis {
  return metaOf(type).footprintX;
}

/**
 * 占地尺寸: w = 沿局部 X, h = 沿局部 Z。
 *
 * 已按各素材的建模轴向归一, 2D 符号与碰撞盒都从这里取, 不再各自推导 ——
 * 之前 2D 一律用 `localW = size[2]`, 于是马桶 (size [0.4, 0.8, 0.65])
 * 在平面图上被画成 0.65 × 0.4, 与 3D 正好差 90°。
 */
export function footprintOf(f: {
  type: FurnitureType;
  size: [number, number, number];
}): { w: number; h: number } {
  return footprintXOf(f.type) === 'size0'
    ? { w: f.size[0], h: f.size[2] }
    : { w: f.size[2], h: f.size[0] };
}
