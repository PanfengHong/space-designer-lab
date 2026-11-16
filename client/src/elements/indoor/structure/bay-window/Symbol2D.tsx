import type { BayWindow } from '../../../../types';
import { C } from '../../../common/planColors';

/** 飘窗 — 灰阶凸出矩形 */
export function BayWindow2D({ bayWindow, wallThickness: wt }: { bayWindow: BayWindow; wallThickness: number }) {
  void wt; // 与其他结构符号保持同构的 props, 飘窗按自身 depth 画
  const [x, , z] = bayWindow.position;
  const w = bayWindow.width;
  const d = bayWindow.depth;
  const rot = bayWindow.rotation ?? 0;

  let rx = x, ry = z, rw = w, rh = d;
  if (rot === 0 || rot === 180) {
    rw = w; rh = d;
    ry = rot === 0 ? z : z - d;
    rx = x - w / 2;
  } else {
    rw = d; rh = w;
    rx = rot === 90 ? x : x - d;
    ry = z - w / 2;
  }

  return (
    <g>
      <rect
        x={rx} y={ry} width={rw} height={rh}
        fill={C.windowFill}
        stroke={C.window}
        strokeWidth={0.06}
      />
    </g>
  );
}
