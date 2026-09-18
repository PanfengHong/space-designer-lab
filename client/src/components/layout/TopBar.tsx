import { HelpCircle, Download } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export function TopBar() {
  const currentUser = useAppStore((s) => s.currentUser);

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
          </div>
          <div className="text-[10px] text-gray-400 tracking-widest uppercase">Interactive Spatial Design</div>
        </div>
      </div>

      {/* 中间标签 */}
      <div className="flex items-center gap-6 text-xs text-gray-600">
        <span className="cursor-pointer hover:text-gray-900 transition-colors">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-2 align-middle" />
          共享建筑
        </span>
        <span className="cursor-pointer hover:text-gray-900 transition-colors">三者设计</span>
        <span className="cursor-pointer hover:text-gray-900 transition-colors">比例实测</span>
      </div>

      {/* 右侧按钮 */}
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
          <HelpCircle size={14} />
          识别说明
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-900 text-white hover:bg-gray-800 rounded-md transition-colors">
          <Download size={14} />
          导出模型
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
