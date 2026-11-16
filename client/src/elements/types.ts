import type { ComponentType, ReactNode } from 'react';
import type {
  DeviceKind,
  Furniture,
  FurnitureType,
  GroundItem,
  GroundItemType,
  OutdoorObject,
  OutdoorObjectType,
} from '../types';
import type { OutdoorPalette } from '../constants/outdoorStyles';
import type { OutdoorPlanPalette } from './outdoor/planPalette';

/**
 * 元素协议 —— 「一种元素」的完整定义。
 *
 * 元素 = 元数据 + 三类视图:
 *   1. 素材卡图标 (左栏列表, 2D/3D 两种形态) → 由 common/ElementIcon 统一渲染,
 *      元素可提供取景参数覆盖默认;
 *   2. 设计区视图 (2D 符号 + 3D 组件) → 由各渲染出口通过注册表取用;
 *   3. 悬浮面板自定义配置 (Config) → 只放该元素特有的字段,
 *      名称/位置/旋转/尺寸/颜色等通用配置统一在 common/CommonConfig 维护。
 *
 * 约束:
 *   - 纯数据 (meta/templates/presets) 与 JSX 分文件存放,
 *     保证 utils/ 与 store/ 可以只 import 纯数据模块而不拉进组件 (避免循环依赖);
 *   - 每个元素一个目录, 目录名 = 元素 type; index 文件导出元素定义,
 *     分组目录 (furniture/structure/ground/objects) 聚合成注册表。
 */

/* ==================== 公共小类型 ==================== */

/** 素材卡预设 —— 同一种元素在素材库里的多种外观/规格 */
export interface CatalogPreset {
  name: string;
  size: [number, number, number];
  color: string;
  /** 附加字段 (路口分支数/车道数等), 拖入时展开到元素数据上 */
  extra?: Record<string, unknown>;
}

