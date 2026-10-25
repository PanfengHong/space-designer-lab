import { useState } from 'react';
import { Activity, X } from 'lucide-react';
import { usePerformanceStore } from '../../store/usePerformanceStore';
import { useAppStore } from '../../store/useAppStore';
import type { PerformanceMetrics } from '../../store/usePerformanceStore';

/** 数字格式化: 千分位 */
function fmt(n: number) {
  return Math.round(n).toLocaleString('en-US');
}

/** 大数字紧凑显示 (1.2k / 3.45M) */
function fmtCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

/** FPS 评级: 颜色 + 文案 */
function fpsTone(fps: number) {
  if (fps >= 55) return { color: '#10b981', text: '流畅', dot: 'bg-emerald-500' };
  if (fps >= 30) return { color: '#f59e0b', text: '一般', dot: 'bg-amber-500' };
  return { color: '#ef4444', text: '卡顿', dot: 'bg-red-500' };
}

/** FPS 迷你曲线 */
function FpsSparkline({ data, color }: { data: number[]; color: string }) {
  const W = 100;
  const H = 28;
  const max = Math.max(60, ...data, 1);
  const points =
    data.length > 1
      ? data
          .map((v, i) => `${(i / (data.length - 1)) * W},${H - Math.min(v / max, 1) * H}`)
          .join(' ')
      : '';
  const refY = H - (60 / max) * H;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-7" preserveAspectRatio="none">
      <line x1="0" y1={refY} x2={W} y2={refY} stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="2 2" />
      {points && (
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

/** 指标水位: 正常(黑) / 偏高(橙) / 超标(红) */
type Level = 'normal' | 'warn' | 'danger';

const LEVEL_TEXT: Record<Level, string> = {
  normal: 'text-gray-800',
  warn: 'text-orange-500',
  danger: 'text-red-500',
};

/** 数值越大越差: >= danger 判超标, >= warn 判偏高 */
function levelOf(value: number, warn: number, danger: number): Level {
  if (value >= danger) return 'danger';
  if (value >= warn) return 'warn';
  return 'normal';
}

/** 渲染指标阈值 (偏高 / 超标) */
const THRESHOLDS = {
  drawCalls: { warn: 1000, danger: 2000 },
  triangles: { warn: 500_000, danger: 1_500_000 },
  meshes: { warn: 800, danger: 1500 },
  materials: { warn: 300, danger: 800 },
  geometries: { warn: 1000, danger: 3000 },
  textures: { warn: 50, danger: 150 },
  programs: { warn: 50, danger: 100 },
  lines: { warn: 50_000, danger: 200_000 },
  lights: { warn: 6, danger: 10 },
  dpr: { warn: 2, danger: 3 },
  pixels: { warn: 6_000_000, danger: 12_000_000 },
  jsHeap: { warn: 512, danger: 1024 },
  frameTime: { warn: 20, danger: 33 },
};

/** 指标格子 */
function Cell({
  label,
  value,
  level = 'normal',
  title,
}: {
  label: string;
  value: string;
  level?: Level;
  title?: string;
}) {
  return (
    <div className="bg-gray-50 rounded-md px-2 py-1.5 min-w-0">
      <div className="text-[9px] text-gray-400 leading-none mb-1">{label}</div>
      <div
        className={`text-[11px] font-mono truncate leading-tight ${LEVEL_TEXT[level]}`}
        title={title ?? value}
      >
        {value}
      </div>
    </div>
  );
}

function SectionTitle({ zh, en }: { zh: string; en: string }) {
  return (
    <div className="flex items-baseline gap-1.5 mb-1.5">
      <span className="text-[10px] font-medium text-gray-600">{zh}</span>
      <span className="text-[8px] text-gray-400 tracking-widest uppercase">{en}</span>
    </div>
  );
}

/**
 * 性能监控 — 悬浮按钮 + 弹出面板
 * 按钮置于光影面板上方; 指标由 Canvas 内的 PerformanceProbe 每 0.5s 上报
 */
export function PerformanceMonitor() {
  const [open, setOpen] = useState(false);
  const metrics = usePerformanceStore((s) => s.metrics);
  const history = usePerformanceStore((s) => s.history);
  const activeModelItem = useAppStore((s) => s.activeModelItem);
  const activeCampusItem = useAppStore((s) => s.activeCampusItem);
  const designerMode = useAppStore((s) => s.designerMode);

  const modelName =
    (designerMode === 'outdoor' ? activeCampusItem?.name : activeModelItem?.name) ?? '默认场景';
  const tone = metrics ? fpsTone(metrics.fps) : null;
  /** 指标水位判定 */
  const lv = (value: number, t: { warn: number; danger: number }): Level => levelOf(value, t.warn, t.danger);
  /** 帧耗时配色: 正常保持灰色, 偏高橙, 超标红 */
  const frameLevel = metrics ? lv(metrics.frameTime, THRESHOLDS.frameTime) : 'normal';
  const frameTone =
    frameLevel === 'danger' ? 'text-red-500' : frameLevel === 'warn' ? 'text-orange-500' : 'text-gray-500';

  return (
    <div className="relative">
      {/* 悬浮按钮 */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="性能监控"
        className={`flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-full border shadow-lg backdrop-blur-md text-[11px] transition-colors ${
          open
            ? 'bg-gray-900 text-white border-gray-900'
            : 'bg-white/95 text-gray-700 border-gray-200 hover:border-gray-300'
        }`}
      >
        <Activity size={13} className={open ? 'text-emerald-400' : 'text-emerald-500'} />
        <span className="font-medium">性能</span>
        {metrics && (
          <span
            className={`text-[10px] font-mono ${open ? 'text-white/80' : ''}`}
            style={open ? undefined : { color: tone?.color }}
          >
            {Math.round(metrics.fps)} FPS
          </span>
        )}
      </button>

      {/* 弹出面板 (向上浮出, 不挤压光影面板) */}
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-72 bg-white/95 backdrop-blur-md rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
          {/* 标题栏 */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50/80">
            <div className="flex items-center gap-1.5 min-w-0">
              <Activity size={12} className="text-emerald-500 shrink-0" />
              <span className="text-[11px] font-semibold text-gray-700 whitespace-nowrap">性能监控</span>
              <span className="text-[8px] text-gray-400 tracking-widest uppercase">Performance</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="关闭"
            >
              <X size={13} />
            </button>
          </div>

          <div className="px-3 py-2.5 space-y-2.5 max-h-[calc(100vh-16rem)] overflow-y-auto">
            {/* 当前模型 */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] text-gray-400 tracking-wider uppercase">当前模型</span>
              <span className="text-[11px] text-gray-800 font-medium truncate" title={modelName}>
                {modelName}
              </span>
            </div>

            {/* 帧率 */}
            <div>
              <div className="flex items-end justify-between mb-1">
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-2xl font-bold font-mono leading-none"
                    style={{ color: tone?.color ?? '#9ca3af' }}
                  >
                    {metrics ? metrics.fps.toFixed(1) : '--'}
                  </span>
                  <span className="text-[9px] text-gray-400">FPS</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${tone?.dot ?? 'bg-gray-300'}`} />
                  <span className="text-[10px] text-gray-500">{tone?.text ?? '采样中'}</span>
                  <span className="text-[10px] text-gray-300">|</span>
                  <span className={`text-[10px] font-mono ${frameTone}`}>
                    {metrics ? `${metrics.frameTime.toFixed(1)} ms` : '--'}
                  </span>
                </div>
              </div>
              <FpsSparkline data={history} color={tone?.color ?? '#9ca3af'} />
            </div>

            {/* 渲染 */}
            <div>
              <SectionTitle zh="渲染" en="Render" />
              <div className="grid grid-cols-2 gap-1.5">
                <Cell
                  label="Draw Calls"
                  value={metrics ? fmt(metrics.drawCalls) : '--'}
                  level={metrics ? lv(metrics.drawCalls, THRESHOLDS.drawCalls) : 'normal'}
                />
                <Cell
                  label="三角面"
                  value={metrics ? fmtCompact(metrics.triangles) : '--'}
                  title={metrics ? fmt(metrics.triangles) : undefined}
                  level={metrics ? lv(metrics.triangles, THRESHOLDS.triangles) : 'normal'}
                />
                <Cell
                  label="网格"
                  value={metrics ? fmt(metrics.meshes) : '--'}
                  level={metrics ? lv(metrics.meshes, THRESHOLDS.meshes) : 'normal'}
                />
                <Cell
                  label="材质"
                  value={metrics ? fmt(metrics.materials) : '--'}
                  level={metrics ? lv(metrics.materials, THRESHOLDS.materials) : 'normal'}
                />
                <Cell
                  label="几何体"
                  value={metrics ? fmt(metrics.geometries) : '--'}
                  level={metrics ? lv(metrics.geometries, THRESHOLDS.geometries) : 'normal'}
                />
                <Cell
                  label="纹理"
                  value={metrics ? fmt(metrics.textures) : '--'}
                  level={metrics ? lv(metrics.textures, THRESHOLDS.textures) : 'normal'}
                />
                <Cell
                  label="Shader"
                  value={metrics ? fmt(metrics.programs) : '--'}
                  level={metrics ? lv(metrics.programs, THRESHOLDS.programs) : 'normal'}
                />
                <Cell
                  label="线段 / 点"
                  value={metrics ? `${fmtCompact(metrics.lines)} / ${fmtCompact(metrics.points)}` : '--'}
                  level={metrics ? lv(metrics.lines + metrics.points, THRESHOLDS.lines) : 'normal'}
                />
              </div>
            </div>

            {/* 当前模型构成 */}
            {metrics && metrics.sceneStats.length > 0 && (
              <div>
                <SectionTitle zh="模型构成" en="Model" />
                <div className="grid grid-cols-2 gap-1.5">
                  {metrics.sceneStats.map((s) => (
                    <Cell key={s.label} label={s.label} value={s.value} />
                  ))}
                </div>
              </div>
            )}

            {/* 环境 */}
            <div>
              <SectionTitle zh="运行环境" en="Environment" />
              <div className="grid grid-cols-2 gap-1.5">
                <Cell
                  label="灯光"
                  value={metrics ? `${metrics.lights} (阴影 ${metrics.shadowLights})` : '--'}
                  level={metrics ? lv(metrics.lights, THRESHOLDS.lights) : 'normal'}
                />
                <Cell
                  label="像素比 DPR"
                  value={metrics ? metrics.dpr.toFixed(2) : '--'}
                  level={metrics ? lv(metrics.dpr, THRESHOLDS.dpr) : 'normal'}
                />
                <Cell
                  label="渲染分辨率"
                  value={metrics ? `${metrics.drawingBuffer[0]} × ${metrics.drawingBuffer[1]}` : '--'}
                  level={
                    metrics ? lv(metrics.drawingBuffer[0] * metrics.drawingBuffer[1], THRESHOLDS.pixels) : 'normal'
                  }
                />
                <Cell
                  label="JS 堆内存"
                  value={metrics ? (metrics.jsHeapMB != null ? `${metrics.jsHeapMB.toFixed(1)} MB` : '不支持') : '--'}
                  level={metrics?.jsHeapMB != null ? lv(metrics.jsHeapMB, THRESHOLDS.jsHeap) : 'normal'}
                />
              </div>
              <div className="mt-1.5 bg-gray-50 rounded-md px-2 py-1.5">
                <div className="text-[9px] text-gray-400 leading-none mb-1">GPU</div>
                <div className="text-[10px] font-mono text-gray-700 leading-tight truncate" title={metrics?.gpu}>
                  {metrics?.gpu ?? '采样中...'}
                </div>
              </div>
            </div>
          </div>

          {/* 脚注 */}
          <div className="px-3 py-1.5 border-t border-gray-100 text-[9px] text-gray-400 flex items-center justify-between">
            <span>每 0.5s 采样 · renderer.info</span>
            <span className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <i className="w-1.5 h-1.5 rounded-full bg-gray-700" />
                正常
              </span>
              <span className="flex items-center gap-1 text-orange-500">
                <i className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                偏高
              </span>
              <span className="flex items-center gap-1 text-red-500">
                <i className="w-1.5 h-1.5 rounded-full bg-red-500" />
                超标
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
