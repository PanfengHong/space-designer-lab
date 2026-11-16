import type { GroundItem } from '../../../../types';
import type { OutdoorElement } from '../../../types';
import { Road } from './View3D';
import { Road2D } from './Symbol2D';

export const roadElement: OutdoorElement<GroundItem> = {
  kind: 'ground',
  type: 'road',
  label: '道路',
  presets: [{ name: '道路', size: [8, 0.18, 2.4], color: '#4a4e54' }],
  View3D: Road,
  Symbol2D: Road2D,
};
