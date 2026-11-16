import type { FloorMaterialId, Room } from '../types';

/**
 * 地面材质注册表 —— 与家具素材注册表同一思路: 一份纯数据, 3D 纹理 / 属性面板色板 /
 * 平面图填充都从这里读, 不要在别处再写第二套材质表。
 *
 * - `base` / `grain` 是程序化纹理的绘制色 (见 utils/floorTextures.ts)
 * - `tile` 是纹理一格对应的真实边长 (米), 用来按房间尺寸算 UV 重复次数
 * - `pattern` 给 2D 平面图用 (木地板画板缝, 砖画网格)
 */
export interface FloorMaterialDef {
  id: FloorMaterialId;
  label: string;
  /** 属性面板里的简短名 */
  short: string;
  /** 底色 */
  base: string;
  /** 纹理线/缝的颜色 */
  grain: string;
  /** 色板颜色 (属性面板小方块) */
  swatch: string;
  /** 一格纹理对应的真实边长 (米) */
  tile: number;
  roughness: number;
  metalness?: number;
  /** 2D 平面图的填充样式 */
  pattern: 'plank' | 'grid-fine' | 'grid-coarse' | 'dot' | 'solid';
  /** 一句话说明, 出现在属性面板 */
  hint: string;
}

export const FLOOR_MATERIALS: Record<FloorMaterialId, FloorMaterialDef> = {
  'wood-oak': {
    id: 'wood-oak',
    label: '浅橡木地板',
    short: '橡木',
    base: '#c9a578',
    grain: '#a5824f',
    swatch: '#c9a578',
    tile: 1.2,
    roughness: 0.42,
    pattern: 'plank',
    hint: '卧室 / 客厅 常用，暖色调',
  },
  'wood-walnut': {
    id: 'wood-walnut',
    label: '深胡桃木地板',
    short: '胡桃',
    base: '#8a5f3f',
    grain: '#6a452c',
    swatch: '#8a5f3f',
    tile: 1.2,
    roughness: 0.4,
    pattern: 'plank',
    hint: '客厅 / 衣帽间，沉稳',
  },
  'tile-white': {
    id: 'tile-white',
    label: '白色地砖 600',
    short: '白砖',
    base: '#eceef0',
    grain: '#cfd4d8',
    swatch: '#eceef0',
    tile: 1.2,
    roughness: 0.28,
    pattern: 'grid-coarse',
    hint: '厨房，600×600 抛光砖',
  },
  'tile-gray': {
    id: 'tile-gray',
    label: '灰色防滑砖 300',
    short: '灰砖',
    base: '#9ba1a6',
    grain: '#7f868c',
    swatch: '#9ba1a6',
    tile: 1.2,
    roughness: 0.62,
    pattern: 'grid-fine',
    hint: '卫生间 / 阳台，哑光防滑',
  },
  carpet: {
    id: 'carpet',
    label: '浅灰地毯',
    short: '地毯',
    base: '#d5d2cc',
    grain: '#bdb9b2',
    swatch: '#d5d2cc',
    tile: 0.8,
    roughness: 0.95,
    pattern: 'dot',
    hint: '卧室 / 影音室，吸音柔软',
  },
  concrete: {
    id: 'concrete',
    label: '水泥自流平',
    short: '水泥',
    base: '#b3b6b7',
    grain: '#9ea1a2',
    swatch: '#b3b6b7',
    tile: 2,
    roughness: 0.68,
    pattern: 'solid',
    hint: '开放式 / 工业风',
  },
};

/** 选择器里的固定顺序 (属性面板按这个排) */
export const FLOOR_MATERIAL_ORDER: FloorMaterialId[] = [
  'wood-oak',
  'wood-walnut',
  'tile-white',
  'tile-gray',
  'carpet',
  'concrete',
];

/**
 * 按空间名字 / 标签猜默认地面 —— 保证老场景不用改数据也能"卧室木地板、厨房地砖"。
 * 认不出来就给橡木 (住宅里最通用的地面)。
 *
 * 先看名字、再看标签。**不能把名字和标签拼成一个串再匹配**: 三居室客厅的 tags 是
 * ["起居","阳台"],
 * 拼串后会先命中"阳台"规则, 整个客厅被铺成灰砖 —— 标签是辅助信息, 只能在名字
 * 认不出来时兜底。
 */
export function defaultFloorForRoom(room: Pick<Room, 'name' | 'tags'>): FloorMaterialId {
  return matchFloorKeyword(room.name) ?? matchFloorKeyword((room.tags ?? []).join(' ')) ?? 'wood-oak';
}

function matchFloorKeyword(s: string): FloorMaterialId | null {
  if (/卫生间|浴室|淋浴|卫浴|洗手间/.test(s)) return 'tile-gray';
  if (/厨房/.test(s)) return 'tile-white';
  if (/阳台|露台|洗衣/.test(s)) return 'tile-gray';
  if (/影音|家庭厅/.test(s)) return 'carpet';
  if (/衣帽间/.test(s)) return 'wood-walnut';
  if (/开放式|工业|loft/i.test(s)) return 'concrete';
  if (/客厅|餐厅|起居/.test(s)) return 'wood-walnut';
  if (/卧室|主卧|次卧|儿童房|书房/.test(s)) return 'wood-oak';
  return null;
}

/** 实际生效的材质: 手动指定优先, 否则按空间类型派生 */
export function floorMaterialOf(room: Pick<Room, 'name' | 'tags' | 'floorMaterial'>): FloorMaterialId {
  return room.floorMaterial ?? defaultFloorForRoom(room);
}

export function floorMaterialDef(room: Pick<Room, 'name' | 'tags' | 'floorMaterial'>): FloorMaterialDef {
  return FLOOR_MATERIALS[floorMaterialOf(room)];
}
