import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../../store/useAppStore';
import { screenToFloor, snapToGrid } from '../../../utils/r3fBridge';
import { checkOutdoorPlacement, type OutdoorColliders } from '../../../utils/collision';
import { useOutdoorPalette } from '../../../constants/outdoorStyles';
import { OutdoorObjectContent } from './OutdoorObjects';
import type { OutdoorObject } from '../../../types';

/** 旋转手柄拖动时的角度吸附步长 (度) */
const ROT_STEP = 15;
const RING_WIDTH = 0.08;
/**
 * 手柄抬升高度 —— 必须高于接触阴影平面 (y=0.16) 与道路面 (y=0.09),
 * 否则圆环会被透明平面遮住且无法被射线命中 (表现为"选中有框但拖不动旋转")。
 */
const HANDLE_Y = 0.6;

/**
 * 圆环半径 —— 取占地"外接圆"(半对角线) 而不是长边的一半。
 * 方形建筑用 max(hx,hz) 时, 圆环会从四角插进建筑基座里 (基座角点在半对角线处),
 * 导致圆环被埋掉、点不中; 用外接圆保证整圈都落在物体占地之外。
 */
function ringRadius(hx: number, hz: number) {
  const circum = Math.hypot(hx, hz);
  return circum + Math.min(3, Math.max(0.6, circum * 0.12));
}

/** 圆环管径 / 抓取球半径 —— 同样随物体尺寸缩放, 大建筑也能轻松点中 */
function handleSizes(hx: number, hz: number) {
  const r = Math.hypot(hx, hz);
  return {
    tube: Math.min(0.3, Math.max(0.09, r * 0.03)),
    ball: Math.min(1.2, Math.max(0.45, r * 0.1)),
  };
}

function normalizeDeg(d: number) {
  const r = d % 360;
  return r < 0 ? r + 360 : r;
}

interface Footprint {
  hx: number;
  hz: number;
  h: number;
}

/** 空间对象占地: 局部 X = size[0], 局部 Z = size[2] (与 collision.ts 的 itemObb 同口径) */
function localFootprint(o: OutdoorObject): Footprint {
  return { hx: o.size[0] / 2, hz: o.size[2] / 2, h: o.size[1] };
}

/* ==================== 旋转手柄 (选中时出现) ==================== */
function RotateHandle({
  position,
  rotationY,
  footprint,
  onGrab,
}: {
  position: [number, number, number];
  rotationY: number;
  footprint: Footprint;
  onGrab: () => void;
}) {
  const R = ringRadius(footprint.hx, footprint.hz);
  const { tube, ball } = handleSizes(footprint.hx, footprint.hz);
  /** 不可见的拾取加宽带: 视觉圆环很细, 大建筑上远看只有几个像素宽, 直接点中很难 */
  const pickHalf = Math.max(0.5, R * 0.06);
  const grab = (e: any) => {
    e.stopPropagation();
    onGrab();
  };
  const hoverIn = (e: any) => {
    e.stopPropagation();
    document.body.style.cursor = 'grab';
  };
  const hoverOut = () => {
    document.body.style.cursor = 'default';
  };
  return (
    <group position={[position[0], position[1] + HANDLE_Y, position[2]]} rotation={[0, rotationY, 0]}>
      {/* 不可见加宽拾取环 (放在最前, 命中范围大) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} onPointerDown={grab} onPointerOver={hoverIn} onPointerOut={hoverOut}>
        <ringGeometry args={[Math.max(0.01, R - pickHalf), R + pickHalf, 64]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* 环形轨道 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} onPointerDown={grab} onPointerOver={hoverIn} onPointerOut={hoverOut}>
        <torusGeometry args={[R, tube, 8, 72]} />
        <meshBasicMaterial color="#2563eb" transparent opacity={0.85} depthWrite={false} />
      </mesh>
      {/* 抓取把手 (放在圆环外侧, 避免贴墙时被建筑挡住) */}
      <mesh position={[R + ball * 0.6, 0, 0]} onPointerDown={grab} onPointerOver={hoverIn} onPointerOut={hoverOut}>
        <sphereGeometry args={[ball, 20, 16]} />
        <meshBasicMaterial color="#2563eb" />
      </mesh>
    </group>
  );
}

