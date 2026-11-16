import type { StructureTemplate } from '../../types';
import { templates as wallTemplates } from './wall/templates';
import { templates as doorTemplates } from './door/templates';
import { templates as windowTemplates } from './window/templates';
import { templates as bayWindowTemplates } from './bay-window/templates';
import { templates as frenchWindowTemplates } from './french-window/templates';

/**
 * 建筑结构素材库聚合 —— 纯数据, 无 JSX,
 * store/拖拽层可以安全导入 (拖拽时直接携带模板)。
 * 类型定义在 elements/types.ts (StructureTemplate)。
 */
export type { StructureTemplate };

/** 图标预览里使用的墙厚 (仅影响视觉, 与场景墙厚无关) */
export const THUMB_WALL_T = 0.2;

/** 建筑结构素材库 — 对应左面板「建筑结构层 · 墙体 楼板 门窗」 */
export const STRUCTURE_CATALOG: StructureTemplate[] = [
  ...wallTemplates,
  ...doorTemplates,
  ...windowTemplates,
  ...bayWindowTemplates,
  ...frenchWindowTemplates,
];
