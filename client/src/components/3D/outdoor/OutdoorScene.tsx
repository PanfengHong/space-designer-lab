import { useMemo, useEffect, useRef, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import { Text, ContactShadows } from '@react-three/drei';
import { useShallow } from 'zustand/react/shallow';
import * as THREE from 'three';
import { useAppStore } from '../../../store/useAppStore';
import { R3FBridgeBinder } from '../indoor/DragDrop';
import { BaseScene } from '../engine/BaseScene';
import type { ViewMode, CameraPreset, LightingModeConfig, GridConfig, WalkPoint } from '../engine/types';
import { GroundItemsGroup, GroundItemContent } from './GroundItems';
import { OutdoorObjectsGroup, OutdoorObjectContent } from './OutdoorObjects';
import { OutdoorTransformController } from './OutdoorTransform';
import { useOutdoorPalette } from '../../../constants/outdoorStyles';
import { buildOutdoorColliders, checkOutdoorPlacement, type OutdoorColliders } from '../../../utils/collision';
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
  /* 主光方位 (dirPos) 刻意与默认相机方位错开约 90°:
     原来的 [28,42,20] 几乎和相机同向, 阴影全部被物体自身挡住 (投影落在物体背后),
     视觉上就是"室外物体没有阴影"。现在改为侧逆光, 投影朝画面左前方展开。 */
  自然光: { ambient: 0.62, ambientColor: '#ffffff', dirIntensity: 1.15, dirColor: '#fffef0', dirPos: [34, 46, -30], dir2Intensity: 0.25, dir2Color: '#c8daf0', dir2Pos: [-20, 25, -18], hemiSky: '#cfe2f5', hemiGround: '#dde4d8', hemiIntensity: 0.45, pointLights: [], fog: null, shadowCameraRange: 55, shadowMapSize: 4096 },
  人造光: { ambient: 0.35, ambientColor: '#fff5e6', dirIntensity: 0.15, dirColor: '#ffe8cc', dirPos: [34, 46, -30], dir2Intensity: 0, hemiSky: '#3a3a48', hemiGround: '#2a2a30', hemiIntensity: 0.2, pointLights: [], fog: [70, '#2a3040'], shadowCameraRange: 55, shadowMapSize: 4096 },
  阴天:   { ambient: 0.65, ambientColor: '#d0d4d8', dirIntensity: 0.25, dirColor: '#c8cdd2', dirPos: [34, 46, -30], dir2Intensity: 0, hemiSky: '#b8bcc0', hemiGround: '#a0a4a8', hemiIntensity: 0.7, pointLights: [], fog: null, shadowCameraRange: 55, shadowMapSize: 4096 },
  夜景:   { ambient: 0.2, ambientColor: '#3a4868', dirIntensity: 0.4, dirColor: '#c8d8f0', dirPos: [34, 46, -30], dir2Intensity: 0, hemiSky: '#1a2a48', hemiGround: '#0e1428', hemiIntensity: 0.35, pointLights: [], fog: [90, '#1a2030'], shadowCameraRange: 55, shadowMapSize: 4096 },
  黄昏:   { ambient: 0.32, ambientColor: '#d8c8b8', dirIntensity: 1.05, dirColor: '#ffa060', dirPos: [34, 46, -30], dir2Intensity: 0, hemiSky: '#c8a890', hemiGround: '#5a4530', hemiIntensity: 0.45, pointLights: [], fog: [110, '#9a8068'], shadowCameraRange: 55, shadowMapSize: 4096 },
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
  const palette = useOutdoorPalette();
  return (
    <group>
      {outdoorSceneData.objects.map((o) => (
        <Text
          key={`lb-${o.id}`}
          position={[o.position[0], o.position[1] + o.size[1] + 0.6, o.position[2]]}
          fontSize={0.9}
          color={palette.label}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor={palette.labelOutline}
        >
          {o.name}
        </Text>
      ))}
      {outdoorSceneData.ground.filter((g) => g.type !== 'ground').map((g) => (
        <Text
          key={`lg-${g.id}`}
          position={[g.position[0], g.position[1] + 0.6, g.position[2]]}
          fontSize={0.8}
          color={palette.label}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor={palette.labelOutline}
        >
          {g.name}
        </Text>
      ))}
    </group>
  );
}

