import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Furniture } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';
import { findFurniture } from '../../../utils/sceneQuery';
import { screenToFloor, findRoomAt } from '../../../utils/r3fBridge';
import * as THREE from 'three';
import { Bed } from './furniture/Bed';
import { Sofa } from './furniture/Sofa';
import { Table } from './furniture/Table';
import { Cabinet } from './furniture/Cabinet';
import { Appliance } from './furniture/Appliance';
import { Refrigerator } from './furniture/Refrigerator';
import { WashingMachine } from './furniture/WashingMachine';
import { Decor } from './furniture/Decor';
import { Chair } from './furniture/Chair';
import { Shower } from './furniture/Shower';
import { Sink } from './furniture/Sink';
import { Toilet } from './furniture/Toilet';
import { Stove } from './furniture/Stove';

interface FurnitureProps {
  items: Furniture[];
  /** 所属空间 id (用于拾取仲裁: 判别点击命中的是不是"别的空间挡在前面的家具") */
  roomId: string;
  opacity?: number;
}

/**
 * 拾取代理相对视觉包围盒的**内缩**量 (米)。
 *
 * 只许往里收, 绝不许往外扩: 代理盒一旦溢出到视觉轮廓之外, 物体旁边就会多出
 * 一圈"看得见别的东西、点下去却选中它"的幽灵命中区。典型翻车现场 —— 卫生间 B
 * 的马桶贴着南墙, 卧室 C 的衣柜立在这道墙外侧 (两者水平只差约 0.4m), 衣柜代理
 * 盒外扩的那 4cm 正好压在马桶边缘, 于是点马桶就选中了衣柜。
 * 至于"点在缝隙里漏选"(椅腿之间、桌腿之间): 那些缝隙本来就落在包围盒内部,
 * 实心代理盒已经盖住了, 根本不需要外扩。本体 mesh 自己也会参与射线, 边缘不会丢。
 */
const PICK_INSET = 0.005;

/**
 * 拾取代理 / 高亮框的统一标记。
 * 墙体命中时会在 intersections 里找这个标记 —— 若墙的后面有家具, 让位给家具,
 * 这样"透过墙/隔壁房间看进去"时也能点中里面的东西 (见 Walls.tsx)。
 */
import { PICK_FURNITURE } from '../../../utils/pickTags';
export { PICK_FURNITURE };

/** 家具局部包围盒 (相对 placement: position + rotationY 的局部坐标系) */
interface LocalBounds {
  cx: number;
  cy: number;
  cz: number;
  sx: number;
  sy: number;
  sz: number;
}

const BOX_CORNERS: [number, number, number][] = [
  [0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1],
  [1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1],
];

/* ================= 拾取仲裁 (遮挡场景下"该选谁") ================= */

interface PickTag {
  id: string;
  roomId: string;
}

/** 取命中对象上的家具拾取标记: 代理盒自带; 家具本体挂在 content 组上, 沿父链向上找 */
function readPickTag(obj: THREE.Object3D | null | undefined): PickTag | null {
  let cur: THREE.Object3D | null = obj ?? null;
  while (cur) {
    const u = cur.userData as { pickKind?: string; pickId?: string; pickRoomId?: string };
    if (u && u.pickKind === PICK_FURNITURE && typeof u.pickId === 'string') {
      return { id: u.pickId, roomId: u.pickRoomId ?? '' };
    }
    cur = cur.parent;
  }
  return null;
}

/** 同位置连点状态 —— 模块级: 同一次点击可能由"挡在前面的那一件"来处理, 状态必须跨对象共享 */
const pickCycle = { x: -99999, y: -99999, ids: [] as string[], index: 0, time: 0 };

/**
 * 遮挡仲裁 —— 决定这一次点击到底该选中哪一件家具。
 *
 * 看得见的和点得到的并不总是一回事: 卫生间 B 的马桶贴着南墙, 而卧室 C 的衣柜
 * 就立在这道墙的外侧 (高 2.45m)。透视视角下衣柜正好压在相机到马桶的射线上,
 * R3F 按距离取最近 → 衣柜抢走了本该属于马桶的点击, 表现为"点马桶却选中了衣柜"。
 *
 * 规则:
 *   1. 候选 = 这条射线命中的全部家具 (按距离由近到远, 已去重);
 *   2. 当前激活空间的家具整体提到最前 —— 用户既然盯着剖切开的那个房间,
 *      墙外的邻房家具就不该抢点击;
 *   3. 同一位置连续点击在候选之间循环 —— 想选中被挡住的那件, 再点一次即可
 *      (与 SketchUp / CAD 的"再点一次选后面那个"一致)。
 */
