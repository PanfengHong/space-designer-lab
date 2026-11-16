import type { StructureElement } from '../../../types';
import { Floor } from './Floor';
import { RoomFloor } from './FloorPlan';
import { FloorConfig } from './Config';

/**
 * 地板 —— 房间附属元素: 不可拖入素材库 (templates 为空),
 * 但拥有完整的三类视图 (2D/3D/自定义配置), 在属性面板按 `floor:<roomId>` 选中。
 */
export const floorElement: StructureElement = {
  kind: 'structure',
  type: 'floor',
  label: '地板',
  templates: [],
  Batch3D: Floor,
  Symbol2D: RoomFloor,
  Config: FloorConfig,
} as StructureElement;
