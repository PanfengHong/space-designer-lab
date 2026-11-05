import { useMemo, useEffect, useRef, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Text, Line } from '@react-three/drei';
import { useShallow } from 'zustand/react/shallow';
import * as THREE from 'three';
import { Building } from './Building';
import { RoomCeilingLights } from './building/CeilingLight';
import { FurnitureGroup } from './Furniture';
import { FurnitureTransformController } from './FurnitureTransform';
import { FurnitureToolbar, HudAnchorReporter } from './FurnitureToolbar';
import { WallLengthHud, WallLengthReporter } from './WallLengthHud';
import { R3FBridgeBinder } from './DragDrop';
import { useAppStore } from '../../../store/useAppStore';
import { useStylePalette } from '../../../constants/styles';
import { findRoomAt } from '../../../utils/r3fBridge';
import { buildIndoorColliders, checkIndoorPlacement, type IndoorColliders } from '../../../utils/collision';
import { resolveStructureDrop, structureGhostSize } from '../../../utils/structurePlacement';
import { inferDevice } from '../../../utils/device';
import { BaseScene } from '../engine/BaseScene';
import type { ViewMode, CameraPreset, LightingModeConfig, GridConfig, WalkPoint } from '../engine/types';
import type { ModelLayer, Furniture } from '../../../types';

// 户型中心坐标 (总宽9.5m, 总深12.2m含阳台)
const CENTER_X = 4.75;
const CENTER_Z = 6.1;

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
  /** 室内照明模式 (自然光 / 人造光 / 阴天 / 夜景 / 黄昏) — 决定吸顶灯是否点亮 */
  lighting: string;
  layers: ModelLayer[];
  monochrome: boolean;
  /** 占位碰撞体, 由 Scene 统一构建后下发, 避免重复计算 */
  colliders: IndoorColliders;
  /** 运行态: 关掉所有编辑 affordance (拖拽手柄 / 长度标签 / 结构拾取) */
  runtime: boolean;
}

/**
 * 相机聚焦动画 — 两个来源:
 *   1. 选中空间 (点空间名): 相机平滑移动到该房间中心上方;
 *   2. 空间目录里点具体元素 (墙/门/窗/家具): 相机飞到该元素上方 (cameraFocus, 带 nonce)。
 * 基础视图切换/重置由 BaseScene 的 EngineCameraController 负责
 */
