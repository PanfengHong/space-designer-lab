/**
 * 元素总注册表 —— 「所有物体/元素统一在一个目录下维护」的入口。
 *
 * 分组 (与原结构一致):
 *   indoor/furniture  室内家具  (15 种, 可拖入)
 *   indoor/structure  建筑结构  (墙/门/窗/飘窗/落地窗/地板)
 *   outdoor/ground    户外地面  (8 种, 可拖入)
 *   outdoor/objects   户外对象  (10 种, 可拖入)
 *
 * 每个元素目录 (elements/<分组>/<type>/) 提供三类视图:
 *   View3D / Symbol2D  —— 设计区视图 (3D / 2D)
 *   icon (或由 common/ElementIcon 由上面两者派生) —— 左侧列表图标
 *   Config             —— 悬浮面板自定义配置 (通用配置见 common/CommonConfig)
 */

export * from './types';
export { FURNITURE_ELEMENTS, getFurnitureElement, furniturePresetsOf, defaultPresetOf } from './indoor/furniture';
export { FURNITURE_META, metaOf, footprintXOf, footprintOf } from './indoor/furniture/metas';
export {
  STRUCTURE_ELEMENTS,
  STRUCTURE_CATALOG,
  getStructureElement,
  RoomFloor,
  FloorPatterns,
} from './indoor/structure';
export { resolveStructure } from './indoor/structure/resolve';
export { GROUND_ELEMENTS, getGroundElement } from './outdoor/ground';
export { OBJECT_ELEMENTS, getOutdoorObjectElement } from './outdoor/objects';
export { PLAN_LIGHT, PLAN_DARK } from './outdoor/planPalette';
export {
  FurnitureIcon3D,
  FurnitureIcon2D,
  StructureIcon3D,
  StructureIcon2D,
  OutdoorIcon3D,
  OutdoorIcon2D,
} from './common/ElementIcon';
export {
  CommonFurnitureRows,
  CommonStructureRows,
  CommonOutdoorRows,
} from './common/CommonConfig';
