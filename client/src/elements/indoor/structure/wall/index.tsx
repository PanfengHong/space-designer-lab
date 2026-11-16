import type { StructureElement } from '../../../types';
import { templates } from './templates';
import { Walls } from './Walls';
import { WallLine } from './Symbol2D';
import { icon3D, icon2D, iconBox2D } from './icon';

export const wallElement: StructureElement = {
  kind: 'structure',
  type: 'wall',
  label: '墙体',
  templates,
  Batch3D: Walls,
  Symbol2D: WallLine,
  icon3D,
  icon2D,
  iconBox2D,
} as StructureElement;
