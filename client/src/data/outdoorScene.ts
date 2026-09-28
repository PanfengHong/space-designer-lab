import type { OutdoorSceneData, ModelItem } from '../types';

/**
 * 户外空间设计 — 数字园区示例场景
 *
 * 视觉风格参考蓝白数字化园区:
 *  - 白色地面基座 + 蓝灰色道路 (白色虚线车道)
 *  - 东侧/南侧蓝色水面
 *  - 绿色草地斑块
 *  - 东西向高架道路 (白色桥墩 + 卡车)
 *  - 蓝色玻璃幕墙高楼 + 白色厂房
 *
 * 坐标约定: position=[x,y,z] 为元素中心; size=[X长, 高, Z宽]
 * 地面主基座 80m × 60m, 中心 (0,0)
 */
export const demoOutdoorScene: OutdoorSceneData = {
  ground: [
    // ===== 地面基座 =====
    { id: 'g-main', name: '园区地面', type: 'ground', position: [0, -0.0, 0], rotation: 0, size: [80, 0.3, 60], color: '#f2f5f9' },

    // ===== 河流 (东侧 + 南侧, 水面略低于地面) =====
    { id: 'g-river-east', name: '东侧河道', type: 'river', position: [44, -0.1, 0], rotation: 0, size: [9, 0.12, 64], color: '#6cb8e6' },
    { id: 'g-river-south', name: '南侧河道', type: 'river', position: [0, -0.1, -34], rotation: 0, size: [96, 0.12, 10], color: '#6cb8e6' },

    // ===== 草地 =====
    { id: 'g-grass-1', name: '中心绿地', type: 'grass', position: [-16.4, 0.23, 15], rotation: 90, size: [20, 0.16, 13], color: '#bfe3c0' },
    { id: 'g-grass-2', name: '办公楼绿地', type: 'grass', position: [6, 0.23, 18], rotation: 90, size: [15, 0.16, 8], color: '#b8e0bb' },
    { id: 'g-grass-3', name: '南侧绿地', type: 'grass', position: [-4, 0.23, -23.5], rotation: 0, size: [16, 0.16, 6], color: '#bfe3c0' },

    // ===== 高架道路 (东西向, 桥面中心 y=3.2) =====
    { id: 'g-highway', name: '高架道路', type: 'road', position: [0, 3.2, -8], rotation: 0, size: [86, 0.28, 3.4], color: '#d3dae3' },

    // ===== 地面道路 =====
    { id: 'g-road-1', name: '东西主干道', type: 'road', position: [0, 0.09, -16.5], rotation: 0, size: [64, 0.18, 6.6], color: '#d3dae3', lanes: 4 },
    { id: 'g-road-2', name: '东侧南北路', type: 'road', position: [14, 0.09, 6], rotation: 90, size: [43, 0.18, 2.8], color: '#d3dae3' },
    { id: 'g-road-3', name: '西侧南北路', type: 'road', position: [-25.20, 0.09, 4], rotation: 90, size: [38, 0.18, 2.8], color: '#d3dae3' },

    // ===== 十字路口 (东西主干道与南北路交点) =====
    { id: 'g-inter-1', name: '东路交口', type: 'intersection', position: [14, 0.09, -16.5], rotation: 0, size: [3.2, 0.18, 3.2], color: '#d3dae3', branches: 4, arcRadius: 1.4 },
    { id: 'g-inter-2', name: '西路交口', type: 'intersection', position: [-25.20, 0.09, -16.20], rotation: 0, size: [3.2, 0.18, 3.2], color: '#d3dae3', branches: 3, arcRadius: 1.4 },

    // ===== 高架匝道 (1/4 圆弧, 高架 → 南转向 → 接东侧南北路) =====
    // 曲线: 起点(-12,3.2,0)切线+X → 弧90°转向+Z → 终点(0,0.09,12)切线+Z
    // 原点(14,1.65,-8): 起点世界(2,3.2,-8)落高架✓, 终点世界(14,0.09,4)落东侧南北路✓
    // 匝道: 起点贴高架右边缘 z=-6.3, 终点贴南北路左边缘 x=12.6, 匝道在主路外侧延伸
    { id: 'g-ramp-1', name: '高架匝道', type: 'ramp', position: [12.6, 0, -6.3], rotation: 0, size: [24, 0.22, 3.2], color: '#d3dae3' },
  ],
  objects: [
    // ===== 建筑 =====
    { id: 'o-tower-1', name: '玻璃幕墙大厦', type: 'building', position: [27, 0, 16], rotation: 0, size: [9, 15, 9], color: '#7db8e8' },
    { id: 'o-tower-2', name: '研发大楼', type: 'building', position: [30.5, 0, 3], rotation: 0, size: [6.5, 9, 6.5], color: '#8fc4ee' },
    { id: 'o-warehouse-1', name: '物流仓库', type: 'warehouse', position: [-32, 0, 13], rotation: 90, size: [15, 5.5, 9], color: '#f2f5f9' },

    // ===== 卡车 (地面道路顶 0.18m, 高架桥面顶 3.34m) =====
    { id: 'o-truck-1', name: '蓝色货车', type: 'truck', position: [-18, 0.18, -17.0], rotation: 180, size: [3.8, 0.95, 0.9], color: '#4a90d9' },
    { id: 'o-truck-2', name: '白色货柜车', type: 'truck', position: [20, 3.34, -7.2], rotation: 0, size: [3.8, 0.95, 0.9], color: '#eef2f7' },
    { id: 'o-truck-3', name: '物流卡车', type: 'truck', position: [13.4, 0.18, 12], rotation: 270, size: [3.8, 0.95, 0.9], color: '#5aa0e0' },

    // ===== 轿车 =====
    { id: 'o-car-1', name: '轿车1', type: 'car', position: [4, 0.18, -15.9], rotation: 180, size: [1.9, 0.55, 0.85], color: '#ffffff' },
    { id: 'o-car-2', name: '轿车2', type: 'car', position: [13.5, 0.18, 0], rotation: 90, size: [1.9, 0.55, 0.85], color: '#dbe7f2' },
    { id: 'o-car-3', name: '轿车3', type: 'car', position: [-25.9, 0.18, 8], rotation: 270, size: [1.9, 0.55, 0.85], color: '#ffffff' },
    { id: 'o-car-4', name: '轿车4', type: 'car', position: [-6, 3.34, -8.8], rotation: 0, size: [1.9, 0.55, 0.85], color: '#cfe0f2' },
    { id: 'o-car-6', name: '停靠轿车', type: 'car', position: [23.5, 0, 21.5], rotation: 0, size: [1.9, 0.55, 0.85], color: '#f2f5f9' },
  ],
};

