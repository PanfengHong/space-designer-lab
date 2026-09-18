import { Suspense, useMemo, useEffect, useRef, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { Building } from './Building';
import { FurnitureGroup } from './Furniture';
import { R3FBridgeBinder, DragGhost } from './DragDrop';
import { useAppStore } from '../../store/useAppStore';
import { useStylePalette } from '../../constants/styles';
import { screenToFloor, snapToGrid, findRoomAt } from '../../utils/r3fBridge';
import type { ModelLayer, Furniture } from '../../types';

// 户型中心坐标 (总宽9.5m, 总深12.2m含阳台)
const CENTER_X = 4.75;
const CENTER_Z = 6.1;

/**
 * 阻止浏览器右键手势（Edge/Chrome 的前进/后退、蓝色指示线等）
 *
 * 浏览器的导航手势在 window/document 级别处理, 仅在 canvas 上拦截不够。
 * 因此采用双层拦截:
 *   1. window 捕获阶段: 拦截所有右键相关事件 (button===2), 阻止浏览器手势识别
 *   2. canvas 级别: 拦截 contextmenu, 阻止右键菜单
 *
 * 同时配合 CSS overscroll-behavior: none 禁用滑动导航。
 */
function DisableBrowserGestures() {
  const gl = useThree((s) => s.gl);
  const domEl = gl.domElement;

  useEffect(() => {
    let rightDown = false;

    // ===== window 级捕获 (最高优先级, 拦截浏览器手势) =====
    // 注意: 只用 preventDefault (阻止浏览器手势), 不用 stopPropagation
    //       否则事件无法到达 canvas, OrbitControls 右键平移会失效。
    const onPointerDownWin = (e: PointerEvent) => {
      if (e.button === 2) {
        rightDown = true;
        e.preventDefault();
        // 捕获指针到 canvas, 明确告知浏览器此交互由应用接管, 阻止手势识别
        try { domEl?.setPointerCapture(e.pointerId); } catch {}
      }
    };
    const onPointerMoveWin = (e: PointerEvent) => {
      if (rightDown) {
        e.preventDefault();
      }
    };
    const onPointerUpWin = (e: PointerEvent) => {
      if (e.button === 2) {
        rightDown = false;
        e.preventDefault();
        try { domEl?.releasePointerCapture(e.pointerId); } catch {}
      }
    };
    const onMouseDownWin = (e: MouseEvent) => {
      if (e.button === 2) {
        e.preventDefault();
      }
    };
    const onMouseMoveWin = (e: MouseEvent) => {
      if (rightDown) {
        e.preventDefault();
      }
    };
    const onAuxClickWin = (e: MouseEvent) => {
      if (e.button === 2) {
        e.preventDefault();
      }
    };
    const onDragStartWin = (e: DragEvent) => {
      if (rightDown) e.preventDefault();
    };

    // capture + non-passive
    const cap: AddEventListenerOptions = { capture: true };
    window.addEventListener('pointerdown', onPointerDownWin, cap);
    window.addEventListener('pointermove', onPointerMoveWin, cap);
    window.addEventListener('pointerup', onPointerUpWin, cap);
    window.addEventListener('mousedown', onMouseDownWin, cap);
    window.addEventListener('mousemove', onMouseMoveWin, cap);
    window.addEventListener('auxclick', onAuxClickWin, cap);
    window.addEventListener('dragstart', onDragStartWin, cap);

    // ===== canvas 级 (兜底, 阻止右键菜单等) =====
    const el = domEl;
    const onContextMenuCanvas = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    if (el) {
      el.addEventListener('contextmenu', onContextMenuCanvas, cap);
    }

    return () => {
      window.removeEventListener('pointerdown', onPointerDownWin, cap);
      window.removeEventListener('pointermove', onPointerMoveWin, cap);
      window.removeEventListener('pointerup', onPointerUpWin, cap);
      window.removeEventListener('mousedown', onMouseDownWin, cap);
      window.removeEventListener('mousemove', onMouseMoveWin, cap);
      window.removeEventListener('auxclick', onAuxClickWin, cap);
      window.removeEventListener('dragstart', onDragStartWin, cap);
      if (el) {
        el.removeEventListener('contextmenu', onContextMenuCanvas, cap);
      }
    };
  }, [domEl]);

  return null;
}

/** 从房间 walls 计算水平中心点 (cx, cz) */
function getRoomCenter(rooms: { id: string; walls: { start: [number, number]; end: [number, number] }[] }[], roomId: string): [number, number] {
  const room = rooms.find((r) => r.id === roomId);
  if (!room) return [CENTER_X, CENTER_Z];
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const w of room.walls) {
    minX = Math.min(minX, w.start[0], w.end[0]);
    maxX = Math.max(maxX, w.start[0], w.end[0]);
    minZ = Math.min(minZ, w.start[1], w.end[1]);
    maxZ = Math.max(maxZ, w.start[1], w.end[1]);
  }
  return [(minX + maxX) / 2, (minZ + maxZ) / 2];
}

