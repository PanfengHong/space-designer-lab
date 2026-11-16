import type { CatalogPreset, FurnitureElement } from '../../types';
import type { FurnitureType } from '../../../types';
import { sofaElement } from './sofa';
import { bedElement } from './bed';
import { tableElement } from './table';
import { cabinetElement } from './cabinet';
import { chairElement } from './chair';
import { fridgeElement } from './fridge';
import { washerElement } from './washer';
import { showerElement } from './shower';
import { toiletElement } from './toilet';
import { sinkElement } from './sink';
import { stoveElement } from './stove';
import { decorElement } from './decor';
import { acElement } from './ac';
import { curtainElement } from './curtain';
import { applianceElement } from './appliance';

/**
 * 室内家具注册表 —— 声明顺序 = 住宅素材库展示顺序。
 *
 * 场景内家具 (Furniture.tsx)、拖拽 ghost、素材卡图标、2D 符号、
 * 悬浮面板自定义配置全部从这里按 type 取, 新增一种家具 = 新建一个元素目录
 * 并在此登记, 不再需要分别去改 registry / symbol / catalog 三处。
 */

export const FURNITURE_ELEMENTS: FurnitureElement[] = [
  sofaElement,
  bedElement,
  tableElement,
  cabinetElement,
  chairElement,
  fridgeElement,
  washerElement,
  showerElement,
  toiletElement,
  sinkElement,
  stoveElement,
  decorElement,
  acElement,
  curtainElement,
  applianceElement,
];

const BY_TYPE = new Map(FURNITURE_ELEMENTS.map((el) => [el.type as string, el]));

export function getFurnitureElement(type: FurnitureType): FurnitureElement | undefined {
  return BY_TYPE.get(type);
}

/** 元素的默认预设 (未显式声明 presets 时由 meta 派生一条) */
export function defaultPresetOf(el: FurnitureElement): CatalogPreset {
  return {
    name: el.meta.label,
    size: el.meta.defaultSize,
    color: el.meta.defaultColor,
  };
}

/** 某个素材库 (住宅/办公) 的预设列表 */
export function furniturePresetsOf(
  el: FurnitureElement,
  office: boolean,
): CatalogPreset[] {
  const presets = office ? el.officePresets : el.presets;
  return presets ?? [defaultPresetOf(el)];
}
