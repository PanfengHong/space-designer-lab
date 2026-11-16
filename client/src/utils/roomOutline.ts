import type { WallSegment } from '../types';
import type { RoomBounds } from './roomBounds';

/**
 * 房间轮廓 (地坪实际范围)。
 *
 * 为什么不直接用"墙体端点包围盒":
 * 房间的墙列表里常有**借来的长墙 / 开放段**。典型例子是三居室客厅的东墙
 * `w-l2a: (7.0, 2.2) → (7.0, 6.5)` —— 它从厨房南沿一路拉到客厅，用来表达
 * "玄关→餐厅→客厅 一整面开放"。取 min/max 会把这 3.3m 多出来的部分算进客厅，
 * 于是客厅地板压到厨房去，净距标注也跟着按错误边界算。
 *
 * 做法: 把房间自己的墙当成一个图 —— 在 T 形接头处切开 → 剪掉悬空支路 →
 * 剩下的闭合环路才是房间的真实轮廓。失败时退回包围盒 (与旧行为一致)。
 */

const EPS = 1e-4;
/** 坐标量化 (1mm): 端点对不齐时仍能落到同一个节点上 */
const Q = 1e-3;

const quant = (v: number) => Math.round(v / Q) * Q;
const nodeKey = (x: number, z: number) => `${quant(x).toFixed(3)}|${quant(z).toFixed(3)}`;

export interface RoomOutline extends RoomBounds {
  /** 轮廓是墙环闭合推出来的 (true) 还是退回包围盒 (false) */
  traced: boolean;
  /** 轮廓多边形 (逆时针/顺时针不定, 米) —— 供以后按真实形状铺地面用 */
  points: [number, number][];
}

interface Edge {
  a: string;
  b: string;
  ax: number;
  az: number;
  bx: number;
  bz: number;
}

/** 所有墙端点 / 交叉点都把墙切开, 让 T 形接头成为真正的节点 */
function splitIntoEdges(segments: WallSegment[]): Edge[] | null {
  const pieces: { x: number; z: number }[][] = [];

  for (let i = 0; i < segments.length; i++) {
    const [x1, z1] = segments[i].start;
    const [x2, z2] = segments[i].end;
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    if (len < EPS) {
      pieces.push([]);
      continue;
    }
    const horizontal = Math.abs(dz) <= EPS;
    const vertical = Math.abs(dx) <= EPS;
    // 斜墙不参与轮廓推导 (现在的户型数据全是正交墙), 退回包围盒
    if (!horizontal && !vertical) return null;

    const ts: number[] = [0, len];
    const push = (t: number) => {
      if (t > 1e-3 && t < len - 1e-3) ts.push(t);
    };

    for (let j = 0; j < segments.length; j++) {
      if (j === i) continue;
      const [ox1, oz1] = segments[j].start;
      const [ox2, oz2] = segments[j].end;
      const odx = ox2 - ox1;
      const odz = oz2 - oz1;
      const oLen = Math.hypot(odx, odz);
      if (oLen < EPS) continue;
      const oHorizontal = Math.abs(odz) <= EPS;
      const oVertical = Math.abs(odx) <= EPS;

      if (horizontal) {
        // 对方端点落在本墙的直线上 → 切开
        if (Math.abs(oz1 - z1) <= EPS && ox1 > x1 && ox1 < x2) push(ox1 - x1);
        if (Math.abs(oz2 - z1) <= EPS && ox2 > x1 && ox2 < x2) push(ox2 - x1);
        // 竖墙穿过本墙 → 交叉点
        if (oVertical && Math.abs(ox1 - x1) < len) {
          if (z1 > Math.min(oz1, oz2) - EPS && z1 < Math.max(oz1, oz2) + EPS) push(ox1 - x1);
        }
      } else {
        if (Math.abs(ox1 - x1) <= EPS && oz1 > z1 && oz1 < z2) push(oz1 - z1);
        if (Math.abs(ox2 - x1) <= EPS && oz2 > z1 && oz2 < z2) push(oz2 - z1);
        if (oHorizontal && Math.abs(oz1 - z1) < len) {
          if (x1 > Math.min(ox1, ox2) - EPS && x1 < Math.max(ox1, ox2) + EPS) push(oz1 - z1);
        }
      }
    }

    ts.sort((a, b) => a - b);
    const uniq: number[] = [];
    for (const t of ts) {
      if (uniq.length === 0 || t - uniq[uniq.length - 1] > 1e-3) uniq.push(t);
    }
    pieces.push(uniq.map((t) => ({ x: x1 + (dx / len) * t, z: z1 + (dz / len) * t })));
  }

  const edges: Edge[] = [];
  for (const pts of pieces) {
    for (let k = 0; k + 1 < pts.length; k++) {
      const p = pts[k];
      const q = pts[k + 1];
      const a = nodeKey(p.x, p.z);
      const b = nodeKey(q.x, q.z);
      if (a === b) continue;
      edges.push({ a, b, ax: p.x, az: p.z, bx: q.x, bz: q.z });
    }
  }
  return edges;
}

