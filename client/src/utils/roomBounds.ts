import type { WallSegment } from '../types';

export interface RoomBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  width: number;
  depth: number;
  area: number;
  cx: number;
  cz: number;
}

function computeBounds(src: WallSegment[]): RoomBounds | null {
  if (src.length === 0) return null;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const s of src) {
    minX = Math.min(minX, s.start[0], s.end[0]);
    maxX = Math.max(maxX, s.start[0], s.end[0]);
    minZ = Math.min(minZ, s.start[1], s.end[1]);
    maxZ = Math.max(maxZ, s.start[1], s.end[1]);
  }
  const width = maxX - minX;
  const depth = maxZ - minZ;
  return {
    minX, maxX, minZ, maxZ,
    width, depth, area: width * depth,
    cx: (minX + maxX) / 2,
    cz: (minZ + maxZ) / 2,
  };
}

/**
 * 房间水平包围盒 (地板 / 天花板 / 吸顶灯定位共用)。
 *
 * 默认忽略 `opening` 墙段: 这类段只用于声明空间边界、不渲染墙体,
 * 而且经常从相邻空间一路延伸过来 (例如客厅东墙的开放段一直伸到餐厅北侧),
 * 计入会把包围盒拉出房间本身, 使天花板 / 灯具跑到隔壁空间去。
 *
 * 若过滤后拿不到有效包围盒 (开放式户型整间都由开放段围合), 回退到全部墙段。
 */
export function roomBounds(segments: WallSegment[], includeOpening = false): RoomBounds | null {
  const solid = includeOpening ? segments : segments.filter((s) => !s.opening);
  let b = computeBounds(solid);
  if (!b || b.width < 0.3 || b.depth < 0.3) b = computeBounds(segments);
  return b;
}
