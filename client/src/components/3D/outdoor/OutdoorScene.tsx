import { useMemo, useEffect, useRef, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../../store/useAppStore';
import { R3FBridgeBinder } from '../indoor/DragDrop';
import { BaseScene } from '../engine/BaseScene';
import type { ViewMode, CameraPreset, LightingModeConfig, GridConfig, WalkPoint } from '../engine/types';
import { GroundItemsGroup, GroundItemContent } from './GroundItems';
import { OutdoorObjectsGroup, OutdoorObjectContent } from './OutdoorObjects';
import { useOutdoorPalette } from '../../../constants/outdoorStyles';
import type { ModelLayer, GroundItem, OutdoorObject, GroundItemType, OutdoorObjectType } from '../../../types';

// 户外场景中心
const CENTER_X = 0;
const CENTER_Z = 0;

// 户外漫游视点 (眼高 1.6m, 位于西侧入口路附近)
const WALK_POS: [number, number, number] = [-24, 1.6, 10];
const WALK_INIT_YAW = Math.PI / 4; // 朝向东南 (+X -Z)

/** 计算点是否在任一 type=ground 基座范围内 */
function isInsideGround(x: number, z: number, ground: GroundItem[]): boolean {
  return ground.some((g) => {
    if (g.type !== 'ground') return false;
    const hw = g.size[0] / 2;
    const hd = g.size[2] / 2;
    return x >= g.position[0] - hw && x <= g.position[0] + hw
      && z >= g.position[2] - hd && z <= g.position[2] + hd;
  });
}

/**
 * 户外漫游 — 位置固定, 左键拖拽环视 360°
 */
function OutdoorWalkthroughLook() {
  const { camera, gl } = useThree() as { camera: THREE.PerspectiveCamera; gl: THREE.WebGLRenderer };
  const yawRef = useRef(WALK_INIT_YAW);
  const pitchRef = useRef(0);
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);

  const updateCamera = useCallback(() => {
    const yaw = yawRef.current;
    const pitch = pitchRef.current;
    const target: [number, number, number] = [
      WALK_POS[0] + Math.sin(yaw) * Math.cos(pitch),
      WALK_POS[1] + Math.sin(pitch),
      WALK_POS[2] - Math.cos(yaw) * Math.cos(pitch),
    ];
    camera.position.set(...WALK_POS);
    camera.lookAt(...target);
  }, [camera]);

  useEffect(() => {
    updateCamera();
  }, [updateCamera]);

  useEffect(() => {
    const dom = gl.domElement;
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
    const onPointerUp = () => { draggingRef.current = false; };
    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);
    return () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', onPointerUp);
    };
  }, [gl, updateCamera]);

  return null;
}

/* ==================== 户外场景配置常量 ==================== */
const OUTDOOR_CAMERA_PRESETS: Record<ViewMode, CameraPreset> = {
  perspective: { position: [42, 40, 48], target: [0, 0, 0] },
  axonometric: { position: [48, 52, 48], target: [0, 0, 0] },
  top:         { position: [0.01, 115, 0.01], target: [0, 0, 0] },
  plan:        { position: [0.01, 115, 0.02], target: [0, 0, 0] },
  walkthrough: { position: WALK_POS, target: [8, 1.6, -12] },
};