/**
 * 封闭园区示例场景 — 参考工业园区效果图
 *
 * 视觉特征:
 *  - 实体围墙围合 (白色立柱 + 栏板 + 压顶)
 *  - 西侧多层办公楼 (玻璃幕墙)
 *  - 东侧大跨度厂房/仓库 (金属屋顶 + 卷帘门)
 *  - 南侧入口门卫室 + 车辆出入口
 *  - 院内铺装场地 + 货车
 *  - 围墙外侧道路 + 行道树
 *
 * 坐标约定: position=[x,y,z] 元素中心; size=[X长, 高/厚, Z宽]
 * 场地约 50m × 40m, 中心 (0,0)
 */
export const enclosedParkScene: OutdoorSceneData = {
  ground: [
    // ===== 地面基座 (整个场地) =====
    { id: 'ep-ground', name: '园区地面', type: 'ground', position: [0, 0, 0], rotation: 0, size: [60, 0.3, 50], color: '#eef2f6' },

    // ===== 院内铺装场地 (略深于基座) =====
    { id: 'ep-courtyard', name: '院内铺装', type: 'ground', position: [0, 0.22, 0], rotation: 0, size: [49, 0.12, 39], color: '#cfd6df' },

    // ===== 围墙 (围合院落, 南侧留 6m 出入口) =====
    // 北围墙
    { id: 'ep-fence-n', name: '北围墙', type: 'fence', position: [0, 0, -19.5], rotation: 0, size: [50, 1.8, 0.4], color: '#f0f4f8' },
    // 南围墙 (左段)
    { id: 'ep-fence-s1', name: '南围墙西段', type: 'fence', position: [-13.5, 0, 19.5], rotation: 0, size: [22, 1.8, 0.4], color: '#f0f4f8' },
    // 南围墙 (右段)
    { id: 'ep-fence-s2', name: '南围墙东段', type: 'fence', position: [13.5, 0, 19.5], rotation: 0, size: [22, 1.8, 0.4], color: '#f0f4f8' },
    // 东围墙
    { id: 'ep-fence-e', name: '东围墙', type: 'fence', position: [24.5, 0, 0], rotation: 90, size: [39, 1.8, 0.4], color: '#f0f4f8' },
    // 西围墙
    { id: 'ep-fence-w', name: '西围墙', type: 'fence', position: [-24.5, 0, 0], rotation: 90, size: [39, 1.8, 0.4], color: '#f0f4f8' },

    // ===== 道路 (西侧 + 南侧, 围墙外侧) =====
    { id: 'ep-road-w', name: '西侧道路', type: 'road', position: [-31, 0.09, 0], rotation: 90, size: [50, 0.18, 7], color: '#5a6270', lanes: 2 },
    { id: 'ep-road-s', name: '南侧道路', type: 'road', position: [0, 0.09, 26], rotation: 0, size: [62, 0.18, 7], color: '#5a6270', lanes: 4 },
    // 入口连接道路 (大门 → 南侧外部马路)
    { id: 'ep-road-connect', name: '入口连接路', type: 'road', position: [0, 0.09, 22.75], rotation: 90, size: [7.5, 0.18, 5.5], color: '#5a6270', lanes: 2 },
    // 院内主路 (大门 → 建筑群, 南北向)
    { id: 'ep-road-in-ns', name: '院内主路', type: 'road', position: [0, 0.09, 8], rotation: 90, size: [24, 0.18, 5], color: '#5a6270', lanes: 2 },
    // 院内支路 (东西向, 连接办公楼与厂房)
    { id: 'ep-road-in-ew', name: '院内支路', type: 'road', position: [0, 0.09, -4], rotation: 0, size: [40, 0.18, 4], color: '#5a6270', lanes: 2 },
    // 路口 (西路与南路相交)
    { id: 'ep-inter-1', name: '西南路口', type: 'intersection', position: [-31, 0.09, 26], rotation: 0, size: [3.4, 0.18, 3.4], color: '#5a6270', branches: 4, arcRadius: 1.6 },

    // ===== 围墙外绿地 =====
    { id: 'ep-grass-w', name: '西侧绿地', type: 'grass', position: [-27.5, 0.23, 0], rotation: 90, size: [40, 0.1, 2.5], color: '#9ec99f' },
    { id: 'ep-grass-s', name: '南侧绿地', type: 'grass', position: [0, 0.23, 22.5], rotation: 0, size: [50, 0.1, 2.5], color: '#9ec99f' },
    { id: 'ep-grass-out', name: '外围绿地', type: 'grass', position: [0, 0.18, 0], rotation: 0, size: [62, 0.1, 52], color: '#bfe3c0' },
  ],
  objects: [
    // ===== 办公楼 (西侧, 玻璃幕墙, 约4层) =====
    { id: 'ep-office', name: '办公楼', type: 'building', position: [-13, 0, -7], rotation: 0, size: [14, 13, 11], color: '#7db8e8' },

    // ===== 厂房仓库 (东侧, 大跨度金属屋顶) =====
    { id: 'ep-warehouse', name: '生产厂房', type: 'warehouse', position: [12, 0, -4], rotation: 0, size: [22, 8.5, 15], color: '#f2f5f9' },

    // ===== 园区大门 (南侧入口, 双门柱 + 伸缩门 + 门卫室) =====
    { id: 'ep-gate', name: '园区大门', type: 'gate', position: [0, 0, 19.5], rotation: 0, size: [9, 4.5, 1.2], color: '#e8eef4' },
    // 门卫室 (大门东侧独立设置)
    { id: 'ep-booth', name: '门卫室', type: 'guard-booth', position: [6, 0, 19.5], rotation: 0, size: [4, 3.2, 3], color: '#e8eef4' },

    // ===== 货车 (院内) =====
    { id: 'ep-truck-1', name: '红色货车', type: 'truck', position: [4, 0.28, 5], rotation: 180, size: [3.8, 0.95, 0.9], color: '#c0392b' },
    { id: 'ep-truck-2', name: '白色货柜车', type: 'truck', position: [-4, 0.28, 3], rotation: 90, size: [3.8, 0.95, 0.9], color: '#eef2f7' },

    // ===== 集装箱 (厂房旁) =====
    { id: 'ep-container-1', name: '集装箱', type: 'warehouse', position: [20, 0, 8], rotation: 0, size: [4, 2.6, 2.2], color: '#5b8def' },
    { id: 'ep-container-2', name: '集装箱', type: 'warehouse', position: [20, 0, 11], rotation: 0, size: [4, 2.6, 2.2], color: '#f5f5f5' },

    // ===== 树木 (沿围墙内侧布置) =====
    // 北围墙内侧
    { id: 'ep-tree-n1', name: '树木', type: 'tree', position: [-16, 0, -17], rotation: 0, size: [0.5, 6, 0.5], color: '#5a8a4a' },
    { id: 'ep-tree-n2', name: '树木', type: 'tree', position: [-8, 0, -17], rotation: 0, size: [0.5, 6, 0.5], color: '#5a8a4a' },
    { id: 'ep-tree-n3', name: '树木', type: 'tree', position: [8, 0, -17], rotation: 0, size: [0.5, 6, 0.5], color: '#5a8a4a' },
    { id: 'ep-tree-n4', name: '树木', type: 'tree', position: [16, 0, -17], rotation: 0, size: [0.5, 6, 0.5], color: '#5a8a4a' },
    // 东围墙内侧
    { id: 'ep-tree-e1', name: '树木', type: 'tree', position: [22, 0, -10], rotation: 0, size: [0.5, 6, 0.5], color: '#5a8a4a' },
    { id: 'ep-tree-e2', name: '树木', type: 'tree', position: [22, 0, 2], rotation: 0, size: [0.5, 6, 0.5], color: '#5a8a4a' },
    { id: 'ep-tree-e3', name: '树木', type: 'tree', position: [22, 0, 12], rotation: 0, size: [0.5, 6, 0.5], color: '#5a8a4a' },
    // 西围墙内侧
    { id: 'ep-tree-w1', name: '树木', type: 'tree', position: [-22, 0, -10], rotation: 0, size: [0.5, 6, 0.5], color: '#5a8a4a' },
    { id: 'ep-tree-w2', name: '树木', type: 'tree', position: [-22, 0, 2], rotation: 0, size: [0.5, 6, 0.5], color: '#5a8a4a' },
    { id: 'ep-tree-w3', name: '树木', type: 'tree', position: [-22, 0, 12], rotation: 0, size: [0.5, 6, 0.5], color: '#5a8a4a' },
    // 南围墙内侧 (入口两侧)
    { id: 'ep-tree-s1', name: '树木', type: 'tree', position: [-17, 0, 17], rotation: 0, size: [0.5, 6, 0.5], color: '#5a8a4a' },
    { id: 'ep-tree-s2', name: '树木', type: 'tree', position: [17, 0, 17], rotation: 0, size: [0.5, 6, 0.5], color: '#5a8a4a' },

    // ===== 行道树 (围墙外道路两侧) =====
    // 西侧道路 (沿 Z 方向排列)
    { id: 'ep-tree-rw1', name: '行道树', type: 'tree', position: [-28, 0, -16], rotation: 0, size: [0.5, 6, 0.5], color: '#5a8a4a' },
    { id: 'ep-tree-rw2', name: '行道树', type: 'tree', position: [-28, 0, -8], rotation: 0, size: [0.5, 6, 0.5], color: '#5a8a4a' },
    { id: 'ep-tree-rw3', name: '行道树', type: 'tree', position: [-28, 0, 0], rotation: 0, size: [0.5, 6, 0.5], color: '#5a8a4a' },
    { id: 'ep-tree-rw4', name: '行道树', type: 'tree', position: [-28, 0, 8], rotation: 0, size: [0.5, 6, 0.5], color: '#5a8a4a' },
    { id: 'ep-tree-rw5', name: '行道树', type: 'tree', position: [-28, 0, 16], rotation: 0, size: [0.5, 6, 0.5], color: '#5a8a4a' },
    // 南侧道路 (沿 X 方向排列)
    { id: 'ep-tree-rs1', name: '行道树', type: 'tree', position: [-20, 0, 23.5], rotation: 0, size: [0.5, 6, 0.5], color: '#5a8a4a' },
    { id: 'ep-tree-rs2', name: '行道树', type: 'tree', position: [-10, 0, 23.5], rotation: 0, size: [0.5, 6, 0.5], color: '#5a8a4a' },
    { id: 'ep-tree-rs3', name: '行道树', type: 'tree', position: [10, 0, 23.5], rotation: 0, size: [0.5, 6, 0.5], color: '#5a8a4a' },
    { id: 'ep-tree-rs4', name: '行道树', type: 'tree', position: [20, 0, 23.5], rotation: 0, size: [0.5, 6, 0.5], color: '#5a8a4a' },
  ],
};

