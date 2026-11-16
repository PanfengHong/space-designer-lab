import type { StructureElement } from '../../../types';
import { templates } from './templates';
import { FrenchWindows } from './FrenchWindow';
import { FrenchWindow2D } from './Symbol2D';
import { icon3D, icon2D, iconBox2D } from './icon';

export const frenchWindowElement: StructureElement = {
  kind: 'structure',
  type: 'frenchWindow',
  label: '落地窗',
  templates,
  Batch3D: FrenchWindows,
  Symbol2D: FrenchWindow2D,
  icon3D,
  icon2D,
  iconBox2D,
} as StructureElement;
