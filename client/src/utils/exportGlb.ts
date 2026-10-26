import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { exportBridge } from './exportBridge';

export interface ExportGlbOptions {
  /** 仅导出当前可见对象 (隐藏的 ghost / 辅助线不进文件) */
  onlyVisible?: boolean;
}

/**
 * 把当前设计场景导出为 GLB (二进制 glTF 2.0)。
 *
 * - 导出对象是 BaseScene 里包住场景内容的 DesignerContent 组,
 *   灯光 / 地面网格 / Environment / 拖拽 ghost 等引擎辅助对象都不在组内, 天然被排除。
 * - 导出期间临时把组名改为文件名 (Blender 等工具会把根节点名当对象名), 完成后恢复。
 */
export async function exportSceneAsGlb(
  fileName: string,
  { onlyVisible = true }: ExportGlbOptions = {}
): Promise<Blob> {
  const root = exportBridge.content;
  if (!root) throw new Error('未检测到 3D 场景, 请切换到 3D 视图后重试');

  const prevName = root.name;
  root.name = fileName;

  try {
    const exporter = new GLTFExporter();
    const result = await exporter.parseAsync(root, {
      binary: true, // 固定导出 GLB (二进制 glTF 2.0)
      onlyVisible,
      // 材质导出用标准 PBR 通道; 纹理内嵌进 GLB
    });
    return new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' });
  } finally {
    root.name = prevName;
  }
}

/** 触发浏览器下载 */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 释放 objectURL (Safari 下立即 revoke 可能中断下载, 延迟释放)
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 文件名清理: 去掉非法字符与首尾空白 */
export function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '').trim();
}