/**
 * 物流园区场景 — 在封闭园区基础上增加更多仓储/物流元素
 * 复用封闭园区布局, 替换办公楼为仓储中心, 增加货柜堆场
 */
export const logisticsParkScene: OutdoorSceneData = {
  ...enclosedParkScene,
  objects: enclosedParkScene.objects.map((o) => {
    // 办公楼改为仓储中心
    if (o.id === 'ep-office') {
      return { ...o, id: 'lp-logistics-center', name: '物流中心', type: 'warehouse', color: '#e8eef4' };
    }
    // 厂区厂房保留
    if (o.id === 'ep-warehouse') {
      return { ...o, id: 'lp-warehouse-a', name: '仓储A库' };
    }
    return o;
  }),
};

/**
 * 校园场景 — 教学楼 + 实验楼 + 宿舍楼 + 操场 + 大门
 *
 * 布局 (俯视, 北为 -Z):
 *   - 北侧: 教学楼 (主建筑, 带钟楼)
 *   - 西侧: 实验楼
 *   - 东侧: 宿舍楼
 *   - 中南部: 操场 (红色跑道 + 绿色球场)
 *   - 南侧: 园区大门 + 连接外部马路
 *   - 院内: 道路 + 绿化 + 树木
 */
export const campusScene: OutdoorSceneData = {
  ground: [
    // ===== 地面基座 =====
    { id: 'cs-ground', name: '校园地面', type: 'ground', position: [0, 0, 0], rotation: 0, size: [72, 0.3, 56], color: '#eef2f6' },

    // ===== 院内铺装 =====
    { id: 'cs-court', name: '院内铺装', type: 'ground', position: [0, 0.22, 0], rotation: 0, size: [60, 0.12, 44], color: '#cfd6df' },

    // ===== 围墙 (南侧留 9m 出入口) =====
    { id: 'cs-fence-n', name: '北围墙', type: 'fence', position: [0, 0, -21.5], rotation: 0, size: [60, 1.8, 0.4], color: '#f0f4f8' },
    { id: 'cs-fence-e', name: '东围墙', type: 'fence', position: [29.5, 0, 0], rotation: 90, size: [43, 1.8, 0.4], color: '#f0f4f8' },
    { id: 'cs-fence-w', name: '西围墙', type: 'fence', position: [-29.5, 0, 0], rotation: 90, size: [43, 1.8, 0.4], color: '#f0f4f8' },
    { id: 'cs-fence-s1', name: '南围墙西段', type: 'fence', position: [-15.5, 0, 21.5], rotation: 0, size: [29, 1.8, 0.4], color: '#f0f4f8' },
    { id: 'cs-fence-s2', name: '南围墙东段', type: 'fence', position: [15.5, 0, 21.5], rotation: 0, size: [29, 1.8, 0.4], color: '#f0f4f8' },

    // ===== 操场 (中南部, 红色椭圆跑道 + 绿色球场) =====
    { id: 'cs-playground', name: '田径操场', type: 'playground', position: [2, 0.22, 4], rotation: 0, size: [22, 0.2, 12], color: '#d93636' },

    // ===== 院内道路 =====
    // 东西向主路 (连接教学楼 → 操场)
    { id: 'cs-road-ew', name: '东西主路', type: 'road', position: [0, 0.09, -6], rotation: 0, size: [54, 0.18, 5], color: '#5a6270', lanes: 2 },
    // 南北向路 (大门 → 操场)
    { id: 'cs-road-ns', name: '南北路', type: 'road', position: [0, 0.09, 13], rotation: 90, size: [18, 0.18, 4.5], color: '#5a6270', lanes: 2 },

    // ===== 外部马路 (南侧) =====
    { id: 'cs-road-out', name: '外部马路', type: 'road', position: [0, 0.09, 28], rotation: 0, size: [74, 0.18, 7], color: '#4a5260', lanes: 4 },
    // 入口连接道路 (大门 → 外部马路)
    { id: 'cs-road-connect', name: '入口连接路', type: 'road', position: [0, 0.09, 25], rotation: 90, size: [7, 0.18, 5.5], color: '#5a6270', lanes: 2 },

    // ===== 绿地 =====
    { id: 'cs-grass-nw', name: '西北绿地', type: 'grass', position: [-22, 0.35, -14], rotation: 0, size: [10, 0.1, 8], color: '#9ec99f' },
    { id: 'cs-grass-ne', name: '东北绿地', type: 'grass', position: [22, 0.35, -14], rotation: 0, size: [10, 0.1, 8], color: '#9ec99f' },
    { id: 'cs-grass-sw', name: '西南绿地', type: 'grass', position: [-20, 0.35, 14], rotation: 0, size: [10, 0.1, 8], color: '#9ec99f' },
    { id: 'cs-grass-out', name: '外围绿地', type: 'grass', position: [0, 0.18, 0], rotation: 0, size: [74, 0.1, 58], color: '#bfe3c0' },
  ],
  objects: [
    // ===== 教学楼 (北侧中央, 最高, 带钟楼 + 雨棚) =====
    { id: 'cs-teaching', name: '教学楼', type: 'teaching-building', position: [0, 0, -15], rotation: 0, size: [20, 16, 8], color: '#f0f4f8' },

    // ===== 实验楼 (西侧) =====
    { id: 'cs-lab', name: '实验楼', type: 'lab-building', position: [-20, 0, -2], rotation: 0, size: [13, 12, 6.5], color: '#e2e8f0' },

    // ===== 宿舍楼 (东侧) =====
    { id: 'cs-dorm', name: '宿舍楼', type: 'dormitory', position: [20, 0, 8], rotation: 0, size: [16, 10, 5.5], color: '#f8fafc' },

    // ===== 园区大门 (南侧入口, 抬杆道闸) =====
    { id: 'cs-gate', name: '校园大门', type: 'gate', position: [0, 0, 21.5], rotation: 0, size: [10, 5, 1.2], color: '#e8eef4' },
    // 门卫室 (大门东侧独立设置)
    { id: 'cs-booth', name: '门卫室', type: 'guard-booth', position: [7, 0, 21.5], rotation: 0, size: [4, 3.2, 3], color: '#e8eef4' },

    // ===== 树木 (沿围墙内侧) =====
    // 北围墙
    { id: 'cs-tree-n1', name: '树木', type: 'tree', position: [-20, 0, -19], rotation: 0, size: [0.5, 5, 0.5], color: '#5a8a4a' },
    { id: 'cs-tree-n2', name: '树木', type: 'tree', position: [-10, 0, -19], rotation: 0, size: [0.5, 5, 0.5], color: '#5a8a4a' },
    { id: 'cs-tree-n3', name: '树木', type: 'tree', position: [10, 0, -19], rotation: 0, size: [0.5, 5, 0.5], color: '#5a8a4a' },
    { id: 'cs-tree-n4', name: '树木', type: 'tree', position: [20, 0, -19], rotation: 0, size: [0.5, 5, 0.5], color: '#5a8a4a' },
    // 东围墙
    { id: 'cs-tree-e1', name: '树木', type: 'tree', position: [27, 0, -12], rotation: 0, size: [0.5, 5, 0.5], color: '#5a8a4a' },
    { id: 'cs-tree-e2', name: '树木', type: 'tree', position: [27, 0, 0], rotation: 0, size: [0.5, 5, 0.5], color: '#5a8a4a' },
    { id: 'cs-tree-e3', name: '树木', type: 'tree', position: [27, 0, 12], rotation: 0, size: [0.5, 5, 0.5], color: '#5a8a4a' },
    // 西围墙
    { id: 'cs-tree-w1', name: '树木', type: 'tree', position: [-27, 0, -12], rotation: 0, size: [0.5, 5, 0.5], color: '#5a8a4a' },
    { id: 'cs-tree-w2', name: '树木', type: 'tree', position: [-27, 0, 0], rotation: 0, size: [0.5, 5, 0.5], color: '#5a8a4a' },
    { id: 'cs-tree-w3', name: '树木', type: 'tree', position: [-27, 0, 12], rotation: 0, size: [0.5, 5, 0.5], color: '#5a8a4a' },

    // ===== 行道树 (外部马路两侧) =====
    { id: 'cs-tree-r1', name: '行道树', type: 'tree', position: [-22, 0, 25.5], rotation: 0, size: [0.5, 5, 0.5], color: '#5a8a4a' },
    { id: 'cs-tree-r2', name: '行道树', type: 'tree', position: [-11, 0, 25.5], rotation: 0, size: [0.5, 5, 0.5], color: '#5a8a4a' },
    { id: 'cs-tree-r3', name: '行道树', type: 'tree', position: [11, 0, 25.5], rotation: 0, size: [0.5, 5, 0.5], color: '#5a8a4a' },
    { id: 'cs-tree-r4', name: '行道树', type: 'tree', position: [22, 0, 25.5], rotation: 0, size: [0.5, 5, 0.5], color: '#5a8a4a' },
  ],
};

/**
 * 根据园区模型返回户外场景
 * - digital-park: 数字产业园区 (蓝白数字化, 含河道/高架/玻璃塔楼)
 * - industrial-park: 封闭工业园区 (办公楼 + 厂房 + 围墙 + 大门)
 * - logistics: 智慧物流园 (仓储中心 + 堆场)
 * - school: 校园 (教学楼 + 实验楼 + 宿舍楼 + 操场 + 大门)
 * - 其他: 默认数字园区
 */
export function getOutdoorSceneForModel(model: ModelItem | null): OutdoorSceneData {
  if (!model || model.category !== 'campus') {
    return demoOutdoorScene;
  }
  switch (model.type) {
    case 'industrial-park':
      return enclosedParkScene;
    case 'logistics':
      return logisticsParkScene;
    case 'office-park':
      return enclosedParkScene;
    case 'school':
      return campusScene;
    case 'digital-park':
    default:
      return demoOutdoorScene;
  }
}
