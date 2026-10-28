import { Suspense, useEffect, useLayoutEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Lightformer, SoftShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../../store/useAppStore';
import { screenToFloor, snapToGrid } from '../../../utils/r3fBridge';
import { PerformanceProbe } from './PerformanceProbe';
import { exportBridge, EXPORT_CONTENT_GROUP } from '../../../utils/exportBridge';
import type { RenderMode } from '../../../types';
import type {
  BaseSceneProps,
  ViewMode,
  CameraPreset,
  LightingModeConfig,
  GridConfig,
  WalkPoint,
} from './types';

/* ==================== 渲染模式 (ARCTIC 素模 / SHADED 着色 / MATERIAL 材质) ==================== */

/** 素模粘土材质色 (微暖白, 比纯白更有石膏感) */
const CLAY_COLOR = '#f2f1ee';

/** 被替换前的原始材质状态 (切换模式后可完整还原) */
interface OriginalMaterialState {
  material: THREE.Material | THREE.Material[];
  metalness: number;
  envMapIntensity: number;
}

/**
 * 渲染模式控制器 — 直写 three 对象, 不经 React state (高频/大遍历约定)。
 *
 * 只处理 DesignerContent 组内的 PBR 材质 (Standard/Physical) 且不透明、depthTest 正常的网格;
 * 导航光柱、选中高亮、文字标签等透明或 Basic 类 UI 对象不受影响, 保证交互可读性。
 * useFrame 每 0.5s 增量扫描一次, 新放入的家具也会立即进入当前模式。
 */
function RenderModeController() {
  const renderMode = useAppStore((s) => s.renderMode);
  const scene = useThree((s) => s.scene);

  const originalRef = useRef<WeakMap<THREE.Mesh, OriginalMaterialState>>(new WeakMap());
  const modeRef = useRef<RenderMode>(renderMode);
  modeRef.current = renderMode;
  const scanAccRef = useRef(0);
  const clayRef = useMemo(
    () => new THREE.MeshStandardMaterial({ color: CLAY_COLOR, roughness: 0.95, metalness: 0 }),
    [],
  );
  useEffect(() => () => clayRef.dispose(), [clayRef]);

  const getRoot = () => scene.getObjectByName(EXPORT_CONTENT_GROUP) ?? null;

  /** 还原所有被改动的材质为原始状态 (含 shaded 模式直接写在原材质上的属性) */
  const restoreAll = () => {
    const root = getRoot();
    if (!root) return;
    const store = originalRef.current;
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!(mesh as any).isMesh) return;
      const orig = store.get(mesh);
      if (!orig) return;
      mesh.material = orig.material;
      const mat = orig.material as any;
      if (!Array.isArray(orig.material) && (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial)) {
        mat.metalness = orig.metalness;
        mat.envMapIntensity = orig.envMapIntensity;
      }
      store.delete(mesh);
    });
  };

  /**
   * 把当前模式应用到组内所有网格 (幂等, 可周期重复调用)。
   * - arctic: 换成共享粘土材质
   * - shaded: 保留固有色, 金属度归零 + 环境反射压到 0.25 (哑光)
   * - material: 不做任何事
   */
  const applyMode = (mode: RenderMode) => {
    const root = getRoot();
    if (!root) return;
    const store = originalRef.current;
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!(mesh as any).isMesh) return;
      const mat = mesh.material as any;
      if (!mat || Array.isArray(mesh.material)) return;
      if (!(mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial)) return;
      if (mat === clayRef || mat.transparent || mat.depthTest === false) return;

      if (mode === 'material') return;

      if (!store.has(mesh)) {
        store.set(mesh, {
          material: mesh.material as THREE.Material,
          metalness: mat.metalness ?? 0,
          envMapIntensity: mat.envMapIntensity ?? 1,
        });
      }
      if (mode === 'arctic') {
        mesh.material = clayRef;
      } else {
        mat.metalness = 0;
        mat.envMapIntensity = 0.25;
      }
    });
  };

  // 模式切换: 先整体还原, 再应用新模式 (避免 shaded 的金属度修改叠加到原始值上)
  useEffect(() => {
    restoreAll();
    if (renderMode !== 'material') applyMode(renderMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderMode, scene]);

  // 增量扫描: 拖入新家具 / 撤销重做后出现的网格, 补上当前模式
  useFrame((_, delta) => {
    if (modeRef.current === 'material') return;
    scanAccRef.current += delta;
    if (scanAccRef.current < 0.5) return;
    scanAccRef.current = 0;
    applyMode(modeRef.current);
  });

  // 卸载时还原, 防止被改动的材质状态泄漏到下一次挂载
  useEffect(
    () => () => {
      restoreAll();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return null;
}

/* ==================== 浏览器手势拦截 ==================== */

/**
 * 场景导出登记: 挂载时把 DesignerContent 组登记到 exportBridge,
 * 卸载 (切 2D 平面图/换页) 时清除, 导出面板据此判断 3D 场景是否可用。
 */
function ExportSceneReporter() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    exportBridge.content = scene.getObjectByName(EXPORT_CONTENT_GROUP) ?? null;
    return () => {
      exportBridge.content = null;
    };
  }, [scene]);
  return null;
}

