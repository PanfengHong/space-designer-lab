import type { OutdoorObjectType } from '../../../types';
import type { AnyObjectElement } from '../../types';
import { buildingElement } from './building';
import { warehouseElement } from './warehouse';
import { teachingBuildingElement, labBuildingElement, dormitoryElement } from './school-building';
import { gateElement } from './gate';
import { guardBoothElement } from './guard-booth';
import { carElement } from './car';
import { truckElement } from './truck';
import { treeElement } from './tree';

/**
 * 户外空间对象注册表 —— 声明顺序 = 素材库展示顺序。
 * 3D 内容分发 (OutdoorObjects)、2D 符号 (OutdoorPlan2D)、素材卡图标全部从这里取。
 */
export const OBJECT_ELEMENTS: AnyObjectElement[] = [
  buildingElement,
  warehouseElement,
  teachingBuildingElement,
  labBuildingElement,
  dormitoryElement,
  gateElement,
  guardBoothElement,
  truckElement,
  carElement,
  treeElement,
];

const BY_TYPE = new Map(OBJECT_ELEMENTS.map((el) => [el.type as string, el]));

export function getOutdoorObjectElement(type: OutdoorObjectType): AnyObjectElement | undefined {
  return BY_TYPE.get(type);
}