// 漫游视角点 (位置 + 朝向目标), 眼高 1.6m
const WALKTHROUGH_POINTS: { position: [number, number, number]; target: [number, number, number] }[] = [
  { position: [8.25, 1.6, 4.75], target: [5.25, 1.6, 8.0] },   // 玄关 → 客厅
  { position: [5.25, 1.6, 8.0], target: [5.25, 1.6, 11.0] },    // 客厅 → 阳台
  { position: [5.25, 1.6, 11.0], target: [5.25, 1.6, 8.0] },    // 阳台 → 客厅
  { position: [5.25, 1.6, 4.0], target: [5.25, 1.6, 1.3] },     // 餐厅 → 厨房
  { position: [5.25, 1.6, 1.3], target: [5.25, 1.6, 4.0] },     // 厨房 → 餐厅
  { position: [1.75, 1.6, 2.4], target: [3.0, 1.6, 3.5] },      // 卧室A → 门
  { position: [1.5, 1.6, 7.5], target: [1.5, 1.6, 10.0] },      // 卧室C → 飘窗
  { position: [8.75, 1.6, 8.5], target: [8.75, 1.6, 10.5] },    // 卧室B → 飘窗
];

interface SceneContentProps {
  viewMode: string;
  wallCutHeight: number;
  showCeiling: boolean;
  showDoorsOpen: boolean;
  showSpaceName: boolean;
  showTrafficLines: boolean;
  renderMode: string;
  layers: ModelLayer[];
  spaces: { id: string; visible: boolean }[];
  monochrome: boolean;
  resetCamera: boolean;
  lighting: string;
}

