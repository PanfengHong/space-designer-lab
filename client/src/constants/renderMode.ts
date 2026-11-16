/**
 * 渲染模式 (arctic / shaded / material) 的共用常量。
 *
 * 白模 (arctic) 的观感由两个地方共同实现:
 *   BaseScene.applyMode   —— 把组内 PBR 材质整体换成共享粘土材质 (统一、最省 draw call)
 *   Floor                 —— 地面**自己**按 renderMode 换外观, 不参与上面的整体替换
 * 两边必须用同一份粘土色, 否则白模里地面会和墙体/家具差一个色, 出现"一块补丁"。
 */

/** 素模粘土材质色 (微暖白, 比纯白更有石膏感) */
export const CLAY_COLOR = '#f2f1ee';

/** 素模粘土粗糙度 —— 全哑光, 靠形体而不是反射出效果 */
export const CLAY_ROUGHNESS = 0.95;
