import type { Door } from '../../../../types';
import { useAppStore } from '../../../../store/useAppStore';
import * as THREE from 'three';

interface DoorsProps {
  doors: Door[];
  roomId: string;
  wallThickness: number;
  doorsOpen?: boolean;
  opacity?: number;
  monochrome?: boolean;
}

export function Doors({ doors, roomId, wallThickness, doorsOpen = false, opacity = 1, monochrome = false }: DoorsProps) {
  return (
    <group>
      {doors.map((door) => (
        <DoorItem key={door.id} door={door} roomId={roomId} wallThickness={wallThickness} open={doorsOpen} opacity={opacity} monochrome={monochrome} />
      ))}
    </group>
  );
}

function DoorItem({
  door,
  roomId,
  wallThickness,
  open,
  opacity = 1,
  monochrome = false,
}: {
  door: Door;
  roomId: string;
  wallThickness: number;
  open: boolean;
  opacity?: number;
  monochrome?: boolean;
}) {
  const thickness = Math.max(0.08, wallThickness * 0.6);
  const frameColor = monochrome ? '#ffffff' : '#6b5b45';
  const panelColor = monochrome ? '#f8f8f8' : '#a08060';
  const handleColor = monochrome ? '#bbbbbb' : '#d4af37';

  const baseRotation = (door.rotation ?? 0) * Math.PI / 180;
  const hingeSide = door.hingeSide ?? 'left';

  const selectStructure = useAppStore((s) => s.selectStructure);
  const selectedId = useAppStore((s) => s.selectedStructureId);
  const layers = useAppStore((s) => s.layers);
  const buildingLocked = layers.find((l) => l.id === 'building')?.locked ?? true;
  const sid = `door:${roomId}:${door.id}`;
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

  // 门洞 (深色背板, 让门框内凹更明显)
  const doorHoleHeight = door.height + 0.05;
  const doorHoleWidth = door.width + 0.06;
  // 高亮包围盒 (沿门的局部坐标: x=宽, y=高, z=墙厚)
  const hlW = doorHoleWidth;
  const hlH = doorHoleHeight;
  const hlD = wallThickness + 0.06;

  // 玻璃推拉门: 透明玻璃 + 金属边框 + 推拉轨道 + 横向把手
  const isGlass = door.style === 'glass';
  const glassColor = monochrome ? '#ffffff' : '#a8c8d8';
  const metalColor = monochrome ? '#bbbbbb' : '#8a8a8a';

  return (
    <group position={[door.position[0], door.position[1], door.position[2]]} rotation={[0, baseRotation, 0]}>
      {/* 命中/选中外层 group */}
      <group
        onPointerDown={handlePointerDown}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
      {/* 门洞保持完全通透 (不渲染背板), 门框仅保留上下左右边框 */}
      {/* 门框 — 上 */}
      <mesh position={[0, doorHoleHeight - 0.04, 0]} castShadow>
        <boxGeometry args={[doorHoleWidth + 0.04, 0.08, wallThickness + 0.04]} />
        <meshStandardMaterial color={isGlass ? metalColor : frameColor} roughness={isGlass ? 0.4 : 0.6} metalness={isGlass ? 0.6 : 0} />
      </mesh>
      {/* 门框 — 左 */}
      <mesh position={[-doorHoleWidth / 2, doorHoleHeight / 2 - 0.04, 0]} castShadow>
        <boxGeometry args={[0.08, doorHoleHeight, wallThickness + 0.04]} />
        <meshStandardMaterial color={isGlass ? metalColor : frameColor} roughness={isGlass ? 0.4 : 0.6} metalness={isGlass ? 0.6 : 0} />
      </mesh>
      {/* 门框 — 右 */}
      <mesh position={[doorHoleWidth / 2, doorHoleHeight / 2 - 0.04, 0]} castShadow>
        <boxGeometry args={[0.08, doorHoleHeight, wallThickness + 0.04]} />
        <meshStandardMaterial color={isGlass ? metalColor : frameColor} roughness={isGlass ? 0.4 : 0.6} metalness={isGlass ? 0.6 : 0} />
      </mesh>

      {isGlass ? (
        // ===== 玻璃推拉门: 两扇推拉玻璃面板 + 上下轨道 + 横向把手 =====
        <>
          {/* 上轨道 */}
          <mesh position={[0, doorHoleHeight - 0.02, 0]} castShadow>
            <boxGeometry args={[doorHoleWidth, 0.04, wallThickness * 0.6]} />
            <meshStandardMaterial color={metalColor} roughness={0.3} metalness={0.7} />
          </mesh>
          {/* 下轨道 */}
          <mesh position={[0, 0.02, 0]} castShadow>
            <boxGeometry args={[doorHoleWidth, 0.04, wallThickness * 0.6]} />
            <meshStandardMaterial color={metalColor} roughness={0.3} metalness={0.7} />
          </mesh>
          {/* 左扇玻璃门 (略偏 -Z, 避免与右扇重叠) */}
          <group position={[-door.width * 0.25, door.height / 2, -0.015]}>
            <mesh castShadow>
              <boxGeometry args={[door.width * 0.48, door.height - 0.1, 0.025]} />
              <meshStandardMaterial
                color={glassColor}
                transparent
                opacity={opacity < 1 ? opacity * 0.5 : 0.35}
                roughness={0.05}
                metalness={0.1}
                depthWrite={false}
              />
            </mesh>
            {/* 玻璃边框描边 */}
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(door.width * 0.48, door.height - 0.1, 0.025)]} />
              <lineBasicMaterial color="#1a1a1a" transparent opacity={opacity < 1 ? opacity : 1} />
            </lineSegments>
            {/* 横向把手 (靠右侧, 即门扇交界处) */}
            <mesh position={[door.width * 0.24 - 0.01, 0, 0.03]} castShadow>
              <boxGeometry args={[0.04, 0.4, 0.03]} />
              <meshStandardMaterial color={metalColor} roughness={0.2} metalness={0.8} />
            </mesh>
          </group>
          {/* 右扇玻璃门 (略偏 +Z) */}
          <group position={[door.width * 0.25, door.height / 2, 0.015]}>
            <mesh castShadow>
              <boxGeometry args={[door.width * 0.48, door.height - 0.1, 0.025]} />
              <meshStandardMaterial
                color={glassColor}
                transparent
                opacity={opacity < 1 ? opacity * 0.5 : 0.35}
                roughness={0.05}
                metalness={0.1}
                depthWrite={false}
              />
            </mesh>
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(door.width * 0.48, door.height - 0.1, 0.025)]} />
              <lineBasicMaterial color="#1a1a1a" transparent opacity={opacity < 1 ? opacity : 1} />
            </lineSegments>
            {/* 横向把手 (靠左侧, 即门扇交界处) */}
            <mesh position={[-(door.width * 0.24 - 0.01), 0, 0.03]} castShadow>
              <boxGeometry args={[0.04, 0.4, 0.03]} />
              <meshStandardMaterial color={metalColor} roughness={0.2} metalness={0.8} />
            </mesh>
          </group>
        </>
      ) : (
        // ===== 普通门: 带铰链的摆动门板 =====
        <group
          position={[hingeSide === 'right' ? door.width / 2 : -door.width / 2, 0, 0]}
          rotation={[0, open ? (door.openInward ? -Math.PI / 2 : Math.PI / 2) : 0, 0]}
        >
          {/* 门板主体 */}
          <mesh position={[hingeSide === 'right' ? -door.width / 2 : door.width / 2, door.height / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[door.width - 0.02, door.height - 0.15, thickness]} />
            <meshStandardMaterial
              color={panelColor}
              transparent={opacity < 1}
              opacity={opacity}
              roughness={0.75}
            />
          </mesh>
          {/* 门板描边 (position 与门板主体一致, 避免错位) */}
          <lineSegments position={[hingeSide === 'right' ? -door.width / 2 : door.width / 2, door.height / 2, 0]}>
            <edgesGeometry
              args={[new THREE.BoxGeometry(door.width - 0.02, door.height - 0.15, thickness)]}
            />
            <lineBasicMaterial color="#1a1a1a" transparent opacity={opacity < 1 ? opacity : 1} />
          </lineSegments>
          {/* 门把手 — 正面 */}
          <mesh position={[hingeSide === 'right' ? -(door.width - 0.15) : door.width - 0.15, door.height / 2, thickness / 2 + 0.02]} castShadow>
            <boxGeometry args={[0.02, 0.15, 0.04]} />
            <meshStandardMaterial color={handleColor} metalness={0.8} roughness={0.2} />
          </mesh>
          {/* 门把手 — 背面 */}
          <mesh position={[hingeSide === 'right' ? -(door.width - 0.15) : door.width - 0.15, door.height / 2, -(thickness / 2 + 0.02)]} castShadow>
            <boxGeometry args={[0.02, 0.15, 0.04]} />
            <meshStandardMaterial color={handleColor} metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      )}
      {/* 选中高亮 */}
      {isSelected && (
        <>
          <mesh position={[0, hlH / 2, 0]}>
            <boxGeometry args={[hlW, hlH, hlD]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.18} depthWrite={false} />
          </mesh>
          <lineSegments position={[0, hlH / 2, 0]}>
            <edgesGeometry args={[new THREE.BoxGeometry(hlW * 1.01, hlH * 1.01, hlD * 1.01)]} />
            <lineBasicMaterial color="#16a34a" />
          </lineSegments>
        </>
      )}
      </group>
    </group>
  );
}
