import { useState, useRef, useEffect, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import type { WallSegment } from '../../../../types';
import { useAppStore } from '../../../../store/useAppStore';
import { wallDragLive } from '../../../../utils/hudAnchor';
import { PICK_FURNITURE } from '../../../../utils/pickTags';
import * as THREE from 'three';

/** 端点拖拽的实时预览回调 (wallId, edge, 新位置 / null 表示结束) */
type PreviewFn = (wallId: string, edge: 'start' | 'end', pos: [number, number] | null) => void;

// 墙体端点拖拽手柄 — 选中墙体时在两端显示, 拖拽调节端点位置
function WallEndHandle({
  wallSeg, roomId, edge, yCenter, height, thickness, onPreview,
}: {
  wallSeg: WallSegment; roomId: string; edge: 'start' | 'end'; yCenter: number; height: number; thickness: number;
  onPreview: PreviewFn;
}) {
  const updateStructure = useAppStore((s) => s.updateStructure);
  const { camera, gl, raycaster, controls } = useThree() as {
    camera: THREE.PerspectiveCamera; gl: THREE.WebGLRenderer; raycaster: THREE.Raycaster;
    controls: { enabled: boolean } | null;
  };
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const ndcRef = useRef(new THREE.Vector2());
  // 地面平面 (y=0) —— 仅在"视线几乎与墙轴平行"这种退化情况下作为回退投影面
  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const hitRef = useRef(new THREE.Vector3());
  const rectRef = useRef<DOMRect | null>(null);
  // 记录最新 wallSeg, 避免 useEffect 重绑定 listener
  const segRef = useRef(wallSeg);
  segRef.current = wallSeg;
  // 预分配向量, 避免拖拽中频繁 new
  const dirRef = useRef(new THREE.Vector3());
  // 固定端点在"手柄高度"上的对应点 —— 投影求解用它, 而不是地面点
  const axisRef = useRef(new THREE.Vector3());
  const w0Ref = useRef(new THREE.Vector3());
  const projRef = useRef(new THREE.Vector3());
  const tmpRef = useRef(new THREE.Vector3());
  // 最近一次预览位置 + 是否真的移动过 (决定松手时是否需要提交)
  const lastRef = useRef<[number, number] | null>(null);
  const movedRef = useRef(false);

  const pos = edge === 'start' ? wallSeg.start : wallSeg.end;
  const handlePos: [number, number, number] = [pos[0], yCenter, pos[1]];
  // 可见柱体半径 (固定 0.12m, 不依赖墙厚, 保证最小可见尺寸)
  const radius = 0.12;
  // 不可见命中范围 (更大, 提升选中精度, 不影响视觉)
  const hitRadius = 0.25;

  const onPointerDown = (e: any) => {
    if (e.button !== 0) return; // 仅左键拖拽, 右键留给视角/上下文
    e.stopPropagation();
    movedRef.current = false;
    lastRef.current = null;
    setDragging(true);
  };

  // 拖拽中: 在 window 上监听 pointermove/pointerup, 鼠标移出手柄仍能持续触发
  useEffect(() => {
    if (!dragging) return;
    // 拖拽期间禁用 OrbitControls, 防止视角旋转
    if (controls) controls.enabled = false;
    document.body.style.cursor = 'grabbing';

    const cur = segRef.current;
    // 每次拖拽重新测量 canvas 位置 (窗口/面板尺寸可能变过)
    rectRef.current = null;
    let finished = false;
    // 固定端 (拖拽时不动) 与被拖端
    const fixed = edge === 'start' ? cur.end : cur.start;
    const moving = edge === 'start' ? cur.start : cur.end;
    const startPos: [number, number] = [moving[0], moving[1]];
    // 手柄渲染在"半墙高"处, 投影求解必须在同一高度上进行, 否则会因视差与光标错位
    axisRef.current.set(fixed[0], yCenter, fixed[1]);
    dirRef.current.set(moving[0] - fixed[0], 0, moving[1] - fixed[1]);
    const dirLen = dirRef.current.length();
    if (dirLen > 1e-4) dirRef.current.divideScalar(dirLen); else dirRef.current.set(1, 0, 0);
    // 最小墙长 (m), 防止墙体缩成点
    const MIN_LEN = 0.3;

    const onMove = (e: PointerEvent) => {
      // canvas 尺寸在拖拽期间不变, 只取一次
      if (!rectRef.current) rectRef.current = gl.domElement.getBoundingClientRect();
      const rect = rectRef.current;
      ndcRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndcRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndcRef.current, camera);

      const A = axisRef.current;
      const U = dirRef.current;
      const ray = raycaster.ray;
      const b = ray.direction.dot(U);
      const denom = 1 - b * b;
      let t: number;
      if (denom > 1e-4) {
        // 手柄所在直线 = 过固定端、沿墙轴、位于手柄高度的一条直线。
        // 取它到鼠标射线的最近点 → 手柄在屏幕上精确贴住光标 (杜绝"拖拽不跟手")。
        w0Ref.current.copy(ray.origin).sub(A);
        const d = ray.direction.dot(w0Ref.current);
        const e2 = U.dot(w0Ref.current);
        t = (e2 - b * d) / denom;
      } else {
        // 视线几乎与墙轴平行 → 最近点不唯一, 回退到地面投影
        const hit = ray.intersectPlane(planeRef.current, hitRef.current);
        if (!hit) return;
        tmpRef.current.set(hit.x - A.x, 0, hit.z - A.z);
        t = tmpRef.current.dot(U);
      }
      const len = t < MIN_LEN ? MIN_LEN : t;
      projRef.current.copy(U).multiplyScalar(len).add(A);
      const next: [number, number] = [projRef.current.x, projRef.current.z];
      if (Math.abs(next[0] - startPos[0]) > 1e-4 || Math.abs(next[1] - startPos[1]) > 1e-4) movedRef.current = true;
      lastRef.current = next;

      // 实时预览: 只更新本房间 Walls 的局部状态, 拖拽期间零全局 store 写入
      // (因此不会连锁重渲染左面板/工具条/视口 → 拖拽跟手)
      onPreview(cur.id, edge, next);

      // 长度标签: 数据交给 Canvas 内的 reporter 每帧写 DOM, 不经 React
      wallDragLive.active = true;
      wallDragLive.x = next[0];
      wallDragLive.y = yCenter;
      wallDragLive.z = next[1];
      wallDragLive.length = len;
    };

    const finish = () => {
      if (finished) return; // pointerup / blur 可能先后触发, 只提交一次
      finished = true;
      wallDragLive.active = false;
      // 松手才提交到全局 store —— 一次拖拽 = 一条撤销记录
      if (movedRef.current && lastRef.current) {
        const patch = edge === 'start'
          ? { start: lastRef.current }
          : { end: lastRef.current };
        updateStructure(`wall:${roomId}:${cur.id}`, patch);
      }
      onPreview(cur.id, edge, null);
      setDragging(false);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish); // 触控笔/系统手势打断
    window.addEventListener('blur', finish);          // 拖到窗口外松手
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      window.removeEventListener('blur', finish);
      wallDragLive.active = false;
      if (controls) controls.enabled = true;
      document.body.style.cursor = 'default';
    };
  }, [dragging, edge, roomId, camera, gl, raycaster, controls, updateStructure, onPreview, yCenter]);

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
          // 常态: 淡蓝 (本次唯一改动的配色); 悬停/拖拽: 保持原有 红/绿 反馈
          color={dragging ? '#22c55e' : hovered ? '#ef4444' : '#38bdf8'}
          depthTest={false}
          transparent
          // 透明度不做区分且保持较高 (避免淡蓝在墙面上过虚)
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
  seg, roomId, midX, midZ, angle, hlLen, effectiveHeight, thickness, onPreview,
}: {
  seg: WallSegment; roomId: string; midX: number; midZ: number; angle: number;
  hlLen: number; effectiveHeight: number; thickness: number; onPreview: PreviewFn;
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
      <WallEndHandle wallSeg={seg} roomId={roomId} edge="start" yCenter={effectiveHeight / 2} height={effectiveHeight} thickness={thickness} onPreview={onPreview} />
      <WallEndHandle wallSeg={seg} roomId={roomId} edge="end" yCenter={effectiveHeight / 2} height={effectiveHeight} thickness={thickness} onPreview={onPreview} />
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
  // 注意: 0 是合法的剖切值 (全部剖掉), 不能用真值判断 —— 否则 cutHeight=0 会回退到完整墙高
  const effectiveHeight = cutHeight != null && cutHeight < height ? cutHeight : height;
  // 每段墙沿中心线两端各延伸 halfT, 使转角处两面墙互相搭接, 消除外角缺口
  const halfT = thickness / 2;
  // 过滤掉开放口（仅用于定义边界，不渲染墙体）
  const solidWalls = segments.filter((s) => !s.opening);

  /**
   * 端点拖拽的实时预览。
   * 刻意放在本组件的局部 state 里: 拖拽过程中完全不写全局 store,
   * 因此只有"本房间的墙体"会重渲染 —— 左面板/工具条/视口等不会跟着抖,
   * 拖拽才能真正跟手; 松手时才 updateStructure 提交一次 (一步撤销)。
   */
  const [preview, setPreview] = useState<{ wallId: string; edge: 'start' | 'end'; pos: [number, number] } | null>(null);
  // 必须是稳定引用: 否则每次重渲染都会让 WallEndHandle 的拖拽 effect 重绑定
  const handlePreview = useCallback<PreviewFn>((wallId, edge, pos) => {
    setPreview((p) => {
      if (!pos) return null;
      // 位置没变时返回原引用, React 会跳过重渲染
      if (p && p.wallId === wallId && p.edge === edge && p.pos[0] === pos[0] && p.pos[1] === pos[1]) return p;
      return { wallId, edge, pos };
    });
  }, []);

  const selectStructure = useAppStore((s) => s.selectStructure);
  const selectedId = useAppStore((s) => s.selectedStructureId);
  const layers = useAppStore((s) => s.layers);
  const buildingLocked = layers.find((l) => l.id === 'building')?.locked ?? true;

  const makeHandlers = (seg: WallSegment) => {
    const sid = `wall:${roomId}:${seg.id}`;
    const isSelected = selectedId === sid;
    const handlePointerDown = (e: any) => {
      if (buildingLocked) {
        e.stopPropagation();
        return;
      }
      /**
       * 家具优先: 墙体是室内最大的遮挡物 —— 从小房间外侧/隔壁看进去时, 视线几乎
       * 必然先穿过墙, 于是"看得见卫生间里的马桶, 却只能选中墙"。
       * 这里检查 R3F 给出的完整命中序列: 只要其中有家具的拾取代理, 就不 stopPropagation,
       * 让事件继续派发给墙后面的家具。想选墙时点没有被家具投影覆盖的墙面即可。
       */
      const hasFurnitureBehind = (e.intersections ?? []).some(
        (it: any) => it.object?.userData?.pickKind === PICK_FURNITURE
      );
      if (hasFurnitureBehind) return;
      e.stopPropagation();
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
        // 端点拖拽的实时预览: 只替换被拖那一端的坐标 (不改全局数据)
        const live = preview && preview.wallId === seg.id ? preview : null;
        const segEff: WallSegment = live
          ? (live.edge === 'start' ? { ...seg, start: live.pos } : { ...seg, end: live.pos })
          : seg;
        const [x1, z1] = segEff.start;
        const [x2, z2] = segEff.end;
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
                  roughness={0.72}
                  envMapIntensity={0.35}
                />
              </mesh>
              {isSelected && <WallSelection seg={segEff} roomId={roomId} midX={midX} midZ={midZ} angle={angle} hlLen={hlLen} effectiveHeight={effectiveHeight} thickness={thickness} onPreview={handlePreview} />}
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
                  roughness={0.72}
                  envMapIntensity={0.35}
                />
              </mesh>
              {isSelected && <WallSelection seg={segEff} roomId={roomId} midX={midX} midZ={midZ} angle={angle} hlLen={hlLen} effectiveHeight={effectiveHeight} thickness={thickness} onPreview={handlePreview} />}
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
                    roughness={0.72}
                    envMapIntensity={0.35}
                  />
                </mesh>
              );
            })}
            {isSelected && <WallSelection seg={segEff} roomId={roomId} midX={midX} midZ={midZ} angle={angle} hlLen={hlLen} effectiveHeight={effectiveHeight} thickness={thickness} onPreview={handlePreview} />}
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
                roughness={0.85}
                envMapIntensity={0.25}
              />
            </mesh>
          );
        })()
      )}
    </group>
  );
}
