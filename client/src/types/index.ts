// 空间（房间）类型
export interface Space {
  id: string;
  name: string;
  order: number;
}

// 模型层级
export interface ModelLayer {
  id: string;
  name: string;
  locked: boolean;
}

// 设计风格
export interface DesignStyle {
  id: string;
  code: string;   // 英文代号 (BASE / STYLE 01 / ...)
  label: string;  // 中文完整标签 (基础空间 / 中古现代 / ...)
  color: string;
}

// 视图模式
export type ViewMode = 'perspective' | 'axonometric' | 'top' | 'plan' | 'walkthrough';

// 渲染模式
export type RenderMode = 'arctic' | 'shaded' | 'material';

// 墙段数据
export interface WallSegment {
  id: string;
  start: [number, number];
  end: [number, number];
  height: number;
  opening?: boolean; // true 表示此处为开放口（无墙体），仅用于定义房间边界
  // 墙洞 (如飘窗洞口): 沿墙长度方向 [start, end] 区间, 高度方向 [sill, top] 区间开洞
  cutout?: {
    start: number; // 沿墙长度方向开口起点 (0~length)
    end: number;   // 沿墙长度方向开口终点
    sill: number;  // 洞口底部高度
    top: number;   // 洞口顶部高度
  };
}

// 门数据
export interface Door {
  id: string;
  position: [number, number, number];
  width: number;
  height: number;
  rotation?: number; // 绕 Y 轴旋转角度（度）
  openInward?: boolean; // true 时门向房间内侧开启 (旋转 -90°), 默认向外 (+90°)
  hingeSide?: 'left' | 'right'; // 铰链位置, 默认 'left' (局部 -X 端)
  style?: 'default' | 'glass'; // 门样式: default 普通门 | glass 推拉玻璃门
}

// 窗数据
export interface Window {
  id: string;
  position: [number, number, number];
  width: number;
  height: number;
  rotation?: number; // 绕 Y 轴旋转角度（度），用于贴在垂直于 X 轴的墙上
  style?: 'default' | 'sliding'; // default: 十字窗棂; sliding: 推拉窗 (仅竖向中梃)
  sill?: number; // 窗台高度 (距地面)
}

// 飘窗数据
// position: 飘窗背面（贴墙那面）中心点；局部 +Z 为凸出方向
// rotation: 0=朝南(+Z) | 90=朝东(+X) | 180=朝北(-Z) | 270=朝西(-X)
// height: 从 position.y (窗台) 向上的总高度
export interface BayWindow {
  id: string;
  position: [number, number, number];
  width: number;   // 飘窗正面宽度（沿墙面方向）
  depth: number;   // 凸出深度（垂直墙面方向）
  height: number;   // 飘窗总高度（从窗台到顶板）
  rotation?: number;
}

// 落地窗数据
// position: 落地窗中心点（地面 y=0）
// rotation: 0=朝南(+Z) | 90=朝东(+X) | 180=朝北(-Z) | 270=朝西(-X)
// width/height 为整体外框尺寸
export interface FrenchWindow {
  id: string;
  position: [number, number, number];
  width: number;
  height: number;
  rotation?: number;
}

// 楼梯数据
export interface StairFlight {
  id: string;
  position: [number, number, number]; // 楼梯起点 (底层)
  direction: 'north' | 'south' | 'east' | 'west';
  steps: number;
  stepHeight: number;
  stepDepth: number;
  width: number;
}

// 电梯门数据
export interface ElevatorDoorData {
  id: string;
  position: [number, number, number];
  width: number;
  height: number;
  rotation?: number; // 0=朝南 90=朝东 180=朝北 270=朝西
}

export type FurnitureType = 'cabinet' | 'sofa' | 'table' | 'bed' | 'appliance' | 'decor' | 'chair' | 'shower' | 'sink' | 'toilet' | 'fridge' | 'washer' | 'stove';

export interface BaseFurnitrue {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: number;
  size: [number, number, number];
  type: FurnitureType;
  color: string;
  // 内嵌模式 (厨房水槽/灶台等嵌入橱柜台面, 不渲染自身柜体)
  embedded?: boolean;
}

export interface ShowerFurniture {
  shape?: 'quarter' | 'rect';
}

export type SofaType = 'straight' | 'L';

export interface SofaFurniture {
  lSegmentW?: number; // L短边段的长度
  sofaShape?: SofaType;
  hasArmLeft?: boolean;
  hasArmRight?: boolean;
  lDirection?: 'right' | 'left'; // L转角方向：右L / 左L
}

// 家具/家电
export type Furniture = BaseFurnitrue & ShowerFurniture & SofaFurniture;

// 房间
export interface Room {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  tags: string[];
  walls: WallSegment[];
  doors: Door[];
  windows: Window[];
  bayWindows?: BayWindow[];
  frenchWindows?: FrenchWindow[];
  furniture: Furniture[];
  floorHeight: number;
  stairs?: StairFlight[];
  elevators?: ElevatorDoorData[];
}

// 场景数据
export interface SceneData {
  rooms: Room[];
  wallThickness: number;
  ceilingHeight: number;
  floorThickness: number;
}

// 视图设置
export interface ViewSettings {
  showSpaceName: boolean;
  showTrafficLines: boolean;
  showCeiling: boolean;
  showDoorsOpen: boolean;
  wallCutHeight: number;
  lighting: string;
}

// 模型分类
export type ModelCategory = 'furniture' | 'apartment';

// 模型卡片数据
export interface ModelItem {
  id: string;
  name: string;
  category: ModelCategory;
  type?: string;        // 家具类型 (sofa/bed/table...) 或户型类型 (one-bed/two-bed...)
  size?: [number, number, number];  // 家具尺寸
  color?: string;       // 家具颜色
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
