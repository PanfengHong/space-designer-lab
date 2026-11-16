import type { GroundItemType } from '../../../types';
import type { AnyGroundElement } from '../../types';
import { groundElement } from './ground';
import { grassElement } from './grass';
import { riverElement } from './river';
import { roadElement } from './road';
import { intersectionElement } from './intersection';
import { rampElement } from './ramp';
import { fenceElement } from './fence';
import { playgroundElement } from './playground';

/**
 * 户外地面元素注册表 —— 声明顺序 = 平面图绘制顺序 (地面最先铺, 道路压草地)。
 * 3D 内容分发 (GroundItems)、2D 符号 (OutdoorPlan2D)、素材卡图标全部从这里取。
 */
export const GROUND_ELEMENTS: AnyGroundElement[] = [
  groundElement,
  grassElement,
  riverElement,
  roadElement,
  intersectionElement,
  rampElement,
  fenceElement,
  playgroundElement,
];

const BY_TYPE = new Map(GROUND_ELEMENTS.map((el) => [el.type as string, el]));

export function getGroundElement(type: GroundItemType): AnyGroundElement | undefined {
  return BY_TYPE.get(type);
}
