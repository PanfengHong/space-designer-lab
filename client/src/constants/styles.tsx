import { useAppStore } from '../store/useAppStore';

/**
 * 设计风格调色板
 *
 * 每种风格定义一组语义色, 家具组件按部位选用对应语义色,
 * 切换风格时整屋色调自动统一。
 *
 * 语义色说明:
 *  wood        — 木质主色 (床架/桌面板/柜体)
 *  woodDark    — 深色木材 (床头板/桌腿/柜底/描边)
 *  fabric      — 布艺主色 (沙发靠背/床垫)
 *  fabricLight — 浅色布艺 (坐垫/被褥/枕套)
 *  metal       — 金属件 (把手/水龙头/旋钮)
 *  metalDark   — 深色金属 (冰箱把手/铆钉)
 *  appliance   — 家电主体 (冰箱/洗衣机外壳)
 *  appliancePanel — 家电控制面板
 *  sanitary    — 卫浴白 (马桶/洗手盆)
 *  sanitaryDark — 卫浴阴影色
 *  glass       — 玻璃色 (淋浴/洗衣机门)
 *  accent      — 点缀色 (描边/缝隙/地漏)
 *  wall        — 墙面色
 *  floor       — 地板色
 */
export interface StylePalette {
  wood: string;
  woodDark: string;
  fabric: string;
  fabricLight: string;
  metal: string;
  metalDark: string;
  appliance: string;
  appliancePanel: string;
  sanitary: string;
  sanitaryDark: string;
  glass: string;
  accent: string;
  wall: string;
  floor: string;
}

export const STYLE_PALETTES: Record<string, StylePalette> = {
  // 基础空间: 全白/灰, 用于线框模式
  base: {
    wood: '#ffffff',
    woodDark: '#f0f0f0',
    fabric: '#ffffff',
    fabricLight: '#ffffff',
    metal: '#cccccc',
    metalDark: '#aaaaaa',
    appliance: '#ffffff',
    appliancePanel: '#f0f0f0',
    sanitary: '#ffffff',
    sanitaryDark: '#f0f0f0',
    glass: '#e0e0e0',
    accent: '#aaaaaa',
    wall: '#ffffff',
    floor: '#f5f5f5',
  },

  // 中古现代: 暖棕色调, 复古质感
  style1: {
    wood: '#c8a882',
    woodDark: '#a08060',
    fabric: '#a08060',
    fabricLight: '#f0e6d8',
    metal: '#b8860b',
    metalDark: '#5a5a5a',
    appliance: '#d8d8d8',
    appliancePanel: '#e8e8e8',
    sanitary: '#fafafa',
    sanitaryDark: '#e8e8e8',
    glass: '#a8d0e6',
    accent: '#5c4033',
    wall: '#e8e0d4',
    floor: '#d4c8b8',
  },

  // 低素感禅味: 自然素雅, 禅意留白
  style2: {
    wood: '#d4c5b0',
    woodDark: '#b8a890',
    fabric: '#c8b8a0',
    fabricLight: '#e8e0d4',
    metal: '#8a8078',
    metalDark: '#4a4540',
    appliance: '#e0dcd6',
    appliancePanel: '#d0ccc6',
    sanitary: '#f5f0ec',
    sanitaryDark: '#e0dcd6',
    glass: '#b8c8d0',
    accent: '#5a5048',
    wall: '#f0ece8',
    floor: '#e4ddd6',
  },

  // 现代简约: 深灰冷调, 简约利落
  style3: {
    wood: '#2d3436',
    woodDark: '#1a1a1a',
    fabric: '#3d4446',
    fabricLight: '#6a6a6a',
    metal: '#8a8a8a',
    metalDark: '#2a2a2a',
    appliance: '#2d3436',
    appliancePanel: '#1a1a1a',
    sanitary: '#ffffff',
    sanitaryDark: '#e0e0e0',
    glass: '#9ab0c8',
    accent: '#1a1a1a',
    wall: '#e8e8e8',
    floor: '#cccccc',
  },
};

/**
 * 获取当前设计风格的调色板
 */
export function useStylePalette(): StylePalette {
  const designStyleId = useAppStore((s) => s.designStyleId);
  return STYLE_PALETTES[designStyleId] ?? STYLE_PALETTES.base;
}
