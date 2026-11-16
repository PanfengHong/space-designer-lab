import type { StructureElement } from '../../../types';
import { templates } from './templates';
import { BayWindows } from './BayWindow';
import { BayWindow2D } from './Symbol2D';
import { icon3D, icon2D, iconBox2D, thumbLiftY } from './icon';

export const bayWindowElement: StructureElement = {
  kind: 'structure',
  type: 'bayWindow',
  label: '飘窗',
  templates,
  Batch3D: BayWindows,
  Symbol2D: BayWindow2D,
  icon3D,
  icon2D,
  iconBox2D,
  thumbLiftY,
} as StructureElement;
