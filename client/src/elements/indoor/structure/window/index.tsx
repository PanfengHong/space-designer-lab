import type { StructureElement } from '../../../types';
import { templates } from './templates';
import { Windows } from './Windows';
import { Window2D } from './Symbol2D';
import { icon3D, icon2D, iconBox2D, thumbLiftY } from './icon';
import { WindowConfig } from './Config';

export const windowElement: StructureElement = {
  kind: 'structure',
  type: 'window',
  label: '窗',
  templates,
  Batch3D: Windows,
  Symbol2D: Window2D,
  Config: WindowConfig,
  icon3D,
  icon2D,
  iconBox2D,
  thumbLiftY,
} as StructureElement;
