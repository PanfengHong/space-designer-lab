import type { StructureTemplate } from '../../../types';
import type { BayWindow } from '../../../../types';
import { THUMB_WALL_T } from '../templates';
import { BayWindows } from './BayWindow';
import { BayWindow2D } from './Symbol2D';

export function icon3D(tpl: StructureTemplate) {
  const [a, b, c] = tpl.size;
  const bay: BayWindow = {
    id: `__icon-${tpl.id}`,
    position: [0, tpl.sill ?? 0.9, 0],
    width: a,
    height: b,
    depth: c,
    rotation: 0,
  };
  return <BayWindows bayWindows={[bay]} roomId={`__icon-${tpl.id}`} wallThickness={THUMB_WALL_T} />;
}

export function icon2D(tpl: StructureTemplate) {
  const [a, b, c] = tpl.size;
  const bay: BayWindow = {
    id: `__icon-${tpl.id}`,
    position: [0, tpl.sill ?? 0.9, 0],
    width: a,
    height: b,
    depth: c,
    rotation: 0,
  };
  return <BayWindow2D bayWindow={bay} wallThickness={Math.min(THUMB_WALL_T, 0.2)} />;
}

export function iconBox2D(tpl: StructureTemplate) {
  const [a, , c] = tpl.size;
  return { x0: -a / 2, y0: 0, x1: a / 2, y1: c };
}

/** 飘窗原点带窗台高度, 缩略图需把整体下移让它落在画面中心 */
export function thumbLiftY(tpl: StructureTemplate) {
  return (tpl.sill ?? 0.9) + tpl.size[1] / 2;
}
