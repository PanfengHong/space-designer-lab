import type { OutdoorObject } from '../../../../types';
import type { OutdoorElement } from '../../../types';
import { GlassBuilding } from './View3D';
import { Building2D } from './Symbol2D';

export const buildingElement: OutdoorElement<OutdoorObject> = {
  kind: 'object',
  type: 'building',
  label: '玻璃建筑',
  presets: [{ name: '玻璃大厦', size: [5, 7, 5], color: '#7db8e8' }],
  View3D: GlassBuilding,
  Symbol2D: Building2D,
};
