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
  showLabels?: boolean; // 户外模式: 显示元素名称标签
}

// 模型分类
export type ModelCategory = 'furniture' | 'apartment' | 'campus';

// 设计器模式: 室内户型设计 / 户外空间设计
export type DesignerMode = 'interior' | 'outdoor';

// ===== 户外空间设计类型 =====

// 地面结构层元素类型: 地面 / 草地 / 河流 / 道路 / 十字路口 / 高架匝道
export type GroundItemType = 'ground' | 'grass' | 'river' | 'road' | 'intersection' | 'ramp';

// 空间设计层对象类型: 玻璃建筑 / 厂房仓库 / 轿车 / 卡车
export type OutdoorObjectType = 'building' | 'warehouse' | 'car' | 'truck';

// 户外元素公共字段
// position: 元素中心点 [x, y, z]; size: [X向长度, 高度/厚度, Z向宽度]
// rotation: 绕 Y 轴旋转角度 (度)
export interface OutdoorItemBase {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: number;
  size: [number, number, number];
  color: string;
}

// 地面结构层元素
export interface GroundItem extends OutdoorItemBase {
  type: GroundItemType;
  branches?: 2 | 3 | 4;   // 路口分支数: 2=T 字岔口(3 路相交), 3=T 字, 4=十字 (默认 4)
  arcRadius?: number;     // 转向圆弧半径 (默认 1.5), 仅 intersection 使用
  lanes?: 2 | 4;          // 车道数: 2=双向 2 车道(默认, 中央单虚线), 4=双向 4 车道(中央双实线+车道虚线), 仅 road 使用
}

// 空间设计层对象 (车辆/建筑)
export interface OutdoorObject extends OutdoorItemBase {
  type: OutdoorObjectType;
}

// 户外场景数据
export interface OutdoorSceneData {
  ground: GroundItem[];
  objects: OutdoorObject[];
}

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