function resolvePick(x: number, y: number, e: any, selfId: string): { id: string; cycled: boolean } {
  const tags: PickTag[] = [];
  for (const it of e.intersections ?? []) {
    const tag = readPickTag(it.object);
    if (tag && !tags.some((t) => t.id === tag.id)) tags.push(tag);
  }
  if (!tags.length) return { id: selfId, cycled: false };

  const state = useAppStore.getState();
  // 空间上下文: 优先用左栏当前激活空间; 没激活时退化为"这条射线与地面的交点落在哪个房间" ——
  // 射线穿过某件家具后继续打到地面, 落点通常就在它脚下的房间, 足够判断用户在看哪一间。
  let preferRoom = state.activeSpaceId;
  if (!preferRoom) {
    const floorPoint = screenToFloor(x, y);
    if (floorPoint) preferRoom = findRoomAt(floorPoint[0], floorPoint[1], state.sceneData.rooms);
  }
  const ordered = preferRoom
    ? [...tags.filter((t) => t.roomId === preferRoom), ...tags.filter((t) => t.roomId !== preferRoom)]
    : tags;
  const ids = ordered.map((t) => t.id);

  // 位置与候选序列都一致才算"连点同一处", 否则从最近的重新开始。
  // 只有一个候选时不存在歧义, 不做循环 (否则第二次按下会被误判成"切换"而失去拖拽)。
  // 下限 350ms: 挡住双击 —— 习惯性双击不该把选中从马桶切成衣柜。
  const now = performance.now();
  const gap = now - pickCycle.time;
  const same =
    ids.length > 1 &&
    ids.length === pickCycle.ids.length &&
    ids.every((id, i) => id === pickCycle.ids[i]) &&
    Math.abs(x - pickCycle.x) <= 6 &&
    Math.abs(y - pickCycle.y) <= 6 &&
    gap > 350 &&
    gap < 1500;
  const index = same ? (pickCycle.index + 1) % ids.length : 0;

  pickCycle.x = x;
  pickCycle.y = y;
  pickCycle.ids = ids;
  pickCycle.index = index;
  pickCycle.time = now;
  return { id: ids[index], cycled: same };
}

function sameBounds(a: LocalBounds | null, b: LocalBounds): boolean {
  if (!a) return false;
  const e = 1e-4;
  return (
    Math.abs(a.cx - b.cx) < e && Math.abs(a.cy - b.cy) < e && Math.abs(a.cz - b.cz) < e &&
    Math.abs(a.sx - b.sx) < e && Math.abs(a.sy - b.sy) < e && Math.abs(a.sz - b.sz) < e
  );
}

/**
 * 量出家具本体在"placement 局部坐标系"里的包围盒。
 *
 * 为什么不在公式里写死 size 的轴向: 各素材组件对 size 的解释并不统一 ——
 * Cabinet/Bed/Table/Sink/Stove 等把 size[2] 当作 X (项目约定), 而 Toilet/Chair
 * 是按 size[0] 做 X 建模的。用公式推导 (hx=size[2]/2) 会让这两类素材的
 * 高亮框 / 拾取代理 / 碰撞盒相对视觉旋转 90°, 表现为"框比物体偏出去一截,
 * 点在物体边缘选不中"。直接量真实几何可以彻底绕开这个不一致,
 * 未来素材库接入 GLB (尺寸含义未知) 时同样成立。
 *
 * 也不能先算世界 AABB 再逆变换回局部: 家具一转非 90° 的整数倍, 世界 AABB 就会
 * 外接住整件, 逆变换回来的盒子比视觉轮廓大一圈, 代理盒又会造出幽灵命中区。
 * 逐个网格的局部包围盒累加才是紧的。
 */
