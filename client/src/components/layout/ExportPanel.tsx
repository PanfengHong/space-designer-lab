import { useEffect, useRef, useState } from 'react';
import { Download, Loader2, X, Check, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { exportBridge } from '../../utils/exportBridge';
import { exportSceneAsGlb, downloadBlob, sanitizeFileName } from '../../utils/exportGlb';

/**
 * 导出模型面板 (TopBar「导出模型」按钮的下拉面板)
 *
 * - 模型名称: 可编辑, 默认取当前模型/园区名
 * - 格式: 暂只支持 GLB (二进制 glTF 2.0), 其余格式占位展示
 * - 仅导出可见对象: 隐藏的 ghost/辅助对象不进文件 (默认开)
 */
/**
 * 导出模型按钮 (图标按钮, 自带下拉面板, 放在视口工具条撤销/重做的右边)
 *
 * - 只保留图标, 悬停有 title 提示
 * - 自含开关状态 + 点击面板外部关闭
 * - onOpenChange 供调用方避让: 面板挂在视口右上角, 会和「视图设置」浮层重叠,
 *   由 Viewport 在打开时临时收起视图设置、关闭后恢复
 */
export function ExportModelButton({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    onOpenChange?.(open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="导出模型"
        className={`p-1.5 rounded-md transition-colors`}
      >
        <Download size={14} />
      </button>
      {open && <ExportPanel onClose={() => setOpen(false)} />}
    </div>
  );
}

export function ExportPanel({ onClose }: { onClose: () => void }) {
  const designerMode = useAppStore((s) => s.designerMode);
  const activeModelItem = useAppStore((s) => s.activeModelItem);
  const activeCampusItem = useAppStore((s) => s.activeCampusItem);

  const defaultName =
    (designerMode === 'outdoor' ? activeCampusItem?.name : activeModelItem?.name) ?? '未命名模型';

  const [name, setName] = useState(defaultName);
  const [onlyVisible, setOnlyVisible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 打开时聚焦并全选名称, 方便直接改名
  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const sceneAvailable = exportBridge.content != null;
  const cleanName = sanitizeFileName(name);
  const canExport = !!cleanName && !busy && sceneAvailable;

  const handleExport = async () => {
    if (!canExport) return;
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const blob = await exportSceneAsGlb(cleanName, { onlyVisible });
      downloadBlob(blob, `${cleanName}.glb`);
      setDone(true);
      setTimeout(onClose, 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : '导出失败, 请重试');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50 select-none">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-100 bg-gray-50/80">
        <div className="flex items-center gap-1.5">
          <Download size={13} className="text-gray-600" />
          <span className="text-xs font-semibold text-gray-700">导出模型</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600" title="关闭">
          <X size={13} />
        </button>
      </div>

      <div className="px-3.5 py-3 space-y-3">
        {/* 模型名称 */}
        <div>
          <label className="block text-[10px] text-gray-500 mb-1.5">模型名称</label>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setDone(false);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleExport()}
            placeholder="输入导出文件名"
            className="w-full text-xs text-gray-800 border border-gray-200 rounded-md px-2.5 py-2 focus:outline-none focus:border-gray-400"
          />
          {cleanName && (
            <div className="text-[9px] text-gray-400 mt-1 font-mono truncate">{cleanName}.glb</div>
          )}
        </div>

        {/* 导出格式 */}
        <div>
          <label className="block text-[10px] text-gray-500 mb-1.5">导出格式</label>
          <select
            value="glb"
            disabled
            className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-2.5 py-2 cursor-not-allowed"
          >
            <option value="glb">GLB (二进制 glTF 2.0)</option>
          </select>
          <div className="text-[9px] text-gray-400 mt-1">通用 3D 格式, 可导入 Blender / Unity / 网页查看器。JSON、OBJ 等格式后续支持。</div>
        </div>

        {/* 仅可见对象 */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-700">仅导出可见对象</span>
          <button
            onClick={() => setOnlyVisible((v) => !v)}
            className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
              onlyVisible ? 'bg-gray-900' : 'bg-gray-300'
            }`}
            title="开启后隐藏对象 (如拖拽虚影) 不会写入文件"
          >
            <span
              className={`absolute top-1/2 -translate-y-1/2 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                onlyVisible ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 场景不可用提示 */}
        {!sceneAvailable && (
          <div className="flex items-start gap-1.5 text-[10px] text-amber-600 bg-amber-50 rounded-md px-2.5 py-2">
            <AlertCircle size={12} className="shrink-0 mt-0.5" />
            <span>当前处于 2D 平面图或 3D 场景尚未加载, 请切回 3D 视图后导出。</span>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="flex items-start gap-1.5 text-[10px] text-red-600 bg-red-50 rounded-md px-2.5 py-2">
            <AlertCircle size={12} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* 导出按钮 */}
        <button
          onClick={handleExport}
          disabled={!canExport}
          className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-md transition-colors ${
            done
              ? 'bg-green-600 text-white'
              : canExport
                ? 'bg-gray-900 text-white hover:bg-gray-800'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {busy ? (
            <>
              <Loader2 size={13} className="animate-spin" /> 正在导出...
            </>
          ) : done ? (
            <>
              <Check size={13} /> 已导出 {cleanName}.glb
            </>
          ) : (
            <>
              <Download size={13} /> 导出 GLB
            </>
          )}
        </button>
      </div>
    </div>
  );
}
