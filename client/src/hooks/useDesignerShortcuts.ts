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
 * 设计器快捷键 (室内 / 户外共用, 按 designerMode 分流)
 *
 * 通用:
 * - Ctrl(Cmd)+Z        : 撤销   Ctrl(Cmd)+Shift+Z 或 Ctrl+Y : 重做
 * - Delete / Backspace : 删除当前选中对象
 * - Esc                : 取消选中
 *
 * 仅室内:
 * - R / Shift+R        : 选中家具顺时针 / 逆时针旋转 90°
 * - Ctrl(Cmd)+D        : 复制选中家具
 *
 * 说明: Ctrl+S(保存) 由 TopBar 自己监听, 这里不重复处理。
 */
export function useDesignerShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const s = useAppStore.getState();
      if (isTypingTarget(e.target)) return;

      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // ---- 撤销 / 重做 (两种模式通用, 栈内容由 store 按 designerMode 决定) ----
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

      const outdoor = s.designerMode === 'outdoor';

      // ---- 复制 (仅室内家具) ----
      if (!outdoor && mod && key === 'd') {
        if (!s.selectedFurnitureId) return;
        e.preventDefault();
        s.duplicateFurniture(s.selectedFurnitureId);
        return;
      }
      // 其余带修饰键的组合交给浏览器/系统
      if (mod || e.altKey) return;

      // ---- 删除 (统一弹确认框, 由 Viewport 渲染 ConfirmDialog) ----
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (outdoor) {
          if (s.selectedGroundId) {
            e.preventDefault();
            const g = s.outdoorSceneData.ground.find((x) => x.id === s.selectedGroundId);
            s.requestDeleteConfirm('删除地面元素', `确定要删除「${g?.name ?? '选中地面元素'}」吗？删除后可通过 Ctrl+Z 撤销。`, () => {
              useAppStore.getState().removeGroundItem(s.selectedGroundId!);
            });
            return;
          }
          if (s.selectedOutdoorObjectId) {
            e.preventDefault();
            const o = s.outdoorSceneData.objects.find((x) => x.id === s.selectedOutdoorObjectId);
            s.requestDeleteConfirm('删除空间对象', `确定要删除「${o?.name ?? '选中空间对象'}」吗？删除后可通过 Ctrl+Z 撤销。`, () => {
              useAppStore.getState().removeOutdoorObject(s.selectedOutdoorObjectId!);
            });
            return;
          }
          return;
        }
        // 室内: 家具优先, 其次建筑结构元素
        if (s.selectedFurnitureId) {
          e.preventDefault();
          const f = findFurniture(s.sceneData, s.selectedFurnitureId);
          s.requestDeleteConfirm('删除家具', `确定要删除「${f?.name ?? '选中家具'}」吗？删除后可通过 Ctrl+Z 撤销。`, () => {
            useAppStore.getState().removeFurniture(s.selectedFurnitureId!);
          });
          return;
        }
        if (s.selectedStructureId) {
          e.preventDefault();
          s.requestDeleteConfirm('删除建筑结构', '确定要删除选中的建筑结构元素吗？删除后可通过 Ctrl+Z 撤销。', () => {
            useAppStore.getState().removeStructure(s.selectedStructureId!);
          });
          return;
        }
        return;
      }

      // ---- 取消选中 ----
      if (e.key === 'Escape') {
        if (outdoor) {
          s.selectGround(null);
          s.selectOutdoorObject(null);
        } else {
          s.selectFurniture(null);
          s.selectStructure(null);
        }
        return;
      }

      // ---- 旋转 90° (仅室内家具) ----
      if (!outdoor && key === 'r') {
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
