import { Copy, RotateCcw, RotateCw, Trash2, X } from 'lucide-react';
import { useCallback, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../../store/useAppStore';
import { hudAnchor } from '../../../utils/hudAnchor';
import { findFurniture, normalizeDeg } from '../../../utils/sceneQuery';

function ToolBtn({
  title,
  onClick,
  disabled,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`p-1.5 rounded-md transition-colors ${
        disabled
          ? 'text-gray-300 cursor-not-allowed'
          : danger
            ? 'text-gray-500 hover:text-red-500 hover:bg-red-50'
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * 就近工具条 — 悬浮在选中家具上方的小工具条。
 * 位置由 Canvas 内的 HudAnchorReporter 每帧投影写入 (见 utils/hudAnchor),
 * 所以这里不参与 React 的高频更新。
 */
export function FurnitureToolbar() {
  const selectedFurnitureId = useAppStore((s) => s.selectedFurnitureId);
  const session = useAppStore((s) => s.transformSession);
  const sceneData = useAppStore((s) => s.sceneData);
  const updateFurniture = useAppStore((s) => s.updateFurniture);
  const removeFurniture = useAppStore((s) => s.removeFurniture);
  const duplicateFurniture = useAppStore((s) => s.duplicateFurniture);
  const selectFurniture = useAppStore((s) => s.selectFurniture);

  const item = useMemo(
    () => findFurniture(sceneData, selectedFurnitureId),
    [sceneData, selectedFurnitureId],
  );

  // 用 ref 回调同步登记/注销, 保证卸载时 hudAnchor 一定被清空
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const setRef = useCallback((el: HTMLDivElement | null) => {
    nodeRef.current = el;
    hudAnchor.el = el;
  }, []);

  // 变换过程中隐藏 (此时视觉由 ghost 承担, 工具条跟着旧坐标走会显得错位)
  if (!item || session) return null;

  const rotate = (delta: number) =>
    updateFurniture(item.id, { rotation: normalizeDeg(item.rotation + delta) });

  return (
    <div
      ref={setRef}
      className="absolute left-0 top-0 z-30 flex items-center gap-0.5 bg-white/95 backdrop-blur-md border border-gray-200 rounded-lg shadow-lg px-1 py-0.5 select-none"
      style={{ opacity: 0, willChange: 'transform' }}
    >
      <ToolBtn
        title="左旋 90°"
        disabled={item.embedded}
        onClick={() => rotate(-90)}
      >
        <RotateCcw size={14} />
      </ToolBtn>
      <ToolBtn
        title="右旋 90°（快捷键 R）"
        disabled={item.embedded}
        onClick={() => rotate(90)}
      >
        <RotateCw size={14} />
      </ToolBtn>
      <span className="w-px h-4 bg-gray-200 mx-0.5" />
      <ToolBtn title="复制（Ctrl+D）" onClick={() => duplicateFurniture(item.id)}>
        <Copy size={14} />
      </ToolBtn>
      <ToolBtn title="删除（Delete）" danger onClick={() => removeFurniture(item.id)}>
        <Trash2 size={14} />
      </ToolBtn>
      <span className="w-px h-4 bg-gray-200 mx-0.5" />
      <ToolBtn title="取消选中（Esc）" onClick={() => selectFurniture(null)}>
        <X size={14} />
      </ToolBtn>
    </div>
  );
}

/**
 * HudAnchorReporter — 放在 Canvas 内, 每帧把选中家具的世界坐标投影成屏幕坐标,
 * 直接写工具条 DOM 的 transform (不经过 React)。
 */
export function HudAnchorReporter() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const selectedFurnitureId = useAppStore((s) => s.selectedFurnitureId);
  const session = useAppStore((s) => s.transformSession);
  const sceneData = useAppStore((s) => s.sceneData);

  const item = useMemo(
    () => findFurniture(sceneData, selectedFurnitureId),
    [sceneData, selectedFurnitureId],
  );
  const v = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const el = hudAnchor.el;
    if (!el) return;
    if (!item || session) {
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      return;
    }
    // 锚点在家具顶面上方一点
    v.set(item.position[0], item.size[1] + 0.4, item.position[2]).project(camera);
    const x = (v.x * 0.5 + 0.5) * size.width;
    const y = (-v.y * 0.5 + 0.5) * size.height;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    const visible = v.z < 1;
    el.style.opacity = visible ? '1' : '0';
    el.style.pointerEvents = visible ? 'auto' : 'none';
  });

  return null;
}
