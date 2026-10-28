import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../../store/useAppStore';
import { screenToFloor, snapToGrid } from '../../../utils/r3fBridge';
import { checkIndoorPlacement, type IndoorColliders } from '../../../utils/collision';
import { findFurniture, normalizeDeg } from '../../../utils/sceneQuery';
import { FurnitureContent } from './Furniture';
import type { Furniture } from '../../../types';

/** 旋转手柄拖动时的角度吸附步长 (度) */
const ROT_STEP = 15;

/** 指针移动超过该像素距离才算"拖动" —— 否则只是点选, 不该进入移动判定 */
const DRAG_THRESHOLD = 4;

/**
 * 环形指示器的统一半径基准 (相对家具占地外接圆半径的增量, 单位米)。
 *
 * 选中态出现的是蓝色旋转手柄环, 拖动态出现的是绿/红落点环 —— 两者必须用同一个
 * 半径, 否则"按住手柄开始拖动"的瞬间两个圈尺寸跳变, 视觉上会脱节。
 * 蓝色环 (torus) 取中心线半径 = 外接圆 + RING_OFFSET;
 * 绿/红环 (ring) 取 [中线 - RING_WIDTH/2, 中线 + RING_WIDTH/2], 中线同为最大值 + RING_OFFSET。
 */
const RING_OFFSET = 0.1;
const RING_WIDTH = 0.08;

/** 占地外接圆半径 —— 手柄环与落点环共用的基准 */
function ringRadius(hx: number, hz: number) {
  return Math.max(hx, hz) + RING_OFFSET;
}

interface Footprint {
  hx: number;
  hz: number;
  ox: number;
  oz: number;
  h: number;
}

/**
 * 用 size[0] 作为局部 X 轴建模的素材 —— 与项目约定 (X = size[2], Z = size[0]) 相反。
 * 占位盒必须跟着各自的建模轴向走, 否则高亮框/落点环会和视觉差 90°。
 * (Toilet: tankW = w*0.85 直接作为 X; Chair: boxGeometry args=[w, seatT, d])
 */
const X_IS_SIZE0 = new Set<string>(['toilet', 'chair']);

/** 家具占地半长 — 与 collision.ts 的 furnitureObb 完全同口径 */
function localFootprint(f: Furniture): Footprint {
  if (f.type === 'shower') {
    if ((f.shape ?? 'quarter') === 'quarter') {
      const r = f.size[0];
      return { hx: r / 2, hz: r / 2, ox: r / 2, oz: r / 2, h: f.size[1] };
    }
    return { hx: f.size[0] / 2, hz: f.size[2] / 2, ox: f.size[0] / 2, oz: f.size[2] / 2, h: f.size[1] };
  }
  if (X_IS_SIZE0.has(f.type)) {
    return { hx: f.size[0] / 2, hz: f.size[2] / 2, ox: 0, oz: 0, h: f.size[1] };
  }
  return { hx: f.size[2] / 2, hz: f.size[0] / 2, ox: 0, oz: 0, h: f.size[1] };
}

/* ==================== 旋转手柄 (选中时出现) ==================== */
function RotateHandle({
  position,
  rotationY,
  footprint,
  onGrab,
}: {
  position: [number, number];
  rotationY: number;
  footprint: Footprint;
  onGrab: () => void;
}) {
  // 与拖动态的绿/红落点环同半径 (RING_OFFSET), 保证按下手柄开始拖动时圈不跳变
  const R = ringRadius(footprint.hx, footprint.hz);
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
    <group position={[position[0], 0.07, position[1]]} rotation={[0, rotationY, 0]}>
      <group position={[footprint.ox, 0, footprint.oz]}>
        {/* 环形轨道 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} onPointerDown={grab} onPointerOver={hoverIn} onPointerOut={hoverOut}>
          <torusGeometry args={[R, 0.028, 8, 72]} />
          <meshBasicMaterial color="#2563eb" transparent opacity={0.55} depthWrite={false} />
        </mesh>
        {/* 抓取把手 */}
        <mesh position={[R, 0, 0]} onPointerDown={grab} onPointerOver={hoverIn} onPointerOut={hoverOut}>
          <sphereGeometry args={[0.11, 20, 16]} />
          <meshBasicMaterial color="#2563eb" />
        </mesh>
      </group>
    </group>
  );
}

/* ==================== 变换控制器 ==================== */
/**
 * 拖拽移动 + 旋转手柄的执行者。
 *
 * 性能约定 (与项目既有拖拽实现一致): 会话期间每帧只直接写 three 对象
 * (ghost 的位置/旋转、指示框颜色、提示条 DOM), 不写 store、不触发 React 重渲染;
 * 松手时才提交一次 updateFurniture —— 因此一次拖动只产生一条撤销历史。
 *
 * 会话期间原家具隐藏 (FurnitureItem 读 transformSession), 由这里的 ghost 克隆体
 * 承担视觉; ghost 用"零位 data"渲染真实家具, 变换全部由外层 group 提供。
 */