/* ==================== 变换控制器 ==================== */
/**
 * 户外空间对象的拖拽移动 + 旋转手柄执行者 (与室内 FurnitureTransformController 同模式)。
 *
 * 会话期间每帧只写 three 对象 (ghost 位置/旋转、指示框颜色、提示条 DOM),
 * 不写 store; 松手时提交一次 updateOutdoorObject, 一次拖动只产生一条撤销/保存记录。
 */
export function OutdoorTransformController({ colliders }: { colliders: OutdoorColliders }) {
  const session = useAppStore((s) => s.transformSession);
  const endTransform = useAppStore((s) => s.endTransform);
  const updateOutdoorObject = useAppStore((s) => s.updateOutdoorObject);
  const beginTransform = useAppStore((s) => s.beginTransform);
  const objects = useAppStore((s) => s.outdoorSceneData.objects);
  const selectedId = useAppStore((s) => s.selectedOutdoorObjectId);
  const spaceLocked = useAppStore((s) => s.layers.find((l) => l.id === 'space')?.locked ?? true);
  const palette = useOutdoorPalette();

  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls);

  const target = useMemo(
    () => (session ? objects.find((o) => o.id === session.id) ?? null : null),
    [session, objects],
  );
  const selected = useMemo(
    () => objects.find((o) => o.id === selectedId) ?? null,
    [objects, selectedId],
  );

  const footprint = useMemo(() => (target ? localFootprint(target) : null), [target]);
  const handleFootprint = useMemo(() => (selected ? localFootprint(selected) : null), [selected]);

  // ghost 用零位 data: 位置/旋转交给外层 group
  const ghostData = useMemo<OutdoorObject | null>(
    () => (target ? { ...target, position: [0, 0, 0], rotation: 0 } : null),
    [target],
  );

  const ghostRef = useRef<THREE.Group>(null);
  const boxMatRef = useRef<THREE.LineBasicMaterial>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const hintRef = useRef<HTMLDivElement | null>(null);
  const grabRef = useRef<[number, number] | null>(null);
  const resultRef = useRef<{ x: number; z: number; rotation: number; ok: boolean } | null>(null);

  /* 提示条: 挂到 Canvas 容器上, 直接改样式 */
  useEffect(() => {
    const parent = gl.domElement.parentElement;
    if (!parent) return;
    const el = document.createElement('div');
    el.style.cssText =
      'position:absolute;display:none;pointer-events:none;z-index:20;padding:3px 9px;' +
      'border-radius:999px;background:#ef4444;color:#fff;font-size:11px;line-height:1.5;' +
      'white-space:nowrap;user-select:none;';
    parent.appendChild(el);
    hintRef.current = el;
    return () => {
      el.remove();
      hintRef.current = null;
    };
  }, [gl]);

  useEffect(() => {
    if (!session || !target) return;
    const mode = session.mode;
    const start = {
      x: target.position[0],
      y: target.position[1],
      z: target.position[2],
      rotation: target.rotation,
    };
    resultRef.current = { x: start.x, z: start.z, rotation: start.rotation, ok: true };
    grabRef.current = null;

    const paint = (ok: boolean) => {
      const c = ok ? '#22c55e' : '#ef4444';
      boxMatRef.current?.color.set(c);
      ringMatRef.current?.color.set(c);
    };
    const setHint = (text: string | null, cx: number, cy: number, color: string) => {
      const el = hintRef.current;
      const parent = gl.domElement.parentElement;
      if (!el || !parent) return;
      if (!text) {
        el.style.display = 'none';
        return;
      }
      const r = parent.getBoundingClientRect();
      el.textContent = text;
      el.style.display = 'block';
      el.style.background = color;
      el.style.left = `${cx - r.left + 14}px`;
      el.style.top = `${cy - r.top + 18}px`;
    };

    const ghost = ghostRef.current;
    if (ghost) {
      ghost.position.set(start.x, start.y, start.z);
      ghost.rotation.y = (start.rotation * Math.PI) / 180;
    }
    paint(true);

    // 拖拽时关掉 OrbitControls, 否则对象与相机一起动
    const ctl = controls as unknown as { enabled: boolean } | null;
    if (ctl) ctl.enabled = false;

    const onMove = (e: PointerEvent) => {
      const floor = screenToFloor(e.clientX, e.clientY);
      if (!floor) return;
      if (mode === 'move') {
        if (!grabRef.current) grabRef.current = [start.x - floor[0], start.z - floor[1]];
        const [sx, sz] = snapToGrid(floor[0] + grabRef.current[0], floor[1] + grabRef.current[1]);
        const res = checkOutdoorPlacement(
          colliders,
          { kind: 'object', size: target.size },
          sx,
          sz,
          { excludeId: target.id, rotation: start.rotation },
        );
        resultRef.current = { x: sx, z: sz, rotation: start.rotation, ok: res.ok };
        const g = ghostRef.current;
        if (g) g.position.set(sx, start.y, sz);
        paint(res.ok);
        setHint(res.ok ? null : res.reason ?? '此处不可放置', e.clientX, e.clientY, '#ef4444');
      } else {
        const raw = -(Math.atan2(floor[1] - start.z, floor[0] - start.x) * 180) / Math.PI;
        const deg = normalizeDeg(Math.round(raw / ROT_STEP) * ROT_STEP);
        resultRef.current = { x: start.x, z: start.z, rotation: deg, ok: true };
        const g = ghostRef.current;
        if (g) g.rotation.y = (deg * Math.PI) / 180;
        setHint(`旋转 ${deg}°`, e.clientX, e.clientY, '#2563eb');
      }
    };

    const finish = () => {
      const r = resultRef.current;
      setHint(null, 0, 0, '#ef4444');
      if (r) {
        if (mode === 'move' && r.ok && (r.x !== start.x || r.z !== start.z)) {
          updateOutdoorObject(target.id, { position: [r.x, start.y, r.z] });
        } else if (mode === 'rotate' && r.rotation !== start.rotation) {
          updateOutdoorObject(target.id, { rotation: r.rotation });
        }
      }
      endTransform();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      if (ctl) ctl.enabled = true;
      setHint(null, 0, 0, '#ef4444');
    };
  }, [session, target, colliders, controls, updateOutdoorObject, endTransform, gl]);

  const showGhost = !!(session && target && footprint && ghostData);
  const showHandle = !!(selected && !spaceLocked && !session && handleFootprint);

  return (
    <>
      {showGhost && ghostData && footprint && (
        <group ref={ghostRef}>
          <OutdoorObjectContent data={ghostData} palette={palette} />
          {/* 占地包围框 + 落点环: 绿=可放 / 红=冲突 */}
          <lineSegments position={[0, footprint.h / 2, 0]}>
            <edgesGeometry
              args={[new THREE.BoxGeometry(footprint.hx * 2, footprint.h, footprint.hz * 2)]}
            />
            <lineBasicMaterial ref={boxMatRef} transparent opacity={0.9} />
          </lineSegments>
          <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry
              args={[
                ringRadius(footprint.hx, footprint.hz) - RING_WIDTH / 2,
                ringRadius(footprint.hx, footprint.hz) + RING_WIDTH / 2,
                48,
              ]}
            />
            <meshBasicMaterial
              ref={ringMatRef}
              transparent
              opacity={0.85}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {showHandle && selected && handleFootprint && (
        <RotateHandle
          position={selected.position}
          rotationY={(selected.rotation * Math.PI) / 180}
          footprint={handleFootprint}
          onGrab={() => beginTransform(selected.id, 'rotate')}
        />
      )}
    </>
  );
}
