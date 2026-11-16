import * as THREE from 'three';
import type { FloorMaterialId } from '../types';
import { FLOOR_MATERIALS } from '../data/floorMaterials';

/**
 * 地面材质贴图 —— 全部用 Canvas 程序化生成, 不依赖任何外部图片资源。
 *
 * 为什么程序化:
 *   - 场景包 / 单文件离线运行器里不能假设有贴图目录, 生成出来的纹理天然可打包
 *   - 尺寸、缝宽、色差都在代码里, 想调直接改常量, 不用重新导出图片
 *
 * 一张贴图 = 材质定义的 `tile` 边长 (米), 由调用方按房间尺寸算 repeat。
 * 结果按材质 id 缓存, 同一材质在多个房间共用同一份底图。
 */

const SIZE = 512;

/** 确定性伪随机 —— 同一材质的纹理每次刷新都一样, 不会闪 */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shade(hex: string, delta: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, ((n >> 16) & 255) + delta));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) + delta));
  const b = Math.min(255, Math.max(0, (n & 255) + delta));
  return `rgb(${r},${g},${b})`;
}

/* ==================== 木地板 ==================== */

function drawWood(ctx: CanvasRenderingContext2D, id: FloorMaterialId) {
  const def = FLOOR_MATERIALS[id];
  const base = def.base;
  const grain = def.grain;
  const rand = rng(hash(id));

  const planks = 8; // 一格 1.2m → 板宽 0.15m
  const ph = SIZE / planks;

  for (let row = 0; row < planks; row++) {
    // 每块板轻微色差, 避免整面死板
    const jitter = Math.round((rand() - 0.5) * 16);
    ctx.fillStyle = shade(base, jitter);
    ctx.fillRect(0, row * ph, SIZE, ph);

    // 木纹: 几条沿板长方向的淡纹
    for (let i = 0; i < 26; i++) {
      const y = row * ph + 2 + rand() * (ph - 4);
      const amp = 1 + rand() * 2.5;
      const phase = rand() * Math.PI * 2;
      ctx.strokeStyle = shade(grain, Math.round((rand() - 0.5) * 18));
      ctx.globalAlpha = 0.12 + rand() * 0.22;
      ctx.lineWidth = 0.6 + rand() * 1.1;
      ctx.beginPath();
      for (let x = 0; x <= SIZE; x += 16) {
        const yy = y + Math.sin(x / 90 + phase) * amp;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 板缝 (横向)
    ctx.strokeStyle = shade(grain, -10);
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, row * ph + 0.5);
    ctx.lineTo(SIZE, row * ph + 0.5);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // 端缝 (每块板一个错缝位置, 让 1.2m 见方内也看得出是拼板)
    const joints = rand() < 0.5 ? 1 : 2;
    for (let j = 0; j < joints; j++) {
      const x = ((row * 0.37 + j * 0.5 + rand() * 0.2) % 1) * SIZE;
      ctx.strokeStyle = shade(grain, -18);
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, row * ph + 1);
      ctx.lineTo(x, (row + 1) * ph - 1);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

/* ==================== 地砖 ==================== */

function drawTile(
  ctx: CanvasRenderingContext2D,
  id: FloorMaterialId,
  cells: number,
  speckle: boolean,
) {
  const def = FLOOR_MATERIALS[id];
  const base = def.base;
  const grain = def.grain;
  const rand = rng(hash(id + cells));

  const cw = SIZE / cells;
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      ctx.fillStyle = shade(base, Math.round((rand() - 0.5) * 10));
      ctx.fillRect(c * cw, r * cw, cw, cw);

      // 釉面高光: 一条很淡的斜向亮带, 让瓷砖不是纯平色块

        const g = ctx.createLinearGradient(c * cw, r * cw, (c + 1) * cw, (r + 1) * cw);
        g.addColorStop(0, 'rgba(255,255,255,0.16)');
        g.addColorStop(0.45, 'rgba(255,255,255,0.02)');
        g.addColorStop(1, 'rgba(0,0,0,0.04)');
        ctx.fillStyle = g;
        ctx.fillRect(c * cw + 1, r * cw + 1, cw - 2, cw - 2);
      // 防滑砖的细颗粒
      if (speckle) {
        for (let i = 0; i < 220; i++) {
          const x = c * cw + rand() * cw;
          const y = r * cw + rand() * cw;
          ctx.fillStyle = rand() > 0.5 ? shade(grain, 8) : shade(grain, -6);
          ctx.globalAlpha = 0.16 + rand() * 0.14;
          ctx.fillRect(x, y, 1.2, 1.2);
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  // 砖缝
  ctx.strokeStyle = grain;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = cells >= 4 ? 2.4 : 3.2;
  for (let i = 0; i <= cells; i++) {
    const p = i * cw;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, SIZE);
    ctx.moveTo(0, p);
    ctx.lineTo(SIZE, p);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/* ==================== 地毯 ==================== */

function drawCarpet(ctx: CanvasRenderingContext2D, id: FloorMaterialId) {
  const def = FLOOR_MATERIALS[id];
  const base = def.base;
  const grain = def.grain;
  const rand = rng(hash(id));

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // 绒毛颗粒
  for (let i = 0; i < 26000; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    ctx.fillStyle = rand() > 0.5 ? shade(base, 10) : shade(grain, 0);
    ctx.globalAlpha = 0.1 + rand() * 0.22;
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  // 织纹: 细密斜线
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = grain;
  ctx.lineWidth = 1;
  for (let i = -SIZE; i < SIZE * 2; i += 7) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + SIZE, SIZE);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/* ==================== 水泥自流平 ==================== */

function drawConcrete(ctx: CanvasRenderingContext2D, id: FloorMaterialId) {
  const def = FLOOR_MATERIALS[id];
  const base = def.base;
  const grain = def.grain;
  const rand = rng(hash(id));

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // 大块云斑
  for (let i = 0; i < 46; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const r = 30 + rand() * 90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const light = rand() > 0.5;
    g.addColorStop(0, light ? 'rgba(255,255,255,0.10)' : 'rgba(80,84,86,0.10)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // 细颗粒
  for (let i = 0; i < 9000; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    ctx.fillStyle = rand() > 0.5 ? shade(base, 12) : grain;
    ctx.globalAlpha = 0.08 + rand() * 0.12;
    ctx.fillRect(x, y, 1.2, 1.2);
  }
  ctx.globalAlpha = 1;
  // 一道极淡的刮痕
  ctx.strokeStyle = grain;
  ctx.globalAlpha = 0.1;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(SIZE * 0.3, SIZE * 0.7, SIZE * 0.45, Math.PI * 1.1, Math.PI * 1.6);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/* ==================== 出口 ==================== */

const cache = new Map<string, THREE.CanvasTexture>();

/**
 * 取一张材质贴图 (repeat 由调用方按房间尺寸设置, 这里返回的模板 repeat = 1)。
 */
export function getFloorTexture(id: FloorMaterialId): THREE.CanvasTexture {
  const key = id;
  const hit = cache.get(key);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;

  switch (id) {
    case 'wood-oak':
    case 'wood-walnut':
      drawWood(ctx, id);
      break;
    case 'tile-white':
      drawTile(ctx, id, 2, false);
      break;
    case 'tile-gray':
      drawTile(ctx, id, 4, true);
      break;
    case 'carpet':
      drawCarpet(ctx, id);
      break;
    case 'concrete':
      drawConcrete(ctx, id);
      break;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}