/**
 * 关掉线段的拾取容差。
 *
 * three 的 Raycaster 对 Line/LineSegments 默认带 1 米的命中阈值 (params.Line.threshold):
 * 命中判定是"射线到线段的最近距离 < 阈值", 而不是真实相交。素材组件里的装饰性
 * 描边 (水箱描边、柜体描边、线框) 全都参与事件射线 —— 于是目标周围 1 米内的任何
 * 描边都会产生"不在射线上"的伪命中, 还会按伪命中点的位置参与距离排序, 抢走本该
 * 属于目标的点击 (典型翻车: 顶视图点马桶, 选中旁边洗手台的描边)。
 * 阈值压到 1cm: 真正点到线上才命中, 伪命中消失。
 */
function DisableLinePicking() {
  const raycaster = useThree((s) => s.raycaster);
  useEffect(() => {
    if (raycaster.params.Line) raycaster.params.Line.threshold = 0.01;
  }, [raycaster]);
  return null;
}

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
/**
 * 光源池上限 = 所有光影配置中 pointLights 的最大数量。
 * 固定光源数量是切换光影不卡顿的关键: three.js 按 NUM_POINT_LIGHTS 等宏编译材质着色器,
 * 光源挂载/卸载会触发全场景材质重编译 (数百 ms 主线程冻结)。
 * 池内未用到的光源只把 intensity 置 0, 数量恒定 → 零重编译。
 */
const LIGHT_POOL_SIZE = 4;

