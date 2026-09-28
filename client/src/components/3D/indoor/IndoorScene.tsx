import { useMemo, useEffect, useRef, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { Building } from './Building';
import { FurnitureGroup } from './Furniture';
import { R3FBridgeBinder } from './DragDrop';
import { useAppStore } from '../../../store/useAppStore';
import { useStylePalette } from '../../../constants/styles';
import { findRoomAt } from '../../../utils/r3fBridge';
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
  layers: ModelLayer[];
  monochrome: boolean;
}

/**
 * 空间聚焦动画 — 选中空间时, 相机平滑移动到该房间中心上方
 * 基础视图切换/重置由 BaseScene 的 EngineCameraController 负责
 */
function SpaceFocusController({ viewMode, activeSpaceId }: { viewMode: string; activeSpaceId: string | null }) {
  const { camera, controls } = useThree() as { camera: THREE.Camera; controls: any };
  const sceneRooms = useAppStore((s) => s.sceneData.rooms);

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

  const posRef = useRef(new THREE.Vector3());
  const lookRef = useRef(new THREE.Vector3());
  const focusingRef = useRef(false);

  useEffect(() => {
    if (!focusTarget) return;
    posRef.current.set(...focusTarget.pos);
    lookRef.current.set(...focusTarget.tgt);
    focusingRef.current = true;
  }, [focusTarget]);

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
const INDOOR_CAMERA_PRESETS: Record<ViewMode, CameraPreset> = {
  perspective: { position: [CENTER_X + 9, 13, CENTER_Z + 9], target: [CENTER_X, 0, CENTER_Z] },
  axonometric: { position: [CENTER_X + 10, 16, CENTER_Z + 10], target: [CENTER_X, 0, CENTER_Z] },
  top:         { position: [CENTER_X, 25, CENTER_Z], target: [CENTER_X, 0, CENTER_Z] },
  plan:        { position: [CENTER_X, 25, CENTER_Z + 0.01], target: [CENTER_X, 0, CENTER_Z] },
  walkthrough: { position: WALKTHROUGH_POINTS[0].position, target: WALKTHROUGH_POINTS[0].target },
};

const INDOOR_LIGHTING_CONFIGS: Record<string, LightingModeConfig> = {
  自然光: { ambient: 0.7, ambientColor: '#ffffff', dirIntensity: 0.8, dirColor: '#fffef0', dirPos: [10, 15, 10], dir2Intensity: 0.3, hemiSky: '#c4d4e8', hemiGround: '#d4c8b8', hemiIntensity: 0.5, pointLights: [], fog: null },
  人造光: { ambient: 0.25, ambientColor: '#fff5e6', dirIntensity: 0.05, dirColor: '#ffffff', dirPos: [10, 15, 10], dir2Intensity: 0, hemiSky: '#3a3a3a', hemiGround: '#2a2a2a', hemiIntensity: 0.15, pointLights: [
    { pos: [CENTER_X + 2, 2.4, CENTER_Z + 2], color: '#ffe8cc', intensity: 0.6, dist: 6 },
    { pos: [CENTER_X - 2, 2.4, CENTER_Z - 2], color: '#ffe8cc', intensity: 0.6, dist: 6 },
    { pos: [CENTER_X + 2, 2.4, CENTER_Z - 2], color: '#ffe8cc', intensity: 0.5, dist: 6 },
    { pos: [CENTER_X - 2, 2.4, CENTER_Z + 2], color: '#ffe8cc', intensity: 0.5, dist: 6 },
  ], fog: null },
  阴天:   { ambient: 0.6, ambientColor: '#d0d4d8', dirIntensity: 0.2, dirColor: '#c8cdd2', dirPos: [0, 20, 5], dir2Intensity: 0.15, hemiSky: '#b8bcc0', hemiGround: '#a0a4a8', hemiIntensity: 0.7, pointLights: [], fog: null },
  夜景:   { ambient: 0.18, ambientColor: '#3a4868', dirIntensity: 0.35, dirColor: '#c8d8f0', dirPos: [-8, 20, 6], dir2Intensity: 0, hemiSky: '#1a2a48', hemiGround: '#0e1428', hemiIntensity: 0.3, pointLights: [
    { pos: [CENTER_X + 2, 2.4, CENTER_Z + 2], color: '#ffe8cc', intensity: 0.5, dist: 6 },
    { pos: [CENTER_X - 2, 2.4, CENTER_Z - 2], color: '#ffe8cc', intensity: 0.5, dist: 6 },
  ], fog: [30, '#1a2030'] },
  黄昏:   { ambient: 0.28, ambientColor: '#d8c8b8', dirIntensity: 1.0, dirColor: '#ffa060', dirPos: [12, 3.5, 8], dir2Intensity: 0.3, dir2Color: '#a8c0d8', dir2Pos: [-8, 12, -6], hemiSky: '#c8a890', hemiGround: '#5a4530', hemiIntensity: 0.45, pointLights: [], fog: [40, '#9a8068'] },
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
  layers,
  monochrome,
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
      <SpaceFocusController viewMode={viewMode} activeSpaceId={activeSpaceId} />

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
    designStyleId,
    resetCamera,
    selectFurniture,
    selectStructure,
    sceneData,
    draggingFurniture,
    setDraggingFurniture,
    setDragGhostPos,
    dragGhostPos,
    addFurniture,
  } = useAppStore();

  const monochrome = designStyleId === 'base';

  const bgColor = useMemo(() => {
    if (renderMode === 'arctic') return '#e8e8e8';
    switch (viewSettings.lighting) {
      case '夜景': return '#1a2030';
      case '黄昏': return '#6a5040';
      case '阴天': return '#c8cdd2';
      default: return '#f0ece4';
    }
  }, [renderMode, viewSettings.lighting]);

  const handleDragOver = useCallback((x: number, z: number) => {
    setDragGhostPos([x, z]);
  }, [setDragGhostPos]);

  const handleDrop = useCallback((x: number, z: number) => {
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
      };
      addFurniture(roomId, newFurniture);
    }
  }, [draggingFurniture, sceneData.rooms, addFurniture]);

  const handleDragEnd = useCallback(() => {
    setDraggingFurniture(null);
    setDragGhostPos(null);
  }, [setDraggingFurniture, setDragGhostPos]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <BaseScene
        center={[CENTER_X, 0, CENTER_Z]}
        onPointerMissed={() => { selectFurniture(null); selectStructure(null); }}
        viewMode={viewMode as ViewMode}
        resetCamera={resetCamera}
        cameraPresets={INDOOR_CAMERA_PRESETS}
        walkPoints={INDOOR_WALK_POINTS}
        lighting={viewSettings.lighting}
        lightingConfigs={INDOOR_LIGHTING_CONFIGS}
        grid={INDOOR_GRID_CONFIG}
        background={bgColor}
        enableDrag
        dragSize={draggingFurniture?.size ?? null}
        dragGhostPos={dragGhostPos}
        dragValidator={(x, z) => !!findRoomAt(x, z, sceneData.rooms)}
        onDragOver={handleDragOver}
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
          layers={layers}
          monochrome={monochrome}
        />
      </BaseScene>
    </div>
  );
}