function measureBounds(root: THREE.Object3D, data: Furniture): LocalBounds | null {
  // R3F 刚挂载完时矩阵可能还没刷新, 显式更新一次再测
  root.updateWorldMatrix(true, true);
  const rotRad = (data.rotation * Math.PI) / 180;
  // placement = T(position) * R(rotY)  →  取逆把世界矩阵搬回未旋转的局部空间
  const placement = new THREE.Matrix4().makeRotationY(rotRad);
  placement.setPosition(data.position[0], data.position[1], data.position[2]);
  const inv = placement.clone().invert();

  const local = new THREE.Box3();
  const v = new THREE.Vector3();
  const m = new THREE.Matrix4();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    const geo = mesh.geometry as THREE.BufferGeometry | undefined;
    if (!geo) return;
    if (!geo.boundingBox) geo.computeBoundingBox();
    const bb = geo.boundingBox;
    if (!bb) return;
    m.multiplyMatrices(inv, mesh.matrixWorld);
    for (const [ix, iy, iz] of BOX_CORNERS) {
      v.set(
        ix ? bb.max.x : bb.min.x,
        iy ? bb.max.y : bb.min.y,
        iz ? bb.max.z : bb.min.z
      ).applyMatrix4(m);
      local.expandByPoint(v);
    }
  });
  if (local.isEmpty()) return null;
  const c = local.getCenter(new THREE.Vector3());
  const s = local.getSize(new THREE.Vector3());
  return { cx: c.x, cy: c.y, cz: c.z, sx: s.x, sy: s.y, sz: s.z };
}

export function FurnitureGroup({ items, roomId }: FurnitureProps) {
  return (
    <group>
      {items.map((item) => (
        <FurnitureItem key={item.id} data={item} roomId={roomId} />
      ))}
    </group>
  );
}

