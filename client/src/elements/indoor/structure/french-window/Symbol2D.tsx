import type { FrenchWindow } from '../../../../types';
import { C } from '../../../common/planColors';

/** 落地窗 — 灰阶粗线 */
export function FrenchWindow2D({ frenchWindow }: { frenchWindow: FrenchWindow; wallThickness: number }) {
  const [x, , z] = frenchWindow.position;
  const w = frenchWindow.width;
  const rot = frenchWindow.rotation ?? 0;
  const isVertical = rot === 90 || rot === 270;

  if (isVertical) {
    return <line x1={x} y1={z - w / 2} x2={x} y2={z + w / 2} stroke={C.window} strokeWidth={0.12} />;
  }
  return <line x1={x - w / 2} y1={z} x2={x + w / 2} y2={z} stroke={C.window} strokeWidth={0.12} />;
}
