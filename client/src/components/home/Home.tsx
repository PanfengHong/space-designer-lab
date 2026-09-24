import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronDown, User, Settings, Home as HomeIcon, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';

/**
 * 登录后工作台 — 选择设计方向:
 *  室内户型设计 / 户外空间设计 (园区等)
 */
export function Home() {
  const { currentUser, logout } = useAppStore();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-50 overflow-hidden select-none">
      {/* 顶部导航 */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center">
            <HomeIcon size={17} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-sm tracking-wide">BASE</span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-900 text-sm font-medium">空间设计工作台</span>
            </div>
            <div className="text-[10px] text-gray-400 tracking-widest uppercase">Spatial Design Workbench</div>
          </div>
        </div>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-medium">
              {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="text-xs text-gray-600">{currentUser?.username || '用户'}</span>
            <ChevronDown size={14} className={`text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
              <div className="px-3 py-2 border-b border-gray-100">
                <div className="text-xs font-medium text-gray-900">{currentUser?.username || '用户'}</div>
                <div className="text-[10px] text-gray-400">已登录</div>
              </div>
              <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                <User size={13} />
                个人中心
              </button>
              <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                <Settings size={13} />
                设置
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut size={13} />
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 主内容 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden">
        {/* 背景网格装饰 */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gray-200 rounded-full blur-3xl opacity-40" />

        <div className="relative z-10 text-center mb-10">
          <h1 className="text-2xl font-semibold text-gray-900">选择设计方向</h1>
          <p className="text-xs text-gray-500 mt-2 tracking-wide">室内户型与户外园区, 统一的空间设计体验</p>
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-3xl">
          {/* 室内户型设计 */}
          <button
            onClick={() => navigate('/models')}
            className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all p-7 text-left"
          >
            <div className="h-36 rounded-xl mb-5 relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
              {/* 户型示意 */}
              <svg viewBox="0 0 120 90" className="w-40 h-auto text-gray-400 group-hover:text-gray-500 transition-colors">
                <rect x="10" y="10" width="45" height="35" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                <rect x="55" y="10" width="55" height="22" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                <rect x="55" y="32" width="55" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                <rect x="10" y="45" width="30" height="35" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                <rect x="40" y="45" width="35" height="35" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                <rect x="75" y="45" width="35" height="35" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-semibold text-gray-900">室内户型设计</div>
                <div className="text-[11px] text-gray-400 mt-1 tracking-wide">APARTMENT · 建筑结构层 / 室内设计层</div>
              </div>
              <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-xs text-gray-500 mt-3 leading-relaxed">
              房间墙体、门窗、家具布置与户型平面, 支持透视、轴测、顶视、平面与漫游五种视图。
            </p>
          </button>

          {/* 户外空间设计 */}
          <button
            onClick={() => navigate('/campus')}
            className="group bg-white rounded-2xl border border-blue-200 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all p-7 text-left"
          >
            <div className="h-36 rounded-xl mb-5 relative overflow-hidden bg-gradient-to-br from-blue-50 to-sky-100 flex items-center justify-center">
              {/* 园区示意 */}
              <svg viewBox="0 0 120 90" className="w-44 h-auto">
                {/* 地面 */}
                <rect x="8" y="12" width="104" height="66" rx="3" fill="#ffffff" stroke="#b6c6d6" strokeWidth="1.5" />
                {/* 河流 */}
                <rect x="100" y="12" width="12" height="66" fill="#9ccdee" />
                {/* 草地 */}
                <rect x="18" y="46" width="30" height="24" rx="2" fill="#cfe9cd" stroke="#a8d4a6" strokeWidth="1" />
                {/* 道路 */}
                <rect x="8" y="36" width="92" height="6" fill="#c2cad4" />
                <line x1="12" y1="39" x2="96" y2="39" stroke="#ffffff" strokeWidth="1" strokeDasharray="4 3" />
                {/* 建筑 */}
                <rect x="58" y="18" width="18" height="14" fill="#d9ebf9" stroke="#5a9fd4" strokeWidth="1.2" />
                <line x1="64" y1="18" x2="64" y2="32" stroke="#5a9fd4" strokeWidth="0.8" />
                <line x1="70" y1="18" x2="70" y2="32" stroke="#5a9fd4" strokeWidth="0.8" />
                <rect x="80" y="46" width="22" height="12" fill="#f2f5f9" stroke="#b8c4d0" strokeWidth="1.2" />
                {/* 车辆 */}
                <rect x="30" y="37.2" width="6" height="3" rx="0.8" fill="#ffffff" stroke="#8a97a5" strokeWidth="0.6" />
                <rect x="70" y="37.2" width="8" height="3.4" rx="0.6" fill="#cfe2f5" stroke="#4a90d9" strokeWidth="0.6" />
              </svg>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-semibold text-gray-900">户外空间设计</div>
                <div className="text-[11px] text-blue-400 mt-1 tracking-wide">CAMPUS · 地面结构层 / 空间设计层</div>
              </div>
              <ChevronRight size={18} className="text-blue-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-xs text-gray-500 mt-3 leading-relaxed">
              地面、草地、河流、道路 (含高架) 的地面结构, 以及车辆、建筑等空间对象, 适用于园区规划。
            </p>
          </button>
        </div>

        <div className="relative z-10 mt-10 text-[11px] text-gray-400 tracking-wide">
          © 2026 BASE · 空间设计实验室 · 仅供演示使用
        </div>
      </div>
    </div>
  );
}
