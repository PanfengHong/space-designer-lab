/**
 * 通用删除确认框 — 固定居中遮罩 + 白色卡片。
 * 所有删除入口 (Delete 键 / 属性面板删除按钮) 统一经由
 * store.requestDeleteConfirm 弹出, 由 Viewport 挂载渲染。
 */
export function ConfirmDialog({
  title,
  message,
  confirmText = '删除',
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onPointerDown={onCancel}
    >
      <div
        className="bg-white rounded-lg shadow-xl border border-gray-200 w-80 p-4"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-xs text-gray-600 mb-4 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-xs rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
