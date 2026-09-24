import type { Window } from '../../../../types';
import { useAppStore } from '../../../../store/useAppStore';
import * as THREE from 'three';

interface WindowsProps {
  windows: Window[];
  roomId: string;
  wallThickness: number;
  opacity?: number;
  monochrome?: boolean;
}

export function Windows({ windows, roomId, wallThickness, opacity = 1, monochrome = false }: WindowsProps) {
  return (
    <group>
      {windows.map((win) => (
        <WindowItem key={win.id} window={win} roomId={roomId} wallThickness={wallThickness} opacity={opacity} monochrome={monochrome} />
      ))}
    </group>
  );
}

function WindowItem({
  window,
  roomId,
  wallThickness,
  opacity = 1,
  monochrome = false,
}: {
  window: Window;
  roomId: string;
  wallThickness: number;
  opacity?: number;
  monochrome?: boolean;
}) {
  const frameDepth = wallThickness + 0.06;
  const frameWidth = 0.08;
  const frameColor = monochrome ? '#ffffff' : '#5a5248';
  const glassColor = monochrome ? '#e0e0e0' : '#8ab5d4';

  const winW = window.width;
  const winH = window.height;
  // 窗洞尺寸 (稍大于窗框, 形成凹槽感)
  const holeW = winW + 0.12;
  const holeH = winH + 0.12;

  const selectStructure = useAppStore((s) => s.selectStructure);
  const selectedId = useAppStore((s) => s.selectedStructureId);
  const layers = useAppStore((s) => s.layers);
  const buildingLocked = layers.find((l) => l.id === 'building')?.locked ?? true;
  const sid = `window:${roomId}:${window.id}`;
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
      position={[
        window.position[0],
        window.position[1] + winH / 2,
        window.position[2],
      ]}
      rotation={[0, ((window.rotation ?? 0) * Math.PI) / 180, 0]}
    >
      <group
        onPointerDown={handlePointerDown}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
      {/* 窗洞保持完全通透 (不渲染背板) */}
      {/* 窗框 — 上 */}
      <mesh position={[0, holeH / 2 - frameWidth / 2, 0]} castShadow>
        <boxGeometry args={[holeW, frameWidth, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.6} />
      </mesh>
      {/* 窗框 — 下 */}
      <mesh position={[0, -holeH / 2 + frameWidth / 2, 0]} castShadow>
        <boxGeometry args={[holeW, frameWidth, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.6} />
      </mesh>
      {/* 窗框 — 左 */}
      <mesh position={[-holeW / 2 + frameWidth / 2, 0, 0]} castShadow>
        <boxGeometry args={[frameWidth, holeH, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.6} />
      </mesh>
      {/* 窗框 — 右 */}
      <mesh position={[holeW / 2 - frameWidth / 2, 0, 0]} castShadow>
        <boxGeometry args={[frameWidth, holeH, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.6} />
      </mesh>

      {/* 窗棂 — 横 (中间分隔, 推拉窗不渲染) */}
      {window.style !== 'sliding' && winH >= 1.2 && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[winW, frameWidth * 0.7, frameDepth]} />
          <meshStandardMaterial color={frameColor} roughness={0.6} />
        </mesh>
      )}
      {/* 窗棂 — 竖 (中间分隔, 推拉窗始终渲染, 表示两扇推拉) */}
      {winW >= 1.2 && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[frameWidth * 0.7, winH, frameDepth]} />
          <meshStandardMaterial color={frameColor} roughness={0.6} />
        </mesh>
      )}

      {/* 玻璃 */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[winW, winH, 0.03]} />
        <meshStandardMaterial
          color={glassColor}
          transparent
          opacity={0.2}
          roughness={0.05}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* 玻璃黑色描边 (外轮廓) */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(winW, winH, 0.03)]} />
        <lineBasicMaterial color="#1a1a1a" transparent={opacity < 1} opacity={opacity} />
      </lineSegments>

      {/* 外框黑色描边 (整体轮廓) */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(holeW + 0.04, holeH + 0.04, frameDepth)]} />
        <lineBasicMaterial color="#111111" linewidth={1} />
      </lineSegments>
      {/* 选中高亮 */}
      {isSelected && (
        <>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[holeW, holeH, frameDepth]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.18} depthWrite={false} />
          </mesh>
          <lineSegments position={[0, 0, 0]}>
            <edgesGeometry args={[new THREE.BoxGeometry(holeW * 1.01, holeH * 1.01, frameDepth * 1.01)]} />
            <lineBasicMaterial color="#16a34a" />
          </lineSegments>
        </>
      )}
      </group>
    </group>
  );
}
