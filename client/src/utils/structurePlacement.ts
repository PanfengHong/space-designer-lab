import type {
  BayWindow,
  Door,
  FrenchWindow,
  Room,
  SceneData,
  WallSegment,
  Window,
} from '../types';
import { obbCorners, obbOverlap, furnitureObb, type Obb2 } from './collision';

/**
 * 建筑结构层元素的拖入放置。
 *
 * 与家具放置的区别:
 * - 家具是"自由摆放的方块", 只要有地就能放;
 * - 结构元素携带语义: 门窗必须**贴在墙面上**、飘窗必须**凸出墙面**,
 *   所以拖拽时不能直接用鼠标落点, 而要把落点**吸附**到最近的墙体上,
 *   并把朝向对齐墙面法向。吸附结果通过 BaseScene 的 snap 通道回传给预览框。
 *
 * 坐标约定与 collision.ts / 渲染层完全一致:
 * - 门窗的 position 恒在**墙中心线**上 (渲染组件把门框/窗框以自身厚度贴在中心线两侧);
 * - group rotation 为绕 Y 轴角度(度), local +X → (cosθ, -sinθ), local +Z → (sinθ, cosθ);
 * - 门窗的宽度沿 local +X, 因此要求 local +X 平行于墙方向。
 */

export type StructureType = 'wall' | 'door' | 'window' | 'bayWindow' | 'frenchWindow';

export interface StructureTemplate {
  /** 素材唯一键 (缩略图缓存 / React key) */
  id: string;
  type: StructureType;
  name: string;
  /**
   * 尺寸 (米):
   * - wall:        [长度, 高度(仅预览用, 落位取层高), 厚度]
   * - door:        [宽度, 高度, 厚度]
   * - window:      [宽度, 高度, 厚度]
   * - bayWindow:   [宽度, 高度, 凸出深度]
   * - frenchWindow:[宽度, 高度, 厚度]
   */
  size: [number, number, number];
  /** 窗台高度 (仅 window / bayWindow) */
  sill?: number;
  style?: string;
}

/** 建筑结构素材库 — 对应左面板「建筑结构层 · 墙体 楼板 门窗」 */
export const STRUCTURE_CATALOG: StructureTemplate[] = [
  { id: 'st-wall', type: 'wall', name: '墙体', size: [2.4, 2.8, 0.2] },
  { id: 'st-wall-short', type: 'wall', name: '半墙', size: [1.2, 1.1, 0.2] },
  { id: 'st-door', type: 'door', name: '平开门', size: [0.9, 2.1, 0.2], style: 'default' },
  { id: 'st-door-glass', type: 'door', name: '玻璃推拉门', size: [1.6, 2.2, 0.2], style: 'glass' },
  { id: 'st-window', type: 'window', name: '平窗', size: [1.5, 1.5, 0.2], sill: 0.9, style: 'default' },
  { id: 'st-window-sliding', type: 'window', name: '推拉窗', size: [1.8, 1.5, 0.2], sill: 0.9, style: 'sliding' },
  { id: 'st-bay', type: 'bayWindow', name: '飘窗', size: [1.8, 1.6, 0.6], sill: 0.9 },
  { id: 'st-french', type: 'frenchWindow', name: '落地窗', size: [2.0, 2.4, 0.2] },
];

/** 落到房间里的完整结构数据 (判别联合, 直接交给 store 追加) */
export type StructurePayload =
  | { kind: 'wall'; wall: WallSegment }
  | { kind: 'door'; door: Door; opening: WallOpening }
  | { kind: 'window'; window: Window; opening: WallOpening }
  | { kind: 'bayWindow'; bayWindow: BayWindow; opening: WallOpening }
  | { kind: 'frenchWindow'; frenchWindow: FrenchWindow; opening: WallOpening };

/**
 * 墙体开洞结果: 把原墙段按洞口拆成 1~3 段。
 *
 * 为什么不改 WallSegment.cutout 的类型 (单个 → 数组)?
 * 拆分墙段可以让"渲染" (Walls.tsx) 与"碰撞" (collision.ts) 两层完全不用动 ——
 * 它们已经支持带 cutout 的墙段, 拆完照样正确; 一面墙上多个门窗也就自然支持了。
 */