function FurnitureItem({ data, roomId }: { data: Furniture; roomId: string }) {
  const selectFurniture = useAppStore((s) => s.selectFurniture);
  const selectedId = useAppStore((s) => s.selectedFurnitureId);
  const layers = useAppStore((s) => s.layers);
  const beginTransform = useAppStore((s) => s.beginTransform);
  const isTransformTarget = useAppStore((s) => s.transformSession?.id === data.id);
  const isSelected = selectedId === data.id;
  // 室内设计层锁定时, 家具不可选中
  const interiorLocked = layers.find((l) => l.id === 'interior')?.locked ?? false;

  const contentRef = useRef<THREE.Group>(null);
  const [bounds, setBounds] = useState<LocalBounds | null>(null);

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    if (interiorLocked) return;

    // 遮挡仲裁: 射线最先打到的未必是用户想选的那件 (墙外邻房家具挡在前面)
    const pick = resolvePick(e.clientX, e.clientY, e, data.id);
    const target =
      pick.id === data.id ? data : findFurniture(useAppStore.getState().sceneData, pick.id);
    if (!target) return;

    selectFurniture(target.id);
    // 左键按下即进入"移动"会话: 拖动时由 FurnitureTransformController 的 ghost 本体
    // 实时跟随指针 (直接写 three 对象, 不经过 React), 松手才落位 —— 只产生一条历史。
    // 内嵌件 (灶台/水槽嵌在台面里) 不参与移动: 其占地本就落在母体柜内, 一动必判重叠。
    // 循环切换那一次只做"选中", 不进移动会话 —— 用户是在挑被挡住的那件, 不是要拖它。
    if (e.button === 0 && !target.embedded && !pick.cycled) {
      beginTransform(target.id, 'move', e.clientX, e.clientY);
    }
  };

  const handlePointerOver = (e: any) => {
    if (interiorLocked) return;
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };
  const handlePointerOut = () => {
    document.body.style.cursor = 'default';
  };

  /* 量一次真实包围盒: 只在本体几何/位姿变化时重算, 选中态不影响 (高亮框不参与测量) */
  useLayoutEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const next = measureBounds(root, data);
    if (!next) return;
    setBounds((prev) => (sameBounds(prev, next) ? prev : next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    data.type,
    data.shape,
    data.size[0],
    data.size[1],
    data.size[2],
    data.rotation,
    data.position[0],
    data.position[1],
    data.position[2],
  ]);

  const boxGeo = useMemo(
    () => (bounds ? new THREE.BoxGeometry(bounds.sx, bounds.sy, bounds.sz) : null),
    [bounds]
  );
  // 线框稍放大避免 z-fighting
  const wireGeo = useMemo(
    () =>
      bounds ? new THREE.BoxGeometry(bounds.sx * 1.01, bounds.sy * 1.01, bounds.sz * 1.01) : null,
    [bounds]
  );
  // 尺寸变化会重建几何, 旧的要释放, 否则反复选中会持续吃显存
  useEffect(
    () => () => {
      boxGeo?.dispose();
      wireGeo?.dispose();
    },
    [boxGeo, wireGeo]
  );

  const placement = {
    position: [data.position[0], data.position[1], data.position[2]] as [number, number, number],
    rotation: [0, (data.rotation * Math.PI) / 180, 0] as [number, number, number],
  };

  return (
    <group
      visible={!isTransformTarget}
      onPointerDown={handlePointerDown}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <group ref={contentRef} userData={{ pickKind: PICK_FURNITURE, pickId: data.id, pickRoomId: roomId }}>
        <FurnitureContent data={data} />
      </group>

      {/* 拾取代理: 覆盖整块视觉轮廓的隐形盒。
          家具本体多由薄板 + 细腿拼成 (椅座 5cm、桌腿 5cm、靠背与座板之间有空隙), 射线只打三角面时,
          点在缝隙里会漏选, 并继续命中后面的地板或邻件 —— 表现为「点不准 / 点到旁边的」。
          尺寸来自真实几何包围盒 (measureBounds), 因此不受各素材组件 size 轴向差异影响;
          并且只内缩不外扩 —— 外扩会在物体旁边造出"点空处选中"的幽灵区。
          内嵌件 (灶台/水槽/电视嵌在柜内) 不加: 命中区与母体重叠, 代理会抢走母体的点击。 */}
      {!data.embedded && bounds && (
        <group {...placement}>
          <mesh
            position={[bounds.cx, bounds.cy, bounds.cz]}
            userData={{ pickKind: PICK_FURNITURE, pickId: data.id, pickRoomId: roomId }}
          >
            <boxGeometry
              args={[
                Math.max(0.01, bounds.sx - PICK_INSET * 2),
                Math.max(0.01, bounds.sy - PICK_INSET * 2),
                Math.max(0.01, bounds.sz - PICK_INSET * 2),
              ]}
            />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
          </mesh>
        </group>
      )}

      {isSelected && bounds && (
        // 高亮外层 group 应用家具的 position/rotation, 与家具内部定位保持一致
        <group {...placement}>
          {/* 半透明绿色高亮盒 (纯装饰, 不参与拾取, 否则会盖住邻件的点击) */}
          <mesh position={[bounds.cx, bounds.cy, bounds.cz]} geometry={boxGeo ?? undefined} raycast={() => null}>
            <meshBasicMaterial color="#22c55e" transparent opacity={0.18} depthWrite={false} />
          </mesh>
          {/* 绿色线框 (放大1%) */}
          <lineSegments position={[bounds.cx, bounds.cy, bounds.cz]} raycast={() => null}>
            <edgesGeometry args={[wireGeo ?? new THREE.BoxGeometry(1, 1, 1)]} />
            <lineBasicMaterial color="#16a34a" />
          </lineSegments>
          {/* 外层粗线框 (再放大1.5%, 形成双层加粗感) */}
          <lineSegments position={[bounds.cx, bounds.cy, bounds.cz]} scale={1.015} raycast={() => null}>
            <edgesGeometry args={[wireGeo ?? new THREE.BoxGeometry(1, 1, 1)]} />
            <lineBasicMaterial color="#22c55e" transparent opacity={0.6} />
          </lineSegments>
        </group>
      )}
    </group>
  );
}

/** 按类型渲染家具本体 (不含选中高亮/交互), 供 FurnitureItem 与变换 ghost 复用 */
export function FurnitureContent({ data }: { data: Furniture }) {
  switch (data.type) {
    case 'bed':
      return <Bed data={data} />;
    case 'sofa':
      return <Sofa data={data} />;
    case 'table':
      return <Table data={data} />;
    case 'cabinet':
      return <Cabinet data={data} />;
    case 'appliance':
      return <Appliance data={data} />;
    case 'fridge':
      return <Refrigerator data={data} />;
    case 'washer':
      return <WashingMachine data={data} />;
    case 'chair':
      return <Chair data={data} />;
    case 'shower':
      return <Shower data={data} />;
    case 'sink':
      return <Sink data={data} />;
    case 'toilet':
      return <Toilet data={data} />;
    case 'stove':
      return <Stove data={data} />;
    case 'decor':
    default:
      return <Decor data={data} />;
  }
}
