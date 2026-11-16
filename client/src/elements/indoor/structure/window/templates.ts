import type { StructureTemplate } from '../../../types';

/** 窗素材规格 */
export const templates: StructureTemplate[] = [
  { id: 'st-window', type: 'window', name: '平窗', size: [1.5, 1.5, 0.2], sill: 0.9, style: 'default' },
  { id: 'st-window-sliding', type: 'window', name: '推拉窗', size: [1.8, 1.5, 0.2], sill: 0.9, style: 'sliding' },
];
