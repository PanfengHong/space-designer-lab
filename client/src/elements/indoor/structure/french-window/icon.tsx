import type { StructureTemplate } from '../../../types';
import type { FrenchWindow } from '../../../../types';
import { THUMB_WALL_T } from '../templates';
import { FrenchWindows } from './FrenchWindow';
import { FrenchWindow2D } from './Symbol2D';

export function icon3D(tpl: StructureTemplate) {
  const [a, b] = tpl.size;
  const fw: FrenchWindow = { id: `__icon-${tpl.id}`, position: [0, 0, 0], width: a, height: b, rotation: 0 };
  return <FrenchWindows frenchWindows={[fw]} roomId={`__icon-${tpl.id}`} wallThickness={THUMB_WALL_T} />;
}

export function icon2D(tpl: StructureTemplate) {
  const [a, b] = tpl.size;
  const fw: FrenchWindow = { id: `__icon-${tpl.id}`, position: [0, 0, 0], width: a, height: b, rotation: 0 };
  return <FrenchWindow2D frenchWindow={fw} wallThickness={Math.min(THUMB_WALL_T, 0.2)} />;
}

export function iconBox2D(tpl: StructureTemplate) {
  const [a] = tpl.size;
  return { x0: -a / 2, y0: -0.1, x1: a / 2, y1: 0.1 };
}
