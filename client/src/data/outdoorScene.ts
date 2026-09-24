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
 * 根据园区模型返回户外场景
 * 当前所有园区模板共用数字园区示例场景
 */
export function getOutdoorSceneForModel(_model: ModelItem | null): OutdoorSceneData {
  return demoOutdoorScene;
}
