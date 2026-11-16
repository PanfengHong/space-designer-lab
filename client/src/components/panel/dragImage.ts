import type { DragEvent } from 'react';

/**
 * 素材卡片的拖拽影像 —— 两个素材库共用。
 *
 * 3D 模式下卡片里是离屏渲染出的透明 PNG (<img>), 直接拿来当拖拽影像;
 * 平面图模式下卡片里是 SVG 符号, 同样可以交给 setDragImage (浏览器会光栅化一次)。
 * 取不到就返回, 让浏览器用默认快照, 不要在拖拽开始时抛错。
 */
export function setCustomDragImage(e: DragEvent) {
  const host = e.currentTarget as HTMLElement;

  const img = host.querySelector('img');
  if (img && img.complete && img.naturalWidth > 0) {
    try {
      e.dataTransfer.setDragImage(img, Math.round(img.clientWidth / 2), Math.round(img.clientHeight / 2));
      return;
    } catch {
      // 继续尝试下一个候选
    }
  }

  const svg = host.querySelector('svg');
  if (svg) {
    const r = svg.getBoundingClientRect();
    try {
      e.dataTransfer.setDragImage(svg, Math.round(r.width / 2), Math.round(r.height / 2));
    } catch {
      // 交给浏览器默认快照
    }
  }
}
