import type { OutdoorObject } from '../../../../types';
import type { OutdoorElement } from '../../../types';
import { GuardBooth } from './View3D';
import { GuardBooth2D } from './Symbol2D';

export const guardBoothElement: OutdoorElement<OutdoorObject> = {
  kind: 'object',
  type: 'guard-booth',
  label: '门卫室',
  presets: [{ name: '门卫室', size: [4, 3.2, 3], color: '#e8eef4' }],
  View3D: GuardBooth,
  Symbol2D: GuardBooth2D,
};
