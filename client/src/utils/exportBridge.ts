import * as THREE from 'three';

/**
 * 场景导出桥
 *
 * 与 hudAnchor 同一套约定: Canvas 内的 ExportSceneReporter 在挂载时把
 * 「设计内容根组」登记进来, TopBar 的导出面板据此取对象交给 GLTFExporter。
 * 2D 平面图模式没有 Canvas, 这里为 null, 导出面板需提示用户切回 3D 视图。
 */
export const exportBridge: { content: THREE.Object3D | null } = { content: null };

/** 设计内容根组的固定名字 (BaseScene 里包住 children 的那个 group) */
export const EXPORT_CONTENT_GROUP = 'DesignerContent';
