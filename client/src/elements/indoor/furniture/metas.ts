import type { FurnitureType } from '../../../types';
import type { FootprintAxis, FurnitureMeta } from '../../types';
import { meta as bedMeta } from './bed/meta';
import { meta as sofaMeta } from './sofa/meta';
import { meta as tableMeta } from './table/meta';
import { meta as cabinetMeta } from './cabinet/meta';
import { meta as applianceMeta } from './appliance/meta';
import { meta as decorMeta } from './decor/meta';
import { meta as chairMeta } from './chair/meta';
import { meta as showerMeta } from './shower/meta';
import { meta as sinkMeta } from './sink/meta';
import { meta as toiletMeta } from './toilet/meta';
import { meta as fridgeMeta } from './fridge/meta';
import { meta as washerMeta } from './washer/meta';
import { meta as stoveMeta } from './stove/meta';
import { meta as acMeta } from './ac/meta';
import { meta as curtainMeta } from './curtain/meta';

/**
 * 家具元数据表 —— 每个 FurnitureType 一条记录, 是所有渲染出口的**唯一真源**。
 *
 * 本文件是**纯数据聚合** (只 import 各元素的 meta.ts), 不含 JSX,
 * 因此可以被 utils/ 里的纯逻辑安全导入 (collision.ts 的占位盒、
 * FurnitureTransform 的足迹都要读 footprintX) 而不会拉进任何组件。
 * 渲染分派见同目录 index.tsx。
 */

export type { FootprintAxis, FurnitureMeta };

/** 元素声明顺序 = 住宅素材库展示顺序 */
export const FURNITURE_META: Record<FurnitureType, FurnitureMeta> = {
  sofa: sofaMeta,
  bed: bedMeta,
  table: tableMeta,
  cabinet: cabinetMeta,
  chair: chairMeta,
  fridge: fridgeMeta,
  washer: washerMeta,
  shower: showerMeta,
  toilet: toiletMeta,
  sink: sinkMeta,
  stove: stoveMeta,
  decor: decorMeta,
  ac: acMeta,
  curtain: curtainMeta,
  appliance: applianceMeta,
};

/** 取某类型的元数据 (未知类型回落到柜子, 保证永远有值) */
export function metaOf(type: FurnitureType): FurnitureMeta {
  return FURNITURE_META[type] ?? FURNITURE_META.cabinet;
}

export function footprintXOf(type: FurnitureType): FootprintAxis {
  return metaOf(type).footprintX;
}

/**
 * 占地尺寸: w = 沿局部 X, h = 沿局部 Z。
 *
 * 已按各素材的建模轴向归一 (例外元素在各自 meta.ts 里声明 footprintX),
 * 2D 符号与碰撞盒都从这里取, 不再各自推导。
 */
export function footprintOf(f: {
  type: FurnitureType;
  size: [number, number, number];
}): { w: number; h: number } {
  return footprintXOf(f.type) === 'size0'
    ? { w: f.size[0], h: f.size[2] }
    : { w: f.size[2], h: f.size[0] };
}