export interface WallOpening {
  /** 被拆分的原墙段 id */
  wallId: string;
  /** 替换后的墙段 (左实段 / 洞段 / 右实段) */
  segments: WallSegment[];
}

/** 拖拽预览框要用的位置/朝向 (门窗会被吸附, 因此和鼠标落点不同) */
export interface StructureSnap {
  x: number;
  z: number;
  /** 绕 Y 轴角度 (度) */
  rotation: number;
  /** 竖直抬升 (窗/飘窗的窗台高度) */
  y?: number;
  /** 沿旋转后 local +Z 的偏移 (飘窗需要把盒子推到墙面外侧) */
  lz?: number;
}

export interface StructureDropResult {
  ok: boolean;
  reason?: string;
  /** 预览框位置 (即使 ok=false 也返回, 便于提示时仍显示在合理位置) */
  snap: StructureSnap;
  roomId?: string;
  /** 门窗吸附到的墙段 id */
  wallId?: string;
  payload?: StructurePayload;
}

/* ==================== 几何工具 ==================== */

const DEG = Math.PI / 180;
/** 门窗吸附的搜索半径: 落点离墙中心线超过此距离就不吸附 (提示需要靠近墙体) */
const SNAP_DIST = 1.6;
/** 判定"某个已有门窗位于这面墙上"的距离阈值 */
const ON_WALL_DIST = 0.45;
/** 容差: 相贴不算重叠 */
const EPS = 1e-3;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** 房间墙体的包围盒 (与 findRoomAt / collision.ts 同口径) */
function roomBounds(room: Room) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const w of room.walls) {
    minX = Math.min(minX, w.start[0], w.end[0]);
    maxX = Math.max(maxX, w.start[0], w.end[0]);
    minZ = Math.min(minZ, w.start[1], w.end[1]);
    maxZ = Math.max(maxZ, w.start[1], w.end[1]);
  }
  return { minX, maxX, minZ, maxZ };
}

/** 点到线段的最近点: 返回沿墙弧长 t、垂距 d、单位方向 (ux, uz)、段长 len */
function nearestOnSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
) {
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz);
  if (len < EPS) {
    return { t: 0, d: Math.hypot(px - ax, pz - az), ux: 1, uz: 0, len: 0 };
  }
  const ux = dx / len;
  const uz = dz / len;
  const t = clamp((px - ax) * ux + (pz - az) * uz, 0, len);
  const cx = ax + ux * t;
  const cz = az + uz * t;
  return { t, d: Math.hypot(px - cx, pz - cz), ux, uz, len };
}

/** 轴对齐 (rotation=0) 的 OBB —— collision.ts 的 makeObb 未导出, 这里按同一约定构造 */
function axisAlignedObb(cx: number, cz: number, hx: number, hz: number): Obb2 {
  return { cx, cz, ux: 1, uz: 0, vx: 0, vz: 1, hx, hz };
}

function cornersInsideRooms(corners: [number, number][], rooms: Room[]): boolean {
  return corners.every(([px, pz]) =>
    rooms.some((room) => {
      const b = roomBounds(room);
      return (
        px >= b.minX - EPS && px <= b.maxX + EPS && pz >= b.minZ - EPS && pz <= b.maxZ + EPS
      );
    }),
  );
}

/** 生成稳定且可读的新 id, 例如 w-new-lq3k9 */
function newId(prefix: string) {
  return `${prefix}-new-${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 6)}`;
}

/* ==================== 墙体开洞 (拆分墙段) ==================== */

/**
 * 在原墙段上为门窗开洞, 返回替换用的墙段列表。
 *
 * 洞口区间 [t0, t1] 是沿墙的弧长。关键在**半墙厚补偿**:
 * 渲染与碰撞都约定"每段墙两端各外扩 halfT"(转角处互相搭接), 因此若直接按 [t0, t1] 切,
 * 左右两个实段各自的延伸会吃掉洞口两边各 halfT, 洞口会窄掉一个墙厚。
 * 解法是让洞段向外各扩 halfT: 洞段取 [t0-halfT, t1+halfT] 并整段开洞,
 * 两个实段的延伸正好覆盖到 t0 / t1, 最终净洞口就是 [t0, t1]。
 *
 * @returns 1~3 段墙; 首个/末个实段会继承原墙段的 cutout (若原本就在该区间内)
 */
