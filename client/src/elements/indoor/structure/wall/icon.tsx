import type { StructureTemplate } from '../../../types';
import type { WallSegment } from '../../../../types';
import { Walls } from './Walls';
import { WallLine } from './Symbol2D';

/** 墙体图标 —— 用模板参数造一份只用于预览的假数据 */
export function icon3D(tpl: StructureTemplate) {
  const [a, b, c] = tpl.size;
  const seg: WallSegment = { id: `__icon-${tpl.id}`, start: [-a / 2, 0], end: [a / 2, 0], height: b };
  return <Walls segments={[seg]} roomId={`__icon-${tpl.id}`} height={b} thickness={c} showCeiling={false} />;
}

export function icon2D(tpl: StructureTemplate) {
  const [a, b, c] = tpl.size;
  const seg: WallSegment = { id: `__icon-${tpl.id}`, start: [-a / 2, 0], end: [a / 2, 0], height: b };
  return <WallLine wall={seg} thickness={c} windows={[]} />;
}

export function iconBox2D(tpl: StructureTemplate) {
  const [a, , c] = tpl.size;
  return { x0: -a / 2, y0: -c / 2, x1: a / 2, y1: c / 2 };
}
