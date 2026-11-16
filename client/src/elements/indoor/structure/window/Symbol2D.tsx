import type { Window } from '../../../../types';
import { C } from '../../../common/planColors';

/** 普通窗户 — 灰阶三线段 + 浅灰填充 */
export function Window2D({ window, wallThickness: wt }: { window: Window; wallThickness: number }) {
  const [x, , z] = window.position;
  const w = window.width;
  const rot = window.rotation ?? 0;
  const isVertical = rot === 90 || rot === 270;
  const half = wt / 2;

  if (isVertical) {
    return (
      <g>
        <rect x={x - half} y={z - w / 2} width={wt} height={w} fill={C.windowFill} opacity={0.6} />
        <line x1={x} y1={z - w / 2} x2={x} y2={z + w / 2} stroke={C.window} strokeWidth={0.04} />
        <line x1={x - half} y1={z - w / 2} x2={x - half} y2={z + w / 2} stroke={C.window} strokeWidth={0.04} />
        <line x1={x + half} y1={z - w / 2} x2={x + half} y2={z + w / 2} stroke={C.window} strokeWidth={0.04} />
      </g>
    );
  }
  return (
    <g>
      <rect x={x - w / 2} y={z - half} width={w} height={wt} fill={C.windowFill} opacity={0.6} />
      <line x1={x - w / 2} y1={z} x2={x + w / 2} y2={z} stroke={C.window} strokeWidth={0.04} />
      <line x1={x - w / 2} y1={z - half} x2={x + w / 2} y2={z - half} stroke={C.window} strokeWidth={0.04} />
      <line x1={x - w / 2} y1={z + half} x2={x + w / 2} y2={z + half} stroke={C.window} strokeWidth={0.04} />
    </g>
  );
}
