/**
 * HUD 锚点 —— Canvas 内 (useFrame) ↔ Canvas 外 (DOM 悬浮层) 的桥
 *
 * 就近工具条是普通 DOM 节点 (需要真按钮/事件), 但它的屏幕位置只能在 Canvas 内
 * 用相机投影算出来。约定:
 * - 工具条组件挂载时把自身 DOM 节点登记到 hudAnchor.el
 * - Canvas 内的 HudAnchorReporter 每帧投影选中家具的位置, 直接写该节点的
 *   transform / opacity (不经过 React, 避免每帧重渲染)
 */
export const hudAnchor: { el: HTMLElement | null } = { el: null };

/**
 * 墙体端点拖拽的实时数据 —— 拖拽逻辑 (Canvas 内) 每帧写入, 长度标签的 reporter
 * 每帧读取。刻意用普通可变对象而不是 React state: 拖拽中要按帧更新, 走 React
 * 会带来不必要的重渲染 (这正是"跟不上鼠标"的成因之一)。
 */
export const wallDragLive: {
  active: boolean;
  /** 被拖端点的世界坐标 */
  x: number;
  y: number;
  z: number;
  /** 当前墙长 (m) */
  length: number;
} = { active: false, x: 0, y: 0, z: 0, length: 0 };

/** 墙长标签的 DOM 节点 (由 WallLengthHud 挂载时登记) */
export const wallHud: { el: HTMLElement | null } = { el: null };
