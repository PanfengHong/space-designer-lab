import type { OutdoorObject } from '../../../../types';
import type { OutdoorElement } from '../../../types';
import { Warehouse } from './View3D';
import { Warehouse2D } from './Symbol2D';

export const warehouseElement: OutdoorElement<OutdoorObject> = {
  kind: 'object',
  type: 'warehouse',
  label: '厂房仓库',
  presets: [{ name: '厂房仓库', size: [7, 4, 4.5], color: '#f2f5f9' }],
  View3D: Warehouse,
  Symbol2D: Warehouse2D,
};
