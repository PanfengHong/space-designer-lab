import { useAppStore } from '../store/useAppStore';

/**
 * 户外空间设计风格
 *
 * park1 数字园区 — 参考蓝白数字化大屏风格:
 *   白色建筑 + 蓝色玻璃幕墙 + 蓝灰道路 + 蓝色水面 + 柔和绿地
 * park2 纯净白模 — 全白灰单色体块
 */
export interface OutdoorPalette {
  monochrome: boolean;
  ground: string;     // 地面基座
  grass: string;     // 草地
  river: string;     // 水面
  road: string;      // 道路
  roadLine: string;  // 车道线
  concrete: string;  // 高架桥墩
  wall: string;      // 建筑白墙
  glass: string;     // 玻璃幕墙
  glassDark: string; // 深色玻璃/厂房门
  metal: string;     // 金属件
  tire: string;      // 轮胎
  edge: string;      // 浅色描边
}

export const OUTDOOR_STYLE_OPTIONS = [
  { id: 'park1', code: 'DIGITAL PARK', label: '数字园区', color: '#4a90d9' },
  { id: 'park2', code: 'PURE MODEL', label: '纯净白模', color: '#f5f5f5' },
];

export const OUTDOOR_PALETTES: Record<string, OutdoorPalette> = {
  park1: {
    monochrome: false,
    ground: '#f2f5f9',
    grass: '#bfe3c0',
    river: '#6cb8e6',
    road: '#d3dae3',
    roadLine: '#ffffff',
    concrete: '#e9eef4',
    wall: '#f7fafc',
    glass: '#8fc4ee',
    glassDark: '#4f8fc6',
    metal: '#c3ccd6',
    tire: '#2b2f36',
    edge: '#c3d0de',
  },
  park2: {
    monochrome: true,
    ground: '#ffffff',
    grass: '#ececec',
    river: '#e4e8ec',
    road: '#e0e0e0',
    roadLine: '#fafafa',
    concrete: '#f5f5f5',
    wall: '#ffffff',
    glass: '#e8eaed',
    glassDark: '#d8dce0',
    metal: '#cccccc',
    tire: '#d0d0d0',
    edge: '#d8d8d8',
  },
};

/** 获取当前户外风格调色板 (非户外风格 id 时回退到数字园区) */
export function useOutdoorPalette(): OutdoorPalette {
  const designStyleId = useAppStore((s) => s.designStyleId);
  return OUTDOOR_PALETTES[designStyleId] ?? OUTDOOR_PALETTES.park1;
}
