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
  /** 单墙厚度 (m)。缺省回落到 sceneData.wallThickness; 内隔墙可用 0.12, 承重外墙 0.2 */
  thickness?: number;
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
  /**
   * 梯段底部标高 (米)。默认 0 = 从本层地面向上爬;
   * 负值 = 下行梯段 (消防楼梯通往下层): 顶阶踏面与本层地板齐平, 梯段穿过楼板洞口向下。
   */
  startHeight?: number;
}

// 楼板洞口 (楼梯井): x/z 为最小角, w/d 为边长 (米)
export interface FloorOpening {
  x: number;
  z: number;
  w: number;
  d: number;
}

// 电梯门数据
export interface ElevatorDoorData {
  id: string;
  position: [number, number, number];
  width: number;
  height: number;
  rotation?: number; // 0=朝南 90=朝东 180=朝北 270=朝西
}

export type FurnitureType = 'cabinet' | 'sofa' | 'table' | 'bed' | 'appliance' | 'decor' | 'chair' | 'shower' | 'sink' | 'toilet' | 'fridge' | 'washer' | 'stove' | 'ac' | 'curtain';

// ===== 智能设备 (设备控制面板 / 未来接 Home Assistant) =====

/** 可控设备类型 — 决定面板里出现哪些控件 */
export type DeviceKind = 'light' | 'ac' | 'curtain' | 'fridge' | 'tv' | 'washer';

export type AcMode = 'cool' | 'heat' | 'fan' | 'dry';
export type FanSpeed = 'auto' | 'low' | 'mid' | 'high';

/**
 * 元素上的设备声明 (静态元数据, 随场景保存)。
 * 运行时状态不在这里 —— 统一放 store.devices, 按元素 id 索引,
 * 这样开关灯不会污染场景撤销栈。
 */
export interface DeviceConfig {
  kind: DeviceKind;
  /** Home Assistant 实体 id (如 light.living_room) — 已预留, 尚未接入 */
  entityId?: string;
}

/** 设备运行时状态 (缺省值由 DeviceKind 决定) */
export interface DeviceState {
  on: boolean;
  /** 灯亮度 0-100 */
  brightness: number;
  /** 色温 2200-6500 K */
  colorTemp: number;
  /** 空调 / 冰箱 目标温度 °C */
  targetTemp: number;
  acMode: AcMode;
  fanSpeed: FanSpeed;
  /** 窗帘开合 0=全关 100=全开 */
  position: number;
}

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
  /** 智能设备声明: 有值即表示可点击调出控制面板 */
  device?: DeviceConfig;
  /** 窗帘朝向: 帘布沿局部 Z 展开 (默认), wall 表示贴墙悬浮 */
  mount?: 'floor' | 'ceiling';
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

// 地面材质 (每种空间的默认材质见 data/floorMaterials.ts)
export type FloorMaterialId =
  | 'wood-oak'
  | 'wood-walnut'
  | 'tile-white'
  | 'tile-gray'
  | 'carpet'
  | 'concrete';

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
  /** 地面材质。未设置时按空间类型自动匹配 (卧室木地板 / 厨卫地砖) */
  floorMaterial?: FloorMaterialId;
  stairs?: StairFlight[];
  elevators?: ElevatorDoorData[];
  /** 楼板洞口 (楼梯井等): 有洞口时地坪改为带孔挤出体, 下行楼梯从中穿过 */
  floorOpenings?: FloorOpening[];
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
  showDimensions?: boolean; // 平面图: 显示总长宽 + 房间长宽标注 (仅 2D 平面图消费)
  wallCutHeight: number;
  lighting: string;
  showLabels?: boolean; // 户外模式: 显示元素名称标签
}

// 模型分类
export type ModelCategory = 'furniture' | 'apartment' | 'campus' | 'office';

// 设计器模式: 室内户型设计 / 户外空间设计
export type DesignerMode = 'interior' | 'outdoor';

// ===== 场景包 (设计器 → 独立运行器的交付格式) =====

/**
 * 场景包里的一台设备。
 *
 * id 必须与运行时渲染用的 id 完全一致:
 *   - 家具设备: Furniture.id
 *   - 吸顶灯:   lamp:<roomId>:<index>
 * 否则运行器里点中的设备和包里的绑定对不上。
 */
export interface ScenePackageDevice {
  id: string;
  kind: DeviceKind;
  name: string;
  roomId: string;
  roomName: string;
  /** Home Assistant 实体 id, 由运行器/宿主消费; 设计器只负责携带 */
  entityId?: string;
}

/** 运行器打开场景时的初始视图状态 */
export interface ScenePackageView {
  mode: ViewMode;
  renderMode: RenderMode;
  styleId: string;
  cutHeight: number;
  showCeiling: boolean;
  showSpaceName: boolean;
  showDoorsOpen: boolean;
  lighting: string;
}

/**
 * 可独立运行的场景包。
 *
 * 这是设计器与运行器之间唯一的契约: 设计器只负责生产, 运行器只负责消费,
 * 两边都可以各自演进, 不必把编辑能力带进运行态。
 */
export interface ScenePackage {
  format: 'space-designer/scene';
  version: 1;
  meta: {
    id: string;
    name: string;
    createdAt: string;
  };
  scene: SceneData;
  devices: ScenePackageDevice[];
  view: ScenePackageView;
}

// ===== 户外空间设计类型 =====

// 地面结构层元素类型: 地面 / 草地 / 河流 / 道路 / 十字路口 / 高架匝道 / 围墙 / 操场
export type GroundItemType = 'ground' | 'grass' | 'river' | 'road' | 'intersection' | 'ramp' | 'fence' | 'playground';

// 空间设计层对象类型: 玻璃建筑 / 厂房仓库 / 教学楼 / 实验楼 / 宿舍楼 / 园区大门 / 门卫室 / 轿车 / 卡车 / 树
export type OutdoorObjectType = 'building' | 'warehouse' | 'teaching-building' | 'lab-building' | 'dormitory' | 'gate' | 'guard-booth' | 'car' | 'truck' | 'tree';

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
