import type { FrenchWindow as FrenchWindowData } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';
import * as THREE from 'three';

interface FrenchWindowsProps {
  frenchWindows: FrenchWindowData[];
  roomId: string;
  wallThickness: number;
  monochrome?: boolean;
}

/**
 * 落地窗(推拉门) — 从地面到顶的玻璃推拉门
 * 局部坐标系: 原点在落地窗中心(地面 y=0), +Z 为朝外方向
 *   x = 沿墙面方向(宽度), y = 向上, z = 厚度方向
 */
export function FrenchWindows({ frenchWindows, roomId, wallThickness, monochrome = false }: FrenchWindowsProps) {
  return (
    <group>
      {frenchWindows.map((fw) => (
        <FrenchWindowItem
          key={fw.id}
          frenchWindow={fw}
          roomId={roomId}
          wallThickness={wallThickness}
          monochrome={monochrome}
        />
      ))}
    </group>
  );
}

function FrenchWindowItem({
  frenchWindow,
  roomId,
  wallThickness,
  monochrome = false,
}: {
  frenchWindow: FrenchWindowData;
  roomId: string;
  wallThickness: number;
  monochrome?: boolean;
}) {
  const { position, width, height, rotation = 0 } = frenchWindow;

  const frameColor = monochrome ? '#ffffff' : '#2a2a2a';
  const glassColor = monochrome ? '#e8e8e8' : '#b8d4e8';
  const sillColor = monochrome ? '#f5f5f5' : '#7a7a7a';
  const handleColor = monochrome ? '#cccccc' : '#c0c0c0';

  const fW = 0.07;            // 外框宽度
  const frameDepth = wallThickness * 0.6; // 窗框深度
  const gT = 0.02;            // 玻璃厚度
  const halfW = width / 2;
  const halfH = height / 2;

  // 推拉门: 4 扇玻璃面板, 每扇之间用较宽的门框分隔
  const panelCount = 4;
  const panelGap = 0.05;      // 每扇门之间的分隔缝
  const frameW = 0.05;        // 每扇门的边框宽
  // 单扇门宽 = (总宽 - 外框*2 - 内分隔缝*(panelCount-1)) / panelCount
  const panelW = (width - fW * 2 - panelGap * (panelCount - 1)) / panelCount;

  // 计算每扇门中心 x
  const panelCenters: number[] = [];
  for (let i = 0; i < panelCount; i++) {
    const cx = -halfW + fW + panelW / 2 + i * (panelW + panelGap);
    panelCenters.push(cx);
  }

  const selectStructure = useAppStore((s) => s.selectStructure);
  const selectedId = useAppStore((s) => s.selectedStructureId);
  const layers = useAppStore((s) => s.layers);
  const buildingLocked = layers.find((l) => l.id === 'building')?.locked ?? true;
  const sid = `french:${roomId}:${frenchWindow.id}`;
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
      {/* ====== 底部轨道 (窗台) ====== */}
      <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.1, 0.08, frameDepth + 0.05]} />
        <meshStandardMaterial color={sillColor} roughness={0.6} metalness={0.2} />
      </mesh>
      {/* 顶部轨道 */}
      <mesh position={[0, height - 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.1, 0.08, frameDepth + 0.05]} />
        <meshStandardMaterial color={sillColor} roughness={0.6} metalness={0.2} />
      </mesh>

      {/* 保持通透, 不渲染背景背板 */}
      {/* ====== 外框 (上/下/左/右) ====== */}
      {/* 上框 */}
      <mesh position={[0, height - fW / 2, 0]} castShadow>
        <boxGeometry args={[width, fW, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.3} />
      </mesh>
      {/* 下框 */}
      <mesh position={[0, fW / 2, 0]} castShadow>
        <boxGeometry args={[width, fW, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.3} />
      </mesh>
      {/* 左框 */}
      <mesh position={[-halfW + fW / 2, halfH, 0]} castShadow>
        <boxGeometry args={[fW, height, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.3} />
      </mesh>
      {/* 右框 */}
      <mesh position={[halfW - fW / 2, halfH, 0]} castShadow>
        <boxGeometry args={[fW, height, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.3} />
      </mesh>

      {/* ====== 推拉门扇 (每扇: 框 + 玻璃 + 描边 + 把手) ====== */}
      {panelCenters.map((cx, i) => {
        const isLeft = i < panelCount / 2; // 左半扇把手在右, 右半扇把手在左
        const handleX = isLeft ? cx + panelW / 2 - 0.08 : cx - panelW / 2 + 0.08;
        return (
          <group key={`panel-${i}`}>
            {/* 门扇边框 (上下左右) */}
            {/* 上 */}
            <mesh position={[cx, height - frameW / 2, 0]} castShadow>
              <boxGeometry args={[panelW, frameW, frameDepth * 0.8]} />
              <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.3} />
            </mesh>
            {/* 下 */}
            <mesh position={[cx, frameW / 2, 0]} castShadow>
              <boxGeometry args={[panelW, frameW, frameDepth * 0.8]} />
              <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.3} />
            </mesh>
            {/* 左 */}
            <mesh position={[cx - panelW / 2 + frameW / 2, halfH, 0]} castShadow>
              <boxGeometry args={[frameW, height, frameDepth * 0.8]} />
              <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.3} />
            </mesh>
            {/* 右 */}
            <mesh position={[cx + panelW / 2 - frameW / 2, halfH, 0]} castShadow>
              <boxGeometry args={[frameW, height, frameDepth * 0.8]} />
              <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.3} />
            </mesh>

            {/* 门扇玻璃 */}
            <mesh position={[cx, halfH, 0]}>
              <boxGeometry args={[panelW - frameW * 2, height - frameW * 2, gT]} />
              <meshStandardMaterial
                color={glassColor}
                transparent
                opacity={0.15}
                roughness={0.08}
                metalness={0}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* 门扇玻璃黑色描边 (勾勒每扇门轮廓) */}
            <lineSegments position={[cx, halfH, 0]}>
              <edgesGeometry args={[new THREE.BoxGeometry(panelW - frameW * 2, height - frameW * 2, gT)]} />
              <lineBasicMaterial color="#1a1a1a" />
            </lineSegments>

            {/* 门扇外框描边 */}
            <lineSegments position={[cx, halfH, 0]}>
              <edgesGeometry args={[new THREE.BoxGeometry(panelW, height, frameDepth * 0.8)]} />
              <lineBasicMaterial color="#111111" linewidth={1} />
            </lineSegments>

            {/* 门把手 (竖向长条) */}
            <mesh position={[handleX, halfH, frameDepth * 0.5]} castShadow>
              <boxGeometry args={[0.03, height * 0.4, 0.04]} />
              <meshStandardMaterial color={handleColor} metalness={0.8} roughness={0.2} />
            </mesh>
          </group>
        );
      })}

      {/* ====== 整体外轮廓 ====== */}
      <lineSegments position={[0, halfH, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(width, height, frameDepth)]} />
        <lineBasicMaterial color="#111111" linewidth={1} />
      </lineSegments>
      {/* 选中高亮 */}
      {isSelected && (
        <>
          <mesh position={[0, halfH, 0]}>
            <boxGeometry args={[width, height, frameDepth]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.18} depthWrite={false} />
          </mesh>
          <lineSegments position={[0, halfH, 0]}>
            <edgesGeometry args={[new THREE.BoxGeometry(width * 1.01, height * 1.01, frameDepth * 1.01)]} />
            <lineBasicMaterial color="#16a34a" />
          </lineSegments>
        </>
      )}
      </group>
    </group>
  );
}