const OUTDOOR_LIGHTING_CONFIGS: Record<string, LightingModeConfig> = {
  自然光: { ambient: 0.72, ambientColor: '#ffffff', dirIntensity: 0.85, dirColor: '#fffef0', dirPos: [28, 42, 20], dir2Intensity: 0.25, dir2Color: '#c8daf0', dir2Pos: [-20, 25, -18], hemiSky: '#cfe2f5', hemiGround: '#dde4d8', hemiIntensity: 0.55, pointLights: [], fog: null, shadowCameraRange: 45 },
  人造光: { ambient: 0.35, ambientColor: '#fff5e6', dirIntensity: 0.15, dirColor: '#ffe8cc', dirPos: [28, 42, 20], dir2Intensity: 0, hemiSky: '#3a3a48', hemiGround: '#2a2a30', hemiIntensity: 0.2, pointLights: [], fog: [70, '#2a3040'], shadowCameraRange: 45 },
  阴天:   { ambient: 0.65, ambientColor: '#d0d4d8', dirIntensity: 0.25, dirColor: '#c8cdd2', dirPos: [28, 42, 20], dir2Intensity: 0, hemiSky: '#b8bcc0', hemiGround: '#a0a4a8', hemiIntensity: 0.7, pointLights: [], fog: null, shadowCameraRange: 45 },
  夜景:   { ambient: 0.2, ambientColor: '#3a4868', dirIntensity: 0.4, dirColor: '#c8d8f0', dirPos: [28, 42, 20], dir2Intensity: 0, hemiSky: '#1a2a48', hemiGround: '#0e1428', hemiIntensity: 0.35, pointLights: [], fog: [90, '#1a2030'], shadowCameraRange: 45 },
  黄昏:   { ambient: 0.32, ambientColor: '#d8c8b8', dirIntensity: 1.05, dirColor: '#ffa060', dirPos: [28, 42, 20], dir2Intensity: 0, hemiSky: '#c8a890', hemiGround: '#5a4530', hemiIntensity: 0.45, pointLights: [], fog: [110, '#9a8068'], shadowCameraRange: 45 },
};

const OUTDOOR_GRID_CONFIG: GridConfig = {
  position: [0, -0.16, 0],
  args: [120, 120],
  cellSize: 2,
  sectionSize: 10,
  cellColor: '#d4dee8',
  sectionColor: '#b8c8d8',
  fadeDistance: 160,
  infiniteGrid: true,
};

const OUTDOOR_WALK_POINTS: WalkPoint[] = [
  { position: WALK_POS, target: [8, 1.6, -12] },
];

/** 元素名称标签 */
function OutdoorLabels() {
  const outdoorSceneData = useAppStore((s) => s.outdoorSceneData);
  return (
    <group>
      {outdoorSceneData.objects.map((o) => (
        <Text
          key={`lb-${o.id}`}
          position={[o.position[0], o.position[1] + o.size[1] + 0.6, o.position[2]]}
          fontSize={0.9}
          color="#4a627a"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#ffffff"
        >
          {o.name}
        </Text>
      ))}
      {outdoorSceneData.ground.filter((g) => g.type !== 'ground').map((g) => (
        <Text
          key={`lg-${g.id}`}
          position={[g.position[0], g.position[1] + 0.6, g.position[2]]}
          fontSize={0.8}
          color="#5a7088"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#ffffff"
        >
          {g.name}
        </Text>
      ))}
    </group>
  );
}

function OutdoorSceneContent({ viewMode, layers, showLabels }: { viewMode: string; layers: ModelLayer[]; showLabels: boolean }) {
  const groundItems = useAppStore((s) => s.outdoorSceneData.ground);
  const objects = useAppStore((s) => s.outdoorSceneData.objects);
  const groundLocked = layers.find((l) => l.id === 'ground')?.locked ?? true;
  const spaceLocked = layers.find((l) => l.id === 'space')?.locked ?? true;
  const isWalkthrough = viewMode === 'walkthrough';

  return (
    <>
      <R3FBridgeBinder />
      {isWalkthrough && <OutdoorWalkthroughLook />}

      {/* 地面结构层 */}
      {/* @ts-ignore pointerEvents 是 R3F 运行时支持的属性 */}
      <group pointerEvents={groundLocked ? 'none' : 'auto'}>
        <GroundItemsGroup items={groundItems} />
      </group>

      {/* 空间设计层 */}
      {/* @ts-ignore pointerEvents 是 R3F 运行时支持的属性 */}
      <group pointerEvents={spaceLocked ? 'none' : 'auto'}>
        <OutdoorObjectsGroup items={objects} />
      </group>

      {showLabels && <OutdoorLabels />}
    </>
  );
}

