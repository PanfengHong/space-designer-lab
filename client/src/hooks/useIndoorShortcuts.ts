import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { findFurniture, normalizeDeg } from '../utils/sceneQuery';

/** 焦点在输入控件里时不劫持按键 (面板上有大量数字输入/下拉) */
function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

/**
 * 室内设计器快捷键
 * - Delete / Backspace : 删除选中的家具 / 建筑结构元素 (墙体 门窗)
 * - Esc                : 取消选中 (家具 + 建筑结构)
 * - R / Shift+R        : 选中家具顺时针 / 逆时针旋转 90°
 * - Ctrl(Cmd)+Z        : 撤销   Ctrl(Cmd)+Shift+Z 或 Ctrl+Y : 重做
 * - Ctrl(Cmd)+D        : 复制选中家具
 *
 * 说明: Ctrl+S(保存) 由 TopBar 自己监听, 这里不重复处理。
 */
export function useIndoorShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const s = useAppStore.getState();
      if (s.designerMode !== 'interior') return;
      if (isTypingTarget(e.target)) return;

      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // ---- 撤销 / 重做 ----
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if (mod && key === 'y') {
        e.preventDefault();
        s.redo();
        return;
      }
      // ---- 复制 ----
      if (mod && key === 'd') {
        if (!s.selectedFurnitureId) return;
        e.preventDefault();
        s.duplicateFurniture(s.selectedFurnitureId);
        return;
      }
      // 其余带修饰键的组合交给浏览器/系统
      if (mod || e.altKey) return;

      // ---- 删除 (家具优先, 其次建筑结构元素) ----
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (s.selectedFurnitureId) {
          e.preventDefault();
          s.removeFurniture(s.selectedFurnitureId);
          return;
        }
        if (s.selectedStructureId) {
          e.preventDefault();
          s.removeStructure(s.selectedStructureId);
          return;
        }
        return;
      }

      // ---- 取消选中 ----
      if (e.key === 'Escape') {
        s.selectFurniture(null);
        s.selectStructure(null);
        return;
      }

      // ---- 旋转 90° ----
      if (key === 'r') {
        const id = s.selectedFurnitureId;
        if (!id) return;
        const f = findFurniture(s.sceneData, id);
        if (!f || f.embedded) return;
        e.preventDefault();
        s.updateFurniture(id, { rotation: normalizeDeg(f.rotation + (e.shiftKey ? -90 : 90)) });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
