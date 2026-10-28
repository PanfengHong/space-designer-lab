import { useState, useEffect, useRef } from 'react';
import { HelpCircle, Download, Save, Check } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ExportPanel } from './ExportPanel';

export function TopBar() {
  const currentUser = useAppStore((s) => s.currentUser);
  const designerMode = useAppStore((s) => s.designerMode);
  const modeLabel = designerMode === 'outdoor' ? '户外空间设计' : '室内户型设计';
  const isDirty = useAppStore((s) => s.isDirty);
  const saveCurrentScene = useAppStore((s) => s.saveCurrentScene);
  const activeModelId = useAppStore((s) => s.activeModelId);
  const activeCampusItem = useAppStore((s) => s.activeCampusItem);
  const activeModelItem = useAppStore((s) => s.activeModelItem);

  // 保存反馈状态
  const [savedFlash, setSavedFlash] = useState(false);
  const hasActiveModel = !!activeModelId || !!activeCampusItem;

  // 导出面板开关 (点击面板外部关闭)
  const [exportOpen, setExportOpen] = useState(false);
  const exportWrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!exportOpen) return;
    const onDown = (e: MouseEvent) => {
      if (exportWrapRef.current && !exportWrapRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [exportOpen]);

  const handleSave = async () => {
    if (!hasActiveModel) return;
    const ok = await saveCurrentScene();
    if (ok) {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    }
  };

  // 当前模型名称 (室内 → 模型, 户外 → 园区)
  const currentModelName =
    (designerMode === 'outdoor' ? activeCampusItem?.name : activeModelItem?.name) ?? '未打开模型';

  // 按 Ctrl/Cmd + S 触发保存
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveModel]);

  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 select-none">
      {/* 左侧 Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 text-sm tracking-wide">BASE</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-900 text-sm font-medium">空间设计实验室</span>
            <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
              designerMode === 'outdoor' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
            }`}>
              {modeLabel}
            </span>
          </div>
          <div className="text-[10px] text-gray-400 tracking-widest uppercase">Interactive Spatial Design</div>
        </div>
      </div>

      {/* 中间: 当前模型名称 */}
      <div className="flex items-center gap-2 min-w-0 max-w-[36rem] px-4">
        <span
          className="text-xs font-medium text-gray-700 truncate"
          title={currentModelName}
        >
          {currentModelName}
        </span>
      </div>

      {/* 右侧按钮 */}
      <div className="flex items-center gap-2">
        
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
          <HelpCircle size={14} />
          识别说明
        </button>
        {/* 导出模型 (下拉面板: 名称 + GLB 格式) */}
        <div className="relative" ref={exportWrapRef}>
          <button
            onClick={() => setExportOpen((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
              exportOpen
                ? 'bg-gray-700 text-white'
                : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            <Download size={14} />
            导出模型
          </button>
          {exportOpen && <ExportPanel onClose={() => setExportOpen(false)} />}
        </div>
        {/* 保存按钮 */}
        <button
          onClick={handleSave}
          disabled={!hasActiveModel}
          title={hasActiveModel ? '保存 (Ctrl/Cmd + S)' : '请先打开一个模型'}
          className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
            savedFlash
              ? 'bg-green-600 text-white'
              : hasActiveModel
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {savedFlash ? <Check size={14} /> : <Save size={14} />}
          {savedFlash ? '已保存' : '保存'}
          {/* 未保存修改指示器 */}
          {isDirty && !savedFlash && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-orange-500 ring-2 ring-white" />
          )}
        </button>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        {/* 用户头像 — 纯展示 */}
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-medium">
            {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="text-xs text-gray-600">{currentUser?.username || '用户'}</span>
        </div>
      </div>
    </div>
  );
}
