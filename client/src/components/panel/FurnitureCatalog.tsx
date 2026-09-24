import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { Furniture } from '../../types';
import { Bed } from '../3D/indoor/furniture/Bed';
import { Sofa } from '../3D/indoor/furniture/Sofa';
import { Table } from '../3D/indoor/furniture/Table';
import { Cabinet } from '../3D/indoor/furniture/Cabinet';
import { Chair } from '../3D/indoor/furniture/Chair';
import { Refrigerator } from '../3D/indoor/furniture/Refrigerator';
import { WashingMachine } from '../3D/indoor/furniture/WashingMachine';
import { Toilet } from '../3D/indoor/furniture/Toilet';
import { Sink } from '../3D/indoor/furniture/Sink';
import { Shower } from '../3D/indoor/furniture/Shower';
import { Stove } from '../3D/indoor/furniture/Stove';
import { Decor } from '../3D/indoor/furniture/Decor';

/**
 * 家具素材库 — 2 列网格 + 3D 缩略图
 * 室内设计层解锁时显示在 LeftPanel 底部
 *
 * 拖拽机制: HTML5 drag-and-drop
 * - onDragStart: 设置 store.draggingFurniture (模板数据)
 * - Canvas 层 onDragOver/onDrop: raycast 计算地板位置并放置
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
];

function renderCatalogFurniture(data: Furniture) {
  switch (data.type) {
    case 'bed': return <Bed data={data} />;
    case 'sofa': return <Sofa data={data} />;
    case 'table': return <Table data={data} />;
    case 'cabinet': return <Cabinet data={data} />;
    case 'chair': return <Chair data={data} />;
    case 'fridge': return <Refrigerator data={data} />;
    case 'washer': return <WashingMachine data={data} />;
    case 'toilet': return <Toilet data={data} />;
    case 'sink': return <Sink data={data} />;
    case 'shower': return <Shower data={data} />;
    case 'stove': return <Stove data={data} />;
    case 'decor': return <Decor data={data} />;
    default: return <Decor data={data} />;
  }
}

/** 单个素材的 3D 缩略图 */
function CatalogThumbnail({ item }: { item: CatalogItem }) {
  const furnitureData: Furniture = useMemo(() => ({
    id: `catalog-${item.type}`,
    name: item.name,
    position: [0, 0, 0],
    rotation: 0,
    size: item.size,
    type: item.type,
    color: item.color,
  }), [item]);

  const [w, h, d] = item.size;
  // 相机距离根据尺寸自适应
  const maxDim = Math.max(w, h, d, 1);
  const camDist = maxDim * 2.2 + 1.2;

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ fov: 35, position: [camDist * 0.7, camDist * 0.5, camDist * 0.7] }}
      style={{ width: '100%', height: '100%', background: 'transparent', pointerEvents: 'none' }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 3]} intensity={0.5} />
        <directionalLight position={[-3, 3, -3]} intensity={0.2} />
        <hemisphereLight args={['#c4d4e8', '#d4c8b8', 0.3]} />

        <group position={[0, -h / 2, 0]}>
          {renderCatalogFurniture(furnitureData)}
        </group>

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={2}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2.2}
          target={[0, 0, 0]}
          enabled={false}
        />
      </Suspense>
    </Canvas>
  );
}

export function FurnitureCatalog() {
  const setDraggingFurniture = useAppStore((s) => s.setDraggingFurniture);

  const handleDragStart = (e: React.DragEvent, item: CatalogItem) => {
    setDraggingFurniture({
      type: item.type,
      name: item.name,
      size: item.size,
      color: item.color,
    });
    e.dataTransfer.setData('text/plain', item.type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="p-2">
      <div className="text-[10px] text-gray-400 mb-2 px-1">
        拖拽家具到设计区域放置
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {CATALOG.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => handleDragStart(e, item)}
            onDragEnd={() => setDraggingFurniture(null)}
            className="flex flex-col bg-gray-50 hover:bg-gray-100 rounded-md cursor-grab active:cursor-grabbing transition-colors select-none overflow-hidden"
            title={`${item.name} ${item.size[0]}×${item.size[2]}m`}
          >
            {/* 3D 缩略图区 */}
            <div className="h-16 bg-gradient-to-br from-gray-50 to-gray-100">
              <CatalogThumbnail item={item} />
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
