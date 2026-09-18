import type { SceneData, ModelItem } from '../types';

/**
 * 一居室户型场景 (单身公寓)
 * 开放式布局: 卧室+客厅+厨房+卫生间
 * 总尺寸约 6m x 7m
 */
export const oneBedroomScene: SceneData = {
  wallThickness: 0.2,
  ceilingHeight: 2.8,
  floorThickness: 0.15,
  rooms: [
    // 主房间 (开放式客卧+厨房) 6m x 5m
    {
      id: 'main',
      name: '开放式空间',
      nameEn: 'Studio',
      description: '卧室、客厅、厨房一体化开放空间',
      tags: ['一居', '开放式'],
      floorHeight: 0,
      walls: [
        { id: 'w-o1', start: [0, 0], end: [6, 0], height: 2.8, cutout: { start: 1.0, end: 3.5, sill: 0.1, top: 2.4 } }, // 北墙 (落地窗)
        { id: 'w-o2', start: [6, 0], end: [6, 5], height: 2.8, cutout: { start: 0.5, end: 2.5, sill: 0.9, top: 2.2 } }, // 东墙 (窗)
        { id: 'w-o3', start: [6, 5], end: [0, 5], height: 2.8, cutout: { start: 4.5, end: 5.5, sill: 0, top: 2.1 } }, // 南墙 (入户门洞)
        { id: 'w-o4', start: [0, 5], end: [0, 0], height: 2.8 }, // 西墙
      ],
      doors: [
        { id: 'd-o1', position: [0, 0, 5], width: 0.9, height: 2.1, rotation: 180, hingeSide: 'left' }, // 入户门 (南墙)
      ],
      windows: [
        { id: 'win-o1', position: [3, 0, 0], width: 2.5, height: 1.5, sill: 0.9, rotation: 180 }, // 北窗
        { id: 'win-o2', position: [6, 0, 2.5], width: 2.0, height: 1.5, sill: 0.9, rotation: 90 }, // 东窗
      ],
      bayWindows: [],
      frenchWindows: [
        { id: 'fw-o1', position: [2.25, 0, 0], width: 2.5, height: 2.4, rotation: 180 }, // 北墙落地窗
      ],
      furniture: [
        // 卧室区 (左上)
        { id: 'f-o1', name: '双人床', position: [1.2, 0, 1.5], rotation: 90, size: [1.8, 0.45, 2.0], type: 'bed', color: '#e8e0d4' },
        { id: 'f-o2', name: '床头柜', position: [0.4, 0, 0.5], rotation: 0, size: [0.5, 0.5, 0.45], type: 'cabinet', color: '#8b7355' },
        // 客厅区 (右下)
        { id: 'f-o3', name: '沙发', position: [4.5, 0, 4.0], rotation: 180, size: [2.0, 0.85, 0.9], type: 'sofa', color: '#d4c5b0' },
        { id: 'f-o4', name: '茶几', position: [4.5, 0, 2.8], rotation: 0, size: [1.0, 0.45, 0.6], type: 'table', color: '#5c4033' },
        { id: 'f-o5', name: '电视柜', position: [5.7, 0, 2.5], rotation: 270, size: [1.8, 0.4, 0.45], type: 'cabinet', color: '#3d3d3d' },
        // 厨房区 (右上)
        { id: 'f-o6', name: '冰箱', position: [5.5, 0, 0.5], rotation: 270, size: [0.7, 1.8, 0.65], type: 'fridge', color: '#e0e0e0' },
      ],
    },
    // 卫生间 2m x 2m
    {
      id: 'bathroom',
      name: '卫生间',
      nameEn: 'Bathroom',
      description: ' compact 卫生间, 含淋浴、马桶、洗手台',
      tags: ['卫浴'],
      floorHeight: 0,
      walls: [
        { id: 'w-ob1', start: [0, 5], end: [2, 5], height: 2.8 }, // 北墙
        { id: 'w-ob2', start: [2, 5], end: [2, 7], height: 2.8 }, // 东墙
        { id: 'w-ob3', start: [2, 7], end: [0, 7], height: 2.8 }, // 南墙
        { id: 'w-ob4', start: [0, 7], end: [0, 5], height: 2.8 }, // 西墙 (与主房间共享, 有门)
      ],
      doors: [
        { id: 'd-ob1', position: [1, 0, 5], width: 0.8, height: 2.1, rotation: 0, hingeSide: 'left' }, // 北墙门
      ],
      windows: [
        { id: 'win-ob1', position: [2, 0, 6], width: 0.8, height: 0.6, sill: 1.4, rotation: 90 }, // 东墙小窗
      ],
      bayWindows: [],
      frenchWindows: [],
      furniture: [
        { id: 'f-ob1', name: '淋浴', position: [0.6, 0, 5.6], rotation: 0, size: [1.2, 2.0, 1.0], type: 'shower', color: '#a8d0e6', shape: 'rect' },
        { id: 'f-ob2', name: '马桶', position: [1.6, 0, 6.5], rotation: 180, size: [0.4, 0.8, 0.65], type: 'toilet', color: '#fafafa' },
        { id: 'f-ob3', name: '洗手台', position: [0.5, 0, 6.8], rotation: 90, size: [0.7, 0.85, 0.5], type: 'sink', color: '#ffffff' },
      ],
    },
  ],
};

/**
 * 两居室户型场景
 * 两室一厅一卫: 主卧+次卧+客厅+厨房+卫生间
 * 总尺寸约 8m x 8m
 */