/** 反复剪掉"只有一端连着别的墙"的支路 —— 这些是伸到隔壁空间的借墙 */
function pruneDangling(edges: Edge[]): Edge[] {
  let alive = edges;
  for (let guard = 0; guard < 64; guard++) {
    const deg = new Map<string, number>();
    for (const e of alive) {
      deg.set(e.a, (deg.get(e.a) ?? 0) + 1);
      deg.set(e.b, (deg.get(e.b) ?? 0) + 1);
    }
    const next = alive.filter((e) => (deg.get(e.a) ?? 0) > 1 && (deg.get(e.b) ?? 0) > 1);
    if (next.length === alive.length) return next;
    alive = next;
  }
  return alive;
}

/** 在剩下的图里沿着边走闭环, 返回每条闭环的顶点序列 */
function traceLoops(edges: Edge[]): [number, number][][] {
  const adj = new Map<string, number[]>();
  const addAdj = (node: string, i: number) => {
    const list = adj.get(node);
    if (list) list.push(i);
    else adj.set(node, [i]);
  };
  edges.forEach((e, i) => {
    addAdj(e.a, i);
    addAdj(e.b, i);
  });

  const used = new Set<number>();
  const loops: [number, number][][] = [];

  for (let seed = 0; seed < edges.length; seed++) {
    if (used.has(seed)) continue;
    const startNode = edges[seed].a;
    const pts: [number, number][] = [];
    let curNode = startNode;
    let curEdge = seed;
    let closed = false;

    for (let guard = 0; guard <= edges.length; guard++) {
      const e = edges[curEdge];
      if (used.has(curEdge)) break;
      used.add(curEdge);
      const forward = e.a === curNode;
      pts.push(forward ? [e.ax, e.az] : [e.bx, e.bz]);
      const next = forward ? e.b : e.a;
      if (next === startNode) {
        closed = true;
        break;
      }
      curNode = next;
      const candidates = adj.get(next) ?? [];
      const follow = candidates.find((i) => !used.has(i));
      if (follow === undefined) break;
      curEdge = follow;
    }

    if (closed && pts.length >= 4) loops.push(pts);
  }
  return loops;
}

function polygonArea(pts: [number, number][]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, z1] = pts[i];
    const [x2, z2] = pts[(i + 1) % pts.length];
    s += x1 * z2 - x2 * z1;
  }
  return Math.abs(s) / 2;
}

function boundsOf(pts: [number, number][], traced: boolean): RoomOutline {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of pts) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  const width = maxX - minX;
  const depth = maxZ - minZ;
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    width,
    depth,
    area: traced ? polygonArea(pts) : width * depth,
    cx: (minX + maxX) / 2,
    cz: (minZ + maxZ) / 2,
    traced,
    points: pts,
  };
}

/** 旧口径: 全部墙体端点的包围盒 */
function bboxOutline(segments: WallSegment[]): RoomOutline {
  const pts: [number, number][] = [];
  for (const s of segments) {
    pts.push([s.start[0], s.start[1]], [s.end[0], s.end[1]]);
  }
  if (pts.length === 0) {
    return {
      minX: 0, maxX: 0, minZ: 0, maxZ: 0, width: 0, depth: 0, area: 0,
      cx: 0, cz: 0, traced: false, points: [],
    };
  }
  return boundsOf(pts, false);
}

/**
 * 房间地坪轮廓。**永不返回 null** —— 推不出闭合墙环时退回全部墙的包围盒,
 * 与旧行为一致 (开放式户型只有两三面墙时就是这种情况)。
 */
export function roomOutline(segments: WallSegment[]): RoomOutline {
  if (segments.length < 3) return bboxOutline(segments);
  const edges = splitIntoEdges(segments);
  if (!edges || edges.length < 4) return bboxOutline(segments);
  const loops = traceLoops(pruneDangling(edges));
  if (loops.length === 0) return bboxOutline(segments);
  // 多个闭环时取面积最大的那个 (其余是墙环里的小回字, 例如管井)
  let best = loops[0];
  for (const loop of loops) if (polygonArea(loop) > polygonArea(best)) best = loop;
  if (polygonArea(best) < 0.25) return bboxOutline(segments);
  return boundsOf(best, true);
}
