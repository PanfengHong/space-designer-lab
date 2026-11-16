import type { Furniture } from '../../../types';
import { Bed } from './furniture/Bed';
import { Sofa } from './furniture/Sofa';
import { Table } from './furniture/Table';
import { Cabinet } from './furniture/Cabinet';
import { Appliance } from './furniture/Appliance';
import { Refrigerator } from './furniture/Refrigerator';
import { WashingMachine } from './furniture/WashingMachine';
import { Decor } from './furniture/Decor';
import { Chair } from './furniture/Chair';
import { Shower } from './furniture/Shower';
import { Sink } from './furniture/Sink';
import { Toilet } from './furniture/Toilet';
import { Stove } from './furniture/Stove';
import { AirConditioner } from './furniture/AirConditioner';
import { Curtain } from './furniture/Curtain';

/**
 * 3D 素材注册表 —— 全应用唯一的类型→组件分派点。
 *
 * 场景内家具 (Furniture.tsx)、拖拽 ghost (FurnitureTransform.tsx)、
 * 素材栏缩略图 (FurnitureCatalog.tsx) 都从这里取组件, 不再各自维护一份 switch。
 * 元数据 (占地轴向/默认尺寸/设备身份) 见 data/furnitureMeta.ts;
 * 2D 对应物见 components/2D/furnitureSymbol2D.tsx。
 */
export function FurnitureContent3D({ data }: { data: Furniture }) {
  switch (data.type) {
    case 'bed':
      return <Bed data={data} />;
    case 'sofa':
      return <Sofa data={data} />;
    case 'table':
      return <Table data={data} />;
    case 'cabinet':
      return <Cabinet data={data} />;
    case 'appliance':
      return <Appliance data={data} />;
    case 'fridge':
      return <Refrigerator data={data} />;
    case 'washer':
      return <WashingMachine data={data} />;
    case 'chair':
      return <Chair data={data} />;
    case 'shower':
      return <Shower data={data} />;
    case 'sink':
      return <Sink data={data} />;
    case 'toilet':
      return <Toilet data={data} />;
    case 'stove':
      return <Stove data={data} />;
    case 'ac':
      return <AirConditioner data={data} />;
    case 'curtain':
      return <Curtain data={data} />;
    case 'decor':
    default:
      return <Decor data={data} />;
  }
}