export const twoBedroomScene: SceneData = {
  wallThickness: 0.2,
  ceilingHeight: 2.8,
  floorThickness: 0.15,
  rooms: [
    // 客厅 4m x 4m
    {
      id: 'living',
      name: '客厅',
      nameEn: 'Living Room',
      description: '朝南客厅, 连通餐厅和厨房',
      tags: ['两居', '客厅'],
      floorHeight: 0,
      walls: [
        { id: 'w-tl1', start: [2, 2], end: [6, 2], height: 2.8, cutout: { start: 0.5, end: 2.5, sill: 0.9, top: 2.2 } }, // 北墙 (窗, 通厨房)
        { id: 'w-tl2', start: [6, 2], end: [6, 6], height: 2.8, cutout: { start: 1.0, end: 3.0, sill: 0.1, top: 2.4 } }, // 东墙 (落地窗)
        { id: 'w-tl3', start: [6, 6], end: [2, 6], height: 2.8, cutout: { start: 2.5, end: 3.5, sill: 0, top: 2.1 } }, // 南墙 (入户门洞)
        { id: 'w-tl4', start: [2, 6], end: [2, 2], height: 2.8, cutout: { start: 0.5, end: 1.4, sill: 0, top: 2.1 } }, // 西墙 (通主卧门洞)
      ],
      doors: [
        { id: 'd-tl1', position: [6, 0, 6], width: 0.9, height: 2.1, rotation: 180, hingeSide: 'left' }, // 入户门
        { id: 'd-tl2', position: [2, 0, 2.5], width: 0.9, height: 2.1, rotation: 90, hingeSide: 'right' }, // 通主卧
      ],
      windows: [
        { id: 'win-tl1', position: [4, 0, 2], width: 2.0, height: 1.5, sill: 0.9, rotation: 0 }, // 北窗
      ],
      bayWindows: [],
      frenchWindows: [
        { id: 'fw-tl1', position: [6, 0, 4], width: 2.0, height: 2.4, rotation: 90 }, // 东墙落地窗
      ],
      furniture: [
        { id: 'f-tl1', name: '沙发', position: [3, 0, 4.5], rotation: 180, size: [2.4, 0.85, 0.9], type: 'sofa', color: '#d4c5b0' },
        { id: 'f-tl2', name: '茶几', position: [3, 0, 3.5], rotation: 0, size: [1.2, 0.45, 0.7], type: 'table', color: '#5c4033' },
        { id: 'f-tl3', name: '电视柜', position: [2.3, 0, 3.5], rotation: 90, size: [2.0, 0.4, 0.45], type: 'cabinet', color: '#3d3d3d' },
      ],
    },
    // 主卧 4m x 4m
    {
      id: 'master-bed',
      name: '主卧',
      nameEn: 'Master Bedroom',
      description: '朝南主卧, 带飘窗',
      tags: ['两居', '主卧'],
      floorHeight: 0,
      walls: [
        { id: 'w-tmb1', start: [2, 2], end: [2, 6], height: 2.8, cutout: { start: 0.5, end: 1.4, sill: 0, top: 2.1 } }, // 东墙 (通客厅门洞)
        { id: 'w-tmb2', start: [2, 6], end: [0, 6], height: 2.8, cutout: { start: 0.5, end: 2.0, sill: 0.9, top: 2.5 } }, // 南墙 (飘窗)
        { id: 'w-tmb3', start: [0, 6], end: [0, 2], height: 2.8 }, // 西墙
        { id: 'w-tmb4', start: [0, 2], end: [2, 2], height: 2.8 }, // 北墙
      ],
      doors: [],
      windows: [],
      bayWindows: [
        { id: 'bw-tmb1', position: [1, 0.9, 6], width: 1.8, depth: 0.6, height: 1.6, rotation: 0 }, // 南墙飘窗
      ],
      frenchWindows: [],
      furniture: [
        { id: 'f-tmb1', name: '双人床', position: [1, 0, 4], rotation: 90, size: [1.8, 0.45, 2.0], type: 'bed', color: '#e8e0d4' },
        { id: 'f-tmb2', name: '衣柜', position: [0.3, 0, 2.5], rotation: 0, size: [2.0, 2.45, 0.5], type: 'cabinet', color: '#d4c5b0' },
        { id: 'f-tmb3', name: '床头柜', position: [1.7, 0, 2.5], rotation: 0, size: [0.5, 0.5, 0.45], type: 'cabinet', color: '#8b7355' },
      ],
    },
    // 次卧/书房 2m x 3m
    {
      id: 'second-bed',
      name: '次卧',
      nameEn: 'Second Bedroom',
      description: '可作为书房或儿童房',
      tags: ['两居', '次卧'],
      floorHeight: 0,
      walls: [
        { id: 'w-tsb1', start: [6, 0], end: [8, 0], height: 2.8 }, // 北墙
        { id: 'w-tsb2', start: [8, 0], end: [8, 3], height: 2.8 }, // 东墙
        { id: 'w-tsb3', start: [8, 3], end: [6, 3], height: 2.8 }, // 南墙
        { id: 'w-tsb4', start: [6, 3], end: [6, 0], height: 2.8, cutout: { start: 0.5, end: 1.4, sill: 0, top: 2.1 } }, // 西墙 (通厨房门洞)
      ],
      doors: [
        { id: 'd-tsb1', position: [6, 0, 1], width: 0.8, height: 2.1, rotation: 90, hingeSide: 'left' },
      ],
      windows: [
        { id: 'win-tsb1', position: [8, 0, 1.5], width: 1.5, height: 1.5, sill: 0.9, rotation: 90 },
      ],
      bayWindows: [],
      frenchWindows: [],
      furniture: [
        { id: 'f-tsb1', name: '单人床', position: [7.2, 0, 2.3], rotation: 90, size: [1.2, 0.45, 2.0], type: 'bed', color: '#d4c5b0' },
        { id: 'f-tsb2', name: '书桌', position: [6.5, 0, 0.3], rotation: 0, size: [1.2, 0.75, 0.6], type: 'table', color: '#5c4033' },
      ],
    },
    // 厨房 2m x 3m
    {
      id: 'kitchen',
      name: '厨房',
      nameEn: 'Kitchen',
      description: '紧凑厨房, 含冰箱和操作台',
      tags: ['两居', '厨房'],
      floorHeight: 0,
      walls: [
        { id: 'w-tk1', start: [6, 0], end: [8, 0], height: 2.8 }, // 北墙
        { id: 'w-tk2', start: [8, 0], end: [8, 2], height: 2.8 }, // 东墙
        { id: 'w-tk3', start: [8, 2], end: [6, 2], height: 2.8 }, // 南墙
        { id: 'w-tk4', start: [6, 2], end: [6, 0], height: 2.8, cutout: { start: 0.5, end: 1.4, sill: 0, top: 2.1 } }, // 西墙 (通客厅门洞)
      ],
      doors: [
        { id: 'd-tk1', position: [6, 0, 1], width: 0.8, height: 2.1, rotation: 90, hingeSide: 'left' },
      ],
      windows: [
        { id: 'win-tk1', position: [8, 0, 1], width: 1.2, height: 1.5, sill: 0.9, rotation: 90 },
      ],
      bayWindows: [],
      frenchWindows: [],
      furniture: [
        // 北橱柜 (沿北墙)
        { id: 'f-tk-cab', name: '橱柜', position: [7, 0, 0.3], rotation: 270, size: [1.8, 0.9, 0.6], type: 'cabinet', color: '#f5f5f5' },
        // 灶台 (嵌入北橱柜左侧)
        { id: 'f-tk-stove', name: '灶台', position: [6.6, 0.82, 0.3], rotation: 270, size: [0.7, 0.08, 0.5], type: 'stove', color: '#1a1a1a' },
        // 厨房水槽 (嵌入北橱柜右侧)
        { id: 'f-tk-sink', name: '厨房水槽', position: [7.5, 0.9, 0.3], rotation: 270, size: [0.5, 0.9, 0.5], type: 'sink', color: '#ffffff', embedded: true },
        // 冰箱 (靠东墙)
        { id: 'f-tk1', name: '冰箱', position: [7.6, 0, 1.5], rotation: 270, size: [0.7, 1.8, 0.65], type: 'fridge', color: '#e0e0e0' },
      ],
    },
    // 卫生间 2m x 2m
    {
      id: 'bathroom-t',
      name: '卫生间',
      nameEn: 'Bathroom',
      description: '紧凑卫生间, 含淋浴、马桶、洗手台',
      tags: ['两居', '卫浴'],
      floorHeight: 0,
      walls: [
        { id: 'w-tbt1', start: [0, 2], end: [2, 2], height: 2.8 }, // 北墙 (通客厅)
        { id: 'w-tbt2', start: [2, 2], end: [2, 0], height: 2.8 }, // 东墙
        { id: 'w-tbt3', start: [2, 0], end: [0, 0], height: 2.8 }, // 南墙
        { id: 'w-tbt4', start: [0, 0], end: [0, 2], height: 2.8 }, // 西墙
      ],
      doors: [
        { id: 'd-tbt1', position: [1, 0, 2], width: 0.7, height: 2.1, rotation: 0, hingeSide: 'right' },
      ],
      windows: [],
      bayWindows: [],
      frenchWindows: [],
      furniture: [
        { id: 'f-tbt1', name: '淋浴', position: [0.6, 0, 0.6], rotation: 0, size: [1.0, 2.0, 1.0], type: 'shower', color: '#a8d0e6', shape: 'rect' },
        { id: 'f-tbt2', name: '马桶', position: [1.7, 0, 1.6], rotation: 180, size: [0.4, 0.8, 0.65], type: 'toilet', color: '#fafafa' },
        { id: 'f-tbt3', name: '洗手台', position: [0.5, 0, 1.8], rotation: 90, size: [0.7, 0.85, 0.5], type: 'sink', color: '#ffffff' },
      ],
    },
  ],
};

/**
 * 参考户型图复刻 v3
 * 中列加宽 (3.5m): 厨房 → 餐厅 → 客厅 连贯开放
 * 右列保持 (2.5m): 卫生间A | 玄关(入户门) | 卧室B
 * 玄关与卫生间A之间有实心墙 + 门
 */