function EngineLighting({ mode, configs }: { mode: string; configs: Record<string, LightingModeConfig> }) {
  const dirRef = useRef<THREE.DirectionalLight>(null);
  const dir2Ref = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const pointRefs = useRef<(THREE.PointLight | null)[]>([]);
  const scene = useThree((s) => s.scene);
  const config = configs[mode] ?? configs[Object.keys(configs)[0]];
  const range = config?.shadowCameraRange ?? 15;

  /* R3F 对 shadow-camera-* 这类嵌套属性只做赋值, 不会调用 updateProjectionMatrix,
     阴影相机一直停留在 DirectionalLightShadow 的默认 ±5m 视锥,
     导致只有原点附近一小块有投影 (户外 80×60m 场景几乎全部丢失阴影)。
     这里显式同步视锥并刷新投影矩阵。 */
  useLayoutEffect(() => {
    const light = dirRef.current;
    if (!light) return;
    const cam = light.shadow.camera;
    cam.left = -range;
    cam.right = range;
    cam.top = range;
    cam.bottom = -range;
    cam.near = 0.5;
    cam.far = 200;
    cam.updateProjectionMatrix();
    light.shadow.needsUpdate = true;
  }, [range, mode]);

  /* 光影切换: 命令式直写光对象属性 (不经 React 重挂载)。
     光源数量与雾的挂载状态恒定, 材质着色器不会重编译, 切换零卡顿。 */
  useLayoutEffect(() => {
    if (!config) return;

    const amb = ambientRef.current;
    if (amb) {
      amb.intensity = config.ambient;
      amb.color.set(config.ambientColor);
    }
    const hemi = hemiRef.current;
    if (hemi) {
      hemi.intensity = config.hemiIntensity;
      hemi.color.set(config.hemiSky);
      hemi.groundColor.set(config.hemiGround);
    }
    const dir = dirRef.current;
    if (dir) {
      dir.intensity = config.dirIntensity;
      dir.color.set(config.dirColor);
      dir.position.set(...config.dirPos);
    }
    const dir2 = dir2Ref.current;
    if (dir2) {
      dir2.intensity = config.dir2Intensity;
      dir2.color.set(config.dir2Color ?? config.dirColor);
      dir2.position.set(...(config.dir2Pos ?? [-5, 10, -5]));
    }
    config.pointLights.forEach((pl, i) => {
      const l = pointRefs.current[i];
      if (!l) return;
      l.position.set(...pl.pos);
      l.color.set(pl.color);
      l.intensity = pl.intensity;
      l.distance = pl.dist;
    });
    // 池内多余的点光: 只熄灭, 不卸载
    for (let i = config.pointLights.length; i < LIGHT_POOL_SIZE; i++) {
      const l = pointRefs.current[i];
      if (l) l.intensity = 0;
    }

    // 雾: 常驻挂载, 无雾模式把 near/far 推到极远处 (雾因子≈0, 视觉等价于无雾),
    // 避免 USE_FOG 宏开关引发的全量材质重编译
    const fog = scene.fog as THREE.Fog | null;
    if (fog) {
      if (config.fog) {
        fog.color.set(config.fog[1]);
        fog.near = config.fog[0];
        fog.far = config.fog[0] + 15;
      } else {
        fog.near = 1e6;
        fog.far = 1e6 + 10;
      }
    }
  }, [config, scene]);

  if (!config) return null;

  return (
    <>
      <fog attach="fog" args={['#000000', 1e6, 1e6 + 10]} />
      <ambientLight ref={ambientRef} />
      <directionalLight
        ref={dirRef}
        position={config.dirPos}
        castShadow
        shadow-mapSize-width={config.shadowMapSize ?? 2048}
        shadow-mapSize-height={config.shadowMapSize ?? 2048}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      <directionalLight ref={dir2Ref} />
      <hemisphereLight ref={hemiRef} />
      {Array.from({ length: LIGHT_POOL_SIZE }, (_, i) => (
        <pointLight
          key={i}
          ref={(el) => { pointRefs.current[i] = el; }}
          decay={2}
        />
      ))}
    </>
  );
}

