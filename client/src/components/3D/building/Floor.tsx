import type { WallSegment } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';
import * as THREE from 'three';

interface FloorProps {
  segments: WallSegment[];
  roomId: string;
  thickness?: number;
  color?: string;
  show?: boolean;
}

export function Floor({
  segments,
  roomId,
  thickness = 0.15,
  color = '#c8c8c8',
  show = true,
}: FloorProps) {
  if (!show || segments.length < 3) return null;

  const selectStructure = useAppStore((s) => s.selectStructure);
  const selectedId = useAppStore((s) => s.selectedStructureId);
  const layers = useAppStore((s) => s.layers);
  const buildingLocked = layers.find((l) => l.id === 'building')?.locked ?? true;
  const sid = `floor:${roomId}`;
  const isSelected = selectedId === sid;

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    if (buildingLocked) return;
    selectStructure(sid);
  };
  const handlePointerOver = (e: any) => {
    if (buildingLocked) return;
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };
  const handlePointerOut = () => {
    document.body.style.cursor = 'default';
  };

  // 从墙段端点计算房间边界
  const points: [number, number][] = segments.map((s) => s.start);
  const xs = points.map((p) => p[0]);
  const zs = points.map((p) => p[1]);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);

  const width = maxX - minX;
  const depth = maxZ - minZ;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;

  return (
    <group
      onPointerDown={handlePointerDown}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <mesh
        receiveShadow
        position={[centerX, -thickness / 2, centerZ]}
      >
        <boxGeometry args={[width, thickness, depth]} />
        <meshStandardMaterial
          color={color}
          roughness={0.85}
        />
      </mesh>
      {/* 选中高亮 */}
      {isSelected && (
        <>
          <mesh position={[centerX, 0.001, centerZ]}>
            <boxGeometry args={[width, 0.01, depth]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.18} depthWrite={false} />
          </mesh>
          <lineSegments position={[centerX, 0.001, centerZ]}>
            <edgesGeometry args={[new THREE.BoxGeometry(width * 1.01, 0.01, depth * 1.01)]} />
            <lineBasicMaterial color="#16a34a" />
          </lineSegments>
        </>
      )}
    </group>
  );
}