function splitWallAtOpening(
  seg: WallSegment,
  t0: number,
  t1: number,
  sill: number,
  top: number,
  halfT: number,
): WallSegment[] {
  const [x1, z1] = seg.start;
  const [x2, z2] = seg.end;
  const len = Math.hypot(x2 - x1, z2 - z1);
  if (len < EPS) return [seg];
  const ux = (x2 - x1) / len;
  const uz = (z2 - z1) / len;
  const at = (t: number): [number, number] => [x1 + ux * t, z1 + uz * t];

  const a = clamp(t0 - halfT, 0, len);
  const b = clamp(t1 + halfT, 0, len);
  const cut = seg.cutout;
  const out: WallSegment[] = [];

  // 左实段: 墙起点 → a (原洞口若整个落在其中则一并继承)
  if (a > 0.02) {
    out.push({
      id: newId('w'),
      start: [x1, z1],
      end: at(a),
      height: seg.height,
      ...(cut && cut.end <= a + EPS ? { cutout: cut } : {}),
    });
  }
  // 洞段: a → b 整段开洞 (sill / top 决定洞口高度)
  out.push({
    id: newId('w'),
    start: at(a),
    end: at(b),
    height: seg.height,
    cutout: { start: 0, end: Math.max(b - a, EPS), sill, top },
  });
  // 右实段: b → 墙终点 (原洞口若整个落在其中则平移继承)
  if (len - b > 0.02) {
    out.push({
      id: newId('w'),
      start: at(b),
      end: [x2, z2],
      height: seg.height,
      ...(cut && cut.start >= b - EPS
        ? { cutout: { ...cut, start: cut.start - b, end: cut.end - b } }
        : {}),
    });
  }
  return out;
}

/* ==================== 墙体 ==================== */

function resolveWall(
  sceneData: SceneData,
  tpl: StructureTemplate,
  x: number,
  z: number,
): StructureDropResult {
  const [len, tplHeight, thick] = tpl.size;
  const room = sceneData.rooms.find((r) => {
    const b = roomBounds(r);
    return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
  });
  if (!room) return { ok: false, reason: '请放在空间范围内', snap: { x, z, rotation: 0 } };

  const b = roomBounds(room);
  if (b.maxX - b.minX < len + EPS) {
    return { ok: false, reason: '空间太窄, 放不下这段墙', snap: { x, z, rotation: 0 } };
  }
  // 与门窗一样自动"找位置": 沿 X 夹到房间范围内, 保证整段墙都落在空间里
  const cx = clamp(x, b.minX + len / 2, b.maxX - len / 2);
  const snap: StructureSnap = { x: cx, z, rotation: 0 };

  // 新墙默认沿 X 轴、以落点为中心; 高度取层高, 与既有墙体保持一致
  const height = tplHeight <= 0 ? sceneData.ceilingHeight : Math.min(tplHeight, sceneData.ceilingHeight);
  const obb = axisAlignedObb(cx, z, len / 2, thick / 2);

  for (const r of sceneData.rooms) {
    for (const f of r.furniture) {
      if (f.embedded) continue;
      if (obbOverlap(obb, furnitureObb(f, f.position[0], f.position[2]))) {
        return { ok: false, reason: `与「${f.name}」重叠`, snap };
      }
    }
  }
  if (!cornersInsideRooms(obbCorners(obb), sceneData.rooms)) {
    return { ok: false, reason: '超出空间范围', snap };
  }

  const wall: WallSegment = {
    id: newId('w'),
    start: [cx - len / 2, z],
    end: [cx + len / 2, z],
    height,
  };
  return { ok: true, snap, roomId: room.id, payload: { kind: 'wall', wall } };
}

