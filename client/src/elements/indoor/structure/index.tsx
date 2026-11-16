import type { StructureFamily } from '../../types';
import { wallElement } from './wall';
import { doorElement } from './door';
import { windowElement } from './window';
import { bayWindowElement } from './bay-window';
import { frenchWindowElement } from './french-window';
import { floorElement } from './floor';

export { STRUCTURE_CATALOG, THUMB_WALL_T } from './templates';
export type { StructureTemplate } from './templates';
export { Walls } from './wall/Walls';
export { Doors } from './door/Doors';
export { Windows } from './window/Windows';
export { BayWindows } from './bay-window/BayWindow';
export { FrenchWindows } from './french-window/FrenchWindow';
export { WallLine } from './wall/Symbol2D';
export { Door2D } from './door/Symbol2D';
export { Window2D } from './window/Symbol2D';
export { BayWindow2D } from './bay-window/Symbol2D';
export { FrenchWindow2D } from './french-window/Symbol2D';
export { RoomFloor, FloorPatterns } from './floor/FloorPlan';

/**
 * 建筑结构注册表 —— 墙/门/窗/飘窗/落地窗/地板。
 * Building.tsx 与 FloorPlan2D.tsx 直接 import 批量组件 (带完整 props 类型);
 * 素材卡图标与属性面板自定义配置从这里按 type 泛化取用。
 */
export const STRUCTURE_ELEMENTS = [
  wallElement,
  doorElement,
  windowElement,
  bayWindowElement,
  frenchWindowElement,
  floorElement,
];

const BY_TYPE = new Map(STRUCTURE_ELEMENTS.map((el) => [el.type as string, el]));

export function getStructureElement(type: StructureFamily): ReturnType<typeof BY_TYPE.get> {
  return BY_TYPE.get(type);
}
