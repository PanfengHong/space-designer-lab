import type { Furniture } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';
import * as THREE from 'three';
import { Bed } from './furniture/Bed';
import { Sofa } from './furniture/Sofa';
import { Table } from './furniture/Table';
import { Cabinet } from './furniture/Cabinet';
import { Appliance } from './furniture/Appliance';
import { Refrigerator } from './furniture/Refrigerator';
import { WashingMachine } from './furniture/WashingMachine';
import { Decor } from './furniture/Decor';
import { Chair } from './furniture/Chair';
import { Shower } from './furniture/Shower';
import { Sink } from './furniture/Sink';
import { Toilet } from './furniture/Toilet';
import { Stove } from './furniture/Stove';

interface FurnitureProps {
  items: Furniture[];
  opacity?: number;
}

export function FurnitureGroup({ items }: FurnitureProps) {
  return (
    <group>
      {items.map((item) => (
        <FurnitureItem key={item.id} data={item} />
      ))}
    </group>
  );
}

function FurnitureItem({ data }: { data: Furniture }) {
  const selectFurniture = useAppStore((s) => s.selectFurniture);
  const selectedId = useAppStore((s) => s.selectedFurnitureId);
  const layers = useAppStore((s) => s.layers);
  const isSelected = selectedId === data.id;
  // 室内设计层锁定时, 家具不可选中
  const interiorLocked = layers.find((l) => l.id === 'interior')?.locked ?? false;

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    if (interiorLocked) return;
    selectFurniture(data.id);
  };

  const handlePointerOver = (e: any) => {
    if (interiorLocked) return;
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };
  const handlePointerOut = () => {
    document.body.style.cursor = 'default';
  };

  // 选中高亮: 半透明包围盒 + 绿色线框
  // 注意: 家具主体约定 x=d(size[2]), z=w(size[0]), y=h(size[1])
  // 淋浴间特殊: 几何体从角点(0,0,0)向+X/+Z延伸, 非居中; quarter形状 size[2]=0
  let boxX: number, boxY: number, boxZ: number;
  let boxOX = 0, boxOZ = 0; // 高亮盒中心偏移
  if (data.type === 'shower') {
    const shape = data.shape ?? 'quarter';
    boxY = data.size[1];
    if (shape === 'quarter') {
      const r = data.size[0];
      boxX = r; boxZ = r;
      boxOX = r / 2; boxOZ = r / 2;
    } else {
      // RectShower: X方向=data.size[0], Z方向=data.size[2]
      boxX = data.size[0]; boxZ = data.size[2];
      boxOX = data.size[0] / 2; boxOZ = data.size[2] / 2;
    }
  } else {
    boxX = data.size[2]; // d → X
    boxY = data.size[1]; // h
    boxZ = data.size[0]; // w → Z
  }
  const boxGeo = new THREE.BoxGeometry(boxX, boxY, boxZ);
  // 线框稍放大避免 z-fighting
  const wireGeo = new THREE.BoxGeometry(boxX * 1.01, boxY * 1.01, boxZ * 1.01);

  return (
    <group
      onPointerDown={handlePointerDown}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <FurnitureContent data={data} />
      {isSelected && (
        // 高亮外层 group 应用家具的 position/rotation, 与家具内部定位保持一致
        <group
          position={[data.position[0], data.position[1], data.position[2]]}
          rotation={[0, (data.rotation * Math.PI) / 180, 0]}
        >
          {/* 半透明绿色高亮盒 */}
          <mesh position={[boxOX, boxY / 2, boxOZ]} geometry={boxGeo}>
            <meshBasicMaterial color="#22c55e" transparent opacity={0.18} depthWrite={false} />
          </mesh>
          {/* 绿色线框 (放大1%) */}
          <lineSegments position={[boxOX, boxY / 2, boxOZ]}>
            <edgesGeometry args={[wireGeo]} />
            <lineBasicMaterial color="#16a34a" />
          </lineSegments>
          {/* 外层粗线框 (再放大1.5%, 形成双层加粗感) */}
          <lineSegments position={[boxOX, boxY / 2, boxOZ]} scale={1.015}>
            <edgesGeometry args={[wireGeo]} />
            <lineBasicMaterial color="#22c55e" transparent opacity={0.6} />
          </lineSegments>
        </group>
      )}
    </group>
  );
}

function FurnitureContent({ data }: { data: Furniture }) {
  switch (data.type) {
    case 'bed':
      return <Bed data={data} />;
    case 'sofa':
      return <Sofa data={data} />;
    case 'table':
      return <Table data={data} />;
    case 'cabinet':
      return <Cabinet data={data} />;
    case 'appliance':
      return <Appliance data={data} />;
    case 'fridge':
      return <Refrigerator data={data} />;
    case 'washer':
      return <WashingMachine data={data} />;
    case 'chair':
      return <Chair data={data} />;
    case 'shower':
      return <Shower data={data} />;
    case 'sink':
      return <Sink data={data} />;
    case 'toilet':
      return <Toilet data={data} />;
    case 'stove':
      return <Stove data={data} />;
    case 'decor':
    default:
      return <Decor data={data} />;
  }
}
