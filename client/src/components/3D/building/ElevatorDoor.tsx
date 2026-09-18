import * as THREE from 'three';
import { useAppStore } from '../../../store/useAppStore';
import type { ElevatorDoorData } from '../../../types';

interface Props {
  elevators: ElevatorDoorData[];
  roomId: string;
}

/**
 * 电梯门组件 — 真实质感电梯门 (不锈钢双开门 + 楼层指示灯 + 门缝)
 * 门后渲染电梯轿厢 (金属内壁)
 */
export function ElevatorDoor({ elevators, roomId }: Props) {
  const layers = useAppStore((s) => s.layers);
  const buildingLocked = layers.find((l) => l.id === 'building')?.locked ?? true;
  const selectStructure = useAppStore((s) => s.selectStructure);
  const selectedId = useAppStore((s) => s.selectedStructureId);

  return (
    <group>
      {elevators.map((ev) => {
        const sid = `elevator:${roomId}:${ev.id}`;
        const isSelected = selectedId === sid;
        const rot = ((ev.rotation ?? 0) * Math.PI) / 180;
        const w = ev.width;
        const h = ev.height;
        const halfW = w / 2;

        return (
          <group
            key={ev.id}
            position={[ev.position[0], ev.position[1], ev.position[2]]}
            rotation={[0, rot, 0]}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (!buildingLocked) selectStructure(sid);
            }}
            onPointerOver={(e) => {
              if (buildingLocked) return;
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => { document.body.style.cursor = 'default'; }}
          >
            {/* 电梯门框 (不锈钢, 比门洞略大) */}
            <mesh position={[0, h / 2 + 0.02, 0]} castShadow>
              <boxGeometry args={[w + 0.12, 0.08, 0.06]} />
              <meshStandardMaterial color="#3a3a3a" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[-halfW - 0.04, h / 2, 0]} castShadow>
              <boxGeometry args={[0.08, h + 0.02, 0.06]} />
              <meshStandardMaterial color="#3a3a3a" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[halfW + 0.04, h / 2, 0]} castShadow>
              <boxGeometry args={[0.08, h + 0.02, 0.06]} />
              <meshStandardMaterial color="#3a3a3a" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[0, -0.02, 0]} castShadow>
              <boxGeometry args={[w + 0.12, 0.04, 0.06]} />
              <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.3} />
            </mesh>

            {/* 电梯轿厢 (门后, 金属内壁) */}
            <group position={[0, h / 2, -0.15]}>
              {/* 轿厢背墙 */}
              <mesh position={[0, 0, -0.6]} castShadow>
                <boxGeometry args={[w + 0.2, h, 0.04]} />
                <meshStandardMaterial color="#4a4a4a" metalness={0.6} roughness={0.35} />
              </mesh>
              {/* 轿厢侧墙 */}
              <mesh position={[-halfW - 0.1, 0, -0.3]} castShadow>
                <boxGeometry args={[0.04, h, 0.6]} />
                <meshStandardMaterial color="#3e3e3e" metalness={0.6} roughness={0.35} />
              </mesh>
              <mesh position={[halfW + 0.1, 0, -0.3]} castShadow>
                <boxGeometry args={[0.04, h, 0.6]} />
                <meshStandardMaterial color="#3e3e3e" metalness={0.6} roughness={0.35} />
              </mesh>
              {/* 轿厢顶 (灯带) */}
              <mesh position={[0, h / 2 - 0.02, -0.3]}>
                <boxGeometry args={[w + 0.2, 0.04, 0.6]} />
                <meshStandardMaterial color="#f0f0e8" emissive="#ddd0c0" emissiveIntensity={0.6} />
              </mesh>
              {/* 轿厢地面 */}
              <mesh position={[0, -h / 2 + 0.01, -0.3]}>
                <boxGeometry args={[w + 0.1, 0.02, 0.6]} />
                <meshStandardMaterial color="#6a5a4a" roughness={0.5} metalness={0.2} />
              </mesh>
              {/* 控制面板 (侧墙上) */}
              <mesh position={[-halfW - 0.08, 0.5, -0.3]}>
                <boxGeometry args={[0.01, 0.3, 0.08]} />
                <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.3} />
              </mesh>
            </group>

            {/* 左门板 (不锈钢, 带竖向纹路) */}
            <mesh position={[-halfW / 2 - 0.01, h / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[halfW - 0.02, h - 0.04, 0.04]} />
              <meshStandardMaterial color="#c8c8c8" metalness={0.85} roughness={0.2} />
            </mesh>
            {/* 左门板纹路线 */}
            <mesh position={[-halfW / 2 - 0.01, h / 2, 0.022]}>
              <boxGeometry args={[0.01, h - 0.08, 0.002]} />
              <meshStandardMaterial color="#9a9a9a" metalness={0.9} roughness={0.15} />
            </mesh>
            <mesh position={[-halfW / 2 - halfW / 4 - 0.01, h / 2, 0.022]}>
              <boxGeometry args={[0.008, h - 0.08, 0.002]} />
              <meshStandardMaterial color="#aaa" metalness={0.9} roughness={0.15} />
            </mesh>

            {/* 右门板 */}
            <mesh position={[halfW / 2 + 0.01, h / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[halfW - 0.02, h - 0.04, 0.04]} />
              <meshStandardMaterial color="#c8c8c8" metalness={0.85} roughness={0.2} />
            </mesh>
            {/* 右门板纹路线 */}
            <mesh position={[halfW / 2 + 0.01, h / 2, 0.022]}>
              <boxGeometry args={[0.01, h - 0.08, 0.002]} />
              <meshStandardMaterial color="#9a9a9a" metalness={0.9} roughness={0.15} />
            </mesh>
            <mesh position={[halfW / 2 + halfW / 4 + 0.01, h / 2, 0.022]}>
              <boxGeometry args={[0.008, h - 0.08, 0.002]} />
              <meshStandardMaterial color="#aaa" metalness={0.9} roughness={0.15} />
            </mesh>

            {/* 门缝 (中间竖线, 深色) */}
            <mesh position={[0, h / 2, 0.022]}>
              <boxGeometry args={[0.015, h - 0.04, 0.003]} />
              <meshStandardMaterial color="#2a2a2a" metalness={0.3} roughness={0.8} />
            </mesh>

            {/* 楼层指示灯 (门框上方) */}
            <mesh position={[0, h + 0.04, 0.03]}>
              <boxGeometry args={[0.25, 0.08, 0.02]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.4} />
            </mesh>
            {/* 指示灯数字区 (绿色背光) */}
            <mesh position={[0, h + 0.04, 0.042]}>
              <boxGeometry args={[0.08, 0.05, 0.005]} />
              <meshStandardMaterial color="#2a2a2a" emissive="#00ff66" emissiveIntensity={0.8} />
            </mesh>
            {/* 方向箭头 (上) */}
            <mesh position={[0.06, h + 0.04, 0.042]}>
              <boxGeometry args={[0.04, 0.05, 0.005]} />
              <meshStandardMaterial color="#1a1a1a" emissive="#ff8800" emissiveIntensity={0.5} />
            </mesh>

            {/* 门槛 (地面金属条) */}
            <mesh position={[0, 0.01, 0]}>
              <boxGeometry args={[w + 0.12, 0.03, 0.08]} />
              <meshStandardMaterial color="#5a5a5a" metalness={0.8} roughness={0.3} />
            </mesh>

            {/* 选中高亮 */}
            {isSelected && (
              <mesh position={[0, h / 2, 0]}>
                <boxGeometry args={[w + 0.15, h + 0.1, 0.08]} />
                <meshBasicMaterial color="#22c55e" transparent opacity={0.18} depthWrite={false} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
