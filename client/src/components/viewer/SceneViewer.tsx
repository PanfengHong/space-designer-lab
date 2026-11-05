import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Loader2,
  Maximize2,
  Minimize2,
  Monitor,
  Upload,
} from 'lucide-react';
import { Scene } from '../3D/indoor/IndoorScene';
import { DevicePanel } from '../ui/DevicePanel';
import { useAppStore } from '../../store/useAppStore';
import { loadPublishedPackage, parseScenePackage } from '../../utils/scenePackage';
import { createLocalDeviceAdapter } from '../../utils/deviceAdapter';
import type { ScenePackage, ViewMode } from '../../types';

const VIEW_OPTIONS: { mode: ViewMode; label: string }[] = [
  { mode: 'perspective', label: '透视' },
  { mode: 'axonometric', label: '轴测' },
  { mode: 'top', label: '顶视' },
  { mode: 'walkthrough', label: '漫游' },
];

/**
 * 独立运行器 —— 模型的独立使用场景。
 *
 * 这里没有设计器的任何东西：没有左侧素材栏、没有拖拽、没有图层、没有登录墙。
 * 它只做三件事：加载场景包 → 渲染 → 让设备可被操作。
 *
 * 场景包来源优先级:
 *   1. `?src=<url>` 远程/同源 JSON
 *   2. localStorage 里设计器「发布」过的包
 *   3. 用户拖入或选择的 .sdscene.json
 */
export function SceneViewer() {
  const [pkg, setPkg] = useState<ScenePackage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const setRuntime = useAppStore((s) => s.setRuntime);

  const applyPackage = useCallback((p: ScenePackage) => {
    const st = useAppStore.getState();
    st.setRuntime(true);
    st.setSceneData(p.scene);
    // 灯 id / 家具 id 是跟着场景走的, 换场景必须清空, 否则状态会串到同名的设备上
    st.resetDevices();
    st.selectFurniture(null);
    st.selectStructure(null);
    st.selectDevice(null);
    st.setViewMode(p.view.mode);
    st.setRenderMode(p.view.renderMode);
    st.selectStyle(p.view.styleId);
    st.updateViewSettings('wallCutHeight', p.view.cutHeight);
    st.updateViewSettings('showCeiling', p.view.showCeiling);
    st.updateViewSettings('showSpaceName', p.view.showSpaceName);
    st.updateViewSettings('showDoorsOpen', p.view.showDoorsOpen);
    st.updateViewSettings('lighting', p.view.lighting);
    setPkg(p);
    setError(null);
  }, []);

  const applyText = useCallback(
    (text: string) => {
      try {
        applyPackage(parseScenePackage(text));
      } catch (e) {
        setError(e instanceof Error ? e.message : '场景包解析失败');
      }
    },
    [applyPackage],
  );

  useEffect(() => {
    setRuntime(true);
    const src = new URLSearchParams(window.location.search).get('src');
    if (src) {
      setBusy(true);
      fetch(src)
        .then((r) => {
          if (!r.ok) throw new Error(`加载失败（HTTP ${r.status}）`);
          return r.text();
        })
        .then(applyText)
        .catch((e) => setError(e instanceof Error ? e.message : '场景包加载失败'))
        .finally(() => setBusy(false));
    } else {
      const local = loadPublishedPackage();
      if (local) applyPackage(local);
    }
    return () => setRuntime(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 本地状态源: 现在只做演示, 接口留给将来的 HA / 宿主注入
  useEffect(() => {
    const adapter = createLocalDeviceAdapter();
    adapter.connect({ onState: () => {} });
    return () => adapter.disconnect();
  }, []);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      applyText(await file.text());
    } finally {
      setBusy(false);
    }
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  return (
    <div
      className="w-screen h-screen relative bg-gray-100 overflow-hidden"
      onDragOver={(e) => {
        e.preventDefault();
        if (!pkg) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) handleFile(f);
      }}
    >
      {pkg ? (
        <Scene runtime />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-[26rem] bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
            {busy ? (
              <>
                <Loader2 size={22} className="animate-spin text-gray-400 mx-auto" />
                <div className="mt-3 text-sm text-gray-500">正在加载场景...</div>
              </>
            ) : (
              <>
                <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
                  <Monitor size={18} className="text-gray-400" />
                </div>
                <div className="mt-3 text-sm font-medium text-gray-800">还没有加载场景</div>
                <div className="mt-1.5 text-[11px] text-gray-500 leading-relaxed">
                  在设计器右上角「导出模型」里选择【场景包】并发布，
                  <br />
                  或把 <span className="font-mono">.sdscene.json</span> 文件拖到这里。
                </div>
                <button
                  onClick={() => inputRef.current?.click()}
                  className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-900 text-white rounded-md hover:bg-gray-800"
                >
                  <Upload size={12} /> 选择场景包文件
                </button>
              </>
            )}
            {error && (
              <div className="mt-3 flex items-start gap-1.5 text-left text-[10px] text-red-600 bg-red-50 rounded-md px-2.5 py-2">
                <AlertCircle size={12} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 场景信息 */}
      {pkg && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 px-2.5 py-1.5 bg-white/90 backdrop-blur rounded-lg border border-gray-200 shadow-sm select-none">
          <Monitor size={13} className="text-gray-500 shrink-0" />
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-gray-900 leading-tight truncate max-w-[15rem]">
              {pkg.meta.name}
            </div>
            <div className="text-[9px] text-gray-400 leading-tight">
              {pkg.devices.length} 个设备 · 状态来源: 本地演示
            </div>
          </div>
        </div>
      )}

      {/* 视图切换 + 文件操作 */}
      {pkg && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-0.5 px-1 py-1 bg-white/90 backdrop-blur rounded-lg border border-gray-200 shadow-sm select-none">
          {VIEW_OPTIONS.map((o) => (
            <button
              key={o.mode}
              onClick={() => setViewMode(o.mode)}
              className={`px-2 py-1 text-[11px] rounded transition-colors ${
                viewMode === o.mode
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
              }`}
            >
              {o.label}
            </button>
          ))}
          <span className="w-px h-4 bg-gray-200 mx-0.5" />
          <button
            onClick={() => inputRef.current?.click()}
            title="更换场景包"
            className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded"
          >
            <Upload size={13} />
          </button>
          <button
            onClick={toggleFullscreen}
            title={fullscreen ? '退出全屏' : '全屏'}
            className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded"
          >
            {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      )}

      {/* 设备控制面板 — 与设计器同一个组件 (只读运行态下同样只做本地控制) */}
      {pkg && (
        <div className="absolute top-14 right-3 z-20">
          <DevicePanel />
        </div>
      )}

      {/* 操作提示 */}
      {pkg && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-2.5 py-1 bg-white/80 backdrop-blur rounded-md text-[10px] text-gray-500 border border-gray-200 select-none">
          拖拽旋转 · 滚轮缩放 · 点击设备可直接控制
        </div>
      )}

      {error && pkg && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex items-start gap-1.5 text-[10px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-2 max-w-md">
          <AlertCircle size={12} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {dragging && !pkg && (
        <div className="absolute inset-0 z-30 bg-gray-900/5 border-2 border-dashed border-gray-400 rounded-lg pointer-events-none flex items-center justify-center">
          <div className="text-xs text-gray-600 bg-white px-3 py-1.5 rounded-md shadow-sm">
            松开以加载场景包
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