export const mockSceneData: SceneData = {
  wallThickness: 0.2,
  ceilingHeight: 2.8,
  floorThickness: 0.15,
  rooms: [
    // ===== 卧室A (左上) x:0~3.5, z:0~4.0 =====
    {
      id: 'bedroom-a',
      name: '卧室A',
      nameEn: 'Bedroom A',
      description: '与上方衣帽间连通；左下圆形边几和窗帘带按轮廓折线细分。',
      tags: ['活动', '衣帽间'],
      floorHeight: 0,
      walls: [
        { id: 'w-ba1', start: [0, 0], end: [3.5, 0], height: 2.8, cutout: { start: 0.55, end: 2.95, sill: 0.9, top: 2.5 } }, // 北墙(有飘窗洞口)
        { id: 'w-ba2', start: [3.5, 0], end: [3.5, 4.3], height: 2.8 }, // 东墙(与餐厅共享, 有门)
        { id: 'w-ba3', start: [3.5, 4.3], end: [0, 4.3], height: 2.8 }, // 南墙
        { id: 'w-ba4', start: [0, 4.3], end: [0, 0], height: 2.8 }, // 西墙
      ],
      doors: [{ id: 'd-ba1', position: [3.5, 0, 3.5], width: 0.9, height: 2.1, rotation: 90 }],
      windows: [],
      // 北墙飘窗 (向北凸出)
      bayWindows: [
        { id: 'bw-ba1', position: [1.75, 0.9, -0.1], width: 2.4, depth: 0.6, height: 1.6, rotation: 180 },
      ],
      furniture: [
        { id: 'f-ba1', name: '双人床', position: [1.05, 0, 1.9], rotation: 90, size: [1.8, 0.45, 2.0], type: 'bed', color: '#e8e0d4' },
        { id: 'f-ba2', name: '衣柜', position: [1.15, 0, 3.9], rotation: 90, size: [2.0, 2.45, 0.5], type: 'cabinet', color: '#d4c5b0' },
        { id: 'f-ba4', name: '床头柜', position: [0.35, 0, 0.6], rotation: 0, size: [0.5, 0.5, 0.45], type: 'cabinet', color: '#8b7355' },
      ],
    },

    // ===== 卫生间B (左下上部) x:0~1.7, z:4.8~6.2 =====
    {
      id: 'bathroom-b',
      name: '卫生间B',
      nameEn: 'Bathroom B',
      description: '四分之一圆淋浴间贴西北墙角；马桶与洗手台沿东墙排布。',
      tags: ['卫浴', '淋浴'],
      floorHeight: 0,
      walls: [
        { id: 'w-bb1', start: [-1.0, 4.3], end: [1.7, 4.3], height: 2.8 }, // 北墙
        { id: 'w-bb2', start: [1.7, 4.3], end: [1.7, 6.2], height: 2.8 }, // 东墙(与卧室C共享, 有门)
        { id: 'w-bb3', start: [1.7, 6.2], end: [-1.0, 6.2], height: 2.8 }, // 南墙
        { id: 'w-bb4', start: [-1.0, 6.2], end: [-1.0, 4.3], height: 2.8 }, // 西墙
      ],
      doors: [{ id: 'd-bb1', position: [1.7, 0, 5.5], width: 0.7, height: 2.1, rotation: 90 }],
      // 西墙(x=-1.0)马桶正上方的小推拉窗, 窗底1.5m, 尺寸0.6x0.6m
      windows: [{ id: 'win-bb1', position: [-1.0, 1.5, 5.8], width: 0.4, height: 0.7, rotation: 90, style: 'sliding' }],
      furniture: [
        // 淋浴间: 左上角, 贴北墙(z=4.3)+西墙(x=-1.0), 四分之一圆, 半径1.2m
        { id: 'f-bb3', name: '淋浴间', position: [-1.0, 0, 4.3], rotation: 0, size: [1.2, 2.0, 0], type: 'shower', shape: 'quarter', color: '#a8d0e6' },
        // 马桶: 左下角, 贴西墙(x=-1.0)+南墙(z=6.2), 正面朝北 (rotation 180)
        { id: 'f-bb1', name: '马桶', position: [-0.6, 0, 5.8], rotation: 90, size: [0.4, 0.8, 0.65], type: 'toilet', color: '#fafafa' },
        // 洗手台: 右上角, 贴北墙(z=4.3)+东墙(x=1.7)
        { id: 'f-bb2', name: '洗手台', position: [1.15, 0, 4.7], rotation: 90, size: [0.7, 0.85, 0.5], type: 'sink', color: '#ffffff' },
      ],
    },

    // ===== 卧室C (左下) x:-1.0~3.5, z:4.3~10.6 =====
    {
      id: 'bedroom-c',
      name: '卧室C',
      nameEn: 'Bedroom C',
      description: '南侧通长飘窗引入自然采光；双人床靠西墙布置。',
      tags: ['活动', '飘窗'],
      floorHeight: 0,
      walls: [
        { id: 'w-bc1', start: [-1.0, 4.3], end: [3.5, 4.3], height: 2.8 }, // 北墙
        { id: 'w-bc2', start: [3.5, 4.3], end: [3.5, 10.6], height: 2.8 }, // 东墙(与客厅共享, 有门)
        { id: 'w-bc3', start: [3.5, 10.6], end: [-1.0, 10.6], height: 2.8, cutout: { start: 0.6, end: 3.4, sill: 0.9, top: 2.5 } }, // 南墙(有飘窗洞口)
        { id: 'w-bc4', start: [-1.0, 10.6], end: [-1.0, 4.3], height: 2.8 }, // 西墙(有窗)
      ],
      doors: [
        { id: 'd-bc2', position: [3.5, 0, 6.0], width: 0.9, height: 2.1, rotation: 90 },
      ],
      windows: [],
      // 南墙飘窗 (向南凸出)
      bayWindows: [
        { id: 'bw-bc1', position: [1.5, 0.9, 10.7], width: 2.8, depth: 0.6, height: 1.6, rotation: 0 },
      ],
      furniture: [
        { id: 'f-bc1', name: '双人床', position: [0.05, 0, 8.75], rotation: 90, size: [1.8, 0.45, 2.0], type: 'bed', color: '#d4c5b0' },
        { id: 'f-bc2', name: '衣柜', position: [0.25, 0, 6.7], rotation: -90, size: [2.2, 2.45, 0.7], type: 'cabinet', color: '#8b7355' },
        { id: 'f-bc3', name: '床头柜', position: [-0.65, 0, 7.5], rotation: 0, size: [0.5, 0.5, 0.45], type: 'cabinet', color: '#5c4033' },
        { id: 'f-bc4', name: '床头柜', position: [-0.65, 0, 10.0], rotation: 0, size: [0.5, 0.5, 0.45], type: 'cabinet', color: '#5c4033' },
      ],
    },

    // ===== 厨房 (中上, 加宽中列) x:3.5~7.0, z:0~2.6 =====
    // 深度缩短至2.6m, U型橱柜: 北(满宽) + 西(2.0m贴南墙) + 东(1.25m) + 冰箱(0.75m)
    {
      id: 'kitchen',
      nameEn: 'Kitchen',
      description: 'U 型橱柜沿北、西、东墙布置；南侧开放连通餐厅。',
      tags: ['烹饪', '开放'],
      name: '厨房',
      floorHeight: 0,
      walls: [
        { id: 'w-k1', start: [3.5, 0], end: [7.0, 0], height: 2.8 }, // 北墙(有窗)
        { id: 'w-k2', start: [7.0, 0], end: [7.0, 2.6], height: 2.8 }, // 东墙
        // 南墙: 右实心 + 中开放 + 左实心
        { id: 'w-k3a', start: [7.0, 2.6], end: [6.0, 2.6], height: 2.8 }, // 南墙(右段, 实心)
        { id: 'w-k3b', start: [6.0, 2.6], end: [4.3, 2.6], height: 2.8, opening: true }, // 南墙(中段, 开放连通餐厅)
        { id: 'w-k3c', start: [4.3, 2.6], end: [3.5, 2.6], height: 2.8 }, // 南墙(左段, 实心)
        { id: 'w-k4', start: [3.5, 2.6], end: [3.5, 0], height: 2.8 }, // 西墙
      ],
      doors: [],
      windows: [{ id: 'win-k1', position: [5.25, 0.9, 0], width: 2.2, height: 1.4, style: 'sliding' }],
      furniture: [
        // 北橱柜: 满3.5m宽, 紧贴东西墙
        { id: 'f-k1', name: '北橱柜', position: [5.25, 0, 0.3], rotation: 270, size: [3.5, 0.9, 0.6], type: 'cabinet', color: '#f5f5f5' },
        // 灶台 (嵌入北橱柜, 灶面与台面齐平 y=0.9)
        { id: 'f-k-stove', name: '灶台', position: [4.5, 0.82, 0.3], rotation: 270, size: [0.8, 0.08, 0.5], type: 'stove', color: '#1a1a1a' },
        // 西橱柜: 2.0m, z:0.6~2.6 紧贴南墙
        { id: 'f-k3', name: '西橱柜', position: [3.8, 0, 1.6], rotation: 0, size: [2.0, 0.9, 0.6], type: 'cabinet', color: '#f5f5f5' },
        // 厨房洗手池 (嵌入西橱柜, 盆沿与台面齐平 y=0.9)
        { id: 'f-k-sink', name: '厨房水槽', position: [3.85, 0.9, 1.2], rotation: 180, size: [0.5, 0.9, 0.5], type: 'sink', color: '#ffffff', embedded: true },
        // 东橱柜: 1.25m, z:0.6~1.85
        { id: 'f-k2', name: '东橱柜', position: [6.7, 0, 1.225], rotation: 180, size: [1.25, 0.9, 0.6], type: 'cabinet', color: '#f5f5f5' },
        // 冰箱: 0.75m, z:1.85~2.6 紧贴南墙; 东橱柜1.25+冰箱0.75=西橱柜2.0
        { id: 'f-k4', name: '冰箱', position: [6.675, 0, 2.225], rotation: 180, size: [0.75, 1.85, 0.65], type: 'fridge', color: '#e0e0e0' },
      ],
    },

    // ===== 卫生间A (右上) x:7.0~9.5, z:0~3.0 =====
    {
      id: 'bathroom-a',
      name: '卫生间A',
      nameEn: 'Bathroom A',
      description: '长方形淋浴间占满北侧；马桶与洗手台贴东墙。',
      tags: ['卫浴', '淋浴'],
      floorHeight: 0,
      walls: [
        { id: 'w-ba1', start: [7.0, 0], end: [9.5, 0], height: 2.8 }, // 北墙(有窗)
        { id: 'w-ba2', start: [9.5, 0], end: [9.5, 3.0], height: 2.8 }, // 东墙
        { id: 'w-ba3', start: [9.5, 3.0], end: [7.0, 3.0], height: 2.8 }, // 南墙(与玄关共享, 有门)
        { id: 'w-ba4', start: [7.0, 3.0], end: [7.0, 0], height: 2.8 }, // 西墙
      ],
      // 通往玄关的门 (南墙, 与玄关共享, 向内开)
      doors: [{ id: 'd-e-ba', position: [8.25, 0, 3.0], width: 0.75, height: 2.1 }],
      windows: [{ id: 'win-ba1', position: [8.25, 1.0, 0], width: 1.2, height: 1.0 }],
      furniture: [
        // 淋浴间: 长方形, 占满卫生间横向全宽 (x:7.0~9.5), 靠北墙, 长边为玻璃
        { id: 'f-ba3', name: '淋浴间', position: [7.0, 0, 0], rotation: 0, size: [2.5, 1.8, 1.0], type: 'shower', shape: 'rect', color: '#a8d0e6' },
        // 马桶: 紧贴东墙 (x=9.5), 水箱靠东墙, 正面朝西 (rotation 270)
        { id: 'f-ba5', name: '马桶', position: [9.05, 0, 1.6], rotation: 270, size: [0.45, 0.8, 0.7], type: 'toilet', color: '#fafafa' },
        // 洗手台: 紧贴东墙 (x=9.5), 马桶南侧
        { id: 'f-ba6', name: '洗手台', position: [9.05, 0, 2.4], rotation: 0, size: [0.75, 0.85, 0.5], type: 'sink', color: '#ffffff' },
      ],
    },

    // ===== 玄关 (右中, 独立房间) x:7.0~9.5, z:2.2~6.5 =====
    // 卧室B北墙下移后玄关扩大, 西墙下半部开放连通客厅
    {
      id: 'entry',
      name: '玄关',
      nameEn: 'Entry',
      description: '入户玄关；鞋柜贴西墙，西侧开放连通客厅。',
      tags: ['玄关', '过渡'],
      floorHeight: 0,
      walls: [
        { id: 'w-e1', start: [7.0, 3.0], end: [9.5, 3.0], height: 2.8 }, // 北墙(与卫生间A共享, 有门)
        { id: 'w-e2', start: [9.5, 3.0], end: [9.5, 6.5], height: 2.8 }, // 东墙(有入户门)
        { id: 'w-e3', start: [9.5, 6.5], end: [7.0, 6.5], height: 2.8 }, // 南墙(与卧室B共享, 有门)
        // 西墙: 完全开放连通客厅 (无上段实心)
        { id: 'w-e4b', start: [7.0, 3.0], end: [7.0, 6.5], height: 2.8, opening: true }, // 西墙(开放连通客厅)
      ],
      doors: [
        // 入户门 (右侧外墙)
        { id: 'd-entry', position: [9.5, 0, 4.0], width: 0.9, height: 2.1, rotation: 90 },
      ],
      windows: [],
      furniture: [
        { id: 'f-e1', name: '鞋柜', position: [7.35, 0, 4.3], rotation: 0, size: [1.0, 0.9, 0.35], type: 'cabinet', color: '#8b7355' },
      ],
    },

    // ===== 餐厅 (中, 加宽中列) x:3.5~7.0, z:2.6~5.5 =====
    {
      id: 'dining',
      name: '餐厅',
      nameEn: 'Dining',
      description: '餐桌居中，四椅围合；南北两侧分别开放连通厨房与客厅。',
      tags: ['用餐', '开放'],
      floorHeight: 0,
      walls: [
        // 北墙: 与厨房南墙对称
        { id: 'w-d1a', start: [3.5, 2.6], end: [4.3, 2.6], height: 2.8 }, // 北墙(左段, 实心)
        { id: 'w-d1b', start: [4.3, 2.6], end: [6.0, 2.6], height: 2.8, opening: true }, // 北墙(中段, 开放连通厨房)
        { id: 'w-d1c', start: [6.0, 2.6], end: [7.0, 2.6], height: 2.8 }, // 北墙(右段, 实心)
        { id: 'w-d1', start: [7.0, 2.6], end: [7.0, 5.1], height: 2.8 }, // 东墙(与玄关共享)
        { id: 'w-d2', start: [7.0, 5.1], end: [7.0, 5.5], height: 2.8, opening: true }, // 东墙(与玄关共享, 开放通道)
        { id: 'w-d3', start: [7.0, 5.5], end: [3.5, 5.5], height: 2.8, opening: true }, // 南墙(开放连通客厅)
        { id: 'w-d4', start: [3.5, 5.5], end: [3.5, 2.6], height: 2.8 }, // 西墙(与卧室A共享, 有门)
      ],
      doors: [],
      windows: [],
      furniture: [
        { id: 'f-d1', name: '餐桌', position: [6.0, 0, 4.05], rotation: 90, size: [1.8, 0.75, 0.95], type: 'table', color: '#5c4033' },
        { id: 'f-d2', name: '餐椅1', position: [5.5, 0, 3.2], rotation: 0, size: [0.5, 0.9, 0.5], type: 'chair', color: '#8b7355' },
        { id: 'f-d3', name: '餐椅2', position: [6.5, 0, 3.2], rotation: 0, size: [0.5, 0.9, 0.5], type: 'chair', color: '#8b7355' },
        { id: 'f-d4', name: '餐椅3', position: [5.5, 0, 4.9], rotation: 180, size: [0.5, 0.9, 0.5], type: 'chair', color: '#8b7355' },
        { id: 'f-d5', name: '餐椅4', position: [6.5, 0, 4.9], rotation: 180, size: [0.5, 0.9, 0.5], type: 'chair', color: '#8b7355' },
      ],
    },

    // ===== 客厅 (中下方, 加宽中列) x:3.5~7.0, z:5.5~10.6 =====
    {
      id: 'living',
      name: '客厅',
      nameEn: 'Living Room',
      description: '三人沙发 + 单人沙发围合茶几；南墙落地窗面向阳台。',
      tags: ['起居', '阳台'],
      floorHeight: 0,
      walls: [
        { id: 'w-l1', start: [3.5, 5.5], end: [7.0, 5.5], height: 2.8, opening: true }, // 北墙(开放连通餐厅)
        // 东墙: 上段(面向玄关)完全开放, 下段(面向卧室B)实心
        { id: 'w-l2a', start: [7.0, 2.2], end: [7.0, 6.5], height: 2.8, opening: true }, // 东墙(开放连通玄关)
        { id: 'w-l2b', start: [7.0, 6.5], end: [7.0, 10.6], height: 2.8 }, // 东墙(下段, 实心面向卧室B)
        { id: 'w-l3', start: [7.0, 10.6], end: [3.5, 10.6], height: 2.8, opening: true }, // 南墙(落地窗隔断阳台)
        { id: 'w-l4', start: [3.5, 10.6], end: [3.5, 5.5], height: 2.8 }, // 西墙(与卧室C共享, 有门)
      ],
      doors: [],
      windows: [],
      // 南墙落地窗 (连通阳台)
      frenchWindows: [
        { id: 'fw-l1', position: [5.25, 0, 10.6], width: 3.5, height: 2.6, rotation: 0 },
      ],
      furniture: [
        { id: 'f-l1', name: '三人沙发', position: [4.05, 0, 9.0], rotation: 0, size: [2.8, 0.9, 0.9], type: 'sofa', color: '#d4c5b0' },
        { id: 'f-l2', name: '单人沙发', position: [5.25, 0, 8.0], rotation: -90, size: [0.9, 0.85, 0.8], type: 'sofa', color: '#c8b8a0' },
        { id: 'f-l3', name: '茶几', position: [5.25, 0, 9.3], rotation: 0, size: [1.3, 0.45, 0.75], type: 'table', color: '#5c4033' },
        { id: 'f-l4', name: '电视柜', position: [6.575, 0, 9.1], rotation: 0, size: [2.2, 0.4, 0.45], type: 'cabinet', color: '#3d3d3d' },
        { id: 'f-l5', name: '电视', position: [6.575, 1.1, 9.05], rotation: 0, size: [1.4, 0.85, 0.05], type: 'appliance', color: '#1a1a1a' },
        { id: 'f-l6', name: '落地灯', position: [4.05, 0, 7.0], rotation: 0, size: [0.4, 1.6, 0.4], type: 'decor', color: '#e8e0d4' },
      ],
    },

    // ===== 卧室B (右下独立套间) x:7.0~9.5, z:6.5~10.6 =====
    // 北墙下移, 玄关扩大, 卧室B缩小
    {
      id: 'bedroom-b',
      name: '卧室B',
      nameEn: 'Bedroom B',
      description: '南侧飘窗；双人床靠东墙，书桌靠西墙布置。',
      tags: ['活动', '书房'],
      floorHeight: 0,
      walls: [
        { id: 'w-bb1', start: [7.0, 6.5], end: [10.5, 6.5], height: 2.8 }, // 北墙(与玄关共享, 有门)
        { id: 'w-bb2', start: [10.5, 6.5], end: [10.5, 10.6], height: 2.8 }, // 东墙
        { id: 'w-bb3', start: [10.5, 10.6], end: [7.0, 10.6], height: 2.8, cutout: { start: 0.55, end: 2.55, sill: 0.9, top: 2.5 } }, // 南墙(有飘窗洞口)
        // 西墙: 上段(面向客厅)实心, 下段(面向玄关)已由玄关开放
        { id: 'w-bb4a', start: [7.0, 6.5], end: [7.0, 10.6], height: 2.8 }, // 西墙(与客厅共享)
      ],
      // 通往玄关的门 (北墙, 与玄关共享, 向卧室B内侧开启)
      doors: [{ id: 'd-e-bb', position: [7.85, 0, 6.5], width: 0.9, height: 2.1, openInward: true }],
      windows: [],
      // 南墙飘窗 (向南凸出)
      bayWindows: [
        { id: 'bw-bb1', position: [8.95, 0.9, 10.7], width: 2.0, depth: 0.6, height: 1.6, rotation: 0 },
      ],
      furniture: [
        { id: 'f-bb5', name: '双人床', position: [9.4, 0, 8.5], rotation: 270, size: [1.8, 0.45, 2.0], type: 'bed', color: '#e8e0d4' },
        { id: 'f-bb6', name: '衣柜', position: [9.35, 0, 6.9], rotation: -90, size: [2.0, 2.45, 0.5], type: 'cabinet', color: '#d4c5b0' },
        { id: 'f-bb7', name: '床头柜', position: [10.05, 0, 9.8], rotation: 180, size: [0.5, 0.5, 0.45], type: 'cabinet', color: '#8b7355' },
        { id: 'f-bb4', name: '书桌', position: [7.45, 0, 9.5], rotation: 90, size: [0.6, 0.75, 1.2], type: 'table', color: '#a0826d' },
      ],
    },

    // ===== 阳台 (客厅外凸) x:3.5~7.0, z:10.6~12.2 =====
    {
      id: 'balcony',
      name: '阳台',
      nameEn: 'Balcony',
      description: '客厅外凸阳台；洗衣机与洗手池贴北墙，休闲椅朝南。',
      tags: ['休闲', '晾晒'],
      floorHeight: 0,
      walls: [
        { id: 'w-bal1', start: [3.5, 10.6], end: [7.0, 10.6], height: 2.8, opening: true }, // 北墙(开放连通客厅)
        { id: 'w-bal2', start: [7.0, 10.6], end: [7.0, 12.2], height: 2.8 }, // 东墙
        { id: 'w-bal3', start: [7.0, 12.2], end: [3.5, 12.2], height: 2.8 }, // 南墙
        { id: 'w-bal4', start: [3.5, 12.2], end: [3.5, 10.6], height: 2.8 }, // 西墙
      ],
      doors: [],
      windows: [],
      furniture: [
        { id: 'f-bal1', name: '洗衣机', position: [3.9, 0, 11.0], rotation: 0, size: [0.6, 0.85, 0.6], type: 'washer', color: '#f0f0f0' },
        { id: 'f-bal2', name: '洗手池', position: [3.9, 0, 11.8], rotation: 180, size: [0.6, 0.85, 0.55], type: 'sink', color: '#ffffff' },
        { id: 'f-bal3', name: '休闲椅', position: [6.3, 0, 11.3], rotation: 0, size: [0.7, 0.8, 0.7], type: 'chair', color: '#a0a0a0' },
      ],
    },
  ],
};

