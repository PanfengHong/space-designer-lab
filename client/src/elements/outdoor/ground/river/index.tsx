import type { GroundItem } from '../../../../types';
import type { OutdoorElement } from '../../../types';
import { River } from './View3D';
import { River2D } from './Symbol2D';

export const riverElement: OutdoorElement<GroundItem> = {
  kind: 'ground',
  type: 'river',
  label: '河流',
  presets: [{ name: '河流', size: [8, 0.12, 2.6], color: '#6cb8e6' }],
  View3D: River,
  Symbol2D: River2D,
};
