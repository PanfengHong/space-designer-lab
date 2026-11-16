import type { FurnitureElement } from '../../../types';
import { meta } from './meta';
import { Table } from './View3D';
import { Table2D } from './Symbol2D';

export const tableElement: FurnitureElement = {
  kind: 'furniture',
  type: 'table',
  meta,
  View3D: Table,
  Symbol2D: Table2D,
  officePresets: [
    { name: '办公桌', size: [1.6, 0.75, 0.8], color: '#e8e4dc' },
    { name: '会议桌', size: [3.6, 0.75, 1.4], color: '#5c4033' },
  ],
};
