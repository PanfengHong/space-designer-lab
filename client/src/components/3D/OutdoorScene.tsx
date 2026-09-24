import { Suspense, useMemo, useEffect, useRef, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../store/useAppStore';
import { screenToFloor, snapToGrid } from '../../utils/r3fBridge';
import { R3FBridgeBinder } from './indoor/DragDrop';
import { DisableBrowserGestures } from './indoor/Scene';
import { GroundItemsGroup, GroundItemContent } from './outdoor/GroundItems';
import { OutdoorObjectsGroup, OutdoorObjectContent } from './outdoor/OutdoorObjects';
import { useOutdoorPalette } from '../../constants/outdoorStyles';
import type { ModelLayer, GroundItem, OutdoorObject, GroundItemType, OutdoorObjectType } from '../../types';

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

/** 户外相机控制 */
function OutdoorCameraController({ viewMode, resetCamera }: { viewMode: string; resetCamera: boolean }) {
  const { camera, controls } = useThree() as { camera: THREE.Camera; controls: any };

  const defaultPosition = useMemo(() => {
    switch (viewMode) {
      case 'axonometric':
        return [48, 52, 48] as [number, number, number];
      case 'top':
        return [0.01, 115, 0.01] as [number, number, number];
      case 'plan':
        return [0.01, 115, 0.02] as [number, number, number];
      case 'walkthrough':
        return WALK_POS;
      default:
        return [42, 40, 48] as [number, number, number];
    }
  }, [viewMode]);

  const defaultTarget = useMemo<[number, number, number]>(() => {
    return viewMode === 'walkthrough' ? [8, 1.6, -12] : [0, 0, 0];
  }, [viewMode]);

  // 切换视图: 直接跳转
  useEffect(() => {
    camera.position.set(...defaultPosition);
    camera.lookAt(...defaultTarget);
    if (controls) {
      controls.target.set(...defaultTarget);
      controls.update();
    }
    const targetFov = viewMode === 'walkthrough' ? 75 : 50;
    if (camera instanceof THREE.PerspectiveCamera && camera.fov !== targetFov) {
      camera.fov = targetFov;
      camera.updateProjectionMatrix();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // 重置视角
  useEffect(() => {
    if (resetCamera) {
      camera.position.set(...defaultPosition);
      camera.lookAt(...defaultTarget);
      if (controls) {
        controls.target.set(...defaultTarget);
        controls.update();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetCamera]);

  return null;
}

/** 比例尺上报 (目标为场景中心) */
function OutdoorScaleReporter() {
  const { camera, size } = useThree() as { camera: THREE.PerspectiveCamera; size: { width: number; height: number } };
  const setPixelsPerMeter = useAppStore((s) => s.setPixelsPerMeter);
  const lastRef = useRef(-1);

  useFrame(() => {
    if (!camera.isPerspectiveCamera) return;
    const target = new THREE.Vector3(CENTER_X, 0, CENTER_Z);
    const distance = camera.position.distanceTo(target);
    const fovRad = (camera.fov * Math.PI) / 180;
    const worldHeightAtTarget = 2 * distance * Math.tan(fovRad / 2);
    const ppm = size.height / worldHeightAtTarget;
    if (Math.abs(ppm - lastRef.current) > 0.5) {
      lastRef.current = ppm;
      setPixelsPerMeter(ppm);
    }
  });
  return null;
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

/** 户外光照 (自然光为主, 复用户内 5 种光影) */
type OutdoorLightConfig = {
  ambient: number;
  ambientColor: string;
  dirIntensity: number;
  dirColor: string;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  fog: [number, string] | null;
};

function OutdoorLighting({ mode }: { mode: string }) {
  const config = useMemo<OutdoorLightConfig>(() => {
    switch (mode) {
      case '人造光':
        return { ambient: 0.35, ambientColor: '#fff5e6', dirIntensity: 0.15, dirColor: '#ffe8cc', hemiSky: '#3a3a48', hemiGround: '#2a2a30', hemiIntensity: 0.2, fog: [70, '#2a3040'] as [number, string] };
      case '阴天':
        return { ambient: 0.65, ambientColor: '#d0d4d8', dirIntensity: 0.25, dirColor: '#c8cdd2', hemiSky: '#b8bcc0', hemiGround: '#a0a4a8', hemiIntensity: 0.7, fog: null };
      case '夜景':
        return { ambient: 0.2, ambientColor: '#3a4868', dirIntensity: 0.4, dirColor: '#c8d8f0', hemiSky: '#1a2a48', hemiGround: '#0e1428', hemiIntensity: 0.35, fog: [90, '#1a2030'] as [number, string] };
      case '黄昏':
        return { ambient: 0.32, ambientColor: '#d8c8b8', dirIntensity: 1.05, dirColor: '#ffa060', hemiSky: '#c8a890', hemiGround: '#5a4530', hemiIntensity: 0.45, fog: [110, '#9a8068'] as [number, string] };
      default:
        return { ambient: 0.72, ambientColor: '#ffffff', dirIntensity: 0.85, dirColor: '#fffef0', hemiSky: '#cfe2f5', hemiGround: '#dde4d8', hemiIntensity: 0.55, fog: null };
    }
  }, [mode]);

  return (
    <>
      {config.fog && <fog attach="fog" args={[config.fog[1], config.fog[0], config.fog[0] + 60]} />}
      <ambientLight intensity={config.ambient} color={config.ambientColor} />
      <directionalLight
        position={[28, 42, 20]}
        intensity={config.dirIntensity}
        color={config.dirColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-near={0.5}
        shadow-camera-far={120}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-20, 25, -18]} intensity={0.25} color="#c8daf0" />
      <hemisphereLight args={[config.hemiSky, config.hemiGround, config.hemiIntensity]} />
    </>
  );
}

/** 户外拖拽放置预览 */
function OutdoorDragGhost() {
  const dragging = useAppStore((s) => s.draggingOutdoor);
  const ghostPos = useAppStore((s) => s.outdoorDragGhostPos);
  const ground = useAppStore((s) => s.outdoorSceneData.ground);
  if (!dragging || !ghostPos) return null;

  const [x, z] = ghostPos;
  const [w, h, d] = dragging.size;
  const valid = isInsideGround(x, z, ground);
  const color = valid ? '#22c55e' : '#ef4444';

  return (
    <group position={[x, h / 2, z]}>
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} depthWrite={false} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
        <lineBasicMaterial color={color} />
      </lineSegments>
      <mesh position={[0, -h / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.5, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

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

interface SceneContentProps {
  viewMode: string;
  layers: ModelLayer[];
  resetCamera: boolean;
  lighting: string;
  showLabels: boolean;
}

function OutdoorSceneContent({ viewMode, layers, resetCamera, lighting, showLabels }: SceneContentProps) {
  const groundItems = useAppStore((s) => s.outdoorSceneData.ground);
  const objects = useAppStore((s) => s.outdoorSceneData.objects);
  const groundLocked = layers.find((l) => l.id === 'ground')?.locked ?? true;
  const spaceLocked = layers.find((l) => l.id === 'space')?.locked ?? true;
  const isWalkthrough = viewMode === 'walkthrough';

  return (
    <>
      <R3FBridgeBinder />
      <OutdoorCameraController viewMode={viewMode} resetCamera={resetCamera} />
      <OutdoorScaleReporter />
      <OutdoorDragGhost />

      {isWalkthrough ? (
        <OutdoorWalkthroughLook />
      ) : (
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          target={[0, 0, 0]}
          minDistance={5}
          maxDistance={220}
          enablePan
          enableZoom
          enableRotate
          mouseButtons={{
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.PAN,
            RIGHT: THREE.MOUSE.PAN,
          }}
        />
      )}

      <OutdoorLighting mode={lighting} />

      {/* 地面网格 */}
      <Grid
        position={[0, -0.16, 0]}
        args={[120, 120]}
        cellSize={2}
        cellThickness={0.5}
        cellColor="#d4dee8"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#b8c8d8"
        fadeDistance={160}
        fadeStrength={1.5}
        infiniteGrid
      />

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

  // 背景色
  const bgColor = useMemo(() => {
    switch (viewSettings.lighting) {
      case '夜景': return '#1a2030';
      case '黄昏': return '#8aa6c4';
      case '阴天': return '#cdd4dc';
      default: return '#dceaf6';
    }
  }, [viewSettings.lighting]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!draggingOutdoor) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const floor = screenToFloor(e.clientX, e.clientY);
    if (floor) {
      const [sx, sz] = snapToGrid(floor[0], floor[1]);
      setOutdoorDragGhostPos([sx, sz]);
    }
  }, [draggingOutdoor, setOutdoorDragGhostPos]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!draggingOutdoor) return;
    const floor = screenToFloor(e.clientX, e.clientY);
    if (floor) {
      const [sx, sz] = snapToGrid(floor[0], floor[1]);
      if (isInsideGround(sx, sz, outdoorSceneData.ground)) {
        const id = `o-drag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        if (draggingOutdoor.kind === 'ground') {
          // 不同地面元素的默认放置高度
          const yMap: Record<GroundItemType, number> = { ground: 0, grass: 0.02, river: -0.1, road: 0.09 };
          const newItem: GroundItem = {
            id: `g-drag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: draggingOutdoor.name,
            type: draggingOutdoor.type as GroundItemType,
            position: [sx, yMap[draggingOutdoor.type as GroundItemType] ?? 0, sz],
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
            position: [sx, 0, sz],
            rotation: 0,
            size: draggingOutdoor.size,
            color: draggingOutdoor.color,
          };
          addOutdoorObject(newObj);
        }
      }
    }
    setDraggingOutdoor(null);
    setOutdoorDragGhostPos(null);
  }, [draggingOutdoor, outdoorSceneData.ground, setDraggingOutdoor, setOutdoorDragGhostPos, addGroundItem, addOutdoorObject]);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{ fov: 50, near: 0.1, far: 800, position: [42, 40, 48] }}
      style={{ width: '100%', height: '100%', background: bgColor, touchAction: 'none' }}
      onPointerMissed={() => { selectGround(null); selectOutdoorObject(null); }}
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
        <OutdoorSceneContent
          viewMode={viewMode}
          layers={layers}
          resetCamera={resetCamera}
          lighting={viewSettings.lighting}
          showLabels={!!viewSettings.showLabels}
        />
      </Suspense>
    </Canvas>
  );
}

/** 户外素材缩略图渲染 (供素材库复用) */
const OBJECT_TYPE_SET = new Set<string>(['building', 'warehouse', 'car', 'truck']);

export function OutdoorThumbnailContent({ item }: { item: GroundItem | OutdoorObject }) {
  const palette = useOutdoorPalette();
  if (OBJECT_TYPE_SET.has(item.type)) {
    return <OutdoorObjectContent data={item as OutdoorObject} palette={palette} />;
  }
  return <GroundItemContent data={item as GroundItem} palette={palette} />;
}