function OutdoorSceneContent({
  viewMode,
  layers,
  showLabels,
  colliders,
}: {
  viewMode: string;
  layers: ModelLayer[];
  showLabels: boolean;
  colliders: OutdoorColliders;
}) {
  const groundItems = useAppStore((s) => s.outdoorSceneData.ground);
  const objects = useAppStore((s) => s.outdoorSceneData.objects);
  const groundLocked = layers.find((l) => l.id === 'ground')?.locked ?? true;
  const spaceLocked = layers.find((l) => l.id === 'space')?.locked ?? true;
  const isWalkthrough = viewMode === 'walkthrough';
  const palette = useOutdoorPalette();

  // 纯净白模: 用接触阴影强化物体与地面的贴合感 (位移/旋转落位后按 key 重烘焙)
  const shadowKey = useMemo(
    () => `${objects.map((o) => `${o.position[0].toFixed(2)},${o.position[2].toFixed(2)},${o.rotation}`).join('|')}#${groundItems.length}`,
    [objects, groundItems.length],
  );

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

      {/* 对象拖拽移动 / 旋转手柄 */}
      <OutdoorTransformController colliders={colliders} />

      {/* 接触阴影: 物体与地面贴合的暗部, 所有风格都开 (白模更重), 保证任何光照角度下物体都"落地" */}
      <ContactShadows
        key={shadowKey}
        position={[0, 0.16, 0]}
        scale={150}
        far={12}
        blur={2.4}
        opacity={palette.monochrome ? 0.42 : 0.3}
        resolution={1024}
        frames={1}
        color={palette.monochrome ? '#6b7785' : '#5c6b7a'}
      />

      {showLabels && <OutdoorLabels />}
    </>
  );
}

export function OutdoorScene() {
  // 按字段订阅, 避免拖拽等高频 store 更新触发整个场景树重渲染 (导致高亮框跟不上鼠标)
  const {
    viewMode,
    viewSettings,
    renderMode,
    layers,
    resetCamera,
    selectGround,
    selectOutdoorObject,
    outdoorSceneData,
    draggingOutdoor,
    setDraggingOutdoor,
    addGroundItem,
    addOutdoorObject,
  } = useAppStore(useShallow((s) => ({
    viewMode: s.viewMode,
    viewSettings: s.viewSettings,
    renderMode: s.renderMode,
    layers: s.layers,
    resetCamera: s.resetCamera,
    selectGround: s.selectGround,
    selectOutdoorObject: s.selectOutdoorObject,
    outdoorSceneData: s.outdoorSceneData,
    draggingOutdoor: s.draggingOutdoor,
    setDraggingOutdoor: s.setDraggingOutdoor,
    addGroundItem: s.addGroundItem,
    addOutdoorObject: s.addOutdoorObject,
  })));

  const palette = useOutdoorPalette();

  // 纯净白模: 降低环境光、增强主光对比, 让白色体块的明暗层次与投影更清晰
  const monochrome = palette.monochrome;
  const lightingConfigs = useMemo(() => {
    if (!monochrome) return OUTDOOR_LIGHTING_CONFIGS;
    const tweak = (c: LightingModeConfig): LightingModeConfig => ({
      ...c,
      ambient: c.ambient * 0.6,
      hemiIntensity: c.hemiIntensity * 0.7,
      dirIntensity: c.dirIntensity * 1.5,
    });
    return Object.fromEntries(
      Object.entries(OUTDOOR_LIGHTING_CONFIGS).map(([k, v]) => [k, tweak(v)]),
    ) as Record<string, LightingModeConfig>;
  }, [monochrome]);

  const bgColor = useMemo(() => {
    // 素模模式: 浅灰背景衬托白色粘土体块 (优先于风格背景)
    if (renderMode === 'arctic') return '#e8e8e8';
    // 暗色风格强制使用深色背景, 否则跟随光照模式
    if (palette.bg) return palette.bg;
    switch (viewSettings.lighting) {
      case '夜景': return '#1a2030';
      case '黄昏': return '#8aa6c4';
      case '阴天': return '#cdd4dc';
      default: return '#dceaf6';
    }
  }, [renderMode, viewSettings.lighting, palette.bg]);

  // 暗色风格使用低明度网格线
  const gridConfig = useMemo<GridConfig>(() => (
    palette.gridCell && palette.gridSection
      ? { ...OUTDOOR_GRID_CONFIG, cellColor: palette.gridCell, sectionColor: palette.gridSection }
      : OUTDOOR_GRID_CONFIG
  ), [palette.gridCell, palette.gridSection]);

  // 拖拽高亮框由 BaseScene 的 EngineDragGhost 直接写入 three 对象位置 (不经过 React),
  // 这里不再写 store, 否则每次 dragover 都会触发全场景重渲染导致高亮框滞后于鼠标

  // 占位碰撞体 (设计区域基座 + 已有空间对象) — 仅在场景数据变化时重建
  const colliders = useMemo(() => buildOutdoorColliders(outdoorSceneData), [outdoorSceneData]);

  // 落点校验: 必须落在设计区域内; 空间对象之间不可重叠 (地面结构允许叠放)
  const dragValidatorDetailed = useCallback(
    (x: number, z: number) => {
      if (!draggingOutdoor) return { ok: false, reason: '未选中素材' };
      return checkOutdoorPlacement(colliders, draggingOutdoor, x, z);
    },
    [colliders, draggingOutdoor],
  );

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
  }, [setDraggingOutdoor]);

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
        lightingConfigs={lightingConfigs}
        softShadow={false}
        grid={gridConfig}
        background={bgColor}
        enableDrag
        dragSize={draggingOutdoor?.size ?? null}
        dragValidatorDetailed={dragValidatorDetailed}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
      >
        <OutdoorSceneContent
          viewMode={viewMode}
          layers={layers}
          showLabels={!!viewSettings.showLabels}
          colliders={colliders}
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