/* ==================== 门窗 (需吸附到墙面) ==================== */

function resolveOpening(
  sceneData: SceneData,
  tpl: StructureTemplate,
  x: number,
  z: number,
): StructureDropResult {
  const [width, height, depth] = tpl.size;
  const label = tpl.type === 'door' ? '门' : tpl.type === 'bayWindow' ? '飘窗' : '窗';
  const fallback: StructureSnap = { x, z, rotation: 0 };
  const fail = (reason: string, snap: StructureSnap = fallback): StructureDropResult => ({
    ok: false,
    reason,
    snap,
  });

  // 1. 找最近的实体墙段 (开放口 opening 不是实体墙, 不参与吸附)
  let best: {
    room: Room;
    seg: WallSegment;
    t: number;
    d: number;
    ux: number;
    uz: number;
    len: number;
  } | null = null;
  for (const room of sceneData.rooms) {
    for (const seg of room.walls) {
      if (seg.opening) continue;
      const near = nearestOnSegment(x, z, seg.start[0], seg.start[1], seg.end[0], seg.end[1]);
      if (near.len < EPS) continue;
      if (!best || near.d < best.d) best = { room, seg, ...near };
    }
  }
  if (!best || best.d > SNAP_DIST) {
    return fail(`${label}需要靠近墙体放置`);
  }

  const { room, seg, ux, uz, len } = best;
  // 门窗整扇必须落在这一段墙上
  if (width > len - 0.02) return fail('这面墙太短, 放不下');

  // 2. 沿墙夹紧: 保证整扇门窗不越过墙段两端
  const t = clamp(best.t, width / 2, len - width / 2);
  const px = seg.start[0] + ux * t;
  const pz = seg.start[1] + uz * t;

  // 3. 朝向: local +X 平行于墙方向 → θ = -φ; 再按"内 / 外"挑选正面
  const phi = Math.atan2(seg.end[1] - seg.start[1], seg.end[0] - seg.start[0]);
  const base = -phi / DEG; // 度
  const midX = (seg.start[0] + seg.end[0]) / 2;
  const midZ = (seg.start[1] + seg.end[1]) / 2;
  const b = roomBounds(room);
  // θ = base 时 local +Z = (-sinφ, cosφ); 与"墙中点 → 房间中心"同向即为朝内
  const inward =
    -Math.sin(phi) * ((b.minX + b.maxX) / 2 - midX) +
    Math.cos(phi) * ((b.minZ + b.maxZ) / 2 - midZ);
  const rotInward = inward >= 0 ? base : base + 180;
  // 门朝房间内开; 窗 / 飘窗 / 落地窗朝着房间外 (与预置场景数据约定一致)
  const rotation = tpl.type === 'door' ? rotInward : rotInward + 180;
  const rotNorm = ((rotation % 360) + 360) % 360;

  // 窗台高度 (窗 / 飘窗) 与预览框参数 —— 重叠失败时也要返回完整 snap, 提示条才不会飘到地面
  const sill = tpl.type === 'window' || tpl.type === 'bayWindow' ? tpl.sill ?? 0.9 : 0;
  const placed: StructureSnap = {
    x: px,
    z: pz,
    rotation: rotNorm,
    y: sill || undefined,
    lz: tpl.type === 'bayWindow' ? depth / 2 : undefined,
  };

  // 洞口在墙面上的高度区间: 门 / 落地窗从地面起, 窗 / 飘窗从窗台起
  const fromFloor = tpl.type === 'door' || tpl.type === 'frenchWindow';
  const openSill = fromFloor ? 0 : sill;
  const openTop = fromFloor ? height : sill + height;

  // 4. 不与这面墙上已有的门窗重叠 (沿墙一维区间比较)
  const halfW = width / 2;
  const occupied: { t: number; half: number; name: string }[] = [];
  const collect = (
    list: { position: [number, number, number]; width: number }[] | undefined,
    name: string,
  ) => {
    for (const it of list ?? []) {
      const n = nearestOnSegment(it.position[0], it.position[2], seg.start[0], seg.start[1], seg.end[0], seg.end[1]);
      // 落在同一面墙上才算占位
      if (n.d < ON_WALL_DIST) occupied.push({ t: n.t, half: it.width / 2, name });
    }
  };
  collect(room.doors, '门');
  collect(room.windows, '窗');
  collect(room.bayWindows, '飘窗');
  collect(room.frenchWindows, '落地窗');
  for (const o of occupied) {
    if (Math.abs(o.t - t) < o.half + halfW - 0.02) {
      return fail(`与已有「${o.name}」重叠`, placed);
    }
  }

  // 5. 目标墙段自身的洞口也不能与新洞口相交 (相交时无法通过"拆分墙段"表达)
  const segCut = seg.cutout;
  if (segCut) {
    let cs = segCut.start;
    let ce = segCut.end;
    if (cs > ce) [cs, ce] = [ce, cs];
    if (t - halfW < ce - 0.02 && t + halfW > cs + 0.02) {
      return fail('这面墙上该位置已有洞口', placed);
    }
  }
  // 开口即在此墙段上把洞口"拆"出来 —— 渲染层与碰撞层都无需改动
  const opening: WallOpening = {
    wallId: seg.id,
    segments: splitWallAtOpening(seg, t - halfW, t + halfW, openSill, openTop, sceneData.wallThickness / 2),
  };

  if (tpl.type === 'door') {
    const door: Door = {
      id: newId('d'),
      position: [px, 0, pz],
      width,
      height,
      rotation: rotNorm,
      hingeSide: 'left',
      style: tpl.style === 'glass' ? 'glass' : 'default',
    };
    return {
      ok: true,
      snap: placed,
      roomId: room.id,
      wallId: seg.id,
      payload: { kind: 'door', door, opening },
    };
  }

  if (tpl.type === 'window') {
    const win: Window = {
      id: newId('win'),
      position: [px, 0, pz],
      width,
      height,
      sill,
      rotation: rotNorm,
      style: tpl.style === 'sliding' ? 'sliding' : 'default',
    };
    return {
      ok: true,
      snap: placed,
      roomId: room.id,
      wallId: seg.id,
      payload: { kind: 'window', window: win, opening },
    };
  }

  if (tpl.type === 'bayWindow') {
    const bay: BayWindow = {
      id: newId('bw'),
      position: [px, sill, pz],
      width,
      height,
      depth,
      rotation: rotNorm,
    };
    // 飘窗 position 是"贴墙那面"的中心, 而预览框是居中的盒子 → 沿 local +Z 推半个深度
    return {
      ok: true,
      snap: placed,
      roomId: room.id,
      wallId: seg.id,
      payload: { kind: 'bayWindow', bayWindow: bay, opening },
    };
  }

  const french: FrenchWindow = {
    id: newId('fw'),
    position: [px, 0, pz],
    width,
    height,
    rotation: rotNorm,
  };
  return {
    ok: true,
    snap: placed,
    roomId: room.id,
    wallId: seg.id,
    payload: { kind: 'frenchWindow', frenchWindow: french, opening },
  };
}

/**
 * 解析一次结构元素拖放: 返回是否可放、预览框位置/朝向、以及要写入场景的数据。
 * 纯函数 —— 拖拽预览 (每个 dragover) 与最终落位 (drop) 用同样的入参调用,
 * 因此预览看到的位置与真正放下的位置一定一致。
 */
export function resolveStructureDrop(
  sceneData: SceneData,
  tpl: StructureTemplate,
  x: number,
  z: number,
): StructureDropResult {
  if (tpl.type === 'wall') return resolveWall(sceneData, tpl, x, z);
  return resolveOpening(sceneData, tpl, x, z);
}

/** 未吸附时的预览框尺寸 (与 resolveStructureDrop 的 snap 配套) */
export function structureGhostSize(tpl: StructureTemplate, ceilingHeight: number): [number, number, number] {
  const [a, b, c] = tpl.size;
  if (tpl.type === 'wall') {
    const h = b <= 0 ? ceilingHeight : Math.min(b, ceilingHeight);
    return [a, h, c];
  }
  return [a, b, c];
}
