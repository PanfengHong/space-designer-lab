import type { StructureTemplate } from '../../../types';
import type { Window } from '../../../../types';
import { THUMB_WALL_T } from '../templates';
import { Windows } from './Windows';
import { Window2D } from './Symbol2D';

export function icon3D(tpl: StructureTemplate) {
  const [a, b] = tpl.size;
  const win: Window = {
    id: `__icon-${tpl.id}`,
    position: [0, 0, 0],
    width: a,
    height: b,
    sill: tpl.sill ?? 0.9,
    rotation: 0,
    style: tpl.style === 'sliding' ? 'sliding' : 'default',
  };
  return <Windows windows={[win]} roomId={`__icon-${tpl.id}`} wallThickness={THUMB_WALL_T} />;
}

export function icon2D(tpl: StructureTemplate) {
  const [a, b] = tpl.size;
  const win: Window = {
    id: `__icon-${tpl.id}`,
    position: [0, 0, 0],
    width: a,
    height: b,
    sill: tpl.sill ?? 0.9,
    rotation: 0,
    style: tpl.style === 'sliding' ? 'sliding' : 'default',
  };
  return <Window2D window={win} wallThickness={Math.min(THUMB_WALL_T, 0.2)} />;
}

export function iconBox2D(tpl: StructureTemplate) {
  const [a, , c] = tpl.size;
  return { x0: -a / 2, y0: -c / 2, x1: a / 2, y1: c / 2 };
}

/** 窗原点带窗台高度, 缩略图需把整体下移让它落在画面中心 */
export function thumbLiftY(tpl: StructureTemplate) {
  return (tpl.sill ?? 0.9) + tpl.size[1] / 2;
}