function CameraController({ viewMode, resetCamera, walkthroughIndex, activeSpaceId }: { viewMode: string; resetCamera: boolean; walkthroughIndex: number; activeSpaceId: string | null }) {
  const { camera, controls } = useThree() as { camera: THREE.Camera; controls: any };
  const sceneRooms = useAppStore((s) => s.sceneData.rooms);

  // 默认相机位置 (整体视角)
  const defaultPosition = useMemo(() => {
    switch (viewMode) {
      case 'axonometric':
        return [CENTER_X + 10, 16, CENTER_Z + 10] as [number, number, number];
      case 'top':
        return [CENTER_X, 25, CENTER_Z] as [number, number, number];
      case 'plan':
        return [CENTER_X, 25, CENTER_Z + 0.01] as [number, number, number];
      case 'walkthrough': {
        const pt = WALKTHROUGH_POINTS[walkthroughIndex % WALKTHROUGH_POINTS.length];
        return pt.position;
      }
      default:
        return [CENTER_X + 9, 13, CENTER_Z + 9] as [number, number, number];
    }
  }, [viewMode, walkthroughIndex]);

  const defaultTarget = useMemo(() => {
    if (viewMode === 'walkthrough') {
      const pt = WALKTHROUGH_POINTS[walkthroughIndex % WALKTHROUGH_POINTS.length];
      return pt.target;
    }
    return [CENTER_X, 0, CENTER_Z] as [number, number, number];
  }, [viewMode, walkthroughIndex]);

  // 选中空间时的相机位置 & target
  const focusTarget = useMemo<{ pos: [number, number, number]; tgt: [number, number, number] } | null>(() => {
    if (!activeSpaceId) return null;
    const [cx, cz] = getRoomCenter(sceneRooms, activeSpaceId);
    switch (viewMode) {
      case 'top':
      case 'plan':
        return { pos: [cx, 25, cz], tgt: [cx, 0, cz] };
      case 'axonometric':
        return { pos: [cx + 6, 10, cz + 6], tgt: [cx, 0, cz] };
      case 'walkthrough':
        return { pos: [cx, 1.6, cz], tgt: [cx, 1.6, cz] };
      default:
        return { pos: [cx + 5, 7, cz + 5], tgt: [cx, 0, cz] };
    }
  }, [activeSpaceId, viewMode, sceneRooms]);

  // 当前目标 (聚焦空间 或 默认)
  const targetPos = focusTarget ? focusTarget.pos : defaultPosition;
  const targetLook = focusTarget ? focusTarget.tgt : defaultTarget;

  // 插值目标 & 动画标记
  const posRef = useRef(new THREE.Vector3(...targetPos));
  const lookRef = useRef(new THREE.Vector3(...targetLook));
  const focusingRef = useRef(false);

  // 目标变化时: 开始聚焦动画
  useEffect(() => {
    posRef.current.set(...targetPos);
    lookRef.current.set(...targetLook);
    focusingRef.current = true;
  }, [targetPos, targetLook]);

  // 切换视图时: 直接跳转 (不插值)
  useEffect(() => {
    camera.position.set(...defaultPosition);
    camera.lookAt(...defaultTarget);
    if (controls) {
      controls.target.set(...defaultTarget);
      controls.update();
    }
    focusingRef.current = false;
    const targetFov = viewMode === 'walkthrough' ? 75 : 50;
    if (camera instanceof THREE.PerspectiveCamera && camera.fov !== targetFov) {
      camera.fov = targetFov;
      camera.updateProjectionMatrix();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, walkthroughIndex]);

  // 重置视角: 直接跳转到默认位置
  useEffect(() => {
    if (resetCamera) {
      camera.position.set(...defaultPosition);
      camera.lookAt(...defaultTarget);
      if (controls) {
        controls.target.set(...defaultTarget);
        controls.update();
      }
      focusingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetCamera]);

  // 仅在聚焦动画期间插值, 完成后停止 (不覆盖用户手动旋转)
  useFrame(() => {
    if (viewMode === 'walkthrough') return;
    if (!focusingRef.current) return;
    const lerpFactor = 0.12;
    camera.position.lerp(posRef.current, lerpFactor);
    if (controls) {
      controls.target.lerp(lookRef.current, lerpFactor);
      controls.update();
    }
    // 接近目标时停止动画, 交还控制权给用户
    if (camera.position.distanceTo(posRef.current) < 0.05) {
      camera.position.copy(posRef.current);
      if (controls) controls.target.copy(lookRef.current);
      focusingRef.current = false;
    }
  });

  return null;
}

/**
 * 实时计算当前相机下 "世界 1 米 = 屏幕多少像素" 并写回 store。
 * 只在值变化超过 0.5 时才 set，避免每帧 setState 浪费。
 */
function ScaleReporter() {
  const { camera, size } = useThree() as { camera: THREE.PerspectiveCamera; size: { width: number; height: number } };
  const setPixelsPerMeter = useAppStore((s) => s.setPixelsPerMeter);
  const lastRef = useRef(-1);

  useFrame(() => {
    if (!camera.isPerspectiveCamera) return;
    const target = new THREE.Vector3(CENTER_X, 0, CENTER_Z);
    const camDir = new THREE.Vector3().subVectors(camera.position, target).normalize();
    const distance = camera.position.distanceTo(target);

    // 相机到 target 所在平面的真实距离 (沿视线方向)
    // 透视相机: 在距离 d 处, fov 对应的世界高度 h = 2 * d * tan(fov/2)
    const fovRad = (camera.fov * Math.PI) / 180;
    const worldHeightAtTarget = 2 * distance * Math.tan(fovRad / 2);

    // 屏幕高 (CSS 像素)
    const screenHeight = size.height;

    // 1 米 对应多少像素
    const ppm = screenHeight / worldHeightAtTarget;

    // 变化阈值 0.5, 减少 setState 频率
    if (Math.abs(ppm - lastRef.current) > 0.5) {
      lastRef.current = ppm;
      setPixelsPerMeter(ppm);
    }
  });

  return null;
}

/**
 * 漫游第一人称视角控制 — 相机位置固定, 仅旋转朝向
 * 拖拽: 360° 旋转视角; 点击地板上的视角点标志: 跳转到该视角点
 */
function WalkthroughLook({ walkthroughIndex, setWalkthroughIndex, activeSpaceId }: { walkthroughIndex: number; setWalkthroughIndex: (i: number) => void; activeSpaceId: string | null }) {
  const { camera, gl } = useThree() as { camera: THREE.PerspectiveCamera; gl: THREE.WebGLRenderer };
  const selectSpace = useAppStore((s) => s.selectSpace);
  const sceneRooms = useAppStore((s) => s.sceneData.rooms);
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);
  const firstRunRef = useRef(true);
  // 用 ref 存当前位置, 避免闭包陈旧
  const positionRef = useRef<[number, number, number]>(WALKTHROUGH_POINTS[0].position);

  // 更新位置 ref (始终最新)
  useEffect(() => {
    if (activeSpaceId) {
      const [cx, cz] = getRoomCenter(sceneRooms, activeSpaceId);
      positionRef.current = [cx, 1.6, cz];
    } else {
      positionRef.current = WALKTHROUGH_POINTS[walkthroughIndex % WALKTHROUGH_POINTS.length].position;
    }
  }, [activeSpaceId, walkthroughIndex]);

  // 选中空间时: 初始化朝向东(+x), 方便环顾房间
  useEffect(() => {
    if (activeSpaceId) {
      yawRef.current = Math.PI / 2;
      pitchRef.current = 0;
    }
  }, [activeSpaceId]);

  // 位置/朝向变化时更新相机
  useEffect(() => {
    const pos = positionRef.current;
    const yaw = yawRef.current;
    const pitch = pitchRef.current;
    const target: [number, number, number] = [
      pos[0] + Math.sin(yaw) * Math.cos(pitch),
      pos[1] + Math.sin(pitch),
      pos[2] - Math.cos(yaw) * Math.cos(pitch),
    ];
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.lookAt(target[0], target[1], target[2]);
  }, [activeSpaceId, walkthroughIndex]);

  const updateCamera = () => {
    const pos = positionRef.current;
    const yaw = yawRef.current;
    const pitch = pitchRef.current;
    const target: [number, number, number] = [
      pos[0] + Math.sin(yaw) * Math.cos(pitch),
      pos[1] + Math.sin(pitch),
      pos[2] - Math.cos(yaw) * Math.cos(pitch),
    ];
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.lookAt(target[0], target[1], target[2]);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    draggingRef.current = true;
    lastXRef.current = e.clientX;
    lastYRef.current = e.clientY;
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - lastXRef.current;
    const dy = e.clientY - lastYRef.current;
    lastXRef.current = e.clientX;
    lastYRef.current = e.clientY;
    yawRef.current -= dx * 0.005;
    pitchRef.current += dy * 0.005;
    pitchRef.current = Math.max(-Math.PI * 0.47, Math.min(Math.PI * 0.47, pitchRef.current));
    updateCamera();
  };

  const onPointerUp = () => {
    draggingRef.current = false;
  };

  // 事件监听器只绑定一次
  useEffect(() => {
    const dom = gl.domElement;
    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);
    return () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  // 点击视角点标志 → 清除空间选中, 跳转到该视角点
  const handlePointClick = (e: any, index: number) => {
    e.stopPropagation();
    selectSpace('');
    setWalkthroughIndex(index);
  };

  return (
    <group>
      {/* 视角点标志 — 地板上的发光圆环 + 垂直光柱 */}
      {WALKTHROUGH_POINTS.map((pt, i) => {
        const isCurrent = i === walkthroughIndex;
        return (
          <group
            key={i}
            position={[pt.position[0], 0.02, pt.position[2]]}
            onClick={(e) => handlePointClick(e, i)}
            onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = 'default'; }}
          >
            {/* 底部发光圆环 */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.15, 0.35, 32]} />
              <meshBasicMaterial
                color={isCurrent ? '#22c55e' : '#3b82f6'}
                transparent
                opacity={isCurrent ? 0.9 : 0.6}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* 中心实心圆 */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
              <circleGeometry args={[0.15, 32]} />
              <meshBasicMaterial
                color={isCurrent ? '#22c55e' : '#3b82f6'}
                transparent
                opacity={0.8}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* 垂直光柱 */}
            <mesh position={[0, 0.6, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 1.2, 12]} />
              <meshBasicMaterial
                color={isCurrent ? '#22c55e' : '#3b82f6'}
                transparent
                opacity={0.5}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/**
 * 光照系统: 根据光影模式切换不同的灯光配置
 *
 * 自然光照: 明亮日光, 暖白主光 + 蓝天环境光
 * 人造光:   无日光, 室内暖色点光源群
 * 阴天:     柔和均匀, 冷灰色环境光
 * 夜景:     深暗, 冷蓝色月光 + 微弱室内光
 * 黄昏:     低角度暖色光, 橙红天空
 */
type LightingConfig = {
  ambient: number;
  ambientColor: string;
  dirIntensity: number;
  dirColor: string;
  dirPos: [number, number, number];
  dir2Intensity: number;
  dir2Color?: string;
  dir2Pos?: [number, number, number];
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  pointLights: { pos: [number, number, number]; color: string; intensity: number; dist: number }[];
  fog: [number, string] | null;
};

function Lighting({ mode }: { mode: string }) {
  const config = useMemo<LightingConfig>(() => {
    switch (mode) {
      case '人造光':
        return {
          ambient: 0.25,
          ambientColor: '#fff5e6',
          dirIntensity: 0.05,
          dirColor: '#ffffff',
          dirPos: [10, 15, 10] as [number, number, number],
          dir2Intensity: 0,
          hemiSky: '#3a3a3a',
          hemiGround: '#2a2a2a',
          hemiIntensity: 0.15,
          pointLights: [
            { pos: [CENTER_X + 2, 2.4, CENTER_Z + 2] as [number, number, number], color: '#ffe8cc', intensity: 0.6, dist: 6 },
            { pos: [CENTER_X - 2, 2.4, CENTER_Z - 2] as [number, number, number], color: '#ffe8cc', intensity: 0.6, dist: 6 },
            { pos: [CENTER_X + 2, 2.4, CENTER_Z - 2] as [number, number, number], color: '#ffe8cc', intensity: 0.5, dist: 6 },
            { pos: [CENTER_X - 2, 2.4, CENTER_Z + 2] as [number, number, number], color: '#ffe8cc', intensity: 0.5, dist: 6 },
          ],
          fog: null as [number, string] | null,
        };
      case '阴天':
        return {
          ambient: 0.6,
          ambientColor: '#d0d4d8',
          dirIntensity: 0.2,
          dirColor: '#c8cdd2',
          dirPos: [0, 20, 5] as [number, number, number],
          dir2Intensity: 0.15,
          hemiSky: '#b8bcc0',
          hemiGround: '#a0a4a8',
          hemiIntensity: 0.7,
          pointLights: [] as { pos: [number, number, number]; color: string; intensity: number; dist: number }[],
          fog: null as [number, string] | null,
        };
      case '夜景':
        return {
          // 提高环境光，模拟月光散射后的夜间环境
          ambient: 0.18,
          // 冷蓝色环境光，模拟月光散射
          ambientColor: '#3a4868',
          // 月光主光：增强强度，冷白色，保持影子效果
          dirIntensity: 0.35,
          dirColor: '#c8d8f0',
          // 月亮位置：高角度斜射
          dirPos: [-8, 20, 6] as [number, number, number],
          dir2Intensity: 0,
          // 夜空蓝色调
          hemiSky: '#1a2a48',
          hemiGround: '#0e1428',
          hemiIntensity: 0.3,
          // 室内点光源（暖光与月光形成冷暖对比）
          pointLights: [
            { pos: [CENTER_X + 2, 2.4, CENTER_Z + 2] as [number, number, number], color: '#ffe8cc', intensity: 0.5, dist: 6 },
            { pos: [CENTER_X - 2, 2.4, CENTER_Z - 2] as [number, number, number], color: '#ffe8cc', intensity: 0.5, dist: 6 },
          ],
          // 雾效稍微淡化
          fog: [30, '#1a2030'] as [number, string],
        };
      case '黄昏':
        return {
          // 降低环境光强度，保留阴影层次（而非统一涂色）
          ambient: 0.28,
          // 中性偏暖环境色，模拟天空散射光（非纯橙）
          ambientColor: '#d8c8b8',
          // 强方向光保留影子效果（接近自然光强度）
          dirIntensity: 1.0,
          // 暖色夕阳主光，不过度饱和
          dirColor: '#ffa060',
          // 低角度阳光，拉长投影
          dirPos: [12, 3.5, 8] as [number, number, number],
          // 补光：冷色天空反射，暖冷对比增加通透感
          dir2Intensity: 0.3,
          dir2Color: '#a8c0d8',
          dir2Pos: [-8, 12, -6] as [number, number, number],
          // 黄昏天空色调
          hemiSky: '#c8a890',
          hemiGround: '#5a4530',
          hemiIntensity: 0.45,
          pointLights: [] as { pos: [number, number, number]; color: string; intensity: number; dist: number }[],
          // 轻微雾效增加空气透视感
          fog: [40, '#9a8068'] as [number, string],
        };
      default: // 自然光照
        return {
          ambient: 0.7,
          ambientColor: '#ffffff',
          dirIntensity: 0.8,
          dirColor: '#fffef0',
          dirPos: [10, 15, 10] as [number, number, number],
          dir2Intensity: 0.3,
          hemiSky: '#c4d4e8',
          hemiGround: '#d4c8b8',
          hemiIntensity: 0.5,
          pointLights: [] as { pos: [number, number, number]; color: string; intensity: number; dist: number }[],
          fog: null as [number, string] | null,
        };
    }
  }, [mode]);

  return (
    <>
      {config.fog && <fog attach="fog" args={[config.fog[1], config.fog[0], config.fog[0] + 15]} />}
      <ambientLight intensity={config.ambient} color={config.ambientColor} />
      <directionalLight
        position={config.dirPos}
        intensity={config.dirIntensity}
        color={config.dirColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-bias={-0.0005}
      />
      {config.dir2Intensity > 0 && (
        <directionalLight
          position={config.dir2Pos ?? [-5, 10, -5]}
          intensity={config.dir2Intensity}
          color={config.dir2Color ?? config.dirColor}
        />
      )}
      <hemisphereLight args={[config.hemiSky, config.hemiGround, config.hemiIntensity]} />
      {config.pointLights.map((pl, i) => (
        <pointLight key={i} position={pl.pos} color={pl.color} intensity={pl.intensity} distance={pl.dist} decay={2} />
      ))}
    </>
  );
}

function SceneContent({
  viewMode,
  wallCutHeight,
  showCeiling,
  showDoorsOpen,
  showSpaceName,
  showTrafficLines,
  renderMode,
  layers,
  monochrome,
  resetCamera,
  lighting,
}: SceneContentProps) {
  const sceneData = useAppStore((s) => s.sceneData);
  const wallThickness = sceneData.wallThickness;
  const ceilingHeight = sceneData.ceilingHeight;
  const floorThickness = sceneData.floorThickness;
  const buildingLocked = layers.find((l) => l.id === 'building')?.locked ?? false;
  const interiorLocked = layers.find((l) => l.id === 'interior')?.locked ?? false;
  const p = useStylePalette();
  const walkthroughIndex = useAppStore((s) => s.walkthroughIndex);
  const setWalkthroughIndex = useAppStore((s) => s.setWalkthroughIndex);
  const activeSpaceId = useAppStore((s) => s.activeSpaceId);

  // 切换到漫游模式时重置到第一个视角点
  useEffect(() => {
    if (viewMode === 'walkthrough') {
      setWalkthroughIndex(0);
    }
  }, [viewMode]);

  const allRooms = sceneData.rooms;

  const wallColor = monochrome ? '#ffffff' : p.wall;
  const floorColor = monochrome ? '#ffffff' : p.floor;

  const isWalkthrough = viewMode === 'walkthrough';

  return (
    <>
      <R3FBridgeBinder />
      <CameraController viewMode={viewMode} resetCamera={resetCamera} walkthroughIndex={walkthroughIndex} activeSpaceId={activeSpaceId} />
      <ScaleReporter />
      <DragGhost />

      {isWalkthrough ? (
        // 漫游模式: 第一人称视角控制 (位置固定, 仅旋转朝向; 点击切换下一个视角点)
        <WalkthroughLook walkthroughIndex={walkthroughIndex} setWalkthroughIndex={setWalkthroughIndex} activeSpaceId={activeSpaceId} />
      ) : (
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          target={[CENTER_X, 0, CENTER_Z]}
          minDistance={4}
          maxDistance={50}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          mouseButtons={{
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.PAN,
            RIGHT: THREE.MOUSE.PAN,
          }}
        />
      )}

      {/* 光照 */}
      <Lighting mode={lighting} />

      {/* 地面网格 */}
      <Grid
        position={[0, -floorThickness - 0.01, 0]}
        args={[40, 40]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#d0d0d0"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#b0b0b0"
        fadeDistance={30}
        fadeStrength={1}
        infiniteGrid
      />

      {/* 房间渲染 */}
      {allRooms.map((room) => {
        // 计算房间中心
        const xs = room.walls.flatMap((w) => [w.start[0], w.end[0]]);
        const zs = room.walls.flatMap((w) => [w.start[1], w.end[1]]);
        const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
        const centerZ = (Math.min(...zs) + Math.max(...zs)) / 2;
        const labelHeight = ceilingHeight + 0.6;

        return (
        <group key={room.id}>
          {/* 建筑结构层 — 锁定时不可选中 */}
          {/* @ts-ignore pointerEvents 是 R3F 运行时支持的属性 */}
          <group pointerEvents={buildingLocked ? 'none' : 'auto'}>
            <Building
              room={room}
              wallThickness={wallThickness}
              floorThickness={floorThickness}
              ceilingHeight={ceilingHeight}
              wallColor={wallColor}
              floorColor={floorColor}
              cutHeight={viewMode === 'plan' ? 0.01 : wallCutHeight}
              showCeiling={showCeiling && viewMode !== 'top' && viewMode !== 'plan'}
              doorsOpen={showDoorsOpen}
              monochrome={monochrome}
            />
          </group>
          {/* 室内设计层 — 锁定时不可选中 */}
          {/* @ts-ignore pointerEvents 是 R3F 运行时支持的属性 */}
          <group pointerEvents={interiorLocked ? 'none' : 'auto'}>
            <FurnitureGroup items={room.furniture} />
          </group>
          {showSpaceName && (
            <Text
              position={[centerX, labelHeight, centerZ]}
              fontSize={0.55}
              color="#666666"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.02}
              outlineColor="#ffffff"
            >
              {room.name}
            </Text>
          )}
        </group>
        );
      })}

      {/* 交通动线 — 连接各空间的行走路径 */}
      {showTrafficLines && (
        <group>
          <Line
            points={WALKTHROUGH_POINTS.map((p) => [p.position[0], 0.05, p.position[2]] as [number, number, number])}
            color="#3b82f6"
            lineWidth={3}
            dashed
            dashSize={0.4}
            gapSize={0.25}
          />
          {WALKTHROUGH_POINTS.map((p, i) => (
            <mesh key={`tp-${i}`} position={[p.position[0], 0.06, p.position[2]]}>
              <sphereGeometry args={[0.12, 16, 16]} />
              <meshStandardMaterial color="#3b82f6" emissive="#1e40af" emissiveIntensity={0.3} />
            </mesh>
          ))}
        </group>
      )}
    </>
  );
}

export function Scene() {
  const {
    viewMode,
    viewSettings,
    renderMode,
    layers,
    styles,
    designStyleId,
    resetCamera,
    selectFurniture,
    selectStructure,
    sceneData,
    draggingFurniture,
    setDraggingFurniture,
    setDragGhostPos,
    addFurniture,
  } = useAppStore();

  const activeStyle = styles.find((s) => s.id === designStyleId);
  const monochrome = designStyleId === 'base';

  // 背景色随光影和渲染模式变化
  const bgColor = useMemo(() => {
    if (renderMode === 'arctic') return '#e8e8e8';
    switch (viewSettings.lighting) {
      case '夜景': return '#1a2030';
      case '黄昏': return '#6a5040';
      case '阴天': return '#c8cdd2';
      default: return '#f0ece4';
    }
  }, [renderMode, viewSettings.lighting]);

  // === 拖拽处理 ===
  // onDragOver: raycast 计算地板位置, 更新 ghost 预览
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!draggingFurniture) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const floor = screenToFloor(e.clientX, e.clientY);
    if (floor) {
      const [sx, sz] = snapToGrid(floor[0], floor[1]);
      setDragGhostPos([sx, sz]);
    }
  }, [draggingFurniture, setDragGhostPos]);

  // onDrop: 在 ghost 位置放置家具
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!draggingFurniture) return;
    const floor = screenToFloor(e.clientX, e.clientY);
    if (!floor) {
      setDraggingFurniture(null);
      setDragGhostPos(null);
      return;
    }
    const [sx, sz] = snapToGrid(floor[0], floor[1]);
    // 检查是否在房间内
    const roomId = findRoomAt(sx, sz, sceneData.rooms);
    if (roomId) {
      const newFurniture: Furniture = {
        id: `f-drag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: draggingFurniture.name,
        position: [sx, 0, sz],
        rotation: 0,
        size: draggingFurniture.size,
        type: draggingFurniture.type,
        color: draggingFurniture.color,
      };
      addFurniture(roomId, newFurniture);
    }
    setDraggingFurniture(null);
    setDragGhostPos(null);
  }, [draggingFurniture, sceneData, setDraggingFurniture, setDragGhostPos, addFurniture]);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{ fov: 50, near: 0.1, far: 500, position: [CENTER_X + 9, 13, CENTER_Z + 9] }}
      style={{ width: '100%', height: '100%', background: bgColor, touchAction: 'none' }}
      onPointerMissed={() => { selectFurniture(null); selectStructure(null); }}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => { if (e.button === 2) e.nativeEvent.preventDefault(); }}
      onPointerMove={(e) => { if (e.buttons === 2) e.nativeEvent.preventDefault(); }}
      onMouseDown={(e) => { if (e.button === 2) e.preventDefault(); }}
      onMouseMove={(e) => { if (e.buttons === 2) e.preventDefault(); }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Suspense fallback={null}>
        <DisableBrowserGestures />
        <color attach="background" args={[bgColor]} />
        <SceneContent
          viewMode={viewMode}
          wallCutHeight={viewSettings.wallCutHeight}
          showCeiling={viewSettings.showCeiling}
          showDoorsOpen={viewSettings.showDoorsOpen}
          showSpaceName={viewSettings.showSpaceName}
          showTrafficLines={viewSettings.showTrafficLines}
          renderMode={renderMode}
          layers={layers}
          spaces={[]}
          monochrome={monochrome}
          resetCamera={resetCamera}
          lighting={viewSettings.lighting}
        />
      </Suspense>
    </Canvas>
  );
}
