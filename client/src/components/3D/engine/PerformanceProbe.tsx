import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../../store/useAppStore';
import { usePerformanceStore } from '../../../store/usePerformanceStore';

/** 采样间隔 (秒) — 0.5s 刷新一次, 避免频繁触发 React 重渲染 */
const SAMPLE_INTERVAL = 0.5;

/**
 * 性能探针: 挂在 Canvas 内, 按固定间隔从 renderer.info / scene 图中采集指标,
 * 写入 usePerformanceStore, 供画布外的性能监控面板读取。
 */
export function PerformanceProbe() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const report = usePerformanceStore((s) => s.report);

  const acc = useRef({ frames: 0, elapsed: 0, gpu: '不可用' });

  // GPU 型号只在初始化时查询一次
  useEffect(() => {
    try {
      const ctx = gl.getContext() as WebGLRenderingContext;
      const ext = ctx.getExtension('WEBGL_debug_renderer_info') as { UNMASKED_RENDERER_WEBGL: number } | null;
      if (ext) {
        const name = ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL);
        if (typeof name === 'string' && name) acc.current.gpu = name;
      } else {
        acc.current.gpu = '受浏览器限制';
      }
    } catch {
      acc.current.gpu = '不可用';
    }
  }, [gl]);

  useFrame((_, delta) => {
    const a = acc.current;
    a.frames += 1;
    a.elapsed += delta;
    if (a.elapsed < SAMPLE_INTERVAL) return;

    const fps = a.frames / a.elapsed;
    const frameTime = (a.elapsed / a.frames) * 1000;

    // 场景构成统计 (遍历一次场景图, 0.5s 一次开销可忽略)
    let meshes = 0;
    let lights = 0;
    let shadowLights = 0;
    const materialSet = new Set<THREE.Material>();

    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        meshes += 1;
        const mat = (obj as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((m) => materialSet.add(m));
        else if (mat) materialSet.add(mat);
      }
      if ((obj as THREE.Light).isLight) {
        lights += 1;
        if ((obj as THREE.Light).castShadow) shadowLights += 1;
      }
    });

    // 当前模型的业务统计 (室内: 空间/墙体/家具; 户外: 地面/对象)
    const app = useAppStore.getState();
    const sceneStats: { label: string; value: string }[] = [];
    if (app.designerMode === 'outdoor') {
      sceneStats.push(
        { label: '地面元素', value: String(app.outdoorSceneData.ground.length) },
        { label: '空间对象', value: String(app.outdoorSceneData.objects.length) },
      );
    } else {
      const rooms = app.sceneData.rooms;
      sceneStats.push(
        { label: '空间', value: String(rooms.length) },
        { label: '墙体', value: String(rooms.reduce((n, r) => n + r.walls.length, 0)) },
        { label: '家具', value: String(rooms.reduce((n, r) => n + r.furniture.length, 0)) },
        {
          label: '门窗',
          value: String(
            rooms.reduce(
              (n, r) =>
                n + r.doors.length + r.windows.length + (r.bayWindows?.length ?? 0) + (r.frenchWindows?.length ?? 0),
              0,
            ),
          ),
        },
      );
    }

    // JS 堆内存 (仅 Chromium 系浏览器提供)
    const perfMemory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;

    report({
      fps,
      frameTime,
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      lines: gl.info.render.lines,
      points: gl.info.render.points,
      programs: gl.info.programs?.length ?? 0,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      meshes,
      materials: materialSet.size,
      lights,
      shadowLights,
      dpr: gl.getPixelRatio(),
      drawingBuffer: [gl.domElement.width, gl.domElement.height],
      gpu: a.gpu,
      jsHeapMB: perfMemory ? perfMemory.usedJSHeapSize / 1048576 : null,
      sceneStats,
      timestamp: performance.now(),
    });

    a.frames = 0;
    a.elapsed = 0;
  });

  return null;
}
