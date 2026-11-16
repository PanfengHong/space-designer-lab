import type { GroundItem } from '../../../../types';
import type { OutdoorElement } from '../../../types';
import { GroundSlab } from './View3D';
import { GroundSlab2D } from './Symbol2D';

/** 地面 — 白色大平台 (设计区域的基座) */
export const groundElement: OutdoorElement<GroundItem> = {
  kind: 'ground',
  type: 'ground',
  label: '地面',
  presets: [{ name: '地面', size: [10, 0.3, 10], color: '#f2f5f9' }],
  View3D: GroundSlab,
  Symbol2D: GroundSlab2D,
};
