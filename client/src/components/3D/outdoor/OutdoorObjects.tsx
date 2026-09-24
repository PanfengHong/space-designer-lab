import * as THREE from 'three';
import type { OutdoorObject } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';
import { useOutdoorPalette, type OutdoorPalette } from '../../../constants/outdoorStyles';
import { GlassBuilding } from './objects/GlassBuilding';
import { Warehouse } from './objects/Warehouse';
import { Car } from './objects/Car';
import { Truck } from './objects/Truck';

/** 空间对象本体 (无外层定位, 用于场景渲染和缩略图) */
export function OutdoorObjectContent({
  data,
  palette,
}: {
  data: OutdoorObject;
  palette: OutdoorPalette;
}) {
  switch (data.type) {
    case 'building':
      return <GlassBuilding data={data} palette={palette} />;
    case 'warehouse':
      return <Warehouse data={data} palette={palette} />;
    case 'car':
      return <Car data={data} palette={palette} />;
    case 'truck':
      return <Truck data={data} palette={palette} />;
    default:
      return <Warehouse data={data} palette={palette} />;
  }
}

/** 单个空间对象 — 定位/旋转/选中/锁定 */
function OutdoorObjectView({ data }: { data: OutdoorObject }) {
  const palette = useOutdoorPalette();
  const selectedId = useAppStore((s) => s.selectedOutdoorObjectId);
  const layers = useAppStore((s) => s.layers);
  const selectOutdoorObject = useAppStore((s) => s.selectOutdoorObject);
  const isSelected = selectedId === data.id;
  const spaceLocked = layers.find((l) => l.id === 'space')?.locked ?? true;

  const [w, h, d] = data.size;

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    if (spaceLocked) return;
    selectOutdoorObject(data.id);
  };
  const handlePointerOver = (e: any) => {
    if (spaceLocked) return;
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };
  const handlePointerOut = () => {
    document.body.style.cursor = 'default';
  };

  return (
    <group
      position={data.position}
      rotation={[0, (data.rotation * Math.PI) / 180, 0]}
      onPointerDown={handlePointerDown}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <OutdoorObjectContent data={data} palette={palette} />
      {isSelected && (
        <group>
          {/* 半透明绿色高亮盒 */}
          <mesh position={[0, h / 2, 0]}>
            <boxGeometry args={[w, h, d]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.18} depthWrite={false} />
          </mesh>
          {/* 双层绿色线框 */}
          <lineSegments position={[0, h / 2, 0]}>
            <edgesGeometry args={[new THREE.BoxGeometry(w * 1.01, h * 1.01, d * 1.01)]} />
            <lineBasicMaterial color="#16a34a" />
          </lineSegments>
          <lineSegments position={[0, h / 2, 0]} scale={1.015}>
            <edgesGeometry args={[new THREE.BoxGeometry(w * 1.01, h * 1.01, d * 1.01)]} />
            <lineBasicMaterial color="#22c55e" transparent opacity={0.6} />
          </lineSegments>
        </group>
      )}
    </group>
  );
}

export function OutdoorObjectsGroup({ items }: { items: OutdoorObject[] }) {
  return (
    <group>
      {items.map((item) => (
        <OutdoorObjectView key={item.id} data={item} />
      ))}
    </group>
  );
}
