import { Suspense, useEffect, useRef, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../../store/useAppStore';
import { screenToFloor, snapToGrid } from '../../../utils/r3fBridge';
import type {
  BaseSceneProps,
  ViewMode,
  CameraPreset,
  LightingModeConfig,
  GridConfig,
  WalkPoint,
} from './types';

/* ==================== 浏览器手势拦截 ==================== */
export function DisableBrowserGestures() {
  const gl = useThree((s) => s.gl);
  const domEl = gl.domElement;

  useEffect(() => {
    let rightDown = false;
    const onPointerDownWin = (e: PointerEvent) => {
      if (e.button === 2) {
        rightDown = true;
        e.preventDefault();
        try { domEl?.setPointerCapture(e.pointerId); } catch {}
      }
    };
    const onPointerMoveWin = (e: PointerEvent) => { if (rightDown) e.preventDefault(); };
    const onPointerUpWin = (e: PointerEvent) => {
      if (e.button === 2) {
        rightDown = false;
        e.preventDefault();
        try { domEl?.releasePointerCapture(e.pointerId); } catch {}
      }
    };
    const onMouseDownWin = (e: MouseEvent) => { if (e.button === 2) e.preventDefault(); };
    const onMouseMoveWin = (e: MouseEvent) => { if (rightDown) e.preventDefault(); };
    const onAuxClickWin = (e: MouseEvent) => { if (e.button === 2) e.preventDefault(); };
    const onDragStartWin = (e: DragEvent) => { if (rightDown) e.preventDefault(); };

    const cap: AddEventListenerOptions = { capture: true };
    window.addEventListener('pointerdown', onPointerDownWin, cap);
    window.addEventListener('pointermove', onPointerMoveWin, cap);
    window.addEventListener('pointerup', onPointerUpWin, cap);
    window.addEventListener('mousedown', onMouseDownWin, cap);
    window.addEventListener('mousemove', onMouseMoveWin, cap);
    window.addEventListener('auxclick', onAuxClickWin, cap);
    window.addEventListener('dragstart', onDragStartWin, cap);

    const el = domEl;
    const onContextMenuCanvas = (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); };
    if (el) el.addEventListener('contextmenu', onContextMenuCanvas, cap);

    return () => {
      window.removeEventListener('pointerdown', onPointerDownWin, cap);
      window.removeEventListener('pointermove', onPointerMoveWin, cap);
      window.removeEventListener('pointerup', onPointerUpWin, cap);
      window.removeEventListener('mousedown', onMouseDownWin, cap);
      window.removeEventListener('mousemove', onMouseMoveWin, cap);
      window.removeEventListener('auxclick', onAuxClickWin, cap);
      window.removeEventListener('dragstart', onDragStartWin, cap);
      if (el) el.removeEventListener('contextmenu', onContextMenuCanvas, cap);
    };
  }, [domEl]);

  return null;
}

