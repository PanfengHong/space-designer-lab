import type { WallSegment } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';
import * as THREE from 'three';

interface WallsProps {
  segments: WallSegment[];
  roomId: string;
  height: number;
  thickness: number;
  cutHeight?: number;
  showCeiling?: boolean;
  color?: string;
  opacity?: number;
}

export function Walls({
  segments,
  roomId,
  height,
  thickness,
  cutHeight,
  showCeiling = true,
  color = '#d4d4d4',
  opacity = 1,
}: WallsProps) {
  const effectiveHeight = cutHeight && cutHeight < height ? cutHeight : height;
  // 每段墙沿中心线两端各延伸 halfT, 使转角处两面墙互相搭接, 消除外角缺口
  const halfT = thickness / 2;
  // 过滤掉开放口（仅用于定义边界，不渲染墙体）
  const solidWalls = segments.filter((s) => !s.opening);

  const selectStructure = useAppStore((s) => s.selectStructure);
  const selectedId = useAppStore((s) => s.selectedStructureId);
  const layers = useAppStore((s) => s.layers);
  const buildingLocked = layers.find((l) => l.id === 'building')?.locked ?? true;

  const makeHandlers = (seg: WallSegment) => {
    const sid = `wall:${roomId}:${seg.id}`;
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
    return { isSelected, handlePointerDown, handlePointerOver, handlePointerOut };
  };

  return (
    <group>
      {/* 墙体 */}
      {solidWalls.map((seg) => {
        const [x1, z1] = seg.start;
        const [x2, z2] = seg.end;
        const length = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
        const angle = Math.atan2(z2 - z1, x2 - x1);
        const midX = (x1 + x2) / 2;
        const midZ = (z1 + z2) / 2;

        const { isSelected, handlePointerDown, handlePointerOver, handlePointerOut } = makeHandlers(seg);
        const hlLen = length + thickness;

        // 无 cutout 或者洞口宽度极小：整面墙一个 box
        if (!seg.cutout) {
          return (
            <group
              key={seg.id}
              onPointerDown={handlePointerDown}
              onPointerOver={handlePointerOver}
              onPointerOut={handlePointerOut}
            >
              <mesh
                position={[midX, effectiveHeight / 2, midZ]}
                rotation={[0, -angle, 0]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[hlLen, effectiveHeight, thickness]} />
                <meshStandardMaterial
                  color={color}
                  transparent={opacity < 1}
                  opacity={opacity}
                  roughness={0.9}
                />
              </mesh>
              {isSelected && (
                <>
                  <mesh position={[midX, effectiveHeight / 2, midZ]} rotation={[0, -angle, 0]}>
                    <boxGeometry args={[hlLen, effectiveHeight, thickness]} />
                    <meshBasicMaterial color="#22c55e" transparent opacity={0.18} depthWrite={false} />
                  </mesh>
                  <lineSegments position={[midX, effectiveHeight / 2, midZ]} rotation={[0, -angle, 0]}>
                    <edgesGeometry args={[new THREE.BoxGeometry(hlLen * 1.01, effectiveHeight * 1.01, thickness * 1.01)]} />
                    <lineBasicMaterial color="#16a34a" />
                  </lineSegments>
                </>
              )}
            </group>
          );
        }

        // ===== 【修复后】cutout.start / cutout.end 统一是沿墙起点的局部长度 =====
        const { sill, top } = seg.cutout;
        let cs = seg.cutout.start;
        let ce = seg.cutout.end;

        // 规范化：保证 cs < ce
        if (cs > ce) [cs, ce] = [ce, cs];
        // 钳制在墙长度区间内
        cs = Math.max(0, Math.min(cs, length));
        ce = Math.max(0, Math.min(ce, length));

        const holeLen = ce - cs;
        // 洞口宽度太小，不拆分，直接渲染整墙
        if (holeLen < 0.001) {
          return (
            <group
              key={seg.id}
              onPointerDown={handlePointerDown}
              onPointerOver={handlePointerOver}
              onPointerOut={handlePointerOut}
            >
              <mesh
                position={[midX, effectiveHeight / 2, midZ]}
                rotation={[0, -angle, 0]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[hlLen, effectiveHeight, thickness]} />
                <meshStandardMaterial
                  color={color}
                  transparent={opacity < 1}
                  opacity={opacity}
                  roughness={0.9}
                />
              </mesh>
              {isSelected && (
                <>
                  <mesh position={[midX, effectiveHeight / 2, midZ]} rotation={[0, -angle, 0]}>
                    <boxGeometry args={[hlLen, effectiveHeight, thickness]} />
                    <meshBasicMaterial color="#22c55e" transparent opacity={0.18} depthWrite={false} />
                  </mesh>
                  <lineSegments position={[midX, effectiveHeight / 2, midZ]} rotation={[0, -angle, 0]}>
                    <edgesGeometry args={[new THREE.BoxGeometry(hlLen * 1.01, effectiveHeight * 1.01, thickness * 1.01)]} />
                    <lineBasicMaterial color="#16a34a" />
                  </lineSegments>
                </>
              )}
            </group>
          );
        }

        const wallPieces: { len: number; t: number; yCenter: number; ySize: number }[] = [];

        // 左侧实心段 (t: -halfT ~ cs, 外端延伸 halfT 填充转角)
        if (cs > 0) {
          wallPieces.push({
            len: cs + halfT,
            t: (cs - halfT) / 2,
            yCenter: effectiveHeight / 2,
            ySize: effectiveHeight,
          });
        }
        // 右侧实心段 (t: ce ~ length+halfT, 外端延伸 halfT 填充转角)
        if (ce < length) {
          wallPieces.push({
            len: length - ce + halfT,
            t: (ce + length + halfT) / 2,
            yCenter: effectiveHeight / 2,
            ySize: effectiveHeight,
          });
        }
        // 洞口下方 (t: cs ~ ce, 不延伸)
        if (sill > 0) {
          wallPieces.push({
            len: ce - cs,
            t: (cs + ce) / 2,
            yCenter: sill / 2,
            ySize: sill,
          });
        }
        // 洞口上方 (t: cs ~ ce, 不延伸)
        if (top < effectiveHeight) {
          const topH = effectiveHeight - top;
          wallPieces.push({
            len: ce - cs,
            t: (cs + ce) / 2,
            yCenter: top + topH / 2,
            ySize: topH,
          });
        }

        return (
          <group
            key={seg.id}
            onPointerDown={handlePointerDown}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          >
            {wallPieces.map((p, i) => {
              // 将沿墙参数 t 转换为世界坐标中点
              const tRatio = p.t / length;
              const px = x1 + (x2 - x1) * tRatio;
              const pz = z1 + (z2 - z1) * tRatio;
              return (
                <mesh
                  key={`${seg.id}-p${i}`}
                  position={[px, p.yCenter, pz]}
                  rotation={[0, -angle, 0]}
                  castShadow
                  receiveShadow
                >
                  <boxGeometry args={[p.len, p.ySize, thickness]} />
                  <meshStandardMaterial
                    color={color}
                    transparent={opacity < 1}
                    opacity={opacity}
                    roughness={0.9}
                  />
                </mesh>
              );
            })}
            {isSelected && (
              <>
                <mesh position={[midX, effectiveHeight / 2, midZ]} rotation={[0, -angle, 0]}>
                  <boxGeometry args={[hlLen, effectiveHeight, thickness]} />
                  <meshBasicMaterial color="#22c55e" transparent opacity={0.18} depthWrite={false} />
                </mesh>
                <lineSegments position={[midX, effectiveHeight / 2, midZ]} rotation={[0, -angle, 0]}>
                  <edgesGeometry args={[new THREE.BoxGeometry(hlLen * 1.01, effectiveHeight * 1.01, thickness * 1.01)]} />
                  <lineBasicMaterial color="#16a34a" />
                </lineSegments>
              </>
            )}
          </group>
        );
      })}

      {/* 天花板 - 覆盖整个房间的面板 */}
      {showCeiling && (
        (() => {
          let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
          for (const seg of segments) {
            minX = Math.min(minX, seg.start[0], seg.end[0]);
            maxX = Math.max(maxX, seg.start[0], seg.end[0]);
            minZ = Math.min(minZ, seg.start[1], seg.end[1]);
            maxZ = Math.max(maxZ, seg.start[1], seg.end[1]);
          }
          const width = maxX - minX + thickness;
          const depth = maxZ - minZ + thickness;
          const cx = (minX + maxX) / 2;
          const cz = (minZ + maxZ) / 2;
          return (
            <mesh position={[cx, height, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[width, depth]} />
              <meshStandardMaterial
                color="#f0ece4"
                side={THREE.DoubleSide}
                transparent={opacity < 1}
                opacity={opacity}
                roughness={0.95}
              />
            </mesh>
          );
        })()
      )}
    </group>
  );
}
