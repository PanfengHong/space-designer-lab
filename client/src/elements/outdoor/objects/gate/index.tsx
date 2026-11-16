import type { OutdoorObject } from '../../../../types';
import type { OutdoorElement } from '../../../types';
import { Gate } from './View3D';
import { Gate2D } from './Symbol2D';

export const gateElement: OutdoorElement<OutdoorObject> = {
  kind: 'object',
  type: 'gate',
  label: '园区大门',
  presets: [{ name: '园区大门', size: [9, 4.5, 1.2], color: '#e8eef4' }],
  View3D: Gate,
  Symbol2D: Gate2D,
};