/** 2D 图标取景框 (SVG viewBox 内容坐标, 米) */
export interface IconBox2D {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/* ==================== 家具元素 ==================== */

/** 素材组件把哪个 size 分量当作局部 +X (详见各元素 meta.ts) */
export type FootprintAxis = 'size0' | 'size2';

export interface FurnitureMeta {
  /** 素材名 (素材栏/默认命名用) */
  label: string;
  /** 拖入时的默认尺寸 [x, y, z] */
  defaultSize: [number, number, number];
  defaultColor: string;
  /** 局部 +X 对应的 size 分量 */
  footprintX: FootprintAxis;
  /** 拖入即具备的设备身份 (需要在尺寸上再细分的类型见 utils/device.ts) */
  device?: DeviceKind;
  /** 挂墙/挂顶件: 2D 里不按落地家具画 (空调、窗帘) */
  wallMounted?: boolean;
}

/** 家具自定义配置 (悬浮面板) 的 props —— 通用配置之外的专属字段 */
export interface FurnitureConfigProps {
  data: Furniture;
  update: (patch: Partial<Furniture>) => void;
}

export interface FurnitureElement {
  kind: 'furniture';
  type: FurnitureType;
  /** 纯数据元数据 (与 meta.ts 同源) */
  meta: FurnitureMeta;
  /** 设计区 3D 视图 (场景渲染/素材缩略图/拖拽 ghost 共用) */
  View3D: ComponentType<{ data: Furniture }>;
  /** 设计区 2D 符号 —— 只画「未旋转」图形, 旋转由出口统一施加 */
  Symbol2D: ComponentType<{ furniture: Furniture }>;
  /** 悬浮面板自定义配置; 缺省 = 只有通用配置 */
  Config?: ComponentType<FurnitureConfigProps>;
  /** 2D 命中盒沿局部 -X 的额外外扩 (米), 如床的床头板 */
  hitPadNegX?: number;
  /** 锚点展开图形 (从 (x,z) 向 +X/+Z 生长): 命中与图标取景走元素自己的实现 */
  hitTest?: (f: Furniture, px: number, pz: number, pad: number) => boolean;
  /** 2D 图标取景框覆盖 (缺省 = 占地外扩) */
  iconBox2D?: (f: Furniture) => IconBox2D;
  /** 住宅素材卡预设; 缺省 = 单条 { meta.label, defaultSize, defaultColor } */
  presets?: CatalogPreset[];
  /** 办公模型素材卡预设; 缺省 = 该类型不进办公素材库 */
  officePresets?: CatalogPreset[];
}

/* ==================== 建筑结构元素 ==================== */

/** 结构元素家族: 墙/门/窗/飘窗/落地窗 + 地板 (地板不可拖入, 只有视图和配置) */
export type StructureFamily = 'wall' | 'door' | 'window' | 'bayWindow' | 'frenchWindow' | 'floor';

/** 素材卡模板 —— 建筑结构在素材库里的规格 (纯数据) */
export interface StructureTemplate {
  /** 素材唯一键 (缩略图缓存 / React key) */
  id: string;
  type: Exclude<StructureFamily, 'floor'>;
  name: string;
  /**
   * 尺寸 (米):
   * - wall:        [长度, 高度(仅预览用, 落位取层高), 厚度]
   * - door:        [宽度, 高度, 厚度]
   * - window:      [宽度, 高度, 厚度]
   * - bayWindow:   [宽度, 高度, 凸出深度]
   * - frenchWindow:[宽度, 高度, 厚度]
   */
  size: [number, number, number];
  /** 窗台高度 (仅 window / bayWindow) */
  sill?: number;
  style?: string;
}

/** 悬浮面板自定义配置的通用 props (door/window/floor 各自的 Config 再声明具体字段) */
export interface StructureConfigProps<TItem = unknown> {
  item: TItem;
  /** 把补丁写回场景 (调用方负责 selector 组装) */
  update: (patch: Record<string, unknown>) => void;
}

export interface StructureElement {
  kind: 'structure';
  type: StructureFamily;
  /** 属性面板里的类型名 (墙体/门/窗/…) */
  label: string;
  /** 素材卡模板 (floor 为空数组 = 不出现在素材库) */
  templates: StructureTemplate[];
  /**
   * 批量 3D 组件 —— Building.tsx 直接 import 具体组件 (带完整类型),
   * 这里供按 type 泛化取用的场合 (props 因元素而异, 放宽为 any)。
   */
  Batch3D?: ComponentType<any>;
  /**
   * 设计区 2D 符号 (批量, props 因元素而异, 放宽为 any) ——
   * FloorPlan2D 直接 import 具体组件, 这里记录 2D 出口的归属。
   */
  Symbol2D?: ComponentType<any>;
  /** 单实例 3D 图标内容 (含假数据组装); 外层灯光/相机由 ElementIcon 统一补 */
  icon3D?: (tpl: StructureTemplate) => ReactNode;
  /** 单实例 2D 图标内容 */
  icon2D?: (tpl: StructureTemplate) => ReactNode;
  /** 2D 图标取景框 */
  iconBox2D?: (tpl: StructureTemplate) => IconBox2D;
  /** 3D 图标的竖直居中修正 (窗/飘窗原点带窗台高度, 需整体下移; 缺省 = 高度一半) */
  thumbLiftY?: (tpl: StructureTemplate) => number;
  /** 悬浮面板自定义配置 (门: 开门方向/铰链; 窗: 样式; 地板: 材质/板厚) */
  Config?: ComponentType<any>;
}

/* ==================== 户外元素 ==================== */

/** 户外地面元素 (ground) / 空间对象 (object) 共用协议 */
export interface OutdoorElement<TData extends GroundItem | OutdoorObject> {
  kind: 'ground' | 'object';
  type: TData['type'];
  /** 属性面板/标签用的中文名 */
  label: string;
  /** 素材卡预设 (户外同类型一般只有一种, 路口类有多种) */
  presets: CatalogPreset[];
  /** 设计区 3D 视图 (无外层定位组) */
  View3D: ComponentType<{ data: TData; palette: OutdoorPalette }>;
  /**
   * 设计区 2D 符号 —— 只画「未旋转」图形 (原点在元素中心),
   * 选中高亮由符号自绘 (路口等外扩图形取景才正确)。
   */
  Symbol2D: ComponentType<{ item: TData; C: OutdoorPlanPalette; selected?: boolean }>;
  /** 悬浮面板自定义配置; 缺省 = 只有通用配置 */
  Config?: ComponentType<{ item: TData; update: (patch: Partial<TData>) => void }>;
}

export type AnyGroundElement = OutdoorElement<GroundItem> & { type: GroundItemType };
export type AnyObjectElement = OutdoorElement<OutdoorObject> & { type: OutdoorObjectType };
