import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { Furniture } from '../../types';
import {
  requestThumbnail,
  useThumbnailUrl,
} from '../../utils/thumbnailCapture';
import { footprintOf } from '../../data/furnitureMeta';
import { FurnitureContent3D } from '../3D/indoor/furnitureRegistry';
import { FurnitureSymbol2D } from '../2D/furnitureSymbol2D';
import { setCustomDragImage } from './dragImage';

/**
 * 家具素材库 — 2 列网格 + 缩略图
 * 室内设计层解锁时显示在 LeftPanel 底部
 *
 * 拖拽机制: HTML5 drag-and-drop
 * - onDragStart: 设置 store.draggingFurniture (模板数据) + 自定义透明拖拽影像
 * - Canvas 层 onDragOver/onDrop: raycast 计算地板位置并放置
 * - 平面图模式下同样走这一套, 落点由 FloorPlan2D 的 dragOver/drop 接管
 *
 * 缩略图机制: 全局单个隐藏 Canvas 离线捕获 (见 utils/thumbnailCapture.tsx),
 * 不再为每个素材创建独立 WebGL context。
 *
 * 视角联动 (2026-11-16): 平面图模式下卡片改画**平面符号** (FurnitureSymbol2D),
 * 与落到平面图里的图形同源, 也不再触发 3D 缩略图捕获 (省一次离屏渲染)。
 */

interface CatalogItem {
  type: Furniture['type'];
  name: string;
  size: [number, number, number];
  color: string;
}

const CATALOG: CatalogItem[] = [
  { type: 'sofa', name: '沙发', size: [2.0, 0.85, 0.9], color: '#d4c5b0' },
  { type: 'bed', name: '床', size: [1.8, 0.45, 2.0], color: '#e8e0d4' },
  { type: 'table', name: '桌子', size: [1.2, 0.75, 0.7], color: '#5c4033' },
  { type: 'cabinet', name: '柜子', size: [1.5, 1.8, 0.5], color: '#d4c5b0' },
  { type: 'chair', name: '椅子', size: [0.5, 0.9, 0.5], color: '#8b7355' },
  { type: 'fridge', name: '冰箱', size: [0.7, 1.8, 0.65], color: '#e0e0e0' },
  { type: 'washer', name: '洗衣机', size: [0.6, 0.85, 0.6], color: '#f0f0f0' },
  { type: 'shower', name: '淋浴', size: [1.2, 2.0, 1.0], color: '#a8d0e6' },
  { type: 'toilet', name: '马桶', size: [0.4, 0.8, 0.65], color: '#fafafa' },
  { type: 'sink', name: '洗手台', size: [0.7, 0.85, 0.5], color: '#ffffff' },
  { type: 'stove', name: '灶台', size: [0.8, 0.08, 0.5], color: '#1a1a1a' },
  { type: 'decor', name: '落地灯', size: [0.4, 1.6, 0.4], color: '#e8e0d4' },
  { type: 'ac', name: '空调', size: [0.95, 0.3, 0.22], color: '#ffffff' },
  { type: 'curtain', name: '窗帘', size: [2.4, 2.5, 0.1], color: '#efe7da' },
];

/** 办公空间素材库 (复用已有家具类型, 不新增 3D 组件) */
const OFFICE_CATALOG: CatalogItem[] = [
  { type: 'table', name: '办公桌', size: [1.6, 0.75, 0.8], color: '#e8e4dc' },
  { type: 'chair', name: '办公椅', size: [0.5, 0.9, 0.5], color: '#3d3d3d' },
  { type: 'table', name: '会议桌', size: [3.6, 0.75, 1.4], color: '#5c4033' },
  { type: 'chair', name: '会议椅', size: [0.5, 0.9, 0.5], color: '#8b7355' },
  { type: 'cabinet', name: '文件柜', size: [1.6, 1.8, 0.45], color: '#d4c5b0' },
  { type: 'cabinet', name: '茶水柜', size: [2.0, 0.9, 0.6], color: '#e0e0e0' },
  { type: 'sofa', name: '接待沙发', size: [2.0, 0.85, 0.9], color: '#c8b8a0' },
  { type: 'decor', name: '绿植盆栽', size: [0.6, 1.2, 0.6], color: '#4a7c59' },
  { type: 'appliance', name: '饮水机', size: [0.5, 1.1, 0.5], color: '#f0f0f0' },
  { type: 'fridge', name: '冰箱', size: [0.7, 1.8, 0.65], color: '#e0e0e0' },
  { type: 'sink', name: '洗手台', size: [0.7, 0.85, 0.5], color: '#ffffff' },
  { type: 'toilet', name: '马桶', size: [0.4, 0.8, 0.65], color: '#fafafa' },
];

/**
 * 缩略图渲染 —— 与场景内家具走同一个注册表 (furnitureRegistry)。
 * 之前这里有一份独立的 switch, 新增素材时两处必须手动同步, 漏改就会出现
 * "缩略图和实物不是同一个东西"。
 */
function renderCatalogFurniture(data: Furniture) {
  return <FurnitureContent3D data={data} />;
}

/** 缩略图键: 类型 + 名称 (住宅/办公素材同名同型但尺寸不同, 需区分) */
const thumbKey = (item: CatalogItem) => `furniture-${item.type}-${item.name}`;

