import type { Furniture } from '../../../../types';
import { footprintOf } from '../metas';
import { C } from '../../../common/planColors';

export function Chair2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  return (
    <rect
      x={x - w / 2} y={z - h / 2} width={w} height={h}
      fill={C.furniture} stroke={C.furnitureStroke} strokeWidth={0.02} rx={0.08}
    />
  );
}
