import { create } from 'zustand';

/** 性能监控指标 (three.js renderer.info + 场景统计) */
export interface PerformanceMetrics {
  // 帧率
  fps: number;
  frameTime: number;          // 平均帧耗时 (ms)
  // 渲染
  drawCalls: number;
  triangles: number;
  lines: number;
  points: number;
  programs: number;           // 着色器程序数
  // 显存 / 资源
  geometries: number;
  textures: number;
  // 场景构成
  meshes: number;
  materials: number;
  lights: number;
  shadowLights: number;
  // 运行环境
  dpr: number;
  drawingBuffer: [number, number];
  gpu: string;
  jsHeapMB: number | null;
  // 当前模型统计
  sceneStats: { label: string; value: string }[];
  timestamp: number;
}

interface PerformanceState {
  metrics: PerformanceMetrics | null;
  history: number[];           // FPS 采样历史 (悬浮按钮迷你曲线)
  report: (m: PerformanceMetrics) => void;
}

const HISTORY_SIZE = 60;

export const usePerformanceStore = create<PerformanceState>((set) => ({
  metrics: null,
  history: [],
  report: (m) =>
    set((state) => ({
      metrics: m,
      history: [...state.history, m.fps].slice(-HISTORY_SIZE),
    })),
}));

/** 便捷选择器: 当前 FPS (无数据时返回 null) */
export const selectFps = (s: PerformanceState) => s.metrics?.fps ?? null;
