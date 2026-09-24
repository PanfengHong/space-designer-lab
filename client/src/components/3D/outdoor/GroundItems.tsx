import { useMemo, useRef } from 'react';
import { extend } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { GroundItem } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';
import { useOutdoorPalette } from '../../../constants/outdoorStyles';
import { Road } from './ground/Road';
import { River } from './ground/River';
import { Grass } from './ground/Grass';
import { Intersection } from './ground/Intersection';
import { Ramp } from './ground/Ramp';

extend({ RoundedBoxGeometry });

/**
 * 地面结构层 — 地面 / 草地 / 河流 / 道路
 *
 * 元素约定: position=[x,y,z] 中心; size=[X长, 厚度, Z宽]; 绕Y旋转
 * 道路 position.y > 0.5 时自动生成混凝土桥墩 (高架道路)
 */

export interface ContentProps {
  data: GroundItem;
  palette: ReturnType<typeof useOutdoorPalette>;
}

/** 地面基座 — 白色大平台 */
function GroundSlab({ data, palette }: ContentProps) {
  const [w, h, d] = data.size;
  return (
    <group>
      <mesh receiveShadow castShadow>
        <roundedBoxGeometry args={[w, h, d, 3, 0.08]} />
        <meshStandardMaterial color={palette.ground} roughness={0.9} />
      </mesh>
      {/* 外轮廓浅描边 */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w * 1.002, h * 1.002, d * 1.002)]} />
        <lineBasicMaterial color={palette.edge} />
      </lineSegments>
    </group>
  );
}

/** 地面元素本体 (无外层定位, 用于场景渲染和缩略图) */
export function GroundItemContent({ data, palette }: ContentProps) {
  switch (data.type) {
    case 'ground': return <GroundSlab data={data} palette={palette} />;
    case 'grass': return <Grass data={data} palette={palette} />;
    case 'river': return <River data={data} palette={palette} />;
    case 'road': return <Road data={data} palette={palette} />;
    case 'intersection': return <Intersection data={data} palette={palette} />;
    case 'ramp': return <Ramp data={data} palette={palette} />;
    default: return <GroundSlab data={data} palette={palette} />;
  }
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
