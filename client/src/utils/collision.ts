import type { Furniture, OutdoorSceneData, Room, SceneData, WallSegment } from '../types';

/**
 * 平面占位检测 (2D OBB + 分离轴定理)
 *
 * 用于拖拽放置时校验落点是否合法:
 * - 室内: 家具不能与墙体重叠、不能与其他家具重叠、必须落在房间范围内
 * - 户外: 空间对象不能互相重叠, 且必须落在设计区域 (type=ground 基座) 内
 *
 * 坐标约定 (与渲染保持一致):
 * - 室内家具 局部 +X 延伸 = size[2], 局部 +Z 延伸 = size[0]
 * - 户外元素 局部 +X 延伸 = size[0], 局部 +Z 延伸 = size[2]
 * - rotation 为绕 Y 轴角度(度), three.js 下 局部+X → (cosθ, -sinθ), 局部+Z → (sinθ, cosθ)
 */

export interface Obb2 {
  cx: number;
  cz: number;
  /** 局部 +X 轴的世界方向 */
  ux: number;
  uz: number;
  /** 局部 +Z 轴的世界方向 */
  vx: number;
  vz: number;
  /** 沿 u 的半长 */
  hx: number;
  /** 沿 v 的半长 */
  hz: number;
}

export interface PlacementResult {
  ok: boolean;
  /** 不可放置的原因 (用于提示) */
  reason?: string;
}

interface Obstacle {
  obb: Obb2;
  name: string;
  /** 家具 id — 拖拽移动已有家具时用于排除自身 */
  id?: string;
}

interface RectBound {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

type FurnitureLike = Pick<Furniture, 'type' | 'size'> & {
  rotation?: number;
  shape?: 'quarter' | 'rect';
};

const DEG = Math.PI / 180;
/** 容差: 边恰好相贴(或微小穿透) 视为不重叠, 保证家具可以贴墙、贴边摆放 */
const EPS = 1e-3;

/* ==================== 基础几何 ==================== */

/** 由中心点 + 绕 Y 轴角度(度) + 半长构造 OBB; ox/oz 为局部偏移量 */
function makeObb(
  x: number,
  z: number,
  rotationDeg: number,
  hx: number,
  hz: number,
  ox = 0,
  oz = 0,
): Obb2 {
  const th = rotationDeg * DEG;
  const cos = Math.cos(th);
  const sin = Math.sin(th);
  const ux = cos;
  const uz = -sin;
  const vx = sin;
  const vz = cos;
  return {
    cx: x + ox * ux + oz * vx,
    cz: z + ox * uz + oz * vz,
    ux,
    uz,
    vx,
    vz,
    hx,
    hz,
  };
}

export function obbCorners(o: Obb2): [number, number][] {
  const su: [number, number][] = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
  return su.map(([a, b]) => [
    o.cx + o.ux * o.hx * a + o.vx * o.hz * b,
    o.cz + o.uz * o.hx * a + o.vz * o.hz * b,
  ] as [number, number]);
}

/** 分离轴定理: 两个 OBB 是否重叠 (相贴不算重叠) */
export function obbOverlap(a: Obb2, b: Obb2): boolean {
  const dx = b.cx - a.cx;
  const dz = b.cz - a.cz;
  const axes: [number, number][] = [
    [a.ux, a.uz],
    [a.vx, a.vz],
    [b.ux, b.uz],
    [b.vx, b.vz],
  ];
  for (const [ax, az] of axes) {
    const dist = Math.abs(dx * ax + dz * az);
    const ra = a.hx * Math.abs(a.ux * ax + a.uz * az) + a.hz * Math.abs(a.vx * ax + a.vz * az);
    const rb = b.hx * Math.abs(b.ux * ax + b.uz * az) + b.hz * Math.abs(b.vx * ax + b.vz * az);
    if (dist >= ra + rb - EPS) return false;
  }
  return true;
}

function boundsOfObb(o: Obb2): RectBound {
  const cs = obbCorners(o);
  const xs = cs.map((c) => c[0]);
  const zs = cs.map((c) => c[1]);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  };
}