/**
 * 现代三居室户型场景
 * 参考平面图: 主卧+次卧一+次卧二+衣帽间+卫生间+厨房+餐厅+客厅+玄关+储藏间
 * 总尺寸 12m x 10m, 开放客餐厅, 主卧带衣帽间
 */
export const modernApartmentScene: SceneData = {
  wallThickness: 0.2,
  ceilingHeight: 2.8,
  floorThickness: 0.15,
  rooms: [
    // ===== 次卧一 (左上) x:0~3.5, z:0~3 =====
    {
      id: 'bedroom-b1',
      name: '次卧一',
      nameEn: 'Bedroom 1',
      description: '北向次卧, 带北窗, 通往衣帽间。',
      tags: ['三居', '次卧'],
      floorHeight: 0,
      walls: [
        { id: 'w-b1n', start: [1, -1], end: [5, -1], height: 2.8, cutout: { start: 1.0, end: 2.5, sill: 0.9, top: 2.2 } }, // 北墙 (窗)
        { id: 'w-b1w', start: [1, -1], end: [1, 3], height: 2.8 }, // 西墙
        { id: 'w-b1s', start: [3.5, 4], end: [5, 4], height: 2.8, cutout: { start: 1.3, end: 2.2, sill: 0, top: 2.1 } }, // 南墙 (门通往衣帽间)
        { id: 'w-b1e', start: [5, -1], end: [5, 4], height: 2.8 }, // 东墙
      ],
      doors: [
        { id: 'd-b1', position: [4.25, 0, 4.0], width: 0.9, height: 2.1, rotation: 0, hingeSide: 'left' },
      ],
      windows: [
        { id: 'win-b1', position: [2.75, 0.9, -1], width: 1.5, height: 1.3, sill: 0.9, rotation: 180 },
      ],
      bayWindows: [],
      frenchWindows: [],
      furniture: [
        { id: 'f-b1-bed', name: '单人床', position: [2, 0, 0.7], rotation: 90, size: [1.8, 0.45, 2.0], type: 'bed', color: '#e8e0d4' },
        { id: 'f-b1-ns1', name: '床头柜', position: [1.4, 0, -0.5], rotation: 0, size: [0.5, 0.5, 0.45], type: 'cabinet', color: '#8b7355' },
        { id: 'f-b1-ns2', name: '床头柜', position: [1.4, 0, 1.95], rotation: 0, size: [0.5, 0.5, 0.45], type: 'cabinet', color: '#8b7355' },
        { id: 'f-b1-r', name: '衣柜', position: [2.2, 0, 2.55], rotation: 90, size: [2.0, 2.4, 0.6], type: 'cabinet', color: '#d4c5b0' },
      ],
    },

    // ===== 卫生间 (上中) x:3.5~5, z:0~2.5 =====
    {
      id: 'bathroom',
      name: '公共卫生间',
      nameEn: 'Bathroom',
      description: '公卫, 含淋浴、马桶、洗手台。',
      tags: ['三居', '卫浴'],
      floorHeight: 0,
      walls: [
        { id: 'w-btn', start: [5, 0.3], end: [7, 0.3], height: 2.8 }, // 北墙
        { id: 'w-btw', start: [5, 0], end: [5, 4], height: 2.8 }, // 西墙
        { id: 'w-bts', start: [6.3, 4.3], end: [7, 4.3], height: 2.8 }, // 南墙 (门)
        { id: 'w-bte', start: [7, 0.5], end: [7, 4.3], height: 2.8 }, // 东墙
      ],
      doors: [
        { id: 'd-bt', position: [5.7, 0, 2.5], width: 0.8, height: 2.1, rotation: 0, hingeSide: 'left', style: 'glass' },
      ],
      windows: [],
      bayWindows: [],
      frenchWindows: [],
      furniture: [
        { id: 'f-bt-shower', name: '淋浴', position: [5, 0, 0.4], rotation: 0, size: [1.95, 1.8, 0.9], type: 'shower', color: '#a8d0e6', shape: 'rect' },
        { id: 'f-bt-toilet', name: '马桶', position: [6.6, 0, 1.9], rotation: 270, size: [0.4, 0.8, 0.65], type: 'toilet', color: '#fafafa' },
        { id: 'f-bt-sink', name: '洗手台', position: [6.7, 0, 3.8], rotation: 0, size: [1.05, 0.85, 0.45], type: 'sink', color: '#ffffff' },
      ],
    },

    // ===== 厨房 (上中右) x:5~7.5, z:0~2.5 =====
    {
      id: 'kitchen',
      name: '厨房',
      nameEn: 'Kitchen',
      description: 'U 型橱柜, 含灶台与水槽, 通往餐厅。',
      tags: ['三居', '厨房'],
      floorHeight: 0,
      walls: [
        { id: 'w-kn', start: [7, 0.8], end: [9.5, 0.8], height: 2.8, cutout: { start: 0.6, end: 1.8, sill: 0.9, top: 2.2 } }, // 北墙 (窗)
        { id: 'w-kw', start: [7, 0.8], end: [7, 4.3], height: 2.8 }, // 西墙
        { id: 'w-ks', start: [7, 4.3], end: [9.5, 4.3], height: 2.8 }, // 南墙 (门通往餐厅)
        { id: 'w-ke', start: [9.6, 0.8], end: [9.6, 1.8], height: 2.8 }, // 东墙
        { id: 'w-ke', start: [9.6, 1.8], end: [9.6, 3.3], height: 2.8, opening: true }, // 东墙
        { id: 'w-ke', start: [9.6, 3.8], end: [9.6, 4.3], height: 2.8 }, // 东墙
      ],
      doors: [
      ],
      windows: [
        { id: 'win-k', position: [8.3, 0.9, 0.8], width: 1.2, height: 1.3, sill: 0.9, rotation: 180 },
      ],
      bayWindows: [],
      frenchWindows: [],
      furniture: [
        // 北橱柜
        { id: 'f-k-ncab', name: '北橱柜', position: [8.25, 0, 1.3], rotation: 270, size: [2.5, 0.9, 0.6], type: 'cabinet', color: '#f5f5f5' },
        // 灶台 (嵌入北橱柜)
        { id: 'f-k-stove', name: '灶台', position: [7.4, 0.82, 2.5], rotation: 0, size: [1.2, 0.08, 0.5], type: 'stove', color: '#1a1a1a' },
        // 水槽 (嵌入北橱柜)
        { id: 'f-k-sink', name: '厨房水槽', position: [8.8, 0.9, 1.3], rotation: 90, size: [0.5, 0.9, 0.5], type: 'sink', color: '#ffffff', embedded: true },
        // 西橱柜
        { id: 'f-k-wcab', name: '西橱柜', position: [7.4, 0, 2.6], rotation: 0, size: [2.0, 0.9, 0.6], type: 'cabinet', color: '#f5f5f5' },
        // 南橱柜
        { id: 'f-k-scab', name: '南橱柜', position: [7.9, 0, 3.9], rotation: 90, size: [1.65, 0.9, 0.6], type: 'cabinet', color: '#f5f5f5' },
        // 冰箱 (贴东墙)
        { id: 'f-k-fridge', name: '冰箱', position: [9.1, 0, 3.9], rotation: 90, size: [0.7, 1.85, 0.65], type: 'fridge', color: '#e0e0e0' },
      ],
    },

    // ===== 餐厅 (上右中) x:9.5~12.5, z:0~3.5 (东移2m) =====
    {
      id: 'dining',
      name: '餐厅',
      nameEn: 'Dining',
      description: '连接厨房与客厅, 南侧开放连通客厅。',
      tags: ['三居', '餐厅'],
      floorHeight: 0,
      walls: [
        { id: 'w-dn', start: [9.7, 0.8], end: [12.5, 0.8], height: 2.8 }, // 北墙
        { id: 'w-dw', start: [10.3, 0.8], end: [10.3, 4.25], height: 2.8, opening: true }, // 西墙
        { id: 'w-ds', start: [9.5, 3.5], end: [11.5, 3.5], height: 2.8, opening: true }, // 南墙 (开放连通客厅)
        { id: 'w-de', start: [13, 0.8], end: [13, 3.5], height: 2.8, opening: true }, // 东墙
      ],
      doors: [],
      windows: [],
      bayWindows: [],
      frenchWindows: [],
      furniture: [
        { id: 'f-d-table', name: '餐桌', position: [11.5, 0, 2.5], rotation: 0, size: [2.7, 0.75, 0.9], type: 'table', color: '#5c4033' },
        { id: 'f-d-c1', name: '餐椅', position: [10.5, 0, 1.6], rotation: 90, size: [0.5, 0.9, 0.5], type: 'chair', color: '#8b7355' },
        { id: 'f-d-c2', name: '餐椅', position: [10.5, 0, 2.5], rotation: 90, size: [0.5, 0.9, 0.5], type: 'chair', color: '#8b7355' },
        { id: 'f-d-c3', name: '餐椅', position: [10.5, 0, 3.4], rotation: 90, size: [0.5, 0.9, 0.5], type: 'chair', color: '#8b7355' },
        { id: 'f-d-c4', name: '餐椅', position: [12.5, 0, 1.6], rotation: -90, size: [0.5, 0.9, 0.5], type: 'chair', color: '#8b7355' },
        { id: 'f-d-c5', name: '餐椅', position: [12.5, 0, 2.5], rotation: -90, size: [0.5, 0.9, 0.5], type: 'chair', color: '#8b7355' },
        { id: 'f-d-c6', name: '餐椅', position: [12.5, 0, 3.4], rotation: -90, size: [0.5, 0.9, 0.5], type: 'chair', color: '#8b7355' },
      ],
    },

    // ===== 电梯间 (玄关北面) x:12.5~15.5, z:-2.5~0 (东移2m) =====
    {
      id: 'elevator-lobby',
      name: '电梯间',
      nameEn: 'Elevator Lobby',
      description: '电梯厅, 南侧入户门通往玄关。',
      tags: ['三居', '公共'],
      floorHeight: 0,
      walls: [
        { id: 'w-el-n', start: [12.5, -2.5], end: [15.5, -2.5], height: 2.8 }, // 北墙 (电梯门)
        { id: 'w-el-w', start: [12.5, -2.5], end: [12.5, 0.8], height: 2.8 }, // 西墙
        { id: 'w-el-s', start: [12.5, 0.8], end: [15.5, 0.8], height: 2.8, cutout: { start: 13.5, end: 14.5, sill: 0, top: 2.1 } }, // 南墙 (入户门)
        // 东墙: 南端开门洞, 通向楼梯间
        { id: 'w-el-e', start: [15.5, -2.5], end: [15.5, 0], height: 2.8, cutout: { start: 2.0, end: 2.5, sill: 0, top: 2.1 } },
      ],
      doors: [],
      windows: [],
      bayWindows: [],
      frenchWindows: [],
      elevators: [
        // 电梯 (贴北墙, 朝南)
        { id: 'ev-1', position: [14, 0, -2.35], width: 2.2, height: 2.4, rotation: 0 },
      ],
      furniture: [],
    },

    // ===== 楼梯间 (玄关东面) x:15.5~18, z:0~3.5 (东移2m) =====
    {
      id: 'stairwell',
      name: '楼梯间',
      nameEn: 'Stairwell',
      description: '消防楼梯, 西侧门通往玄关。',
      tags: ['三居', '公共'],
      floorHeight: 0,
      walls: [
        // 北墙: 西端开门洞, 通向电梯间
        { id: 'w-st-n', start: [16.5, 0], end: [18, 0], height: 2.8 },
        // 西墙: 北端开门洞, 通向电梯间东墙
        { id: 'w-st-w', start: [15.5, 0.5], end: [15.5, 3.5], height: 2.8 },
        { id: 'w-st-s', start: [15.5, 3.5], end: [18, 3.5], height: 2.8 }, // 南墙
        { id: 'w-st-e', start: [18, 0], end: [18, 3.5], height: 2.8 }, // 东墙
      ],
      doors: [
        // 北墙门 (通向电梯间)
        { id: 'd-st', position: [16, 0, 0], width: 0.9, height: 2.1, rotation: 0, hingeSide: 'left' },
      ],
      windows: [
      ],
      bayWindows: [],
      frenchWindows: [],
      stairs: [
        // 直跑楼梯: 从南向北, 10级, 顶部通向电梯间东墙
        { id: 'st-1', position: [16.75, 0, 3.0], direction: 'north', steps: 10, stepHeight: 0.18, stepDepth: 0.3, width: 1.5 },
      ],
      furniture: [],
    },

    // ===== 玄关 (右上) x:11.5~15.5, z:0~3.5 (东移2m) =====
    {
      id: 'entry',
      name: '玄关',
      nameEn: 'Entry',
      description: '入户玄关, 北侧入户门, 东侧通楼梯间, 鞋柜贴西墙。',
      tags: ['三居', '玄关'],
      floorHeight: 0,
      walls: [
        { id: 'w-en', start: [12.5, 0.8], end: [15.5, 0.8], height: 2.8, cutout: { start: 13.5, end: 14.5, sill: 0, top: 2.1 } }, // 北墙 (入户门)
        { id: 'w-ew', start: [13, 0], end: [13, 3.5], height: 2.8, opening: true }, // 西墙 (开放连通客厅)
        { id: 'w-es', start: [13.5, 3.5], end: [15.5, 3.5], height: 2.8 }, // 南墙
        { id: 'w-ee', start: [15.5, 0], end: [15.5, 3.5], height: 2.8 }, // 东墙 (门通楼梯间)
      ],
      doors: [
        { id: 'd-entry', position: [14, 0, 0.8], width: 1.0, height: 2.1, rotation: 0, hingeSide: 'left' },
      ],
      windows: [],
      bayWindows: [],
      frenchWindows: [],
      furniture: [
        { id: 'f-e-shoe1', name: '鞋柜', position: [15.2, 0, 2.7], rotation: 0, size: [1.2, 0.9, 0.35], type: 'cabinet', color: '#8b7355' },
        { id: 'f-e-shoe2', name: '鞋柜', position: [15.2, 0, 1.5], rotation: 0, size: [1.2, 0.9, 0.35], type: 'cabinet', color: '#8b7355' },
      ],
    },

    // ===== 主卫生间 (左中) x:3.5~5, z:0~2.5 =====
    {
      id: 'master-bath',
      name: '主卫生间',
      nameEn: 'Bathroom',
      description: '主卫间, 含淋浴、马桶、洗手台。',
      tags: ['三居', '卫浴'],
      floorHeight: 0,
      walls: [
        { id: 'w-mbtn', start: [0, 3], end: [3.5, 3], height: 2.8 }, // 北墙
        { id: 'w-mtw', start: [0, 3], end: [0, 5.4], height: 2.8 }, // 西墙
        { id: 'w-mts', start: [0, 5.4], end: [3.5, 5.4], height: 2.8, cutout: { start: 3.9, end: 4.7, sill: 0, top: 2.1 } }, // 南墙 (门)
        { id: 'w-mte', start: [3.5, 3], end: [3.5, 5.4], height: 2.8 }, // 东墙
      ],
      doors: [
        { id: 'd-bt', position: [2.45, 0, 5.5], width: 0.8, height: 2.1, rotation: 0, hingeSide: 'left' },
      ],
      windows: [],
      bayWindows: [],
      frenchWindows: [],
      furniture: [
        { id: 'f-mbt-shower', name: '淋浴', position: [0, 0, 3.1], rotation: 0, size: [1.1, 1.8, 2.3], type: 'shower', color: '#a8d0e6', shape: 'rect' },
        { id: 'f-mbt-toilet', name: '马桶', position: [1.7, 0, 3.4], rotation: 0, size: [0.4, 0.8, 0.65], type: 'toilet', color: '#fafafa' },
        { id: 'f-mbt-sink', name: '洗手台', position: [3.1, 0, 4.8], rotation: 0, size: [1, 0.85, 0.45], type: 'sink', color: '#ffffff' },
      ],
    },

    // ===== 衣帽间 (左中) x:0~3.5, z:3~5.5 =====
    {
      id: 'walkin',
      name: '衣帽间',
      nameEn: 'Walk-in Closet',
      description: '连接次卧一与主卧, 两侧衣柜。',
      tags: ['三居', '衣帽间'],
      floorHeight: 0,
      walls: [
        { id: 'w-win', start: [0, 5.4], end: [3.5, 5.4], height: 2.8, cutout: { start: 1.3, end: 2.2, sill: 0, top: 2.1 } }, // 北墙 (门从次卧一)
        { id: 'w-wiw', start: [0, 5.4], end: [0, 7.85], height: 2.8 }, // 西墙
        { id: 'w-wis', start: [0, 8.1], end: [3.0, 8.1], height: 2.8 }, // 南墙
        { id: 'w-wie', start: [3.5, 5.4], end: [3.5, 7.9], height: 2.8, opening: true }, // 东墙 (开放连通主卧)
      ],
      doors: [
      ],
      windows: [],
      bayWindows: [],
      frenchWindows: [],
      furniture: [
        { id: 'f-wi-l', name: '衣柜', position: [1.55, 0, 7.75], rotation: 90, size: [3.0, 2.4, 0.6], type: 'cabinet', color: '#d4c5b0' },
        { id: 'f-wi-r', name: '衣柜', position: [0.4, 0, 6.45], rotation: 0, size: [2.0, 2.4, 0.6], type: 'cabinet', color: '#d4c5b0' },
      ],
    },

    // ===== 主卧室 (左下) x:0~5, z:5.5~10 =====
    {
      id: 'master',
      name: '主卧室',
      nameEn: 'Master Bedroom',
      description: '南向主卧, 带大窗, 连通衣帽间。',
      tags: ['三居', '主卧'],
      floorHeight: 0,
      walls: [
        { id: 'w-mn', start: [0, 5.4], end: [5, 5.4], height: 2.8 }, // 北墙
        { id: 'w-mw', start: [0, 5.5], end: [0, 12], height: 2.8 }, // 西墙 (落地窗)
        { id: 'w-ms', start: [0, 12], end: [5, 12], height: 2.8, cutout: { start: 1.0, end: 3.5, sill: 0.9, top: 2.2 } }, // 南墙 (窗)
        { id: 'w-me', start: [5, 5.5], end: [5, 12], height: 2.8 }, // 东墙
      ],
      doors: [
        { id: 'd-m', position: [4.25, 0, 5.5], width: 0.9, height: 2.1, rotation: 180, hingeSide: 'left' },
      ],
      windows: [
        { id: 'win-m', position: [2.25, 0.9, 12], width: 2.5, height: 1.3, sill: 0.9, rotation: 0 },
      ],
      bayWindows: [],
      frenchWindows: [
      ],
      furniture: [
        { id: 'f-m-bed', name: '双人床', position: [1.1, 0, 10.0], rotation: 90, size: [1.8, 0.45, 2.0], type: 'bed', color: '#e8e0d4' },
        { id: 'f-m-ns1', name: '床头柜', position: [0.5, 0, 8.6], rotation: 0, size: [0.5, 0.5, 0.45], type: 'cabinet', color: '#8b7355' },
        { id: 'f-m-ns2', name: '床头柜', position: [0.5, 0, 11.5], rotation: 0, size: [0.5, 0.5, 0.45], type: 'cabinet', color: '#8b7355' },
      ],
    },

    // ===== 客厅 (中下, 大开间) x:3.5~13.5, z:3.5~10 (面宽+2m, 东墙+2m) =====
    {
      id: 'living',
      name: '客厅',
      nameEn: 'Living Room',
      description: '南北通透大客厅, 含多功能区, 南侧大落地窗。',
      tags: ['三居', '客厅'],
      floorHeight: 0,
      walls: [
        { id: 'w-ln', start: [3.5, 3.5], end: [9.5, 3.5], height: 2.8, opening: true }, // 北墙 (开放连通餐厅)
        { id: 'w-lw', start: [5, 5.4], end: [5, 10], height: 2.8 }, // 西墙
        { id: 'w-ls', start: [3.5, 10], end: [13.5, 10], height: 2.8, opening: true, cutout: { start: 4.0, end: 11.0, sill: 0.1, top: 2.5 } }, // 南墙 (落地窗, 面宽8m)
        { id: 'w-le', start: [13.5, 5.5], end: [13.5, 10], height: 2.8, cutout: { start: 6.0, end: 7.0, sill: 0, top: 2.1 } }, // 东墙 (门通次卧二)
      ],
      doors: [
      ],
      windows: [],
      bayWindows: [],
      frenchWindows: [
        { id: 'fw-l', position: [9.3, 0, 10], width: 8.0, height: 2.4, rotation: 0 }, // 南墙落地窗 (适配新面宽)
      ],
      furniture: [
        // 沙发区 (L型沙发, 靠南, 整体东移2m适配新面宽)
        { id: 'f-l-sofa', name: 'L型沙发', position: [10, 0, 8], rotation: 0, size: [2.8, 0.85, 0.9], type: 'sofa', color: '#d4c5b0', sofaShape: 'L' },
        { id: 'f-l-tea', name: '茶几', position: [11.7, 0, 8.1], rotation: 0, size: [1.2, 0.45, 0.65], type: 'table', color: '#5c4033' },
        { id: 'f-l-tv', name: '电视柜', position: [13.2, 0, 8.5], rotation: 0, size: [2.0, 0.4, 0.4], type: 'cabinet', color: '#3d3d3d' },
        // 多功能区 (靠北)
        { id: 'f-l-lounge', name: '休闲椅', position: [6.3, 0, 7.7], rotation: 45, size: [0.9, 0.85, 0.8], type: 'chair', color: '#c8b8a0' },
        { id: 'f-l-plant', name: '绿植', position: [7.4, 0, 9.5], rotation: 0, size: [0.5, 1.2, 0.5], type: 'decor', color: '#5a8a4a' },
      ],
    },

    // ===== 储藏间 (右中) x:13.5~15.5, z:3.5~5.5 (东移2m) =====
    {
      id: 'storage',
      name: '储藏间',
      nameEn: 'Storage',
      description: '储物空间, 两侧置物架。',
      tags: ['三居', '储物'],
      floorHeight: 0,
      walls: [
        { id: 'w-sn', start: [13.5, 3.5], end: [15.5, 3.5], height: 2.8 }, // 北墙
        { id: 'w-sw', start: [13.5, 3.5], end: [13.5, 5.5], height: 2.8, cutout: { start: 4.0, end: 4.9, sill: 0, top: 2.1 } }, // 西墙 (门)
        { id: 'w-ss', start: [13.5, 5.5], end: [15.5, 5.5], height: 2.8 }, // 南墙
        { id: 'w-se', start: [15.5, 3.5], end: [15.5, 5.5], height: 2.8 }, // 东墙
      ],
      doors: [
        { id: 'd-s', position: [13.5, 0, 4.45], width: 0.8, height: 2.1, rotation: 270, hingeSide: 'left' },
      ],
      windows: [],
      bayWindows: [],
      frenchWindows: [],
      furniture: [
        { id: 'f-s-shelf1', name: '置物架', position: [15.2, 0, 4.5], rotation: 180, size: [1.5, 2.0, 0.4], type: 'cabinet', color: '#8b7355' },
      ],
    },

    // ===== 次卧二 (右下) x:13.5~17, z:5.5~10 (东移2m) =====
    {
      id: 'bedroom-b2',
      name: '次卧二',
      nameEn: 'Bedroom 2',
      description: '东向次卧, 带东窗, 门通往客厅。',
      tags: ['三居', '次卧'],
      floorHeight: 0,
      walls: [
        { id: 'w-b2n', start: [13.5, 5.5], end: [17, 5.5], height: 2.8 }, // 北墙
        { id: 'w-b2w', start: [13.5, 5.5], end: [13.5, 10], height: 2.8, cutout: { start: 7.0, end: 8.0, sill: 0, top: 2.1 } }, // 西墙 (门从客厅)
        { id: 'w-b2s', start: [13.5, 10], end: [17, 10], height: 2.8, cutout: { start: 0.4, end: 2.4, sill: 0.9, top: 2.2 } }, // 南墙(窗)
        { id: 'w-b2e', start: [17, 5.5], end: [17, 10], height: 2.8 }, // 东墙
      ],
      doors: [
        { id: 'd-b2', position: [13.5, 0, 6.5], width: 0.9, height: 2.1, rotation: 270, hingeSide: 'left' },
      ],
      windows: [
        { id: 'win-b2', position: [15, 0.9, 10], width: 2.0, height: 1.3, sill: 0.9, rotation: 0 },
      ],
      bayWindows: [],
      frenchWindows: [],
      furniture: [
        { id: 'f-b2-bed', name: '单人床', position: [15.7, 0, 8.15], rotation: -90, size: [1.8, 0.45, 2.0], type: 'bed', color: '#e8e0d4' },
        { id: 'f-b2-ns1', name: '床头柜', position: [16.5, 0, 6.8], rotation: 0, size: [0.5, 0.5, 0.45], type: 'cabinet', color: '#8b7355' },
        { id: 'f-b2-ns2', name: '床头柜', position: [16.5, 0, 9.5], rotation: 0, size: [0.5, 0.5, 0.45], type: 'cabinet', color: '#8b7355' },
        { id: 'f-b2-tmb', name: '衣柜', position: [16, 0, 5.8], rotation: -90, size: [2.0, 2.45, 0.5], type: 'cabinet', color: '#d4c5b0' },
      ],
    },
  ],
};

