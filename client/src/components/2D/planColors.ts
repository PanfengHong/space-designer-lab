/**
 * 平面图灰阶色板 —— 墙体/标注/家具符号共用。
 * 单独抽出来, 避免符号文件与 FloorPlan2D 互相导入。
 */
export const C = {
  bg: '#f5f5f5',
  floor: '#ffffff',
  floorAlt: '#f0f0f0',
  wall: '#1f1f1f',
  wallInner: '#2a2a2a',
  door: '#888888',
  doorArc: '#bbbbbb',
  window: '#9a9a9a',
  windowFill: '#d8d8d8',
  furniture: '#e2e2e2',
  furnitureStroke: '#b8b8b8',
  furnitureDark: '#d0d0d0',
  furnitureLight: '#ededed',
  text: '#555555',
  textDim: '#888888',
} as const;
