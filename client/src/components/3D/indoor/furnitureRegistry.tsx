import type { Furniture } from '../../../types';
import { getFurnitureElement } from '../../../elements/indoor/furniture';
import { Decor } from '../../../elements/indoor/furniture/decor/View3D';

/**
 * 3D 素材注册表出口 —— 全应用唯一的类型→组件分派点。
 *
 * 场景内家具 (Furniture.tsx)、拖拽 ghost (FurnitureTransform.tsx)、
 * 素材栏缩略图 (ElementIcon) 都从这里取组件, 不再各自维护一份 switch。
 * 元素定义 (元数据/2D 符号/自定义配置) 见 elements/indoor/furniture/。
 */
export function FurnitureContent3D({ data }: { data: Furniture }) {
  const el = getFurnitureElement(data.type);
  if (!el) return <Decor data={data} />;
  const View3D = el.View3D;
  return <View3D data={data} />;
}