/**
 * 家具展示场景: 单个家具置于简单展示房间内
 * 房间 4m x 4m, 层高 2.8m, 四面墙均有窗提供采光
 * 家具居中摆放, 便于全方位查看
 */
export function createFurnitureShowcase(item: ModelItem): SceneData {
  // 展示房间尺寸
  const ROOM = 4.0;
  const H = 2.8;
  // 家具尺寸 (若 ModelItem 未提供则用默认值)
  const size = item.size ?? [1.0, 0.5, 1.0];
  // 家具类型, 用于 Furniture.type; 默认 decor
  const type = (item.type as any) ?? 'decor';

  return {
    wallThickness: 0.2,
    ceilingHeight: H,
    floorThickness: 0.15,
    rooms: [
      {
        id: 'showcase',
        name: '家具展示',
        nameEn: 'Showcase',
        description: `${item.name} - 单品展示空间`,
        tags: ['展示', item.type ?? '家具'],
        floorHeight: 0,
        walls: [
          // 北墙 (有落地窗洞口, 模拟展示空间采光)
          { id: 'w-s1', start: [0, 0], end: [ROOM, 0], height: H, cutout: { start: 0.5, end: 3.5, sill: 0.1, top: 2.4 } },
          { id: 'w-s2', start: [ROOM, 0], end: [ROOM, ROOM], height: H, cutout: { start: 0.5, end: 3.5, sill: 0.9, top: 2.2 } },
          { id: 'w-s3', start: [ROOM, ROOM], end: [0, ROOM], height: H, cutout: { start: 0.5, end: 3.5, sill: 0.9, top: 2.2 } },
          { id: 'w-s4', start: [0, ROOM], end: [0, 0], height: H, cutout: { start: 0.5, end: 3.5, sill: 0.9, top: 2.2 } },
        ],
        doors: [],
        windows: [],
        // 北墙落地窗
        frenchWindows: [
          { id: 'fw-s1', position: [ROOM / 2, 0, 0], width: 3.0, height: 2.4, rotation: 180 },
        ],
        // 家具居中放置 (rotation=0 默认朝南)
        furniture: [
          {
            id: 'showcase-item',
            name: item.name,
            position: [ROOM / 2, 0, ROOM / 2],
            rotation: 0,
            size: size,
            type: type,
            color: item.color ?? '#cccccc',
            ...(item.type === 'shower' ? { shape: 'rect' as const } : {}),
          },
        ],
      },
    ],
  };
}

/**
 * 根据模型选择设计器场景数据
 * - furniture 类: 返回单品展示场景
 * - apartment 类: 根据 type 返回对应户型 (one-bed/two-bed/three-bed/modern)
 * - 无模型 (默认): 返回完整三居户型
 */
export function getSceneForModel(model: ModelItem | null): SceneData {
  if (!model) return mockSceneData;
  if (model.category === 'furniture') {
    return createFurnitureShowcase(model);
  }
  // apartment: 根据 type 返回对应户型
  switch (model.type) {
    case 'one-bed':
      return oneBedroomScene;
    case 'two-bed':
      return twoBedroomScene;
    case 'modern':
      return modernApartmentScene; // 现代三居室 (参考平面图)
    case 'three-bed':
    default:
      return mockSceneData; // 三居室 (完整户型)
  }
}