export function FurnitureTransformController({ colliders }: { colliders: IndoorColliders }) {
  const session = useAppStore((s) => s.transformSession);
  const endTransform = useAppStore((s) => s.endTransform);
  const updateFurniture = useAppStore((s) => s.updateFurniture);
  const beginTransform = useAppStore((s) => s.beginTransform);
  const sceneData = useAppStore((s) => s.sceneData);
  const selectedFurnitureId = useAppStore((s) => s.selectedFurnitureId);

  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls);

  const target = useMemo(
    () => (session ? findFurniture(sceneData, session.id) : null),
    [session, sceneData],
  );
  const selected = useMemo(
    () => findFurniture(sceneData, selectedFurnitureId),
    [sceneData, selectedFurnitureId],
  );

  const footprint = useMemo(() => (target ? localFootprint(target) : null), [target]);
  const handleFootprint = useMemo(() => (selected ? localFootprint(selected) : null), [selected]);
  // ghost 用零位 data: 局部平移/旋转交给外层 group, 便于直接操作 three 对象
  const ghostData = useMemo<Furniture | null>(
    () => (target ? { ...target, position: [0, target.position[1], 0], rotation: 0 } : null),
    [target],
  );

  const ghostRef = useRef<THREE.Group>(null);
  const boxMatRef = useRef<THREE.LineBasicMaterial>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const hintRef = useRef<HTMLDivElement | null>(null);
  const grabRef = useRef<[number, number] | null>(null);
  const resultRef = useRef<{ x: number; z: number; rotation: number; ok: boolean } | null>(null);

  /* 提示条: 挂到 Canvas 容器上, 直接改样式 (与 BaseScene 的落点提示同款) */
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
    const start = { x: target.position[0], z: target.position[2], rotation: target.rotation };
    resultRef.current = { ...start, ok: true };
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
      ghost.position.set(start.x, 0, start.z);
      ghost.rotation.y = (start.rotation * Math.PI) / 180;
    }
    paint(true);

    // 拖拽家具时关掉 OrbitControls, 否则家具与相机一起动
    // (three 的 OrbitControls 在 enabled=false 时会忽略后续 pointermove)
    const ctl = controls as unknown as { enabled: boolean } | null;
    if (ctl) ctl.enabled = false;

    /**
     * 点选 vs 拖动: 指针离开起点超过 DRAG_THRESHOLD 像素才真正开始移动判定。
     * 否则"点一下家具想选中它"会被当成"拖回原地", 触发一次占位校验并可能弹出
     * "此处不可放置"的红字 —— 尤其贴墙摆放的家具 (如卫生间的马桶), 原地判定
     * 本身就与墙相切, 用户会误以为"这个物体选不中"。
     */
    const startX = session.startX;
    const startY = session.startY;
    let dragging = startX == null || startY == null;

    const onMove = (e: PointerEvent) => {
      if (!dragging) {
        if (Math.hypot(e.clientX - (startX as number), e.clientY - (startY as number)) < DRAG_THRESHOLD) {
          return;
        }
        dragging = true;
      }
      const floor = screenToFloor(e.clientX, e.clientY);
      if (!floor) return;
      if (mode === 'move') {
        // 首次移动记录"抓取偏移", 让家具随指针相对位移, 而不是把原点吸到指针上
        if (!grabRef.current) grabRef.current = [start.x - floor[0], start.z - floor[1]];
        const [sx, sz] = snapToGrid(floor[0] + grabRef.current[0], floor[1] + grabRef.current[1]);
        const res = checkIndoorPlacement(colliders, target, sx, sz, target.id);
        resultRef.current = { x: sx, z: sz, rotation: start.rotation, ok: res.ok };
        const g = ghostRef.current;
        if (g) g.position.set(sx, 0, sz);
        paint(res.ok);
        // 合法不打扰, 非法才贴指针给原因
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
          updateFurniture(target.id, { position: [r.x, target.position[1], r.z] });
        } else if (mode === 'rotate' && r.rotation !== start.rotation) {
          updateFurniture(target.id, { rotation: r.rotation });
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
  }, [session, target, colliders, controls, updateFurniture, endTransform, gl]);

  const showGhost = !!(session && target && footprint && ghostData);
  const showHandle = !!selected && !selected.embedded && !session && !!handleFootprint;

  return (
    <>
      {showGhost && ghostData && footprint && (
        <group ref={ghostRef}>
          <FurnitureContent data={ghostData} />
          {/* 占地包围框 + 落点环: 绿=可放 / 红=冲突 */}
          <lineSegments position={[footprint.ox, footprint.h / 2, footprint.oz]}>
            <edgesGeometry
              args={[new THREE.BoxGeometry(footprint.hx * 2, footprint.h, footprint.hz * 2)]}
            />
            <lineBasicMaterial ref={boxMatRef} transparent opacity={0.9} />
          </lineSegments>
          <mesh position={[footprint.ox, 0.02, footprint.oz]} rotation={[-Math.PI / 2, 0, 0]}>
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
          position={[selected.position[0], selected.position[2]]}
          rotationY={(selected.rotation * Math.PI) / 180}
          footprint={handleFootprint}
          onGrab={() => beginTransform(selected.id, 'rotate')}
        />
      )}
    </>
  );
}
