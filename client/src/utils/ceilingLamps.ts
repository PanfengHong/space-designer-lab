import type { RoomBounds } from './roomBounds';

export interface LampSpot {
  x: number;
  z: number;
  radius: number;
}

/**
 * 吸顶灯排布: 单灯覆盖约 12㎡, 最多 9 盏。
 * 多灯时在房间包围盒内做网格布局, 行列数取"尽量填满 + 贴合房间长宽比"的组合,
 * 避免大客厅 / 开放办公区只有一盏灯、或长条房间灯排成一列。
 */
export function layoutCeilingLamps(b: RoomBounds): LampSpot[] {
  const n = Math.min(9, Math.max(1, Math.round(b.area / 12)));

  if (n === 1) {
    // 单灯: 灯罩直径随房间面积分档 (卫生间小而客厅大)
    const radius = b.area >= 16 ? 0.3 : b.area >= 9 ? 0.25 : b.area >= 5 ? 0.2 : 0.16;
    return [{ x: b.cx, z: b.cz, radius }];
  }

  let best = { cols: n, rows: 1, score: Infinity };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const waste = cols * rows - n;                              // 空位越少越好
    const ratioDiff = Math.abs(cols / rows - b.width / b.depth); // 网格比例贴近房间长宽比
    const score = waste * 10 + ratioDiff;
    if (score < best.score) best = { cols, rows, score };
  }

  const padX = Math.min(b.width * 0.24, 0.9);
  const padZ = Math.min(b.depth * 0.24, 0.9);
  const spanX = b.width - padX * 2;
  const spanZ = b.depth - padZ * 2;

  const out: LampSpot[] = [];
  for (let r = 0; r < best.rows && out.length < n; r++) {
    for (let c = 0; c < best.cols && out.length < n; c++) {
      out.push({
        x: best.cols === 1 ? b.cx : b.minX + padX + (spanX * c) / (best.cols - 1),
        z: best.rows === 1 ? b.cz : b.minZ + padZ + (spanZ * r) / (best.rows - 1),
        radius: 0.24,
      });
    }
  }
  return out;
}
