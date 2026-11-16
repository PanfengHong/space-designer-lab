import type { Furniture } from '../../../../types';
import { footprintOf } from '../metas';
import { C } from '../../../common/planColors';

/** 家电 (饮水机 / 打印机 / 电视): 矩形 + 内缩面板 */
export function Appliance2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  const inset = Math.min(w, h) * 0.16;
  return (
    <g>
      <rect
        x={x - w / 2} y={z - h / 2} width={w} height={h}
        fill={C.furnitureLight} stroke={C.furnitureStroke} strokeWidth={0.02} rx={0.03}
      />
      <rect
        x={x - w / 2 + inset} y={z - h / 2 + inset}
        width={Math.max(0.02, w - inset * 2)} height={Math.max(0.02, h - inset * 2)}
        fill="none" stroke={C.furnitureStroke} strokeWidth={0.018} rx={0.02}
      />
    </g>
  );
}