function insideBounds(corners: [number, number][], bs: RectBound[]): boolean {
  return corners.every(([px, pz]) =>
    bs.some(
      (b) =>
        px >= b.minX - EPS &&
        px <= b.maxX + EPS &&
        pz >= b.minZ - EPS &&
        pz <= b.maxZ + EPS,
    ),
  );
}

/* ==================== 室内: 家具 / 墙体 ==================== */

/**
 * 用 size[0] 作为局部 X 轴建模的素材 —— 与项目约定 (X = size[2], Z = size[0]) 相反。
 * Toilet: tankW = w*0.85 直接作为 boxGeometry 的 X; Chair: args=[w, seatT, d]。
 * 占位盒必须跟随各自的建模轴向, 否则贴墙摆放时会凭空"多占"十几厘米。
 */
const X_IS_SIZE0 = new Set<string>(['toilet', 'chair']);

/** 家具占位盒 — 与 Furniture.tsx 的选中高亮盒完全一致 (含淋浴间特殊偏移) */
export function furnitureObb(f: FurnitureLike, x?: number, z?: number): Obb2 {
  const px = x ?? 0;
  const pz = z ?? 0;
  const rot = f.rotation ?? 0;
  const swap = X_IS_SIZE0.has(f.type);
  let hx = (swap ? f.size[0] : f.size[2]) / 2;
  let hz = (swap ? f.size[2] : f.size[0]) / 2;
  let ox = 0;
  let oz = 0;
  if (f.type === 'shower') {
    if ((f.shape ?? 'quarter') === 'quarter') {
      // 四分之一圆: 从角点向 +X/+Z 展开, 高亮盒中心偏移 (r/2, r/2)
      const r = f.size[0];
      hx = r / 2;
      hz = r / 2;
      ox = r / 2;
      oz = r / 2;
    } else {
      hx = f.size[0] / 2;
      hz = f.size[2] / 2;
      ox = f.size[0] / 2;
      oz = f.size[2] / 2;
    }
  }
  return makeObb(px, pz, rot, hx, hz, ox, oz);
}

/**
 * 墙段在地面层 (y≈0) 的实体占位盒
 * - 无洞口, 或洞口底部高于地面 (窗台 sill>0): 整段墙在地面层都是实体
 * - 洞口从地面起 (门 / 落地窗): 洞口区间在地面层是通的, 只保留两侧实心段
 * 长度按渲染口径向两端各延伸半墙厚, 保证转角处不漏判
 */
function wallObbs(seg: WallSegment, thickness: number): Obb2[] {
  if (seg.opening) return [];
  const [x1, z1] = seg.start;
  const [x2, z2] = seg.end;
  const len = Math.hypot(x2 - x1, z2 - z1);
  if (len < EPS) return [];
  const angleRad = Math.atan2(z2 - z1, x2 - x1);
  const rotDeg = -angleRad / DEG; // three.js 绕 Y 渲染角
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const halfT = thickness / 2;
  const out: Obb2[] = [];
  const push = (t0: number, t1: number) => {
    if (t1 - t0 < EPS) return;
    const mid = (t0 + t1) / 2;
    out.push(makeObb(x1 + cos * mid, z1 + sin * mid, rotDeg, (t1 - t0) / 2, halfT));
  };

  const cut = seg.cutout;
  if (cut && cut.sill <= EPS) {
    let cs = cut.start;
    let ce = cut.end;
    if (cs > ce) {
      const t = cs;
      cs = ce;
      ce = t;
    }
    cs = Math.max(0, Math.min(cs, len));
    ce = Math.max(0, Math.min(ce, len));
    push(-halfT, cs);
    push(ce, len + halfT);
  } else {
    push(-halfT, len + halfT);
  }
  return out;
}

