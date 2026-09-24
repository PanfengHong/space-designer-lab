import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';

export function Login() {
  const login = useAppStore((s) => s.login);
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('请输入用户名');
      return;
    }
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }

    setLoading(true);
    // 模拟登录请求
    setTimeout(() => {
      setLoading(false);
      login(username.trim());
      navigate('/home');
    }, 600);
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-gray-50 select-none overflow-hidden relative">
      {/* 背景装饰 — 淡色网格 */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(#e5e5e5 1px, transparent 1px), linear-gradient(90deg, #e5e5e5 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* 背景光晕 */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gray-200 rounded-full blur-3xl opacity-40" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gray-300 rounded-full blur-3xl opacity-30" />

      {/* 登录卡片 */}
      <div className="relative z-10 w-[400px] bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* 顶部 Logo 区 */}
        <div className="px-8 pt-8 pb-6 text-center border-b border-gray-100">
          <div className="w-14 h-14 rounded-full bg-gray-900 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="font-bold text-gray-900 text-lg tracking-wide">BASE</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-900 text-lg font-medium">空间设计实验室</span>
          </div>
          <div className="text-[11px] text-gray-400 tracking-widest uppercase">Interactive Spatial Design</div>
        </div>

        {/* 表单区 */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              className="w-full px-3 py-2.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg outline-none transition-colors focus:border-gray-900 placeholder:text-gray-400"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full px-3 py-2.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg outline-none transition-colors focus:border-gray-900 placeholder:text-gray-400"
            />
          </div>

          {error && (
            <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                登录中...
              </>
            ) : (
              '登 录'
            )}
          </button>

          {/* 辅助链接 */}
          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-1.5 text-gray-500 cursor-pointer">
              <input type="checkbox" className="accent-gray-900" />
              记住我
            </label>
            <span className="text-gray-500 hover:text-gray-900 cursor-pointer transition-colors">忘记密码？</span>
          </div>
        </form>

        {/* 底部 */}
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
          <span className="text-[11px] text-gray-400">还没有账号？</span>
          <span className="text-[11px] text-gray-700 hover:text-gray-900 cursor-pointer transition-colors ml-1 font-medium">
            立即注册
          </span>
        </div>
      </div>

      {/* 页脚 */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-[11px] text-gray-400">
        © 2026 BASE · 空间设计实验室 · 仅供演示使用
      </div>
    </div>
  );
}
