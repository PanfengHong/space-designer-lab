import type { StructureElement } from '../../../types';
import { templates } from './templates';
import { Doors } from './Doors';
import { Door2D } from './Symbol2D';
import { icon3D, icon2D, iconBox2D } from './icon';
import { DoorConfig } from './Config';

export const doorElement: StructureElement = {
  kind: 'structure',
  type: 'door',
  label: '门',
  templates,
  Batch3D: Doors,
  Symbol2D: Door2D,
  Config: DoorConfig,
  icon3D,
  icon2D,
  iconBox2D,
} as StructureElement;