function roomBounds(room: Room): RectBound {
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

export interface IndoorColliders {
  /** 地面层为实体的墙段 */
  walls: Obstacle[];
  /** 已放置的家具 */
  furniture: Obstacle[];
  /** 各房间包围盒 (用于判断是否落在空间内) */
  rooms: RectBound[];
}

export function buildIndoorColliders(sceneData: SceneData): IndoorColliders {
  const colliders: IndoorColliders = { walls: [], furniture: [], rooms: [] };
  for (const room of sceneData.rooms) {
    colliders.rooms.push(roomBounds(room));
    for (const seg of room.walls) {
      for (const obb of wallObbs(seg, seg.thickness ?? sceneData.wallThickness)) {
        colliders.walls.push({ obb, name: '墙体' });
      }
    }
    for (const f of room.furniture) {
      // 内嵌件 (embedded: 厨房水槽/灶台嵌入橱柜台面, 电视摆在电视柜上) 不参与占位校验:
      // 它们的占地本来就落在"母体"柜子的范围内, 若参与校验会与母体互相报重叠,
      // 也会反过来挡住用户把新物件放到台面上。
      if (f.embedded) continue;
      colliders.furniture.push({ obb: furnitureObb(f, f.position[0], f.position[2]), name: f.name, id: f.id });
    }
  }
  return colliders;
}

/**
 * 校验家具落点: 在房间内 + 不与墙体/其他家具重叠
 * @param ignoreId 拖拽移动已有家具时传入自身 id, 避免与自己判重叠
 */
export function checkIndoorPlacement(
  colliders: IndoorColliders,
  item: FurnitureLike,
  x: number,
  z: number,
  ignoreId?: string,
): PlacementResult {
  const obb = furnitureObb(item, x, z);
  const corners = obbCorners(obb);

  // 顺序: 先报物理冲突 (更具体、可操作), 最后才是范围判定
  for (const o of colliders.furniture) {
    if (ignoreId && o.id === ignoreId) continue;
    if (obbOverlap(obb, o.obb)) return { ok: false, reason: `与「${o.name}」重叠` };
  }
  for (const o of colliders.walls) {
    if (obbOverlap(obb, o.obb)) return { ok: false, reason: '与墙体重叠' };
  }
  if (!insideBounds(corners, colliders.rooms)) {
    return { ok: false, reason: '超出空间范围' };
  }
  return { ok: true };
}

/* ==================== 户外: 设计区域 / 空间对象 ==================== */

export interface OutdoorColliders {
  /** type=ground 的基座范围 */
  bases: RectBound[];
  /** 已有的空间对象 (建筑/车辆/树) */
  objects: Obstacle[];
}

export function buildOutdoorColliders(scene: OutdoorSceneData): OutdoorColliders {
  const colliders: OutdoorColliders = { bases: [], objects: [] };
  for (const g of scene.ground) {
    if (g.type !== 'ground') continue;
    colliders.bases.push(boundsOfObb(itemObb(g.size, g.rotation, g.position[0], g.position[2])));
  }
  for (const o of scene.objects) {
    colliders.objects.push({
      obb: itemObb(o.size, o.rotation, o.position[0], o.position[2]),
      name: o.name,
      id: o.id,
    });
  }
  return colliders;
}

/** 户外元素占位盒: 局部 X = size[0], 局部 Z = size[2] */
function itemObb(size: [number, number, number], rotation: number, x: number, z: number): Obb2 {
  return makeObb(x, z, rotation, size[0] / 2, size[2] / 2);
}

/**
 * 校验户外落点
 * - 地面结构 (草地/道路等): 只要求在设计区域内 (允许与基座/其他地面元素叠放)
 * - 空间对象 (建筑/车辆/树): 需在设计区域内, 且不与其他空间对象重叠
 */
export function checkOutdoorPlacement(
  colliders: OutdoorColliders,
  item: { kind: 'ground' | 'object'; size: [number, number, number] },
  x: number,
  z: number,
  options?: { excludeId?: string; rotation?: number },
): PlacementResult {
  const obb = itemObb(item.size, options?.rotation ?? 0, x, z);
  const corners = obbCorners(obb);

  if (!insideBounds(corners, colliders.bases)) {
    return { ok: false, reason: '不在设计区域内' };
  }
  if (item.kind === 'object') {
    for (const o of colliders.objects) {
      if (options?.excludeId && o.id === options.excludeId) continue;
      if (obbOverlap(obb, o.obb)) return { ok: false, reason: `与「${o.name}」重叠` };
    }
  }
  return { ok: true };
}
