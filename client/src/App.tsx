import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { TopBar } from './components/layout/TopBar';
import { LeftPanel } from './components/layout/LeftPanel';
import { Viewport } from './components/layout/Viewport';
import { Login } from './components/auth/Login';
import { ModelManagement } from './components/model/ModelManagement';
import { useAppStore } from './store/useAppStore';
import { getModelById } from './api/mockApi';
import type { ModelItem } from './types';

function DesignerPage() {
  const fullscreen = useAppStore((s) => s.isFullscreen);
  const leftOpen = useAppStore((s) => s.leftPanelOpen);
  const leftWidth = fullscreen || !leftOpen ? 'w-0' : 'w-64';
  const setActiveModel = useAppStore((s) => s.setActiveModel);
  const activeModelItem = useAppStore((s) => s.activeModelItem);
  const params = useParams();
  const modelId = params.modelId;
  const [loading, setLoading] = useState(!!modelId);
  const [error, setError] = useState<string | null>(null);

  // 根据 URL 中的 modelId 加载模型并切换场景
  useEffect(() => {
    if (!modelId) {
      // 无 modelId: 使用默认户型场景
      setActiveModel(null);
      setLoading(false);
      return;
    }
    // 已加载相同模型则跳过
    if (activeModelItem?.id === modelId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getModelById(modelId)
      .then((m) => {
        if (m) {
          setActiveModel(m);
        } else {
          setError('未找到该模型');
        }
      })
      .catch(() => setError('加载模型失败'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId]);

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-50 text-gray-400 text-sm">
        正在加载模型...
      </div>
    );
  }
  if (error) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500 gap-3">
        <span className="text-sm">{error}</span>
        <a href="/models" className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded-md">
          返回模型库
        </a>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-50 overflow-hidden">
      <div
        className={`transition-all duration-300 ease-out ${
          fullscreen ? 'h-0 opacity-0 overflow-hidden' : 'h-12 opacity-100'
        }`}
      >
        <TopBar />
      </div>
      <div className="flex-1 flex flex-row overflow-hidden min-h-0 relative">
        <div className={`transition-all duration-300 ease-out overflow-hidden ${leftWidth}`}>
          <LeftPanel />
        </div>
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Viewport />
        </div>
      </div>
    </div>
  );
}

function App() {
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isLoggedIn ? <Navigate to="/models" replace /> : <Login />} />
        <Route
          path="/models"
          element={isLoggedIn ? <ModelManagement /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/designer"
          element={isLoggedIn ? <DesignerPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/designer/:modelId"
          element={isLoggedIn ? <DesignerPage /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to={isLoggedIn ? '/models' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
