import { useState, useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { WallSegment } from '../../../../types';
import { useAppStore } from '../../../../store/useAppStore';
import * as THREE from 'three';

// 墙体端点拖拽手柄 — 选中墙体时在两端显示, 拖拽调节端点位置
function WallEndHandle({
  wallSeg, roomId, edge, yCenter, height, thickness,
}: {
  wallSeg: WallSegment; roomId: string; edge: 'start' | 'end'; yCenter: number; height: number; thickness: number;
}) {
  const updateStructure = useAppStore((s) => s.updateStructure);
  const { camera, gl, raycaster, controls } = useThree() as {
    camera: THREE.PerspectiveCamera; gl: THREE.WebGLRenderer; raycaster: THREE.Raycaster;
    controls: { enabled: boolean } | null;
  };
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const ndcRef = useRef(new THREE.Vector2());
  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const hitRef = useRef(new THREE.Vector3());
  const rectRef = useRef<DOMRect | null>(null);
  const rectTimeRef = useRef(0);
  // 记录最新 wallSeg, 避免 useEffect 重绑定 listener
  const segRef = useRef(wallSeg);
  segRef.current = wallSeg;
  // 预分配向量, 避免拖拽中频繁 new
  const dirRef = useRef(new THREE.Vector3());
  const anchorRef = useRef(new THREE.Vector3());
  const mouseRef = useRef(new THREE.Vector3());
  const projRef = useRef(new THREE.Vector3());
  const tmpRef = useRef(new THREE.Vector3());

  const pos = edge === 'start' ? wallSeg.start : wallSeg.end;
  const handlePos: [number, number, number] = [pos[0], yCenter, pos[1]];
  // 可见柱体半径 (固定 0.12m, 不依赖墙厚, 保证最小可见尺寸)
  const radius = 0.12;
  // 不可见命中范围 (更大, 提升选中精度, 不影响视觉)
  const hitRadius = 0.25;

  const onPointerDown = (e: any) => {
    e.stopPropagation();
    setDragging(true);
  };

  // 拖拽中: 在 window 上监听 pointermove/pointerup, 鼠标移出手柄仍能持续触发
  useEffect(() => {
    if (!dragging) return;
    // 拖拽期间禁用 OrbitControls, 防止视角旋转
    if (controls) controls.enabled = false;
    const cur = segRef.current;
    // 锁定点 (拖拽时保持不动的另一端), 墙体方向轴
    const anchor = edge === 'start' ? cur.end : cur.start;
    anchorRef.current.set(anchor[0], 0, anchor[1]);
    const moving = edge === 'start' ? cur.start : cur.end;
    dirRef.current.set(moving[0] - anchor[0], 0, moving[1] - anchor[1]);
    const dirLen = dirRef.current.length();
    if (dirLen > 0.0001) dirRef.current.divideScalar(dirLen); else dirRef.current.set(1, 0, 0);

    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      if (!rectRef.current || now - rectTimeRef.current > 100) {
        rectRef.current = gl.domElement.getBoundingClientRect();
        rectTimeRef.current = now;
      }
      const rect = rectRef.current!;
      ndcRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndcRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndcRef.current, camera);
      const hit = raycaster.ray.intersectPlane(planeRef.current, hitRef.current);
      if (hit) {
        // 鼠标地面投影 → 投影到墙体方向轴上 → 约束只能沿墙角度延伸
        mouseRef.current.set(hit.x, 0, hit.z);
        tmpRef.current.copy(mouseRef.current).sub(anchorRef.current);
        const t = tmpRef.current.dot(dirRef.current);
        // 约束最小长度 0.3m, 防止墙体缩成点
        const minLen = 0.3;
        const clampedT = t < minLen ? minLen : t;
        projRef.current.copy(dirRef.current).multiplyScalar(clampedT).add(anchorRef.current);
        const patch = edge === 'start'
          ? { start: [projRef.current.x, projRef.current.z] as [number, number] }
          : { end: [projRef.current.x, projRef.current.z] as [number, number] };
        updateStructure(`wall:${roomId}:${cur.id}`, patch);
      }
    };
    const onUp = () => {
      setDragging(false);
      if (controls) controls.enabled = true;
      document.body.style.cursor = 'default';
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (controls) controls.enabled = true;
    };
  }, [dragging, edge, roomId, camera, gl, raycaster, controls, updateStructure]);

  return (
    <group position={handlePos}>
      {/* 可见柱体 (墙端柱) */}
      <mesh
        onPointerDown={onPointerDown}
        onPointerOver={(e: any) => { e.stopPropagation(); setHovered(true); if (!dragging) document.body.style.cursor = 'grab'; }}
        onPointerOut={() => { setHovered(false); if (!dragging) document.body.style.cursor = 'default'; }}
      >
        <cylinderGeometry args={[radius, radius, height, 16]} />
        <meshBasicMaterial
          color={dragging ? '#22c55e' : hovered ? '#ef4444' : '#f97316'}
          depthTest={false}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* 不可见命中球 (扩大点击热区, 不影响视觉) */}
      <mesh
        onPointerDown={onPointerDown}
        onPointerOver={(e: any) => { e.stopPropagation(); setHovered(true); if (!dragging) document.body.style.cursor = 'grab'; }}
        onPointerOut={() => { setHovered(false); if (!dragging) document.body.style.cursor = 'default'; }}
      >
        <sphereGeometry args={[hitRadius, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

// 墙体选中高亮 + 端点手柄
function WallSelection({
  seg, roomId, midX, midZ, angle, hlLen, effectiveHeight, thickness,
}: {
  seg: WallSegment; roomId: string; midX: number; midZ: number; angle: number;
  hlLen: number; effectiveHeight: number; thickness: number;
}) {
  return (
    <>
      <mesh position={[midX, effectiveHeight / 2, midZ]} rotation={[0, -angle, 0]} raycast={() => null}>
        <boxGeometry args={[hlLen, effectiveHeight, thickness]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <lineSegments position={[midX, effectiveHeight / 2, midZ]} rotation={[0, -angle, 0]} raycast={() => null}>
        <edgesGeometry args={[new THREE.BoxGeometry(hlLen * 1.01, effectiveHeight * 1.01, thickness * 1.01)]} />
        <lineBasicMaterial color="#16a34a" />
      </lineSegments>
      <WallEndHandle wallSeg={seg} roomId={roomId} edge="start" yCenter={effectiveHeight / 2} height={effectiveHeight} thickness={thickness} />
      <WallEndHandle wallSeg={seg} roomId={roomId} edge="end" yCenter={effectiveHeight / 2} height={effectiveHeight} thickness={thickness} />
    </>
  );
}

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
              {isSelected && <WallSelection seg={seg} roomId={roomId} midX={midX} midZ={midZ} angle={angle} hlLen={hlLen} effectiveHeight={effectiveHeight} thickness={thickness} />}
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
              {isSelected && <WallSelection seg={seg} roomId={roomId} midX={midX} midZ={midZ} angle={angle} hlLen={hlLen} effectiveHeight={effectiveHeight} thickness={thickness} />}
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
            {isSelected && <WallSelection seg={seg} roomId={roomId} midX={midX} midZ={midZ} angle={angle} hlLen={hlLen} effectiveHeight={effectiveHeight} thickness={thickness} />}
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
