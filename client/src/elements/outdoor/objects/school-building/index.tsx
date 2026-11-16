import type { OutdoorObject, OutdoorObjectType } from '../../../../types';
import type { OutdoorElement } from '../../../types';
import { SchoolBuilding } from './View3D';
import { SchoolBuilding2D } from './Symbol2D';

/**
 * 教学楼 / 实验楼 / 宿舍楼 —— 三种元素类型共用同一栋「校园建筑」3D 组件
 * (外观差异只来自尺寸/颜色), 因此放在同一目录维护, 导出三个元素定义。
 */
export const teachingBuildingElement: OutdoorElement<OutdoorObject> = {
  kind: 'object',
  type: 'teaching-building',
  label: '教学楼',
  presets: [{ name: '教学楼', size: [12, 12, 6], color: '#f0f4f8' }],
  View3D: SchoolBuilding,
  Symbol2D: SchoolBuilding2D,
};

export const labBuildingElement: OutdoorElement<OutdoorObject> = {
  kind: 'object',
  type: 'lab-building',
  label: '实验楼',
  presets: [{ name: '实验楼', size: [10, 10, 5], color: '#e2e8f0' }],
  View3D: SchoolBuilding,
  Symbol2D: SchoolBuilding2D,
};

export const dormitoryElement: OutdoorElement<OutdoorObject> = {
  kind: 'object',
  type: 'dormitory',
  label: '宿舍楼',
  presets: [{ name: '宿舍楼', size: [14, 9, 5], color: '#f8fafc' }],
  View3D: SchoolBuilding,
  Symbol2D: SchoolBuilding2D,
};

export type { OutdoorObjectType };
