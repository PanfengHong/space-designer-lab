import { Suspense, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
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

/* ==================== 拖拽预览框 (forwardRef, 事件直写) ==================== */
const _ghostColor = new THREE.Color();
export interface EngineDragGhostHandle {
  group: THREE.Group | null;
  boxMat: THREE.MeshBasicMaterial | null;
  lineMat: THREE.LineBasicMaterial | null;
  height: number;
}
const EngineDragGhost = forwardRef<EngineDragGhostHandle, {
  size: [number, number, number];
}>(function EngineDragGhost({ size }, ref) {
  const [w, h, d] = size;
  const groupRef = useRef<THREE.Group>(null);
  const boxMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const lineMatRef = useRef<THREE.LineBasicMaterial>(null);
  const geometry = useMemo(() => new THREE.BoxGeometry(w, h, d), [w, h, d]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);
  useImperativeHandle(ref, () => ({
    group: groupRef.current,
    boxMat: boxMatRef.current,
    lineMat: lineMatRef.current,
    height: h,
  }), [h]);
  return (
    <group ref={groupRef} visible={false}>
      <mesh geometry={geometry}>
        <meshBasicMaterial ref={boxMatRef} transparent opacity={0.25} depthWrite={false} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial ref={lineMatRef} />
      </lineSegments>
    </group>
  );
});

/* ==================== 引擎主体 ==================== */
export function BaseScene(props: BaseSceneProps) {
  const {
    center, viewMode, resetCamera, cameraPresets, defaultFov = 50,
    walkPoints = [], lighting, lightingConfigs, grid, background,
    enableDrag = false, dragSize, dragValidator,
    onDragOver, onDrop, onDragEnd, onPointerMissed, children,
  } = props;

  const walkthroughIndex = useAppStore((s) => s.walkthroughIndex);
  const ghostHandleRef = useRef<EngineDragGhostHandle>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // 保存最新 props 到 ref, 供原生事件处理器读取, 避免重新绑定 listener
  const propsRef = useRef({ enableDrag, dragValidator, onDragOver, onDrop, onDragEnd });
  propsRef.current = { enableDrag, dragValidator, onDragOver, onDrop, onDragEnd };

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    // 找到实际的 canvas DOM (R3F 在 container 内渲染 <canvas>)
    const getCanvas = () => container.querySelector('canvas') as HTMLCanvasElement | null;

    const applyGhost = (clientX: number, clientY: number) => {
      const floor = screenToFloor(clientX, clientY);
      if (!floor) return false;
      const [sx, sz] = snapToGrid(floor[0], floor[1]);
      const handle = ghostHandleRef.current;
      if (handle?.group) {
        handle.group.visible = true;
        handle.group.position.set(sx, handle.height / 2, sz);
        const valid = propsRef.current.dragValidator ? propsRef.current.dragValidator(sx, sz) : true;
        _ghostColor.set(valid ? '#22c55e' : '#ef4444');
        handle.boxMat?.color.copy(_ghostColor);
        handle.lineMat?.color.copy(_ghostColor);
      }
      propsRef.current.onDragOver?.(sx, sz);
      return true;
    };

    const onNativeDragOver = (e: DragEvent) => {
      if (!propsRef.current.enableDrag) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      applyGhost(e.clientX, e.clientY);
    };

    const onNativeDrop = (e: DragEvent) => {
      if (!propsRef.current.enableDrag) return;
      e.preventDefault();
      const floor = screenToFloor(e.clientX, e.clientY);
      if (floor) {
        const [sx, sz] = snapToGrid(floor[0], floor[1]);
        if (propsRef.current.dragValidator ? propsRef.current.dragValidator(sx, sz) : true) {
          propsRef.current.onDrop?.(sx, sz);
        }
      }
      const handle = ghostHandleRef.current;
      if (handle?.group) handle.group.visible = false;
      propsRef.current.onDragEnd?.();
    };

    const hideGhost = () => {
      const handle = ghostHandleRef.current;
      if (handle?.group) handle.group.visible = false;
    };

    // 原生监听绑定在容器上 (事件捕获阶段, 抢在 React 之前)
    container.addEventListener('dragover', onNativeDragOver);
    container.addEventListener('drop', onNativeDrop);
    container.addEventListener('dragleave', hideGhost);
    window.addEventListener('dragend', hideGhost);

    return () => {
      container.removeEventListener('dragover', onNativeDragOver);
      container.removeEventListener('drop', onNativeDrop);
      container.removeEventListener('dragleave', hideGhost);
      window.removeEventListener('dragend', hideGhost);
    };
  }, []);

  const isWalkthrough = viewMode === 'walkthrough';

  return (
    <div
      ref={canvasContainerRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
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

        {enableDrag && dragSize && (
          <EngineDragGhost ref={ghostHandleRef} size={dragSize} />
        )}

        {children}
      </Suspense>
    </Canvas>
    </div>
  );
}
