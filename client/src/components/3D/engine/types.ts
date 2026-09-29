import type { ReactNode } from 'react';

/** 视图模式: 透视 / 轴测 / 顶视 / 平面 / 漫游 */
export type ViewMode = 'perspective' | 'axonometric' | 'top' | 'plan' | 'walkthrough';

/** 单个相机预设 (某视图模式下的默认位置 + 朝向) */
export interface CameraPreset {
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
}

/** 漫游视点 */
export interface WalkPoint {
  position: [number, number, number];
  target: [number, number, number];
}

/** 点光源配置 */
export interface PointLightConfig {
  pos: [number, number, number];
  color: string;
  intensity: number;
  dist: number;
}

/** 单种光照模式的完整配置 */
export interface LightingModeConfig {
  ambient: number;
  ambientColor: string;
  dirIntensity: number;
  dirColor: string;
  dirPos: [number, number, number];
  dir2Intensity: number;
  dir2Color?: string;
  dir2Pos?: [number, number, number];
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  pointLights: PointLightConfig[];
  fog: [number, string] | null;
  castShadow?: boolean;
  shadowCameraRange?: number;
}

/** 网格配置 */
export interface GridConfig {
  position: [number, number, number];
  args: [number, number];
  cellSize: number;
  sectionSize: number;
  cellColor: string;
  sectionColor: string;
  fadeDistance: number;
  infiniteGrid: boolean;
}

/**
 * 统一 3D 渲染引擎配置接口
 * 引擎封装 Canvas / 相机 / 光照 / 网格 / 手势 / 拖拽 等基础设施
 * 场景内容由 children 注入, 引擎不感知具体模型类型
 */
export interface BaseSceneProps {
  /** 场景中心点 (相机 target、比例尺计算基准) */
  center: [number, number, number];
  /** 当前视图模式 */
  viewMode: ViewMode;
  /** 触发相机重置 */
  resetCamera: boolean;
  /** 各视图模式的相机预设 */
  cameraPresets: Record<ViewMode, CameraPreset>;
  /** 默认 FOV */
  defaultFov?: number;
  /** 漫游视点列表 */
  walkPoints?: WalkPoint[];
  /** 当前光影模式标识 */
  lighting: string;
  /** 各种光影模式配置 */
  lightingConfigs: Record<string, LightingModeConfig>;
  /** 网格配置, 不传则不渲染 */
  grid?: GridConfig;
  /** 背景色 */
  background: string;

  /** 是否启用拖拽放置 */
  enableDrag?: boolean;
  /** 拖拽元素尺寸 (预览框大小) */
  dragSize?: [number, number, number] | null;
  /** 放置位置校验 */
  dragValidator?: (x: number, z: number) => boolean;
  /** 拖拽移动回调 (更新预览位置) */
  onDragOver?: (x: number, z: number) => void;
  /** 放置回调 */
  onDrop?: (x: number, z: number) => void;
  /** 拖拽结束/取消回调 */
  onDragEnd?: () => void;
  /** 点击空白处回调 (R3F onPointerMissed, 用于清空选中) */
  onPointerMissed?: () => void;


  /** 场景内容 */
  children: ReactNode;
}
