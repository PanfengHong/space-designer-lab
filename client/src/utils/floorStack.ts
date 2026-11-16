import type { Room } from '../types';
import { roomOutline } from './roomOutline';

/**
 * 地面分层 —— 解决「地板一直在闪」。
 *
 * 起因: 地面是按房间轮廓铺的矩形板 (见 Floor.tsx), 顶面统一在 y=0。
 * 而户型数据里房间并不互斥: 三居室的卫生间B 整块落在卧室C 的矩形轮廓里
 * (L 形房间被当成矩形铺)。两边顶面严格共面 → 深度值插值有微小差异 →
 * 逐像素互相抢胜, 画面上就是整片地面高频闪烁
 * (白模下尤其明显, 因为相邻房间的材质不同, 闪的是两种颜色)。
 *
 * 解法: 按「谁该盖住谁」给每间房一个极小的抬升值, 让共面变成不共面。
 *   - 只在**重叠**的房间之间建立约束: 面积小的抬到面积大的上面
 *     (重叠区归小房间所有 —— 卫生间压在卧室矩形板上、餐厅压在客厅矩形板上)
 *   - 用「最小分层」而不是「排序序号」: 同层能并存的不强行拉开,
 *     一条链再长也只有几级, 避免小房间被累积抬到肉眼可见的台阶
 *
 * 步长 1.5mm 的依据: 相机 near=0.5 / far=200 时, 25m 处的深度分辨率约 0.07mm,
 * 100m 处约 1.2mm —— 1.5mm 足够在任何可用的观察距离上稳定分出前后, 同时
 * 比墙角/门槛的视觉分辨极限还小一个量级, 看不出来。
 */

/** 每一级的抬升量 (米) */
const STEP = 0.0015;

/** 包围盒重判定的容差: 小于这个宽度的"贴边"不算重叠 (相邻房间共用一面墙) */
const EPS = 0.01;

interface RoomBox {
  id: string;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  area: number;
}

function roomBox(room: Room): RoomBox {
  // 与 Floor.tsx 铺地的范围同源 (房间闭合墙环), 否则会给一个实际并不重叠的房间
  // 白抬 1.5mm, 抬升表也就失去意义了
  const b = roomOutline(room.walls);
  return { id: room.id, x0: b.minX, x1: b.maxX, z0: b.minZ, z1: b.maxZ, area: b.area };
}

function overlaps(a: RoomBox, b: RoomBox) {
  return (
    Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > EPS &&
    Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0) > EPS
  );
}

/**
 * 每间房的抬升值 (米)。没有重叠的房间一律返回 0 —— 只打断真正共面的地方,
 * 不给正常户型引入任何无谓的高度差。
 */
export function floorElevations(rooms: Room[]): Record<string, number> {
  const boxes = rooms.map(roomBox);
  const level = new Map<string, number>();
  for (const b of boxes) level.set(b.id, 0);

  // 松弛迭代求最小分层: 每轮把"压在别人下面"的房间往上顶一级, 直到不再变化。
  // 轮数上限 = 房间数 (最长链也就是这么长), 同面积时用 id 定序避免互相顶死。
  for (let iter = 0; iter < boxes.length; iter++) {
    let changed = false;
    for (const big of boxes) {
      for (const small of boxes) {
        if (big.id === small.id || !overlaps(big, small)) continue;
        const bigBelow =
          big.area > small.area || (big.area === small.area && big.id < small.id);
        if (!bigBelow) continue;
        const need = (level.get(big.id) ?? 0) + 1;
        if ((level.get(small.id) ?? 0) < need) {
          level.set(small.id, need);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  const out: Record<string, number> = {};
  for (const b of boxes) out[b.id] = (level.get(b.id) ?? 0) * STEP;
  return out;
}
