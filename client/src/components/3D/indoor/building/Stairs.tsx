import * as THREE from 'three';
import type { ReactNode } from 'react';
import { useAppStore } from '../../../../store/useAppStore';
import type { StairFlight } from '../../../../types';

interface StairsProps {
  flights: StairFlight[];
  roomId: string;
}

/**
 * 楼梯组件 — 渲染直跑楼梯 (含踏步、踢面、扶手)
 * 每级台阶: 踏面 (水平面) + 踢面 (垂直面) + 侧板
 */
export function Stairs({ flights, roomId }: StairsProps) {
  const layers = useAppStore((s) => s.layers);
  const buildingLocked = layers.find((l) => l.id === 'building')?.locked ?? true;
  const selectStructure = useAppStore((s) => s.selectStructure);
  const selectedId = useAppStore((s) => s.selectedStructureId);

  return (
    <group>
      {flights.map((flight) => {
        const sid = `stairs:${roomId}:${flight.id}`;
        const isSelected = selectedId === sid;

        // 方向向量
        const dirMap = {
          north: [0, 0, -1] as [number, number, number],
          south: [0, 0, 1] as [number, number, number],
          east: [1, 0, 0] as [number, number, number],
          west: [-1, 0, 0] as [number, number, number],
        };
        const [dx, , dz] = dirMap[flight.direction];

        // 梯段底部标高: 默认 0 (从地面起升); 下行梯段 (消防楼梯) 传负值,
        // 顶阶踏面与本层地板齐平, 梯段穿过楼板洞口 (Room.floorOpenings) 向下。
        const base = flight.startHeight ?? 0;

        const steps: ReactNode[] = [];
        const totalRun = flight.steps * flight.stepDepth;

        for (let i = 0; i < flight.steps; i++) {
          const stepY = base + i * flight.stepHeight;
          // 踏面中心位置 (沿方向前进)
          const stepCenter = (i + 0.5) * flight.stepDepth;
          const px = flight.position[0] + dx * stepCenter;
          const pz = flight.position[2] + dz * stepCenter;

          // 踏面 (水平板)
          steps.push(
            <mesh key={`${flight.id}-tread-${i}`} position={[px, stepY + flight.stepHeight / 2 - 0.01, pz]} castShadow receiveShadow>
              <boxGeometry args={[
                Math.abs(dx) > 0 ? flight.stepDepth + 0.02 : flight.width,
                0.03,
                Math.abs(dz) > 0 ? flight.stepDepth + 0.02 : flight.width,
              ]} />
              <meshStandardMaterial color="#8a8a8a" roughness={0.7} metalness={0.1} />
            </mesh>
          );

          // 踢面 (垂直板)
          const kickX = flight.position[0] + dx * (i * flight.stepDepth);
          const kickZ = flight.position[2] + dz * (i * flight.stepDepth);
          steps.push(
            <mesh key={`${flight.id}-riser-${i}`} position={[kickX, stepY + flight.stepHeight / 2, kickZ]} castShadow>
              <boxGeometry args={[
                Math.abs(dx) > 0 ? 0.02 : flight.width,
                flight.stepHeight,
                Math.abs(dz) > 0 ? 0.02 : flight.width,
              ]} />
              <meshStandardMaterial color="#7a7a7a" roughness={0.7} metalness={0.1} />
            </mesh>
          );
        }

        // 侧板 (楼梯侧面的三角形斜板)
        const sideOffsetX = dz * (flight.width / 2);
        const sideOffsetZ = -dx * (flight.width / 2);
        for (const side of [1, -1]) {
          const sx = sideOffsetX * side;
          const sz = sideOffsetZ * side;
          // 简化为多个小柱支撑: 从梯段底部 (base) 立到各级踏步
          for (let i = 0; i < flight.steps; i += 2) {
            const colH = i * flight.stepHeight;
            const stepCenter = (i + 0.5) * flight.stepDepth;
            const px = flight.position[0] + dx * stepCenter + sx;
            const pz = flight.position[2] + dz * stepCenter + sz;
            steps.push(
              <mesh key={`${flight.id}-post-${side}-${i}`} position={[px, base + colH / 2, pz]} castShadow>
                <boxGeometry args={[0.04, colH + 0.02, 0.04]} />
                <meshStandardMaterial color="#5a5a5a" roughness={0.6} metalness={0.2} />
              </mesh>
            );
          }
        }

        // 底层地面板 (梯段底部的落地面/休息平台, 随 base 升降)
        const baseX = flight.position[0] + dx * totalRun / 2;
        const baseZ = flight.position[2] + dz * totalRun / 2;
        steps.push(
          <mesh key={`${flight.id}-base`} position={[baseX, base, baseZ]} receiveShadow>
            <boxGeometry args={[
              Math.abs(dx) > 0 ? totalRun : flight.width,
              0.02,
              Math.abs(dz) > 0 ? totalRun : flight.width,
            ]} />
            <meshStandardMaterial color="#6a6a6a" roughness={0.8} />
          </mesh>
        );

        return (
          <group
            key={flight.id}
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
            {steps}
            {isSelected && (
              <mesh position={[baseX, base + (flight.steps * flight.stepHeight) / 2, baseZ]}>
                <boxGeometry args={[
                  Math.abs(dx) > 0 ? totalRun + 0.2 : flight.width + 0.2,
                  flight.steps * flight.stepHeight + 0.2,
                  Math.abs(dz) > 0 ? totalRun + 0.2 : flight.width + 0.2,
                ]} />
                <meshBasicMaterial color="#22c55e" transparent opacity={0.18} depthWrite={false} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