/* ==================== 相机控制器 ==================== */
function EngineCameraController({
  viewMode,
  resetCamera,
  cameraPresets,
  defaultFov,
  walkPoints,
  walkthroughIndex,
}: {
  viewMode: ViewMode;
  resetCamera: boolean;
  cameraPresets: Record<ViewMode, CameraPreset>;
  defaultFov: number;
  walkPoints: WalkPoint[];
  walkthroughIndex: number;
}) {
  const { camera, controls } = useThree() as { camera: THREE.Camera; controls: any };

  const preset = cameraPresets[viewMode];
  const defaultPosition = preset.position;
  const defaultTarget = viewMode === 'walkthrough'
    ? walkPoints[walkthroughIndex % Math.max(1, walkPoints.length)]?.target ?? preset.target
    : preset.target;

  useEffect(() => {
    camera.position.set(...defaultPosition);
    camera.lookAt(...defaultTarget);
    if (controls) {
      controls.target.set(...defaultTarget);
      controls.update();
    }
    const targetFov = viewMode === 'walkthrough' ? 75 : (preset.fov ?? defaultFov);
    if (camera instanceof THREE.PerspectiveCamera && camera.fov !== targetFov) {
      camera.fov = targetFov;
      camera.updateProjectionMatrix();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, walkthroughIndex]);

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

/* ==================== 比例尺上报 ==================== */
function EngineScaleReporter({ center }: { center: [number, number, number] }) {
  const { camera, size } = useThree() as { camera: THREE.PerspectiveCamera; size: { width: number; height: number } };
  const setPixelsPerMeter = useAppStore((s) => s.setPixelsPerMeter);
  const lastRef = useRef(-1);

  useFrame(() => {
    if (!camera.isPerspectiveCamera) return;
    const target = new THREE.Vector3(center[0], center[1], center[2]);
    const distance = camera.position.distanceTo(target);
    const fovRad = (camera.fov * Math.PI) / 180;
    const worldHeight = 2 * distance * Math.tan(fovRad / 2);
    const ppm = size.height / worldHeight;
    if (Math.abs(ppm - lastRef.current) > 0.5) {
      lastRef.current = ppm;
      setPixelsPerMeter(ppm);
    }
  });

  return null;
}

/* ==================== 光照 ==================== */
function EngineLighting({ mode, configs }: { mode: string; configs: Record<string, LightingModeConfig> }) {
  const config = configs[mode] ?? configs[Object.keys(configs)[0]];
  if (!config) return null;

  return (
    <>
      {config.fog && <fog attach="fog" args={[config.fog[1], config.fog[0], config.fog[0] + 15]} />}
      <ambientLight intensity={config.ambient} color={config.ambientColor} />
      <directionalLight
        position={config.dirPos}
        intensity={config.dirIntensity}
        color={config.dirColor}
        castShadow={config.castShadow ?? true}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-(config.shadowCameraRange ?? 15)}
        shadow-camera-right={config.shadowCameraRange ?? 15}
        shadow-camera-top={config.shadowCameraRange ?? 15}
        shadow-camera-bottom={-(config.shadowCameraRange ?? 15)}
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

/* ==================== 拖拽预览框 ==================== */
function EngineDragGhost({
  size,
  ghostPos,
  validator,
}: {
  size: [number, number, number];
  ghostPos: [number, number];
  validator?: (x: number, z: number) => boolean;
}) {
  const [x, z] = ghostPos;
  const [w, h, d] = size;
  const valid = validator ? validator(x, z) : true;
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
    </group>
  );
}

/* ==================== 引擎主体 ==================== */
export function BaseScene(props: BaseSceneProps) {
  const {
    center, viewMode, resetCamera, cameraPresets, defaultFov = 50,
    walkPoints = [], lighting, lightingConfigs, grid, background,
    enableDrag = false, dragSize, dragGhostPos, dragValidator,
    onDragOver, onDrop, onDragEnd, onPointerMissed, children,
  } = props;

  const walkthroughIndex = useAppStore((s) => s.walkthroughIndex);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!enableDrag) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const floor = screenToFloor(e.clientX, e.clientY);
    if (floor) {
      const [sx, sz] = snapToGrid(floor[0], floor[1]);
      onDragOver?.(sx, sz);
    }
  }, [enableDrag, onDragOver]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (!enableDrag) return;
    e.preventDefault();
    const floor = screenToFloor(e.clientX, e.clientY);
    if (floor) {
      const [sx, sz] = snapToGrid(floor[0], floor[1]);
      if (dragValidator ? dragValidator(sx, sz) : true) {
        onDrop?.(sx, sz);
      }
    }
    onDragEnd?.();
  }, [enableDrag, dragValidator, onDrop, onDragEnd]);

  const isWalkthrough = viewMode === 'walkthrough';

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{ fov: defaultFov, near: 0.1, far: 800, position: cameraPresets.perspective.position }}
      style={{ width: '100%', height: '100%', background, touchAction: 'none' }}
      onPointerMissed={onPointerMissed}
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
        <color attach="background" args={[background]} />

        <EngineCameraController
          viewMode={viewMode}
          resetCamera={resetCamera}
          cameraPresets={cameraPresets}
          defaultFov={defaultFov}
          walkPoints={walkPoints}
          walkthroughIndex={walkthroughIndex}
        />
        <EngineScaleReporter center={center} />

        {!isWalkthrough && (
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.08}
            target={center}
            minDistance={4}
            maxDistance={220}
            enablePan enableZoom enableRotate
            mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN }}
          />
        )}

        <EngineLighting mode={lighting} configs={lightingConfigs} />

        {grid && (
          <Grid
            position={grid.position}
            args={grid.args}
            cellSize={grid.cellSize}
            cellThickness={0.5}
            cellColor={grid.cellColor}
            sectionSize={grid.sectionSize}
            sectionThickness={1}
            sectionColor={grid.sectionColor}
            fadeDistance={grid.fadeDistance}
            fadeStrength={1}
            infiniteGrid={grid.infiniteGrid}
          />
        )}

        {enableDrag && dragSize && dragGhostPos && (
          <EngineDragGhost size={dragSize} ghostPos={dragGhostPos} validator={dragValidator} />
        )}

        {children}
      </Suspense>
    </Canvas>
  );
}
