import { useCallback, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { wallDragLive, wallHud } from '../../../utils/hudAnchor';

/**
 * 拖拽墙体端点时的实时长度标签 (mm)。
 *
 * 常驻挂载 + opacity 切换; 位置与数值都由 Canvas 内的 WallLengthReporter
 * 每帧直接写 DOM, 完全不经过 React —— 拖拽时不会有任何重渲染,
 * 标签始终紧贴手柄, 也不会拖慢鼠标跟随。
 */
export function WallLengthHud() {
  // ref 回调同步登记/注销, 保证卸载时槽位一定被清空
  const setRef = useCallback((el: HTMLDivElement | null) => {
    wallHud.el = el;
  }, []);
  return (
    <div
      ref={setRef}
      className="absolute left-0 top-0 z-40 px-1.5 py-0.5 rounded-md bg-slate-900/80 text-white text-[11px] leading-none font-medium tabular-nums pointer-events-none select-none"
      style={{ opacity: 0, willChange: 'transform' }}
    />
  );
}

/** Canvas 内: 每帧把被拖端点投影到屏幕, 写入标签的 transform 与文字 */
export function WallLengthReporter() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const v = useRef(new THREE.Vector3()).current;

  useFrame(() => {
    const el = wallHud.el;
    if (!el) return;
    if (!wallDragLive.active) {
      if (el.style.opacity !== '0') el.style.opacity = '0';
      return;
    }
    // 锚点在手柄上方一点, 不压住手柄本体
    v.set(wallDragLive.x, wallDragLive.y + 0.32, wallDragLive.z).project(camera);
    const x = (v.x * 0.5 + 0.5) * size.width;
    const y = (-v.y * 0.5 + 0.5) * size.height;
    const text = `${Math.round(wallDragLive.length * 1000)} mm`;
    if (el.textContent !== text) el.textContent = text;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
    el.style.opacity = v.z < 1 ? '1' : '0';
  });

  return null;
}
