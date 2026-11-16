import type { OutdoorObject } from '../../../../types';
import type { OutdoorElement } from '../../../types';
import { Tree } from './View3D';
import { Tree2D } from './Symbol2D';

export const treeElement: OutdoorElement<OutdoorObject> = {
  kind: 'object',
  type: 'tree',
  label: '树木',
  presets: [{ name: '树木', size: [3.2, 6, 3.2], color: '#bfe3c0' }],
  View3D: Tree,
  Symbol2D: Tree2D,
};
