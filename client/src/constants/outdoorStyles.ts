import { useAppStore } from '../store/useAppStore';

/**
 * 户外空间设计风格
 *
 * park1 数字园区 — 参考蓝白数字化大屏风格:
 *   白色建筑 + 蓝色玻璃幕墙 + 柏油道路 + 蓝色水面 + 柔和绿地
 * park2 纯净白模 — 全白灰单色体块
 * park3 暗色孪生 — 数字孪生大屏常用的深色风格:
 *   深蓝黑底 + 冷色发光车道线/幕墙 + 低明度建筑与绿地
 */
export interface OutdoorPalette {
  monochrome: boolean;
  dark: boolean;           // 暗色大屏风格
  useModelColor: boolean;  // 建筑/厂房/草地等是否沿用素材自身颜色
  glowColor: string;       // 自发光 (霓虹) 强调色
  glowIntensity: number;   // 自发光强度
  bg?: string;             // 场景背景色 (仅暗色风格强制覆盖)
  gridCell?: string;       // 网格细线色
  gridSection?: string;    // 网格主线色
  label: string;           // 元素标签文字色
  labelOutline: string;    // 元素标签描边色
  ground: string;     // 地面基座
  grass: string;      // 草地
  river: string;      // 水面
  road: string;       // 道路
  roadLine: string;   // 车道线
  concrete: string;   // 高架桥墩
  wall: string;       // 建筑白墙
  glass: string;      // 玻璃幕墙
  glassDark: string;  // 深色玻璃/厂房门
  metal: string;      // 金属件
  tire: string;       // 轮胎
  edge: string;       // 描边
}

export const OUTDOOR_STYLE_OPTIONS = [
  {
    id: 'park2',
    code: 'PURE MODEL',
    label: '纯净白模',
    color: '#f5f5f5',
    swatch: 'linear-gradient(135deg, #ffffff 0%, #d8d8d8 100%)',
    desc: '纯净白模风格, 用于体块推敲与方案汇报。',
  },
  {
    id: 'park1',
    code: 'DIGITAL PARK',
    label: '数字园区',
    color: '#4a90d9',
    swatch: 'linear-gradient(135deg, #4a90d9 0%, #dceaf6 100%)',
    desc: '数字园区蓝白风格, 参考数字化大屏视觉。',
  },
  {
    id: 'park3',
    code: 'DARK TWIN',
    label: '暗色孪生',
    color: '#0b1622',
    swatch: 'linear-gradient(135deg, #06101c 0%, #17c8f0 100%)',
    desc: '数字孪生大屏常用暗色风格, 冷色发光线条。',
  },
];

export const OUTDOOR_PALETTES: Record<string, OutdoorPalette> = {
  park1: {
    monochrome: false,
    dark: false,
    useModelColor: true,
    glowColor: '#8fc4ee',
    glowIntensity: 0.08,
    label: '#4a627a',
    labelOutline: '#ffffff',
    ground: '#f2f5f9',
    grass: '#bfe3c0',
    river: '#6cb8e6',
    road: '#4a4e54',
    roadLine: '#ffffff',
    concrete: '#e9eef4',
    wall: '#f7fafc',
    glass: '#8fc4ee',
    glassDark: '#4f8fc6',
    metal: '#c3ccd6',
    tire: '#2b2f36',
    edge: '#2a2d32',
  },
  park2: {
    monochrome: true,
    dark: false,
    useModelColor: false,
    glowColor: '#000000',
    glowIntensity: 0,
    label: '#4a627a',
    labelOutline: '#ffffff',
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
  park3: {
    monochrome: false,
    dark: true,
    useModelColor: false,
    glowColor: '#3fd8ff',
    glowIntensity: 0.55,
    bg: '#050b14',
    gridCell: '#12324a',
    gridSection: '#1d5a7d',
    label: '#9adcf0',
    labelOutline: '#04121c',
    ground: '#0b1622',
    grass: '#123326',
    river: '#0a2c47',
    road: '#151d27',
    roadLine: '#5fe3ff',
    concrete: '#1a2735',
    wall: '#22334a',
    glass: '#1b6f96',
    glassDark: '#0f8fc4',
    metal: '#2a3a4c',
    tire: '#0a0e13',
    edge: '#2b6d8d',
  },
};

/** 获取当前户外风格调色板 (非户外风格 id 时回退到数字园区) */
export function useOutdoorPalette(): OutdoorPalette {
  const designStyleId = useAppStore((s) => s.designStyleId);
  return OUTDOOR_PALETTES[designStyleId] ?? OUTDOOR_PALETTES.park1;
}