function SpaceFocusController({ viewMode, activeSpaceId }: { viewMode: string; activeSpaceId: string | null }) {
  const { camera, controls } = useThree() as { camera: THREE.Camera; controls: any };
  const sceneRooms = useAppStore((s) => s.sceneData.rooms);
  const cameraFocus = useAppStore((s) => s.cameraFocus);

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

  // 已消费的请求 nonce: 挂载前就存在的请求视为已消费; 消费后即使重算 (切视图模式) 也不重放
  const consumedRef = useRef(cameraFocus?.nonce ?? 0);

  /**
   * 元素聚焦: 视距比房间聚焦近一档 —— 点的是单件家具/一段墙, 拉到房间高度就看不清了。
   * plan 模式 3D 画布整体卸载, 这里返回 null 不消费。
   */
  const elementTarget = useMemo<{ pos: [number, number, number]; tgt: [number, number, number] } | null>(() => {
    if (!cameraFocus || cameraFocus.nonce === consumedRef.current) return null;
    const { x, z } = cameraFocus;
    switch (viewMode) {
      case 'plan':
        return null;
      case 'top':
        return { pos: [x, 12, z], tgt: [x, 0, z] };
      case 'axonometric':
        return { pos: [x + 4, 6.5, z + 4], tgt: [x, 0.4, z] };
      case 'walkthrough':
        return { pos: [x, 1.6, z], tgt: [x, 1.2, z] };
      default:
        return { pos: [x + 3.2, 4.5, z + 3.2], tgt: [x, 0.5, z] };
    }
  }, [cameraFocus, viewMode]);

  const posRef = useRef(new THREE.Vector3());
  const lookRef = useRef(new THREE.Vector3());
  const focusingRef = useRef(false);

  useEffect(() => {
    if (!focusTarget) return;
    posRef.current.set(...focusTarget.pos);
    lookRef.current.set(...focusTarget.tgt);
    focusingRef.current = true;
  }, [focusTarget]);

  useEffect(() => {
    if (!elementTarget || !cameraFocus) return;
    consumedRef.current = cameraFocus.nonce;
    posRef.current.set(...elementTarget.pos);
    lookRef.current.set(...elementTarget.tgt);
    focusingRef.current = true;
  }, [elementTarget, cameraFocus]);

  useFrame(() => {
    if (viewMode === 'walkthrough') return;
    if (!focusingRef.current) return;
    const lerpFactor = 0.12;
    camera.position.lerp(posRef.current, lerpFactor);
    if (controls) {
      controls.target.lerp(lookRef.current, lerpFactor);
      controls.update();
    }
    if (camera.position.distanceTo(posRef.current) < 0.05) {
      camera.position.copy(posRef.current);
      if (controls) controls.target.copy(lookRef.current);
      focusingRef.current = false;
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

/* ==================== 室内场景配置常量 ==================== */
// 取景距离说明: 主户型平面 11.5×12.2m, 中心约在 (CENTER_X, CENTER_Z)。
// 原来透视离中心 ~18.2m、轴测 ~21.4m, 模型上下几乎顶满画面, 显得很"近";
// 现统一退到 ~24.4m / ~25.5m, 模型约占画面高度 6 成, 四周留出余量。
// 只放大"相机到中心"的距离、方位角与仰角不变, 所以构图角度不变, 只是整体退远;
// 轴测原来比透视远 18% 导致显得更小, 这里把两者距离拉平。
const INDOOR_CAMERA_PRESETS: Record<ViewMode, CameraPreset> = {
  perspective: { position: [CENTER_X + 9, 13, CENTER_Z + 9], target: [CENTER_X, 0, CENTER_Z] },
  axonometric: { position: [CENTER_X + 10, 16, CENTER_Z + 10], target: [CENTER_X, 0, CENTER_Z] },
  top:         { position: [CENTER_X, 25, CENTER_Z], target: [CENTER_X, 0, CENTER_Z] },
  plan:        { position: [CENTER_X, 25, CENTER_Z + 0.01], target: [CENTER_X, 0, CENTER_Z] },
  walkthrough: { position: WALKTHROUGH_POINTS[0].position, target: WALKTHROUGH_POINTS[0].target },
};

const INDOOR_LIGHTING_CONFIGS: Record<string, LightingModeConfig> = {
  // 自然光照: 阳光是主光 (约 50° 斜射, 从窗侧照进房间, 地面上留下墙体/家具投影),
  //   ambient / hemi / IBL 只做补光 —— 补光一高, 方向感就被冲平, 画面发白
  自然光照: { ambient: 0.08, ambientColor: '#e6edf6', dirIntensity: 2.3, dirColor: '#ffe6b8', dirPos: [13, 16, 10], dir2Intensity: 0.14, dir2Color: '#cfe0f2', dir2Pos: [-9, 8, -7], hemiSky: '#d3e4f5', hemiGround: '#c8c0b0', hemiIntensity: 0.22, pointLights: [], fog: null, envIntensity: 0.2, shadowCameraRange: 20 },
  人造光: { ambient: 0.1, ambientColor: '#ffe9cc', dirIntensity: 0.03, dirColor: '#ffffff', dirPos: [10, 15, 10], dir2Intensity: 0, hemiSky: '#2e2e33', hemiGround: '#232326', hemiIntensity: 0.08, pointLights: [
    { pos: [CENTER_X + 2, 2.4, CENTER_Z + 2], color: '#ffe8cc', intensity: 2.2, dist: 10 },
    { pos: [CENTER_X - 2, 2.4, CENTER_Z - 2], color: '#ffe8cc', intensity: 2.2, dist: 10 },
    { pos: [CENTER_X + 2, 2.4, CENTER_Z - 2], color: '#ffe8cc', intensity: 1.9, dist: 10 },
    { pos: [CENTER_X - 2, 2.4, CENTER_Z + 2], color: '#ffe8cc', intensity: 1.9, dist: 10 },
  ], fog: null, envIntensity: 0.1 },
  // 阴天: 唯一应该"平"的模式 —— 天空漫射为主, 没有明确投影
  阴天:   { ambient: 0.28, ambientColor: '#d3d8dd', dirIntensity: 0.25, dirColor: '#c8cdd2', dirPos: [0, 20, 5], dir2Intensity: 0.1, hemiSky: '#b8bcc0', hemiGround: '#a0a4a8', hemiIntensity: 0.55, pointLights: [], fog: null, envIntensity: 0.7 },
  // 夜景: 房间整体压黑, 光只来自"真实光源" —
  //   dir  = 月光 (冷蓝、斜射, 透过剖切/窗口在地面投出光斑与阴影)
  //   dir2 = 地面/物件的一次反射补光 (极弱, 让黑部不至于死黑)
  //   IBL 几乎关掉。吸顶灯不强制点亮, 进入夜景时也会把已开的灯全部关掉
  夜景:   { ambient: 0.09, ambientColor: '#1a2742', dirIntensity: 2.4, dirColor: '#a8c4ec', dirPos: [-5, 16, -3.5], dir2Intensity: 0.14, dir2Color: '#3b5a86', dir2Pos: [9, 4, 10], hemiSky: '#12203a', hemiGround: '#22334f', hemiIntensity: 0.45, pointLights: [], fog: [40, '#0a0f19'], envIntensity: 0.04, shadowCameraRange: 20 },
  黄昏:   { ambient: 0.12, ambientColor: '#d8c8b8', dirIntensity: 1.8, dirColor: '#ff9a52', dirPos: [16, 4.5, 10], dir2Intensity: 0.16, dir2Color: '#8aa8c8', dir2Pos: [-9, 8, -7], hemiSky: '#c8a890', hemiGround: '#5a4530', hemiIntensity: 0.3, pointLights: [], fog: [40, '#9a8068'], envIntensity: 0.25, shadowCameraRange: 20 },
};

const INDOOR_GRID_CONFIG: GridConfig = {
  position: [0, -0.3 - 0.01, 0],
  args: [40, 40],
  cellSize: 1,
  sectionSize: 5,
  cellColor: '#d0d0d0',
  sectionColor: '#b0b0b0',
  fadeDistance: 30,
  infiniteGrid: true,
};

const INDOOR_WALK_POINTS: WalkPoint[] = WALKTHROUGH_POINTS;

function SceneContent({
  viewMode,
  wallCutHeight,
  showCeiling,
  showDoorsOpen,
  showSpaceName,
  showTrafficLines,
  lighting,
  layers,
  monochrome,
  colliders,
  runtime,
}: SceneContentProps) {
  const sceneData = useAppStore((s) => s.sceneData);
  const wallThickness = sceneData.wallThickness;
  const ceilingHeight = sceneData.ceilingHeight;
  const floorThickness = sceneData.floorThickness;
  const buildingLocked = runtime || (layers.find((l) => l.id === 'building')?.locked ?? false);
  // 室内层锁定不再用 pointerEvents 整组禁用: 锁定时仍要能点开设备面板,
  // 编辑行为由 FurnitureItem 内部按 interiorLocked 拦截
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
  // 人造光: 吸顶灯全亮。自然光/夜景不点灯 —— 夜景只有月光, 灯罩保持熄灭 (自发光 0)
  const lampLit = lighting === '人造光';
  const lampGlow = lampLit ? 1 : lighting === '夜景' ? 0 : 0.45;
  const updateDevice = useAppStore((s) => s.updateDevice);

  // 切到夜景 = 关掉所有已开的设备灯 (只清 on, 不动温度/开合等参数),
  // 房间只留月光。切回来不自动开灯, 由用户自己点。
  useEffect(() => {
    if (lighting !== '夜景') return;
    const devices = useAppStore.getState().devices;
    Object.keys(devices).forEach((id) => {
      if (devices[id]?.on) updateDevice(id, { on: false });
    });
  }, [lighting, updateDevice]);

  return (
    <>
      {/* 运行态不挂任何编辑辅助: 拖拽桥 / 变换手柄 / 工具条锚点 / 墙长标签 */}
      {!runtime && (
        <>
          <R3FBridgeBinder />
          <SpaceFocusController viewMode={viewMode} activeSpaceId={activeSpaceId} />
          {/* 选中家具的拖拽移动 / 旋转手柄 + 就近工具条锚点 */}
          <FurnitureTransformController colliders={colliders} />
          <HudAnchorReporter />
          {/* 墙体端点拖拽时的实时长度标签 (每帧直写 DOM, 不走 React) */}
          <WallLengthReporter />
        </>
      )}

      {isWalkthrough && (
        <WalkthroughLook walkthroughIndex={walkthroughIndex} setWalkthroughIndex={setWalkthroughIndex} activeSpaceId={activeSpaceId} />
      )}

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
          {/* 吸顶灯 — 独立于建筑结构层渲染, 层锁定时依然点得开设备面板 */}
          <RoomCeilingLights
            room={room}
            ceilingHeight={ceilingHeight}
            cutHeight={viewMode === 'plan' ? 0.01 : wallCutHeight}
            baseIntensity={lampGlow}
            monochrome={monochrome}
          />
          {/* 室内设计层 — 锁定时不可编辑, 但设备仍可点击控制 (见 FurnitureItem) */}
          {/* @ts-ignore pointerEvents 是 R3F 运行时支持的属性 */}
          <group pointerEvents="auto">
            <FurnitureGroup items={room.furniture} roomId={room.id} readOnly={runtime} />
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

export function Scene({ runtime = false }: { runtime?: boolean } = {}) {
  // 按字段订阅, 避免拖拽等高频 store 更新触发整个场景树重渲染 (导致高亮框跟不上鼠标)
  const {
    viewMode,
    viewSettings,
    renderMode,
    layers,
    designStyleId,
    resetCamera,
    selectFurniture,
    selectStructure,
    selectDevice,
    sceneData,
    draggingFurniture,
    setDraggingFurniture,
    addFurniture,
    draggingStructure,
    setDraggingStructure,
    addStructure,
  } = useAppStore(useShallow((s) => ({
    viewMode: s.viewMode,
    viewSettings: s.viewSettings,
    renderMode: s.renderMode,
    layers: s.layers,
    designStyleId: s.designStyleId,
    resetCamera: s.resetCamera,
    selectFurniture: s.selectFurniture,
    selectStructure: s.selectStructure,
    selectDevice: s.selectDevice,
    sceneData: s.sceneData,
    draggingFurniture: s.draggingFurniture,
    setDraggingFurniture: s.setDraggingFurniture,
    addFurniture: s.addFurniture,
    draggingStructure: s.draggingStructure,
    setDraggingStructure: s.setDraggingStructure,
    addStructure: s.addStructure,
  })));

  const monochrome = designStyleId === 'base';

  const bgColor = useMemo(() => {
    if (renderMode === 'arctic') return '#e8e8e8';
    switch (viewSettings.lighting) {
      case '夜景': return '#0b111e';
      case '黄昏': return '#6a5040';
      case '阴天': return '#cfd4d8';
      default: return '#e2e7ec';
    }
  }, [renderMode, viewSettings.lighting]);

  // 拖拽高亮框由 BaseScene 的 EngineDragGhost 直接写入 three 对象位置 (不经过 React),
  // 这里不再写 store, 否则每次 dragover 都会触发全场景重渲染导致高亮框滞后于鼠标

  // 占位碰撞体 (墙体 + 已有家具 + 房间范围) — 仅在场景数据变化时重建
  const colliders = useMemo(() => buildIndoorColliders(sceneData), [sceneData]);

  // 落点校验: 房间范围 / 家具互压 / 墙体重叠, 返回原因用于画布提示
  // 建筑结构元素 (墙体/门窗) 走另一套校验: 门窗会返回吸附到墙面后的 snap
  const dragValidatorDetailed = useCallback(
    (x: number, z: number) => {
      if (draggingStructure) {
        const r = resolveStructureDrop(sceneData, draggingStructure, x, z);
        return { ok: r.ok, reason: r.reason, snap: r.snap };
      }
      if (!draggingFurniture) return { ok: false, reason: '未选中素材' };
      return checkIndoorPlacement(colliders, draggingFurniture, x, z);
    },
    [colliders, draggingFurniture, draggingStructure, sceneData],
  );

  // 预览框尺寸/偏移: 家具局部 +X = size[2], +Z = size[0] (与落位后的实际占地方向一致)
  // 淋浴间 (四分之一圆) 从角点向 +X/+Z 展开, 几何体不居中 → 预览框同步偏移
  const dragGhost = useMemo(() => {
    const st = draggingStructure;
    if (st) {
      return {
        size: structureGhostSize(st, sceneData.ceilingHeight),
        offset: null as [number, number] | null,
      };
    }
    const f = draggingFurniture;
    if (!f) {
      return {
        size: null as [number, number, number] | null,
        offset: null as [number, number] | null,
      };
    }
    const [w, h, d] = f.size;
    if (f.type === 'shower') {
      return { size: [w, h, w] as [number, number, number], offset: [w / 2, w / 2] as [number, number] };
    }
    return { size: [d, h, w] as [number, number, number], offset: null };
  }, [draggingFurniture, draggingStructure, sceneData.ceilingHeight]);

  const handleDrop = useCallback((x: number, z: number) => {
    // 结构元素: 复用与预览完全相同的解析, 保证"看到哪里就放到哪里"
    if (draggingStructure) {
      const r = resolveStructureDrop(sceneData, draggingStructure, x, z);
      if (r.ok && r.roomId && r.payload) addStructure(r.roomId, r.payload);
      return;
    }
    if (!draggingFurniture) return;
    const roomId = findRoomAt(x, z, sceneData.rooms);
    if (roomId) {
      const newFurniture: Furniture = {
        id: `f-drag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: draggingFurniture.name,
        position: [x, 0, z],
        rotation: 0,
        size: draggingFurniture.size,
        type: draggingFurniture.type,
        color: draggingFurniture.color,
        // 拖入即带设备身份 (空调/窗帘/冰箱/电视/落地灯), 之后点击就能调出控制面板
        device: inferDevice(draggingFurniture.type, draggingFurniture.size),
      };
      addFurniture(roomId, newFurniture);
    }
  }, [draggingFurniture, draggingStructure, sceneData, addFurniture, addStructure]);

  const handleDragEnd = useCallback(() => {
    setDraggingFurniture(null);
    setDraggingStructure(null);
  }, [setDraggingFurniture, setDraggingStructure]);
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <BaseScene
        center={[CENTER_X, 0, CENTER_Z]}
        onPointerMissed={() => {
          selectFurniture(null);
          if (runtime) {
            selectDevice(null);
            return;
          }
          selectStructure(null);
          selectDevice(null);
        }}
        viewMode={viewMode as ViewMode}
        resetCamera={resetCamera}
        cameraPresets={INDOOR_CAMERA_PRESETS}
        walkPoints={INDOOR_WALK_POINTS}
        lighting={viewSettings.lighting}
        lightingConfigs={INDOOR_LIGHTING_CONFIGS}
        /* 室内关掉 PCSS 软阴影: 默认 8 采样在低角度阳光的大斜面上会抖出密集噪点,
           看起来像蒙了层灰白脏点。改用高分辨率 PCF, 投影边界干净, 更像真实日照 */
        softShadow={false}
        grid={INDOOR_GRID_CONFIG}
        background={bgColor}
        enableDrag={!runtime}
        dragSize={dragGhost.size}
        dragOffset={dragGhost.offset}
        dragValidatorDetailed={dragValidatorDetailed}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
      >
        <SceneContent
          viewMode={viewMode}
          wallCutHeight={viewSettings.wallCutHeight}
          showCeiling={viewSettings.showCeiling}
          showDoorsOpen={viewSettings.showDoorsOpen}
          showSpaceName={viewSettings.showSpaceName}
          showTrafficLines={viewSettings.showTrafficLines}
          lighting={viewSettings.lighting}
          layers={layers}
          monochrome={monochrome}
          colliders={colliders}
          runtime={runtime}
        />
      </BaseScene>
      {!runtime && (
        <>
          {/* 就近工具条: 悬浮于选中家具上方, 位置由 HudAnchorReporter 每帧投影写入 */}
          <FurnitureToolbar />
          {/* 墙体端点拖拽时的实时长度标签 */}
          <WallLengthHud />
        </>
      )}
    </div>
  );
}
