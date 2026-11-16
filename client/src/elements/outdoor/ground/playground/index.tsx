import type { GroundItem } from '../../../../types';
import type { OutdoorElement } from '../../../types';
import { Playground } from './View3D';
import { Playground2D } from './Symbol2D';

export const playgroundElement: OutdoorElement<GroundItem> = {
  kind: 'ground',
  type: 'playground',
  label: '操场',
  presets: [{ name: '操场', size: [16, 0.2, 9], color: '#d93636' }],
  View3D: Playground,
  Symbol2D: Playground2D,
};