export function OutdoorScene() {
  const {
    viewMode,
    viewSettings,
    layers,
    resetCamera,
    selectGround,
    selectOutdoorObject,
    outdoorSceneData,
    draggingOutdoor,
    setDraggingOutdoor,
    setOutdoorDragGhostPos,
    addGroundItem,
    addOutdoorObject,
  } = useAppStore();

  const bgColor = useMemo(() => {
    switch (viewSettings.lighting) {
      case '夜景': return '#1a2030';
      case '黄昏': return '#8aa6c4';
      case '阴天': return '#cdd4dc';
      default: return '#dceaf6';
    }
  }, [viewSettings.lighting]);

  const handleDragOver = useCallback((x: number, z: number) => {
    setOutdoorDragGhostPos([x, z]);
  }, [setOutdoorDragGhostPos]);

  const handleDrop = useCallback((x: number, z: number) => {
    if (!draggingOutdoor) return;
    if (isInsideGround(x, z, outdoorSceneData.ground)) {
      const id = `o-drag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      if (draggingOutdoor.kind === 'ground') {
        const yMap: Record<GroundItemType, number> = { ground: 0, grass: 0.02, river: -0.1, road: 0.09, intersection: 0.09, ramp: 0, fence: 0, playground: 0.1 };
        const newItem: GroundItem = {
          id: `g-drag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: draggingOutdoor.name,
          type: draggingOutdoor.type as GroundItemType,
          position: [x, yMap[draggingOutdoor.type as GroundItemType] ?? 0, z],
          rotation: 0,
          size: draggingOutdoor.size,
          color: draggingOutdoor.color,
        };
        addGroundItem(newItem);
      } else {
        const newObj: OutdoorObject = {
          id,
          name: draggingOutdoor.name,
          type: draggingOutdoor.type as OutdoorObjectType,
          position: [x, 0, z],
          rotation: 0,
          size: draggingOutdoor.size,
          color: draggingOutdoor.color,
        };
        addOutdoorObject(newObj);
      }
    }
  }, [draggingOutdoor, outdoorSceneData.ground, addGroundItem, addOutdoorObject]);

  const handleDragEnd = useCallback(() => {
    setDraggingOutdoor(null);
    setOutdoorDragGhostPos(null);
  }, [setDraggingOutdoor, setOutdoorDragGhostPos]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <BaseScene
        center={[0, 0, 0]}
        onPointerMissed={() => { selectGround(null); selectOutdoorObject(null); }}
        viewMode={viewMode as ViewMode}
        resetCamera={resetCamera}
        cameraPresets={OUTDOOR_CAMERA_PRESETS}
        walkPoints={OUTDOOR_WALK_POINTS}
        lighting={viewSettings.lighting}
        lightingConfigs={OUTDOOR_LIGHTING_CONFIGS}
        grid={OUTDOOR_GRID_CONFIG}
        background={bgColor}
        enableDrag
        dragSize={draggingOutdoor?.size ?? null}
        dragValidator={(x, z) => isInsideGround(x, z, outdoorSceneData.ground)}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
      >
        <OutdoorSceneContent
          viewMode={viewMode}
          layers={layers}
          showLabels={!!viewSettings.showLabels}
        />
      </BaseScene>
    </div>
  );
}

/** 户外素材缩略图渲染 (供素材库复用) */
const OBJECT_TYPE_SET = new Set<string>(['building', 'warehouse', 'car', 'truck', 'tree']);

export function OutdoorThumbnailContent({ item }: { item: GroundItem | OutdoorObject }) {
  const palette = useOutdoorPalette();
  if (OBJECT_TYPE_SET.has(item.type)) {
    return <OutdoorObjectContent data={item as OutdoorObject} palette={palette} />;
  }
  return <GroundItemContent data={item as GroundItem} palette={palette} />;
}