/* ==================== 环境光照 (离线 IBL — 用 Lightformer 拼出柔和工作室光, 无需外部 HDR) ==================== */
function StudioEnvironment() {
  return (
    <Environment resolution={64} frames={1}>
      {/* 顶部大面暖光 (主柔光) */}
      <Lightformer intensity={1.4} position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[12, 12, 1]} color="#fff4e2" />
      {/* 左后冷补光 */}
      <Lightformer intensity={0.55} position={[-6, 2.5, -5]} rotation={[0, Math.PI / 4, 0]} scale={[7, 4, 1]} color="#dfe9f4" />
      {/* 右前暖补光 */}
      <Lightformer intensity={0.45} position={[6, 2.5, 6]} rotation={[0, -Math.PI * 0.75, 0]} scale={[7, 4, 1]} color="#f3ede2" />
      {/* 背面淡蓝环境 */}
      <Lightformer intensity={0.35} position={[0, 2, -8]} scale={[10, 4, 1]} color="#e8eef6" />
    </Environment>
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
    softShadow,
    enableDrag = false, dragSize, dragOffset, dragValidator, dragValidatorDetailed,
    onDragOver, onDrop, onDragEnd, onPointerMissed, children,
  } = props;

  const walkthroughIndex = useAppStore((s) => s.walkthroughIndex);
  const ghostHandleRef = useRef<EngineDragGhostHandle>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  // 保存最新 props 到 ref, 供原生事件处理器读取, 避免重新绑定 listener
  const propsRef = useRef({ enableDrag, dragOffset, dragValidator, dragValidatorDetailed, onDragOver, onDrop, onDragEnd });
  propsRef.current = { enableDrag, dragOffset, dragValidator, dragValidatorDetailed, onDragOver, onDrop, onDragEnd };

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    // 找到实际的 canvas DOM (R3F 在 container 内渲染 <canvas>)
    const getCanvas = () => container.querySelector('canvas') as HTMLCanvasElement | null;

    // 校验落点: 优先使用带原因的校验器
    const checkPlacement = (
      x: number,
      z: number,
    ): { ok: boolean; reason?: string; snap?: { x: number; z: number; rotation?: number; y?: number; lz?: number } } => {
      const detailed = propsRef.current.dragValidatorDetailed;
      if (detailed) return detailed(x, z);
      const fn = propsRef.current.dragValidator;
      return { ok: fn ? fn(x, z) : true };
    };

    // container 的 boundingRect 在拖拽期间不变, 缓存 100ms 避免强制重排
    let rect: DOMRect | null = null;
    let rectTime = 0;
    const getRect = () => {
      const now = performance.now();
      if (!rect || now - rectTime > 100) {
        rect = container.getBoundingClientRect();
        rectTime = now;
      }
      return rect;
    };

    // 无效落点的原因提示条 (直接操作 DOM, 不经过 React, 避免高频重渲染)
    const showHint = (reason: string, clientX: number, clientY: number) => {
      const el = hintRef.current;
      if (!el) return;
      const r = getRect();
      el.textContent = reason;
      el.style.display = 'block';
      el.style.left = `${clientX - r.left + 14}px`;
      el.style.top = `${clientY - r.top + 18}px`;
    };
    const hideHint = () => {
      const el = hintRef.current;
      if (el) el.style.display = 'none';
    };

    const applyGhost = (clientX: number, clientY: number, dt: DataTransfer | null) => {
      const floor = screenToFloor(clientX, clientY);
      if (!floor) return false;
      const [sx, sz] = snapToGrid(floor[0], floor[1]);
      const result = checkPlacement(sx, sz);
      const handle = ghostHandleRef.current;
      if (handle?.group) {
        // 结构元素带吸附 (snap): 位置/朝向/抬升都以吸附结果为准; 家具则用鼠标落点
        const snap = result.snap;
        const px = snap?.x ?? sx;
        const pz = snap?.z ?? sz;
        const theta = ((snap?.rotation ?? 0) * Math.PI) / 180;
        const off = propsRef.current.dragOffset;
        // lz: 沿旋转后 local +Z 的偏移 (飘窗的 position 在贴墙面, 预览盒要推到墙外侧)
        const lz = snap?.lz ?? 0;
        handle.group.visible = true;
        handle.group.position.set(
          px + (off?.[0] ?? 0) + Math.sin(theta) * lz,
          handle.height / 2 + (snap?.y ?? 0),
          pz + (off?.[1] ?? 0) + Math.cos(theta) * lz,
        );
        handle.group.rotation.y = theta;
        _ghostColor.set(result.ok ? '#22c55e' : '#ef4444');
        handle.boxMat?.color.copy(_ghostColor);
        handle.lineMat?.color.copy(_ghostColor);
      }
      // 无效落点: 显示原因 + 禁止放下 (dropEffect=none 会显示禁止光标并阻止 drop)
      if (result.ok) hideHint();
      else showHint(result.reason ?? '此处不可放置', clientX, clientY);
      if (dt) dt.dropEffect = result.ok ? 'copy' : 'none';
      propsRef.current.onDragOver?.(sx, sz);
      return true;
    };

    const onNativeDragOver = (e: DragEvent) => {
      if (!propsRef.current.enableDrag) return;
      e.preventDefault();
      applyGhost(e.clientX, e.clientY, e.dataTransfer);
    };

    const onNativeDrop = (e: DragEvent) => {
      if (!propsRef.current.enableDrag) return;
      e.preventDefault();
      const floor = screenToFloor(e.clientX, e.clientY);
      if (floor) {
        const [sx, sz] = snapToGrid(floor[0], floor[1]);
        // 放下前再校验一次 (部分浏览器 dropEffect=none 不阻止 drop)
        const result = checkPlacement(sx, sz);
        if (result.ok) {
          // 吸附元素 (门窗/飘窗) 提交吸附后的坐标, 与预览框看到的位置一致
          propsRef.current.onDrop?.(result.snap?.x ?? sx, result.snap?.z ?? sz);
        }
      }
      const handle = ghostHandleRef.current;
      if (handle?.group) handle.group.visible = false;
      hideHint();
      propsRef.current.onDragEnd?.();
    };

    const hideGhost = () => {
      const handle = ghostHandleRef.current;
      if (handle?.group) handle.group.visible = false;
      hideHint();
    };

    const onNativeDragLeave = (e: DragEvent) => {
      // relatedTarget 仍在容器内, 说明只是移动到了子元素 (canvas 等), 不算真正离开
      const to = e.relatedTarget as Node | null;
      if (to && container.contains(to)) return;
      hideGhost();
    };

    // 原生监听绑定在容器上 (事件捕获阶段, 抢在 React 之前)
    container.addEventListener('dragover', onNativeDragOver);
    container.addEventListener('drop', onNativeDrop);
    container.addEventListener('dragleave', onNativeDragLeave);
    window.addEventListener('dragend', hideGhost);

    return () => {
      container.removeEventListener('dragover', onNativeDragOver);
      container.removeEventListener('drop', onNativeDrop);
      container.removeEventListener('dragleave', onNativeDragLeave);
      window.removeEventListener('dragend', hideGhost);
    };
  }, []);

  const isWalkthrough = viewMode === 'walkthrough';

  return (
    <div
      ref={canvasContainerRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      {/* 无效落点原因提示 (拖拽时直接写 DOM, 不经过 React) */}
      <div
        ref={hintRef}
        style={{
          position: 'absolute',
          display: 'none',
          pointerEvents: 'none',
          zIndex: 20,
          padding: '3px 9px',
          borderRadius: 999,
          background: '#ef4444',
          color: '#ffffff',
          fontSize: 11,
          lineHeight: 1.5,
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
      />
    <Canvas
      shadows="soft"
      dpr={[1, 2]}
      gl={{ antialias: true }}
      onCreated={({ gl }) => { gl.toneMappingExposure = 1.12; }}
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
        <DisableLinePicking />
        {/* PCSS 软阴影: 阴影边缘随距离柔和扩散, 去除硬边截图感 */}
        {softShadow !== false && (
          <SoftShadows
            size={(softShadow?.size) ?? 22}
            samples={softShadow?.samples ?? 8}
            focus={softShadow?.focus ?? 0.7}
          />
        )}
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
        <PerformanceProbe />

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
        <StudioEnvironment />
        <ExportSceneReporter />
        <RenderModeController />

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

        {/* 设计内容根组: 导出 GLB 时只导这个组 (灯光/网格/Environment 等引擎辅助在组外) */}
        <group name={EXPORT_CONTENT_GROUP}>{children}</group>
      </Suspense>
    </Canvas>
    </div>
  );
}
