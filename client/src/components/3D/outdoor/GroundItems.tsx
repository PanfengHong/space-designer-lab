import { extend } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { GroundItem } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';
import { useOutdoorPalette } from '../../../constants/outdoorStyles';
import { getGroundElement } from '../../../elements/outdoor/ground';
import { GroundSlab } from '../../../elements/outdoor/ground/ground/View3D';

extend({ RoundedBoxGeometry });

/**
 * 地面结构层 — 地面 / 草地 / 河流 / 道路 / 路口 / 匝道 / 围墙 / 操场
 *
 * 元素约定: position=[x,y,z] 中心; size=[X长, 厚度, Z宽]; 绕Y旋转
 * 道路 position.y > 0.5 时自动生成混凝土桥墩 (高架道路)
 *
 * 内容分发走 elements/outdoor/ground 注册表, 本文件只负责「选中/锁定/高亮」这层外壳。
 */

export interface ContentProps {
  data: GroundItem;
  palette: ReturnType<typeof useOutdoorPalette>;
}

/** 地面元素本体 (无外层定位, 用于场景渲染和缩略图) */
export function GroundItemContent({ data, palette }: ContentProps) {
  const el = getGroundElement(data.type);
  if (!el) return <GroundSlab data={data} palette={palette} />;
  const View3D = el.View3D;
  return <View3D data={data} palette={palette} />;
}

/** 单个地面元素 — 定位/旋转/选中/锁定 */
function GroundItemView({ data }: { data: GroundItem }) {
  const palette = useOutdoorPalette();
  const selectedId = useAppStore((s) => s.selectedGroundId);
  const layers = useAppStore((s) => s.layers);
  const selectGround = useAppStore((s) => s.selectGround);
  const isSelected = selectedId === data.id;
  const groundLocked = layers.find((l) => l.id === 'ground')?.locked ?? true;

  const [w, h, d] = data.size;

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    if (groundLocked) return;
    selectGround(data.id);
  };
  const handlePointerOver = (e: any) => {
    if (groundLocked) return;
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
      <GroundItemContent data={data} palette={palette} />
      {isSelected && (
        <>
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[w, Math.max(h, 0.05), d]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.18} depthWrite={false} />
          </mesh>
          <lineSegments position={[0, 0.02, 0]}>
            <edgesGeometry args={[new THREE.BoxGeometry(w * 1.01, Math.max(h, 0.05) * 1.01, d * 1.01)]} />
            <lineBasicMaterial color="#16a34a" />
          </lineSegments>
          <lineSegments position={[0, 0.02, 0]} scale={1.015}>
            <edgesGeometry args={[new THREE.BoxGeometry(w * 1.01, Math.max(h, 0.05) * 1.01, d * 1.01)]} />
            <lineBasicMaterial color="#22c55e" transparent opacity={0.6} />
          </lineSegments>
        </>
      )}
    </group>
  );
}

export function GroundItemsGroup({ items }: { items: GroundItem[] }) {
  return (
    <group>
      {items.map((item) => (
        <GroundItemView key={item.id} data={item} />
      ))}
    </group>
  );
}
