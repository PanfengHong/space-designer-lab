import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';

/**
 * 缩略图离线捕获系统 — 彻底解决 WebGL context 超限问题
 *
 * 背景: 素材库/模型库此前为每个缩略图创建独立 <Canvas>, 页面同时存在
 * 十几个 WebGL context, 触发浏览器 "Too many active WebGL contexts" 警告,
 * 最旧的 context 被强制回收导致画面丢失。
 *
 * 方案: 全局只挂载一个隐藏的捕获 Canvas (ThumbnailCaptureHost),
 * 缩略图请求进入串行队列, 逐个渲染 3 帧后 toDataURL 导出为透明 PNG 缓存,
 * 随后立即卸载 Canvas。稳态下额外 WebGL context 数量为 0。
 *
 * 使用方式:
 * 1. <ThumbnailCaptureHost /> 挂载在 App 根部 (一次即可)
 * 2. 组件内 useEffect 调用 requestThumbnail({ key, camera, content })
 * 3. 用 useThumbnailUrl(key) 订阅捕获结果 (<img src={url} />)
 */

export interface ThumbnailRequest {
  /** 缓存键, 需全局唯一 (包含类型/颜色等影响外观的要素) */
  key: string;
  /** 相机参数 (R3F perspective camera) */
  camera: { fov?: number; position: [number, number, number] };
  /** 相机注视点, 默认原点 */
  target?: [number, number, number];
  /** 场景内容: 灯光 + 物体 (物体需自行偏移到原点附近) */
  content: ReactNode;
  /** 输出尺寸 (正方形边长, px), 默认 256 */
  size?: number;
}

const cache = new Map<string, string>();
const listeners = new Set<() => void>();
const queued = new Set<string>();
const queue: ThumbnailRequest[] = [];

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function notifyPump() {
  if (pumpRef) pumpRef();
}

// 宿主注册的泵函数 (模块级, 避免跨文件事件总线)
let pumpRef: (() => void) | null = null;

/** 请求一张缩略图 (已缓存或已在队列中时为幂等操作) */
export function requestThumbnail(req: ThumbnailRequest) {
  if (cache.has(req.key) || queued.has(req.key)) return;
  queued.add(req.key);
  queue.push(req);
  notifyPump();
}

/** 读取缓存 (供 useSyncExternalStore 使用) */
export function getThumbnailUrl(key: string): string | null {
  return cache.get(key) ?? null;
}

/** 订阅指定 key 的缩略图 URL, 捕获完成后触发重渲染 */
export function useThumbnailUrl(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => getThumbnailUrl(key),
    () => null,
  );
}

/** 捕获执行器: 等 3 帧让内容完成渲染后导出 PNG */
function CaptureContent({ request, onDone }: { request: ThumbnailRequest; onDone: () => void }) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const framesRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    if (request.target) {
      camera.lookAt(request.target[0], request.target[1], request.target[2]);
    }
  }, [camera, request.target]);

  useFrame(() => {
    if (doneRef.current) return;
    framesRef.current += 1;
    if (framesRef.current < 3) return; // 等待场景内容完成首帧渲染
    doneRef.current = true;
    try {
      const url = gl.domElement.toDataURL('image/png');
      cache.set(request.key, url);
      emit();
    } catch {
      // toDataURL 失败 (极少见), 跳过该缩略图
    }
    onDone();
  });

  return <>{request.content}</>;
}

/**
 * 缩略图捕获宿主 — 在 App 根部挂载一次
 * 队列非空时挂载隐藏 Canvas, 逐个捕获; 空闲时完全卸载 (0 个 WebGL context)
 *
 * 注意: pump 必须保持纯 setState (出队副作用放在 updater 外部),
 * 否则 StrictMode 下 updater 被双重调用会吞掉队列请求, 导致部分缩略图永远 loading
 */
export function ThumbnailCaptureHost() {
  const [current, setCurrent] = useState<ThumbnailRequest | null>(null);
  const currentRef = useRef<ThumbnailRequest | null>(null);

  const pump = useCallback(() => {
    if (currentRef.current || queue.length === 0) return;
    // 出队在 setState 之前完成, updater 只做纯赋值
    const next = queue.shift()!;
    queued.delete(next.key);
    currentRef.current = next;
    setCurrent(next);
  }, []);

  useEffect(() => {
    pumpRef = pump;
    pump();
    return () => {
      pumpRef = null;
    };
  }, [pump]);

  const handleDone = useCallback(() => {
    currentRef.current = null;
    setCurrent(null);
    // 让下一个请求进入 (微任务延迟, 避免 Canvas 卸载/挂载在同一次提交中竞争)
    setTimeout(pump, 0);
  }, [pump]);

  if (!current) return null;

  const size = current.size ?? 256;

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        left: 0,
        bottom: 0,
        width: size,
        height: size,
        opacity: 0,
        pointerEvents: 'none',
        zIndex: -1,
        overflow: 'hidden',
      }}
    >
      <Canvas
        key={current.key}
        dpr={1}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        camera={{ fov: current.camera.fov ?? 35, position: current.camera.position, near: 0.1, far: 2000 }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <CaptureContent request={current} onDone={handleDone} />
      </Canvas>
    </div>
  );
}
