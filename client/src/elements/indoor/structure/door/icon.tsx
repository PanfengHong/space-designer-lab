import type { StructureTemplate } from '../../../types';
import type { Door } from '../../../../types';
import { THUMB_WALL_T } from '../templates';
import { Doors } from './Doors';
import { Door2D } from './Symbol2D';

export function icon3D(tpl: StructureTemplate) {
  const [a, b] = tpl.size;
  const door: Door = {
    id: `__icon-${tpl.id}`,
    position: [0, 0, 0],
    width: a,
    height: b,
    rotation: 0,
    hingeSide: 'left',
    style: tpl.style === 'glass' ? 'glass' : 'default',
  };
  return <Doors doors={[door]} roomId={`__icon-${tpl.id}`} wallThickness={THUMB_WALL_T} />;
}

export function icon2D(tpl: StructureTemplate) {
  const [a, b] = tpl.size;
  const door: Door = {
    id: `__icon-${tpl.id}`,
    position: [0, 0, 0],
    width: a,
    height: b,
    rotation: 0,
    hingeSide: 'left',
    style: tpl.style === 'glass' ? 'glass' : 'default',
  };
  return <Door2D door={door} wallThickness={Math.min(THUMB_WALL_T, 0.2)} />;
}

/** 门的开门弧线向 -Z 甩出一整个门宽, 取景框要比其它类型高一倍, 否则弧线被裁 */
export function iconBox2D(tpl: StructureTemplate) {
  const [a] = tpl.size;
  return { x0: -a / 2, y0: -a, x1: a / 2, y1: 0 };
}