/** 单个素材缩略图 — 由全局捕获宿主离线渲染为透明 PNG */
function CatalogThumbnail({ item }: { item: CatalogItem }) {
  const key = thumbKey(item);
  const url = useThumbnailUrl(key);

  useEffect(() => {
    const [w, h] = item.size;
    const maxDim = Math.max(...item.size, 1);
    const camDist = maxDim * 2.2 + 1.2;
    const furnitureData: Furniture = {
      id: `catalog-${item.type}`,
      name: item.name,
      position: [0, 0, 0],
      rotation: 0,
      size: item.size,
      type: item.type,
      color: item.color,
    };

    requestThumbnail({
      key,
      camera: { fov: 35, position: [camDist * 0.7, camDist * 0.5, camDist * 0.7] },
      content: (
        <>
          <ambientLight intensity={0.6} />
          <directionalLight position={[3, 5, 3]} intensity={0.5} />
          <directionalLight position={[-3, 3, -3]} intensity={0.2} />
          <hemisphereLight args={['#c4d4e8', '#d4c8b8', 0.3]} />
          <group position={[0, -h / 2, 0]}>
            {renderCatalogFurniture(furnitureData)}
          </group>
        </>
      ),
    });
  }, [item, key]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {url ? (
        <img
          src={url}
          alt={item.name}
          draggable={false}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
      ) : (
        <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-gray-400 animate-spin" />
      )}
    </div>
  );
}

/**
 * 平面图模式下的素材卡预览 —— 直接渲染 2D 平面符号。
 *
 * 与落到平面图里的图形是同一个组件 (FurnitureSymbol2D), 所以"卡上看到的就是落下去的样子",
 * 也顺带免掉了 3D 缩略图的离屏渲染开销。
 */
function PlanSymbolPreview({ item }: { item: CatalogItem }) {
  const furniture: Furniture = {
    id: `plan-${item.type}-${item.name}`,
    name: item.name,
    position: [0, 0, 0],
    rotation: 0,
    size: item.size,
    type: item.type,
    color: item.color,
  };
  const { w, h } = footprintOf(furniture);
  // 淋浴间是从锚点 (0,0) 向 +X/+Z 展开的图形, 画完再平移到中心
  const isShower = item.type === 'shower';
  const boxW = isShower ? item.size[0] : w;
  const boxH = isShower ? item.size[0] : h;
  const pad = Math.max(boxW, boxH) * 0.12 + 0.06;

  return (
    <svg
      viewBox={`${-boxW / 2 - pad} ${-boxH / 2 - pad} ${boxW + pad * 2} ${boxH + pad * 2}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <g transform={isShower ? `translate(${-boxW / 2}, ${-boxH / 2})` : undefined}>
        <FurnitureSymbol2D furniture={furniture} />
      </g>
    </svg>
  );
}

/**
 * 从卡片 DOM 中取缩略图 <img> (平面图模式下取 <svg> 符号) 作为自定义拖拽影像。
 * 透明 PNG 只包含家具本体, 不带白色卡片背景。
 */
export function FurnitureCatalog() {
  const setDraggingFurniture = useAppStore((s) => s.setDraggingFurniture);
  const setDraggingStructure = useAppStore((s) => s.setDraggingStructure);
  const activeModelItem = useAppStore((s) => s.activeModelItem);
  const isPlan = useAppStore((s) => s.viewMode === 'plan');

  const isOffice = activeModelItem?.category === 'office';
  const catalog = isOffice ? OFFICE_CATALOG : CATALOG;

  const handleDragStart = (e: React.DragEvent, item: CatalogItem) => {
    // 与建筑结构素材库互斥, 避免落下时被判成两种元素
    setDraggingStructure(null);
    setDraggingFurniture({
      type: item.type,
      name: item.name,
      size: item.size,
      color: item.color,
    });
    e.dataTransfer.setData('text/plain', item.type);
    e.dataTransfer.effectAllowed = 'copy';
    setCustomDragImage(e);
  };

  return (
    <div className="p-2">
      <div className="text-[10px] text-gray-400 mb-2 px-1">
        {isPlan
          ? '拖拽家具到平面图上放置 · 自动贴墙对齐'
          : isOffice
            ? '拖拽办公家具到设计区域放置'
            : '拖拽家具到设计区域放置'}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {catalog.map((item) => (
          <div
            key={`${item.type}-${item.name}`}
            draggable
            onDragStart={(e) => handleDragStart(e, item)}
            onDragEnd={() => setDraggingFurniture(null)}
            className="flex flex-col bg-gray-50 hover:bg-gray-100 rounded-md cursor-grab active:cursor-grabbing transition-colors select-none overflow-hidden"
            title={`${item.name} ${item.size[0]}×${item.size[2]}m`}
          >
            {/* 缩略图区: 平面图模式画 2D 符号, 其余模式画 3D 捕获图 */}
            <div className={`h-16 ${isPlan ? 'bg-white' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
              {isPlan ? <PlanSymbolPreview item={item} /> : <CatalogThumbnail item={item} />}
            </div>
            {/* 名称 */}
            <div className="px-1 py-1 text-center">
              <span className="text-[9px] text-gray-600">{item.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
