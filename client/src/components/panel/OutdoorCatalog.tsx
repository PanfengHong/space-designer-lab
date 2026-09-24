import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { OutdoorThumbnailContent } from '../3D/OutdoorScene';
import type { GroundItem, OutdoorObject } from '../../types';

/**
 * 户外素材库 — 地面元素 (地面/草地/河流/道路) + 空间对象 (车辆/建筑)
 * 拖拽到设计区域放置, 复用室内素材库的 HTML5 拖拽机制
 */

interface CatalogEntry {
  kind: 'ground' | 'object';
  type: string;
  name: string;
  size: [number, number, number];
  color: string;
}

export const GROUND_CATALOG: CatalogEntry[] = [
  { kind: 'ground', type: 'ground', name: '地面', size: [10, 0.3, 10], color: '#f2f5f9' },
  { kind: 'ground', type: 'grass', name: '草地', size: [6, 0.16, 5], color: '#bfe3c0' },
  { kind: 'ground', type: 'river', name: '河流', size: [8, 0.12, 2.6], color: '#6cb8e6' },
  { kind: 'ground', type: 'road', name: '道路', size: [8, 0.18, 2.4], color: '#d3dae3' },
  { kind: 'ground', type: 'intersection', name: '十字路口', size: [4, 0.18, 4], color: '#d3dae3', branches: 4, arcRadius: 1.5 } as any,
  { kind: 'ground', type: 'intersection', name: '三岔路口', size: [4, 0.18, 4], color: '#d3dae3', branches: 3, arcRadius: 1.5 } as any,
  { kind: 'ground', type: 'ramp', name: '高架匝道', size: [12, 0.22, 2.6], color: '#d3dae3' },
];

export const OBJECT_CATALOG: CatalogEntry[] = [
  { kind: 'object', type: 'building', name: '玻璃大厦', size: [5, 7, 5], color: '#7db8e8' },
  { kind: 'object', type: 'warehouse', name: '厂房仓库', size: [7, 4, 4.5], color: '#f2f5f9' },
  { kind: 'object', type: 'truck', name: '卡车', size: [2.6, 0.75, 0.7], color: '#4a90d9' },
  { kind: 'object', type: 'car', name: '轿车', size: [1.5, 0.45, 0.7], color: '#ffffff' },
];

function CatalogThumbnail({ entry }: { entry: CatalogEntry }) {
  const item = useMemo<GroundItem | OutdoorObject>(() => ({
    id: `outdoor-catalog-${entry.kind}-${entry.type}`,
    name: entry.name,
    position: [0, 0, 0],
    rotation: 0,
    size: entry.size,
    color: entry.color,
    // 判别联合类型
    ...(entry.kind === 'ground'
      ? { type: entry.type as GroundItem['type'] }
      : { type: entry.type as OutdoorObject['type'] }),
  } as GroundItem | OutdoorObject), [entry]);

  const [w, h, d] = entry.size;
  const maxDim = Math.max(w, h, d, 1);
  const camDist = maxDim * 1.5 + 1.4;

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ fov: 35, position: [camDist * 0.75, camDist * 0.55, camDist * 0.75] }}
      style={{ width: '100%', height: '100%', background: 'transparent', pointerEvents: 'none' }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.65} />
        <directionalLight position={[3, 5, 3]} intensity={0.55} />
        <directionalLight position={[-3, 3, -3]} intensity={0.25} color="#c8daf0" />
        <hemisphereLight args={['#dceaf6', '#e4eadf', 0.4]} />
        <group position={[0, -h / 2, 0]}>
          <OutdoorThumbnailContent item={item} />
        </group>
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={1.5}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2.2}
          target={[0, 0, 0]}
          enabled={false}
        />
      </Suspense>
    </Canvas>
  );
}

export function OutdoorCatalog({ kind }: { kind: 'ground' | 'object' }) {
  const setDraggingOutdoor = useAppStore((s) => s.setDraggingOutdoor);
  const entries = kind === 'ground' ? GROUND_CATALOG : OBJECT_CATALOG;

  const handleDragStart = (e: React.DragEvent, entry: CatalogEntry) => {
    setDraggingOutdoor({
      kind: entry.kind,
      type: entry.type,
      name: entry.name,
      size: entry.size,
      color: entry.color,
    });
    e.dataTransfer.setData('text/plain', entry.type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="p-2">
      <div className="text-[10px] text-gray-400 mb-2 px-1">
        拖拽{kind === 'ground' ? '地面元素' : '空间对象'}到设计区域放置
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {entries.map((entry) => (
          <div
            key={`${entry.kind}-${entry.type}`}
            draggable
            onDragStart={(e) => handleDragStart(e, entry)}
            onDragEnd={() => setDraggingOutdoor(null)}
            className="flex flex-col bg-gray-50 hover:bg-gray-100 rounded-md cursor-grab active:cursor-grabbing transition-colors select-none overflow-hidden"
            title={`${entry.name} ${entry.size[0]}×${entry.size[2]}m`}
          >
            <div className="h-16 bg-gradient-to-br from-gray-50 to-gray-100">
              <CatalogThumbnail entry={entry} />
            </div>
            <div className="px-1 py-1 text-center">
              <span className="text-[9px] text-gray-600">{entry.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
