import type { BayWindow as BayWindowData } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';
import * as THREE from 'three';

interface BayWindowsProps {
  bayWindows: BayWindowData[];
  roomId: string;
  wallThickness: number;
  monochrome?: boolean;
}

/**
 * 飘窗组件 — 从墙体向外凸出的矩形盒子，三面（正/左/右）均有窗框+玻璃
 * 局部坐标系: 原点在飘窗背面中心(贴墙那面), +Z 为凸出方向
 *   x = 沿墙面方向(宽度), y = 向上, z = 凸出方向(深度)
 * position.y 为窗台高度, height 为从窗台向上的总高度
 */
export function BayWindows({ bayWindows, roomId, wallThickness, monochrome = false }: BayWindowsProps) {
  return (
    <group>
      {bayWindows.map((bw) => (
        <BayWindowItem
          key={bw.id}
          bayWindow={bw}
          roomId={roomId}
          wallThickness={wallThickness}
          monochrome={monochrome}
        />
      ))}
    </group>
  );
}

function BayWindowItem({
  bayWindow,
  roomId,
  wallThickness,
  monochrome = false,
}: {
  bayWindow: BayWindowData;
  roomId: string;
  wallThickness: number;
  monochrome?: boolean;
}) {
  const { position, width, depth, height, rotation = 0 } = bayWindow;

  const frameColor = monochrome ? '#ffffff' : '#5a5248';
  const glassColor = monochrome ? '#e8e8e8' : '#8ab5d4';
  const sillColor = monochrome ? '#f5f5f5' : '#a8a8a8';

  const fW = 0.08; // 窗框宽度
  const fD = wallThickness * 0.6; // 窗框深度(沿凸出方向)
  const gT = 0.03; // 玻璃厚度
  const halfW = width / 2;
  const halfD = depth / 2;

  const selectStructure = useAppStore((s) => s.selectStructure);
  const selectedId = useAppStore((s) => s.selectedStructureId);
  const layers = useAppStore((s) => s.layers);
  const buildingLocked = layers.find((l) => l.id === 'building')?.locked ?? true;
  const sid = `bay:${roomId}:${bayWindow.id}`;
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

  return (
    <group
      position={position}
      rotation={[0, (rotation * Math.PI) / 180, 0]}
    >
      <group
        onPointerDown={handlePointerDown}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
      {/* ====== 窗台板 (底部) ====== */}
      <mesh position={[0, 0, halfD]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.04, 0.1, depth + 0.04]} />
        <meshStandardMaterial color={sillColor} roughness={0.7} />
      </mesh>
      {/* ====== 顶板 ====== */}
      <mesh position={[0, height, halfD]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.04, 0.1, depth + 0.04]} />
        <meshStandardMaterial color={sillColor} roughness={0.7} />
      </mesh>

      {/* ============ 正面 (朝 +Z) ============ */}
      {/* 保持通透, 不渲染背板 */}
      {/* 正面窗框 — 上 */}
      <mesh position={[0, height - fW / 2, halfD]} castShadow>
        <boxGeometry args={[width, fW, fD]} />
        <meshStandardMaterial color={frameColor} roughness={0.6} />
      </mesh>
      {/* 正面窗框 — 下 */}
      <mesh position={[0, fW / 2, halfD]} castShadow>
        <boxGeometry args={[width, fW, fD]} />
        <meshStandardMaterial color={frameColor} roughness={0.6} />
      </mesh>
      {/* 正面窗框 — 左 */}
      <mesh position={[-halfW + fW / 2, height / 2, halfD]} castShadow>
        <boxGeometry args={[fW, height, fD]} />
        <meshStandardMaterial color={frameColor} roughness={0.6} />
      </mesh>
      {/* 正面窗框 — 右 */}
      <mesh position={[halfW - fW / 2, height / 2, halfD]} castShadow>
        <boxGeometry args={[fW, height, fD]} />
        <meshStandardMaterial color={frameColor} roughness={0.6} />
      </mesh>
      {/* 正面玻璃 */}
      <mesh position={[0, height / 2, halfD]}>
        <boxGeometry args={[width - fW * 2, height - fW * 2, gT]} />
        <meshStandardMaterial
          color={glassColor}
          transparent
          opacity={0.2}
          roughness={0.05}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* 正面玻璃描边 (position 与玻璃一致) */}
      <lineSegments position={[0, height / 2, halfD]}>
        <edgesGeometry args={[new THREE.BoxGeometry(width - fW * 2, height - fW * 2, gT)]} />
        <lineBasicMaterial color="#1a1a1a" />
      </lineSegments>

      {/* ============ 左侧面 (朝 -X) ============ */}
      {/* 保持通透, 不渲染背板 */}
      {/* 左侧窗框 — 上 */}
      <mesh position={[-halfW, height - fW / 2, halfD]} castShadow>
        <boxGeometry args={[fD, fW, depth]} />
        <meshStandardMaterial color={frameColor} roughness={0.6} />
      </mesh>
      {/* 左侧窗框 — 下 */}
      <mesh position={[-halfW, fW / 2, halfD]} castShadow>
        <boxGeometry args={[fD, fW, depth]} />
        <meshStandardMaterial color={frameColor} roughness={0.6} />
      </mesh>
      {/* 左侧窗框 — 前 */}
      <mesh position={[-halfW, height / 2, halfD - fW / 2]} castShadow>
        <boxGeometry args={[fD, height, fW]} />
        <meshStandardMaterial color={frameColor} roughness={0.6} />
      </mesh>
      {/* 左侧窗框 — 后 */}
      <mesh position={[-halfW, height / 2, fW / 2]} castShadow>
        <boxGeometry args={[fD, height, fW]} />
        <meshStandardMaterial color={frameColor} roughness={0.6} />
      </mesh>
      {/* 左侧玻璃 */}
      <mesh position={[-halfW, height / 2, halfD]}>
        <boxGeometry args={[gT, height - fW * 2, depth - fW * 2]} />
        <meshStandardMaterial
          color={glassColor}
          transparent
          opacity={0.2}
          roughness={0.05}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ============ 右侧面 (朝 +X) ============ */}
      {/* 保持通透, 不渲染背板 */}
      {/* 右侧窗框 — 上 */}
      <mesh position={[halfW, height - fW / 2, halfD]} castShadow>
        <boxGeometry args={[fD, fW, depth]} />
        <meshStandardMaterial color={frameColor} roughness={0.6} />
      </mesh>
      {/* 右侧窗框 — 下 */}
      <mesh position={[halfW, fW / 2, halfD]} castShadow>
        <boxGeometry args={[fD, fW, depth]} />
        <meshStandardMaterial color={frameColor} roughness={0.6} />
      </mesh>
      {/* 右侧窗框 — 前 */}
      <mesh position={[halfW, height / 2, halfD - fW / 2]} castShadow>
        <boxGeometry args={[fD, height, fW]} />
        <meshStandardMaterial color={frameColor} roughness={0.6} />
      </mesh>
      {/* 右侧窗框 — 后 */}
      <mesh position={[halfW, height / 2, fW / 2]} castShadow>
        <boxGeometry args={[fD, height, fW]} />
        <meshStandardMaterial color={frameColor} roughness={0.6} />
      </mesh>
      {/* 右侧玻璃 */}
      <mesh position={[halfW, height / 2, halfD]}>
        <boxGeometry args={[gT, height - fW * 2, depth - fW * 2]} />
        <meshStandardMaterial
          color={glassColor}
          transparent
          opacity={0.2}
          roughness={0.05}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ====== 整体外轮廓黑色描边 (中心在 [0, height/2, halfD]) ====== */}
      <lineSegments position={[0, height / 2, halfD]}>
        <edgesGeometry args={[new THREE.BoxGeometry(width + 0.04, height + 0.1, depth + 0.04)]} />
        <lineBasicMaterial color="#111111" linewidth={1} />
      </lineSegments>
      {/* 选中高亮 */}
      {isSelected && (
        <>
          <mesh position={[0, height / 2, halfD]}>
            <boxGeometry args={[width + 0.04, height + 0.1, depth + 0.04]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.18} depthWrite={false} />
          </mesh>
          <lineSegments position={[0, height / 2, halfD]}>
            <edgesGeometry args={[new THREE.BoxGeometry((width + 0.04) * 1.01, (height + 0.1) * 1.01, (depth + 0.04) * 1.01)]} />
            <lineBasicMaterial color="#16a34a" />
          </lineSegments>
        </>
      )}
      </group>
    </group>
  );
}
