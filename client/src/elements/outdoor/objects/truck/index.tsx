import type { OutdoorObject } from '../../../../types';
import type { OutdoorElement } from '../../../types';
import { Truck } from './View3D';
import { Truck2D } from './Symbol2D';

export const truckElement: OutdoorElement<OutdoorObject> = {
  kind: 'object',
  type: 'truck',
  label: '卡车',
  presets: [{ name: '卡车', size: [2.6, 0.75, 0.7], color: '#4a90d9' }],
  View3D: Truck,
  Symbol2D: Truck2D,
};
